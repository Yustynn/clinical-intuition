"""
Clinical trial data ingestor service.
"""
import time
from datetime import datetime, UTC
from typing import Dict, Optional, Any, Tuple
from dataclasses import dataclass

from models.core import Study
from storage.json_store import JSONStore
from ingestion.api.client import ClinicalTrialsAPIClient, APIConfig
from ingestion.processing.field_mapper import ClinicalTrialsFieldMapper
from utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class IngestionConfig:
    """Configuration for data ingestion"""
    max_studies_per_run: int = 5000
    batch_size: int = 100
    retry_attempts: int = 3
    retry_delay: float = 1.0
    filter_has_results_only: bool = True
    filter_completed_only: bool = True
    save_raw_data: bool = True  # Save raw API responses for debugging
    continue_on_error: bool = True


@dataclass
class IngestionStats:
    """Statistics for ingestion run"""
    total_fetched: int = 0
    successfully_processed: int = 0
    failed_processing: int = 0
    duplicate_studies: int = 0
    studies_with_results: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    @property
    def duration_seconds(self) -> float:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0
    
    @property
    def success_rate(self) -> float:
        if self.total_fetched == 0:
            return 0.0
        return self.successfully_processed / self.total_fetched


class ClinicalTrialIngestor:
    """Main service for ingesting clinical trial data"""
    
    def __init__(self, 
                 store: JSONStore,
                 api_config: Optional[APIConfig] = None,
                 ingestion_config: Optional[IngestionConfig] = None):
        self.store = store
        self.api_client = ClinicalTrialsAPIClient(api_config)
        self.field_mapper = ClinicalTrialsFieldMapper()
        self.config = ingestion_config or IngestionConfig()
        self.logger = get_logger(__name__)
        
        # Create directory for raw data if needed
        if self.config.save_raw_data:
            self.raw_data_dir = self.store.data_dir / "raw_studies"
            self.raw_data_dir.mkdir(exist_ok=True)
    
    def test_connection(self) -> bool:
        """Test API connection before running ingestion"""
        return self.api_client.test_connection()
    
    def build_query_filters(self, custom_filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build query filters for the API request"""
        # Use behavioral intervention filtering like the working notebook
        # Note: hasResults filtering must be done in post-processing as API doesn't support it
        filters = {
            "intervention_type": "BEHAVIORAL"  # This translates to AREA[InterventionType]BEHAVIORAL
        }
        
        # Apply custom filters (if provided)
        if custom_filters:
            filters.update(custom_filters)
        
        self.logger.info(f"Using query filters: {filters}")
        return filters
    
    def save_raw_study_data(self, nct_id: str, raw_data: Dict[str, Any]) -> bool:
        """Save raw API response data for debugging"""
        if not self.config.save_raw_data:
            return True
        
        try:
            import json
            file_path = self.raw_data_dir / f"{nct_id}_raw.json"
            
            with open(file_path, 'w') as f:
                json.dump(raw_data, f, indent=2, default=str)
            
            return True
        except Exception as e:
            self.logger.warning(f"Failed to save raw data for {nct_id}: {e}")
            return False
    
    def should_process_study(self, api_response: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Determine if a study should be processed based on our criteria.
        Returns: (should_process, reason_if_not)
        """
        # Check if study has results (strict requirement for prediction markets)
        has_results = api_response.get('hasResults', False)
        if self.config.filter_has_results_only and not has_results:
            return False, "No results posted"
        
        protocol_section = api_response.get('protocolSection', {})
        
        # Check if interventional study
        design_module = protocol_section.get('designModule', {})
        study_type = design_module.get('studyType', '')
        if study_type.upper() != "INTERVENTIONAL":
            return False, f"Not interventional study: {study_type}"
        
        # Check study status
        status_module = protocol_section.get('statusModule', {})
        overall_status = status_module.get('overallStatus', '')
        
        allowed_statuses = ["COMPLETED", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"]
        if self.config.filter_completed_only:
            if overall_status not in allowed_statuses:
                return False, f"Study not in allowed statuses: {overall_status}"
        
        # Check for interventions
        arms_module = protocol_section.get('armsInterventionsModule', {})
        interventions = arms_module.get('interventions', [])
        if not interventions:
            return False, "No interventions defined"
        
        # Check for primary outcomes
        outcomes_module = protocol_section.get('outcomesModule', {})
        primary_outcomes = outcomes_module.get('primaryOutcomes', [])
        if not primary_outcomes:
            return False, "No primary outcomes defined"
        
        return True, ""
    
    def process_single_study(self, api_response: Dict[str, Any]) -> Tuple[bool, Optional[Study], str]:
        """
        Process a single study from API response.
        Returns: (success, study_object, error_message)
        """
        try:
            # First check if we should process this study
            should_process, reason = self.should_process_study(api_response)
            if not should_process:
                return False, None, reason
            
            # Extract raw study data
            raw_data = self.field_mapper.extract_raw_study_data(api_response)
            nct_id = raw_data.nct_id
            
            # Check if study already exists
            existing_study = self.store.get_study(nct_id)
            if existing_study:
                self.logger.debug(f"Study {nct_id} already exists, skipping")
                return False, existing_study, "Already exists"
            
            # Save the raw data (already comprehensive from bulk API fetch)
            self.save_raw_study_data(nct_id, api_response)
            
            # Map to Study object
            study = self.field_mapper.map_to_study_object(raw_data)
            
            # Save to store
            study_id = self.store.save_study(study)
            self.logger.debug(f"Successfully processed and saved study {study_id}")
            
            return True, study, ""
            
        except Exception as e:
            error_msg = f"Failed to process study: {e}"
            self.logger.error(error_msg)
            return False, None, error_msg
    
    def ingest_studies(self, 
                      custom_filters: Optional[Dict[str, Any]] = None,
                      max_studies: Optional[int] = None) -> IngestionStats:
        """
        Main ingestion method - fetch and process studies from API.
        """
        stats = IngestionStats(start_time=datetime.now(UTC))
        max_studies = max_studies or self.config.max_studies_per_run
        
        self.logger.info(f"Starting ingestion run with max_studies={max_studies}")
        
        # Test connection first
        if not self.test_connection():
            self.logger.error("API connection test failed, aborting ingestion")
            stats.end_time = datetime.now(UTC)
            return stats
        
        try:
            # Build query filters
            query_filters = self.build_query_filters(custom_filters)
            
            # Fetch studies from API
            studies_processed = 0
            
            for study_data in self.api_client.fetch_studies_stream(
                query_filters=query_filters,
                max_pages=max_studies // self.api_client.config.page_size + 1
            ):
                if studies_processed >= max_studies:
                    self.logger.info(f"Reached max studies limit: {max_studies}")
                    break
                
                stats.total_fetched += 1
                
                # Process with retry logic
                success, study, error_msg = self._process_with_retry(study_data)
                
                if success:
                    stats.successfully_processed += 1
                    if study and study.has_results:
                        stats.studies_with_results += 1
                elif error_msg == "Already exists":
                    stats.duplicate_studies += 1
                else:
                    stats.failed_processing += 1
                    if not self.config.continue_on_error:
                        self.logger.error(f"Stopping ingestion due to error: {error_msg}")
                        break
                
                studies_processed += 1
                
                # Log progress periodically
                if studies_processed % self.config.batch_size == 0:
                    self.logger.info(
                        f"Progress: {studies_processed} processed, "
                        f"{stats.successfully_processed} successful, "
                        f"{stats.failed_processing} failed"
                    )
        
        except Exception as e:
            self.logger.error(f"Ingestion failed with exception: {e}")
        
        finally:
            stats.end_time = datetime.now(UTC)
            self._log_ingestion_summary(stats)
        
        return stats
    
    def _process_with_retry(self, study_data: Dict[str, Any]) -> Tuple[bool, Optional[Study], str]:
        """Process study with retry logic"""
        last_error = ""
        
        for attempt in range(self.config.retry_attempts):
            try:
                success, study, error_msg = self.process_single_study(study_data)
                
                if success or error_msg == "Already exists":
                    return success, study, error_msg
                
                last_error = error_msg
                
                # If it's a validation error, don't retry
                if any(msg in error_msg.lower() for msg in [
                    "no results", "no primary outcomes", "no interventions", 
                    "not interventional", "not completed"
                ]):
                    break
                
                # Wait before retry
                if attempt < self.config.retry_attempts - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                    
            except Exception as e:
                last_error = str(e)
                if attempt < self.config.retry_attempts - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
        
        return False, None, last_error
    
    def _log_ingestion_summary(self, stats: IngestionStats):
        """Log comprehensive ingestion summary"""
        self.logger.info("=" * 60)
        self.logger.info("INGESTION SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info(f"Total fetched: {stats.total_fetched}")
        self.logger.info(f"Successfully processed: {stats.successfully_processed}")
        self.logger.info(f"Failed processing: {stats.failed_processing}")
        self.logger.info(f"Duplicate studies: {stats.duplicate_studies}")
        self.logger.info(f"Studies with results: {stats.studies_with_results}")
        self.logger.info(f"Success rate: {stats.success_rate:.2%}")
        self.logger.info(f"Duration: {stats.duration_seconds:.1f} seconds")
        
        if stats.successfully_processed > 0:
            rate = stats.successfully_processed / stats.duration_seconds if stats.duration_seconds > 0 else 0
            self.logger.info(f"Processing rate: {rate:.1f} studies/second")
        
        # Log storage stats
        storage_stats = self.store.get_stats()
        self.logger.info(f"Storage stats: {storage_stats}")
        self.logger.info("=" * 60)
    
    def ingest_single_study_by_nct_id(self, nct_id: str) -> Tuple[bool, Optional[Study], str]:
        """Ingest a specific study by NCT ID"""
        self.logger.info(f"Fetching single study: {nct_id}")
        
        try:
            # Fetch from API
            study_data = self.api_client.fetch_study_by_nct_id(nct_id)
            
            if not study_data:
                return False, None, f"Study {nct_id} not found in API"
            
            # Process the study
            return self.process_single_study(study_data)
            
        except Exception as e:
            error_msg = f"Failed to fetch study {nct_id}: {e}"
            self.logger.error(error_msg)
            return False, None, error_msg
    
    def get_ingestion_progress(self) -> Dict[str, Any]:
        """Get current ingestion progress and storage statistics"""
        storage_stats = self.store.get_stats()
        
        return {
            "storage_stats": storage_stats,
            "last_run": None,  # Could track this in future
            "configuration": {
                "filter_has_results_only": self.config.filter_has_results_only,
                "filter_completed_only": self.config.filter_completed_only,
                "max_studies_per_run": self.config.max_studies_per_run,
                "batch_size": self.config.batch_size
            }
        }