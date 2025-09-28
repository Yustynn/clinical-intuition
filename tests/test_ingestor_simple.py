"""
Focused tests for the ingestor components that work with existing models.
"""
import pytest
from unittest.mock import Mock, patch
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ingestion.api.client import ClinicalTrialsAPIClient, APIConfig
from ingestion.orchestrator import ClinicalTrialIngestor, IngestionConfig, IngestionStats
from storage.json_store import JSONStore


class TestAPIClientCore:
    """Test core API client functionality"""
    
    def test_api_config_initialization(self):
        """Test API configuration setup"""
        config = APIConfig(page_size=100, max_pages=5)
        client = ClinicalTrialsAPIClient(config)
        
        assert client.config.page_size == 100
        assert client.config.max_pages == 5
        
    def test_build_behavioral_filter_url(self):
        """Test building URL with behavioral intervention filter"""
        client = ClinicalTrialsAPIClient()
        filters = {"intervention_type": "BEHAVIORAL"}
        url = client._build_request_url(query_filters=filters)
        
        assert "AREA%5BInterventionType%5DBEHAVIORAL" in url
        assert "pageSize=" in url
        
    def test_post_processing_filters(self):
        """Test post-processing filtering functionality"""
        client = ClinicalTrialsAPIClient()
        
        studies = [
            {"hasResults": True, "protocolSection": {}},
            {"hasResults": False, "protocolSection": {}},
            {"hasResults": True, "protocolSection": {}}
        ]
        
        filters = {"has_results": True}
        filtered = client._filter_studies(studies, filters)
        
        assert len(filtered) == 2
        assert all(s["hasResults"] for s in filtered)


class TestIngestionConfig:
    """Test ingestion configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = IngestionConfig()
        
        assert config.max_studies_per_run == 5000
        assert config.filter_has_results_only == True
        assert config.filter_completed_only == True
        assert config.save_raw_data == True
        
    def test_custom_config(self):
        """Test custom configuration"""
        config = IngestionConfig(
            max_studies_per_run=100,
            filter_has_results_only=False
        )
        
        assert config.max_studies_per_run == 100
        assert config.filter_has_results_only == False


class TestIngestionStats:
    """Test ingestion statistics"""
    
    def test_stats_initialization(self):
        """Test stats initialization and calculations"""
        stats = IngestionStats()
        
        assert stats.total_fetched == 0
        assert stats.successfully_processed == 0
        assert stats.success_rate == 0.0
        
    def test_success_rate_calculation(self):
        """Test success rate calculation"""
        stats = IngestionStats()
        stats.total_fetched = 100
        stats.successfully_processed = 25
        
        assert stats.success_rate == 0.25


class TestIngestorFiltering:
    """Test the ingestor filtering logic"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_store = Mock(spec=JSONStore)
        self.config = IngestionConfig(save_raw_data=False)
        self.ingestor = ClinicalTrialIngestor(self.mock_store, None, self.config)
        
    def test_should_process_study_with_results(self):
        """Test filtering for studies with results"""
        valid_study = {
            "hasResults": True,
            "protocolSection": {
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test"}]},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test"}]}
            }
        }
        
        should_process, reason = self.ingestor.should_process_study(valid_study)
        assert should_process == True
        assert reason == ""
        
    def test_should_process_study_no_results(self):
        """Test filtering rejects studies without results"""
        study_no_results = {
            "hasResults": False,
            "protocolSection": {
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test"}]},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test"}]}
            }
        }
        
        should_process, reason = self.ingestor.should_process_study(study_no_results)
        assert should_process == False
        assert "No results posted" in reason
        
    def test_should_process_study_not_interventional(self):
        """Test filtering rejects non-interventional studies"""
        observational_study = {
            "hasResults": True,
            "protocolSection": {
                "designModule": {"studyType": "OBSERVATIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test"}]},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test"}]}
            }
        }
        
        should_process, reason = self.ingestor.should_process_study(observational_study)
        assert should_process == False
        assert "Not interventional study" in reason
        
    def test_should_process_study_no_interventions(self):
        """Test filtering rejects studies without interventions"""
        no_interventions = {
            "hasResults": True,
            "protocolSection": {
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": []},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test"}]}
            }
        }
        
        should_process, reason = self.ingestor.should_process_study(no_interventions)
        assert should_process == False
        assert "No interventions defined" in reason
        
    def test_should_process_study_no_outcomes(self):
        """Test filtering rejects studies without primary outcomes"""
        no_outcomes = {
            "hasResults": True,
            "protocolSection": {
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test"}]},
                "outcomesModule": {"primaryOutcomes": []}
            }
        }
        
        should_process, reason = self.ingestor.should_process_study(no_outcomes)
        assert should_process == False
        assert "No primary outcomes defined" in reason
        
    def test_build_behavioral_query_filters(self):
        """Test building query filters for behavioral interventions"""
        filters = self.ingestor.build_query_filters()
        
        assert "intervention_type" in filters
        assert filters["intervention_type"] == "BEHAVIORAL"
        
    def test_build_custom_query_filters(self):
        """Test building query filters with custom options"""
        custom_filters = {"conditions": ["Depression"]}
        filters = self.ingestor.build_query_filters(custom_filters)
        
        assert "intervention_type" in filters  # Should keep default
        assert "conditions" in filters  # Should add custom
        assert filters["conditions"] == ["Depression"]


class TestIngestorIntegration:
    """Integration test for ingestor with mocked dependencies"""
    
    @patch('ingestion.orchestrator.ClinicalTrialIngestor.test_connection')
    @patch('ingestion.api.client.ClinicalTrialsAPIClient.fetch_studies_stream')
    def test_ingest_studies_pipeline(self, mock_fetch_stream, mock_test_connection):
        """Test the complete ingestion pipeline with mocks"""
        # Setup mocks
        mock_test_connection.return_value = True
        
        # Mock study data that should pass filtering
        valid_study = {
            "hasResults": True,
            "protocolSection": {
                "identificationModule": {"nctId": "NCT12345678", "briefTitle": "Test Study"},
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test Intervention", "type": "BEHAVIORAL"}]},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test Outcome", "timeFrame": "8 weeks"}]},
                "conditionsModule": {"conditions": ["Depression"]}
            }
        }
        
        # Mock study data that should be filtered out
        invalid_study = {
            "hasResults": False,  # This should cause filtering failure
            "protocolSection": {
                "identificationModule": {"nctId": "NCT87654321", "briefTitle": "Invalid Study"},
                "designModule": {"studyType": "INTERVENTIONAL"},
                "statusModule": {"overallStatus": "COMPLETED"},
                "armsInterventionsModule": {"interventions": [{"name": "Test"}]},
                "outcomesModule": {"primaryOutcomes": [{"measure": "Test"}]}
            }
        }
        
        mock_fetch_stream.return_value = iter([valid_study, invalid_study])
        
        # Setup ingestor
        mock_store = Mock(spec=JSONStore)
        mock_store.get_study.return_value = None  # No existing studies
        mock_store.save_study.return_value = "test_id"
        mock_store.get_stats.return_value = {"studies": 1}
        
        config = IngestionConfig(max_studies_per_run=2, save_raw_data=False)
        ingestor = ClinicalTrialIngestor(mock_store, None, config)
        
        # Run ingestion
        stats = ingestor.ingest_studies()
        
        # Verify results
        assert stats.total_fetched == 2
        assert stats.successfully_processed == 1  # Only valid study should pass
        assert stats.failed_processing == 1  # Invalid study should be filtered
        
        # Verify store was called for the valid study
        mock_store.save_study.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])