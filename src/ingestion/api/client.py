"""
ClinicalTrials.gov API v2 client for fetching study data.
"""
import urllib.request
import urllib.parse
import urllib.error
import json
import time
from typing import Dict, Optional, Generator, Any
from dataclasses import dataclass

from utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class APIConfig:
    """Configuration for ClinicalTrials.gov API"""
    base_url: str = "https://clinicaltrials.gov/api/v2/studies"
    user_agent: str = "Python-Clinical-Trial-Predictor/1.0"
    timeout: int = 30
    page_size: int = 1000
    max_pages: int = 50
    sleep_between_requests: float = 0.1


class ClinicalTrialsAPIClient:
    """Client for ClinicalTrials.gov API v2"""
    
    # Comprehensive fields for bulk fetching - include everything we need in one request
    COMPREHENSIVE_FIELDS = [
        # Core identification
        "protocolSection.identificationModule.nctId",
        "protocolSection.identificationModule.briefTitle",
        "protocolSection.identificationModule.officialTitle",
        "protocolSection.identificationModule.orgStudyIdInfo",
        "protocolSection.identificationModule.secondaryIdInfos",
        "protocolSection.identificationModule.organization",
        
        # Descriptions
        "protocolSection.descriptionModule.briefSummary",
        "protocolSection.descriptionModule.detailedDescription",
        
        # Status and dates
        "protocolSection.statusModule.overallStatus",
        "protocolSection.statusModule.whyStopped",
        "protocolSection.statusModule.studyFirstSubmitDate",
        "protocolSection.statusModule.studyFirstPostDate",
        "protocolSection.statusModule.resultsFirstSubmitDate",
        "protocolSection.statusModule.resultsFirstPostDate",
        "protocolSection.statusModule.lastUpdateSubmitDate",
        "protocolSection.statusModule.lastUpdatePostDate",
        "protocolSection.statusModule.studyStartDate",
        "protocolSection.statusModule.primaryCompletionDate",
        "protocolSection.statusModule.completionDate",
        
        # Sponsor and collaborators
        "protocolSection.sponsorCollaboratorsModule.leadSponsor",
        "protocolSection.sponsorCollaboratorsModule.collaborators",
        "protocolSection.sponsorCollaboratorsModule.responsibleParty",
        
        # Design details
        "protocolSection.designModule.studyType",
        "protocolSection.designModule.phases",
        "protocolSection.designModule.designInfo.allocation",
        "protocolSection.designModule.designInfo.interventionModel",
        "protocolSection.designModule.designInfo.interventionModelDescription",
        "protocolSection.designModule.designInfo.primaryPurpose",
        "protocolSection.designModule.designInfo.maskingInfo",
        "protocolSection.designModule.enrollmentInfo",
        "protocolSection.designModule.targetDuration",
        
        # Conditions
        "protocolSection.conditionsModule.conditions",
        "protocolSection.conditionsModule.keywords",
        
        # Eligibility
        "protocolSection.eligibilityModule.sex",
        "protocolSection.eligibilityModule.minimumAge", 
        "protocolSection.eligibilityModule.maximumAge",
        "protocolSection.eligibilityModule.healthyVolunteers",
        "protocolSection.eligibilityModule.eligibilityCriteria",
        "protocolSection.eligibilityModule.stdAges",
        
        # Interventions & arms
        "protocolSection.armsInterventionsModule.armGroups",
        "protocolSection.armsInterventionsModule.interventions",
        
        # Outcomes
        "protocolSection.outcomesModule.primaryOutcomes",
        "protocolSection.outcomesModule.secondaryOutcomes",
        "protocolSection.outcomesModule.otherOutcomes",
        
        # Locations
        "protocolSection.contactsLocationsModule.locations",
        "protocolSection.contactsLocationsModule.overallOfficials",
        
        # Oversight
        "protocolSection.oversightModule.oversightHasDmc",
        "protocolSection.oversightModule.isFdaRegulatedDrug",
        "protocolSection.oversightModule.isFdaRegulatedDevice",
        
        # Results data
        "resultsSection.participantFlowModule",
        "resultsSection.baselineCharacteristicsModule", 
        "resultsSection.outcomeMeasuresModule",
        
        # Results indicator
        "hasResults"
    ]
    
    # Minimal fields to stay within URL limits - exactly as they were working before
    CORE_FIELDS = [
        "protocolSection.identificationModule.nctId",
        "protocolSection.identificationModule.briefTitle",
        "protocolSection.identificationModule.officialTitle",
        "protocolSection.statusModule.overallStatus", 
        "protocolSection.statusModule.whyStopped",
        "protocolSection.designModule.studyType",
        "protocolSection.designModule.phases",
        "protocolSection.conditionsModule.conditions",
        "protocolSection.eligibilityModule.sex",
        "protocolSection.eligibilityModule.minimumAge",
        "protocolSection.eligibilityModule.maximumAge", 
        "protocolSection.eligibilityModule.healthyVolunteers",
        "protocolSection.armsInterventionsModule.interventions",
        "protocolSection.outcomesModule.primaryOutcomes",
        "hasResults"
    ]
    
    # Default to core fields to avoid URL length limits
    REQUIRED_FIELDS = CORE_FIELDS
    
    def __init__(self, config: Optional[APIConfig] = None):
        self.config = config or APIConfig()
        logger.info(f"Initialized ClinicalTrials API client with base URL: {self.config.base_url}")
    
    def _build_request_url(self, 
                          query_filters: Optional[Dict[str, Any]] = None, 
                          page_token: Optional[str] = None) -> str:
        """Build the complete request URL with parameters"""
        params = {
            "pageSize": self.config.page_size,
            "fields": ",".join(self.REQUIRED_FIELDS)
        }
        
        # Add query filters using the correct CT.gov API syntax
        if query_filters:
            query_terms = []
            
            # Intervention type filtering (proven to work from notebook)
            if "intervention_type" in query_filters:
                query_terms.append(f"AREA[InterventionType]{query_filters['intervention_type']}")
            
            # Condition filtering
            if "conditions" in query_filters:
                conditions = query_filters["conditions"]
                if isinstance(conditions, list):
                    for condition in conditions:
                        query_terms.append(f"AREA[Condition]{condition}")
                else:
                    query_terms.append(f"AREA[Condition]{conditions}")
            
            # Overall status filtering - CAN be done at API level using AREA[OverallStatus]
            if "overall_status" in query_filters:
                statuses = query_filters["overall_status"]
                if isinstance(statuses, list):
                    # API doesn't support OR for multiple statuses, pick primary one
                    if "COMPLETED" in statuses:
                        query_terms.append("AREA[OverallStatus]COMPLETED")
                elif isinstance(statuses, str):
                    query_terms.append(f"AREA[OverallStatus]{statuses}")
            
            # hasResults filtering - After extensive testing, the ClinicalTrials.gov API
            # does NOT support hasResults filtering at the query level.
            # Tested syntaxes that don't work:
            # - filter.hasResults=true (returns 400)
            # - AREA[HasResults]TRUE (returns 400) 
            # - hasResults:true (returns 0 results even though studies exist)
            # Therefore, hasResults MUST be filtered in post-processing
            
            # Note: study_type also cannot be filtered at API level
            # and must be done in post-processing
            
            # Combine query terms
            if query_terms:
                params["query.term"] = " AND ".join(query_terms)
        
        # Add pagination token
        if page_token:
            params["pageToken"] = page_token
        
        url = f"{self.config.base_url}?{urllib.parse.urlencode(params)}"
        logger.debug(f"Built request URL: {url[:200]}...")
        return url
    
    def _make_request(self, url: str) -> Dict[str, Any]:
        """Make HTTP request to the API"""
        req = urllib.request.Request(url)
        req.add_header('User-Agent', self.config.user_agent)
        req.add_header('Accept', 'application/json')
        
        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")
                
                data = json.loads(response.read().decode('utf-8'))
                logger.debug(f"Successfully fetched data, studies count: {len(data.get('studies', []))}")
                return data
                
        except urllib.error.URLError as e:
            logger.error(f"URL error for request {url}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for request {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for request {url}: {e}")
            raise
    
    def _filter_studies(self, studies: list, query_filters: Optional[Dict[str, Any]] = None) -> list:
        """Apply post-processing filters to studies"""
        if not query_filters:
            return studies
        
        filtered_studies = []
        
        for study in studies:
            # Filter by hasResults
            if "has_results" in query_filters and query_filters["has_results"]:
                if not study.get("hasResults", False):
                    continue
            
            # Filter by overall status
            if "overall_status" in query_filters:
                protocol_section = study.get("protocolSection", {})
                status_module = protocol_section.get("statusModule", {})
                current_status = status_module.get("overallStatus", "")
                
                target_statuses = query_filters["overall_status"]
                if isinstance(target_statuses, list):
                    if current_status not in target_statuses:
                        continue
                else:
                    if current_status != target_statuses:
                        continue
            
            # Filter by study type
            if "study_type" in query_filters:
                protocol_section = study.get("protocolSection", {})
                design_module = protocol_section.get("designModule", {})
                current_type = design_module.get("studyType", "")
                
                if current_type.upper() != query_filters["study_type"].upper():
                    continue
            
            filtered_studies.append(study)
        
        return filtered_studies
    
    def fetch_studies_batch(self, 
                           query_filters: Optional[Dict[str, Any]] = None,
                           page_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch a single batch of studies"""
        url = self._build_request_url(query_filters, page_token)
        
        try:
            data = self._make_request(url)
            
            studies = data.get('studies', [])
            
            # Apply post-processing filters
            if query_filters:
                studies = self._filter_studies(studies, query_filters)
            
            next_token = data.get('nextPageToken')
            total_count = data.get('totalCount', 0)
            
            logger.info(f"Fetched batch: {len(studies)} studies after filtering, next_token: {bool(next_token)}")
            
            return {
                'studies': studies,
                'next_page_token': next_token,
                'total_count': total_count,
                'has_more': bool(next_token)
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch studies batch: {e}")
            raise
    
    def fetch_studies_stream(self, 
                            query_filters: Optional[Dict[str, Any]] = None,
                            max_pages: Optional[int] = None) -> Generator[Dict[str, Any], None, None]:
        """Stream studies from the API with pagination"""
        max_pages = max_pages or self.config.max_pages
        page_count = 0
        next_token = None
        total_fetched = 0
        
        logger.info(f"Starting study stream with filters: {query_filters}")
        
        while page_count < max_pages:
            try:
                batch = self.fetch_studies_batch(query_filters, next_token)
                studies = batch['studies']
                
                if not studies:
                    logger.info("No more studies to fetch")
                    break
                
                for study in studies:
                    yield study
                    total_fetched += 1
                
                page_count += 1
                next_token = batch['next_page_token']
                
                logger.info(f"Completed page {page_count}, total studies: {total_fetched}")
                
                if not batch['has_more']:
                    logger.info("Reached end of results")
                    break
                
                # Rate limiting
                if self.config.sleep_between_requests > 0:
                    time.sleep(self.config.sleep_between_requests)
                    
            except Exception as e:
                logger.error(f"Error fetching page {page_count}: {e}")
                break
        
        logger.info(f"Stream completed: {total_fetched} studies fetched across {page_count} pages")
    
    def fetch_study_by_nct_id(self, nct_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific study by NCT ID"""
        try:
            # Use the query.id parameter to fetch specific study by NCT ID
            params = {
                "pageSize": 1,
                "fields": ",".join(self.REQUIRED_FIELDS),
                "query.id": nct_id
            }
            url = f"{self.config.base_url}?{urllib.parse.urlencode(params)}"
            data = self._make_request(url)
            
            studies = data.get('studies', [])
            if studies:
                logger.info(f"Found study {nct_id}")
                return studies[0]
            
            logger.warning(f"Study {nct_id} not found")
            return None
                
        except Exception as e:
            logger.error(f"Failed to fetch study {nct_id}: {e}")
            return None
    
    
    def test_connection(self) -> bool:
        """Test API connection with a minimal request"""
        try:
            # Simple test with minimal fields
            logger.info("Testing API connection...")
            
            test_url = f"{self.config.base_url}?pageSize=1&fields=protocolSection.identificationModule.nctId,protocolSection.identificationModule.briefTitle,hasResults"
            
            data = self._make_request(test_url)
            
            if data.get('studies'):
                logger.info("✅ API connection test successful")
                return True
            else:
                logger.warning("⚠️ API connection successful but no studies returned")
                return False
                
        except Exception as e:
            logger.error(f"❌ API connection test failed: {e}")
            return False


def create_default_filters_for_prediction_market() -> Dict[str, Any]:
    """Create default query filters optimized for prediction market data collection"""
    return {
        "has_results": True,  # Only studies with posted results
        "overall_status": [   # Focus on completed studies
            "COMPLETED"
        ],
        "study_type": "INTERVENTIONAL"  # Only interventional studies
    }