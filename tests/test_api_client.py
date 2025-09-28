"""
Tests specifically for the API client functionality.
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import urllib.parse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ingestion.api.client import ClinicalTrialsAPIClient, APIConfig


class TestClinicalTrialsAPIClient:
    """Detailed tests for the ClinicalTrials.gov API client"""
    
    def setup_method(self):
        """Set up test fixtures before each test"""
        self.config = APIConfig(
            page_size=50,
            max_pages=2,
            timeout=15
        )
        self.client = ClinicalTrialsAPIClient(self.config)
        
    def test_initialization_with_config(self):
        """Test client initialization with custom config"""
        assert self.client.config.page_size == 50
        assert self.client.config.max_pages == 2
        assert self.client.config.timeout == 15
        
    def test_initialization_without_config(self):
        """Test client initialization with default config"""
        client = ClinicalTrialsAPIClient()
        assert client.config.page_size == 1000
        assert client.config.max_pages == 50
        assert client.config.timeout == 30
        
    def test_comprehensive_fields_included(self):
        """Test that comprehensive fields include all necessary data"""
        fields = self.client.COMPREHENSIVE_FIELDS
        
        # Check identification fields
        assert "protocolSection.identificationModule.nctId" in fields
        assert "protocolSection.identificationModule.briefTitle" in fields
        
        # Check status fields  
        assert "protocolSection.statusModule.overallStatus" in fields
        
        # Check design fields
        assert "protocolSection.designModule.studyType" in fields
        
        # Check intervention fields
        assert "protocolSection.armsInterventionsModule.interventions" in fields
        
        # Check outcome fields
        assert "protocolSection.outcomesModule.primaryOutcomes" in fields
        assert "protocolSection.outcomesModule.secondaryOutcomes" in fields
        
        # Check results fields
        assert "resultsSection.participantFlowModule" in fields
        assert "hasResults" in fields
        
    def test_build_request_url_no_filters(self):
        """Test URL building without any filters"""
        url = self.client._build_request_url()
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        assert parsed.scheme == "https"
        assert parsed.netloc == "clinicaltrials.gov"
        assert "pageSize" in params
        assert params["pageSize"][0] == "50"
        assert "fields" in params
        
    def test_build_request_url_behavioral_filter(self):
        """Test URL building with behavioral intervention filter"""
        filters = {"intervention_type": "BEHAVIORAL"}
        url = self.client._build_request_url(query_filters=filters)
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        assert "query.term" in params
        query_term = params["query.term"][0]
        assert "AREA[InterventionType]BEHAVIORAL" in query_term
        
    def test_build_request_url_multiple_conditions(self):
        """Test URL building with multiple condition filters"""
        filters = {"conditions": ["Depression", "Anxiety", "PTSD"]}
        url = self.client._build_request_url(query_filters=filters)
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        query_term = params["query.term"][0]
        assert "AREA[Condition]Depression" in query_term
        assert "AREA[Condition]Anxiety" in query_term
        assert "AREA[Condition]PTSD" in query_term
        assert " AND " in query_term
        
    def test_build_request_url_single_condition(self):
        """Test URL building with single condition filter"""
        filters = {"conditions": "Depression"}
        url = self.client._build_request_url(query_filters=filters)
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        query_term = params["query.term"][0]
        assert "AREA[Condition]Depression" in query_term
        
    def test_build_request_url_combined_filters(self):
        """Test URL building with multiple filter types"""
        filters = {
            "intervention_type": "BEHAVIORAL",
            "conditions": ["Depression", "Anxiety"]
        }
        url = self.client._build_request_url(query_filters=filters)
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        query_term = params["query.term"][0]
        assert "AREA[InterventionType]BEHAVIORAL" in query_term
        assert "AREA[Condition]Depression" in query_term
        assert "AREA[Condition]Anxiety" in query_term
        assert query_term.count(" AND ") == 2  # Should have 2 AND operators
        
    def test_build_request_url_with_pagination(self):
        """Test URL building with pagination token"""
        url = self.client._build_request_url(page_token="test_pagination_token")
        
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        assert "pageToken" in params
        assert params["pageToken"][0] == "test_pagination_token"
        
    @patch('urllib.request.urlopen')
    def test_make_request_success(self, mock_urlopen):
        """Test successful HTTP request"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "studies": [
                {"hasResults": True, "protocolSection": {"identificationModule": {"nctId": "NCT12345678"}}}
            ],
            "totalCount": 1,
            "nextPageToken": "next_token"
        }).encode('utf-8')
        
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.client._make_request("https://test.com")
        
        assert "studies" in result
        assert len(result["studies"]) == 1
        assert result["totalCount"] == 1
        assert result["nextPageToken"] == "next_token"
        
    @patch('urllib.request.urlopen')
    def test_make_request_http_error(self, mock_urlopen):
        """Test HTTP error handling"""
        mock_response = Mock()
        mock_response.status = 400
        mock_response.reason = "Bad Request"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with pytest.raises(Exception, match="HTTP 400: Bad Request"):
            self.client._make_request("https://test.com")
            
    @patch('urllib.request.urlopen')
    def test_make_request_json_error(self, mock_urlopen):
        """Test JSON decode error handling"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = b"invalid json"
        
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        with pytest.raises(json.JSONDecodeError):
            self.client._make_request("https://test.com")
            
    @patch('urllib.request.urlopen')
    def test_make_request_network_error(self, mock_urlopen):
        """Test network error handling"""
        mock_urlopen.side_effect = urllib.error.URLError("Network error")
        
        with pytest.raises(urllib.error.URLError):
            self.client._make_request("https://test.com")
            
    def test_filter_studies_has_results_true(self):
        """Test filtering studies with hasResults=True"""
        studies = [
            {"hasResults": True, "protocolSection": {}},
            {"hasResults": False, "protocolSection": {}},
            {"hasResults": True, "protocolSection": {}},
            {"protocolSection": {}}  # Missing hasResults field
        ]
        
        filters = {"has_results": True}
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 2
        assert all(study.get("hasResults", False) for study in filtered)
        
    def test_filter_studies_has_results_false(self):
        """Test filtering allows studies without hasResults when not required"""
        studies = [
            {"hasResults": True, "protocolSection": {}},
            {"hasResults": False, "protocolSection": {}},
            {"protocolSection": {}}  # Missing hasResults field
        ]
        
        filters = {}  # No hasResults filter
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 3  # All studies should pass
        
    def test_filter_studies_overall_status_single(self):
        """Test filtering by single overall status"""
        studies = [
            {"protocolSection": {"statusModule": {"overallStatus": "COMPLETED"}}},
            {"protocolSection": {"statusModule": {"overallStatus": "RECRUITING"}}},
            {"protocolSection": {"statusModule": {"overallStatus": "COMPLETED"}}},
            {"protocolSection": {"statusModule": {}}}  # Missing status
        ]
        
        filters = {"overall_status": "COMPLETED"}
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 2
        
    def test_filter_studies_overall_status_multiple(self):
        """Test filtering by multiple overall statuses"""
        studies = [
            {"protocolSection": {"statusModule": {"overallStatus": "COMPLETED"}}},
            {"protocolSection": {"statusModule": {"overallStatus": "RECRUITING"}}},
            {"protocolSection": {"statusModule": {"overallStatus": "ACTIVE_NOT_RECRUITING"}}},
            {"protocolSection": {"statusModule": {"overallStatus": "WITHDRAWN"}}}
        ]
        
        filters = {"overall_status": ["COMPLETED", "ACTIVE_NOT_RECRUITING"]}
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 2
        
    def test_filter_studies_study_type(self):
        """Test filtering by study type"""
        studies = [
            {"protocolSection": {"designModule": {"studyType": "INTERVENTIONAL"}}},
            {"protocolSection": {"designModule": {"studyType": "OBSERVATIONAL"}}},
            {"protocolSection": {"designModule": {"studyType": "interventional"}}},  # lowercase
            {"protocolSection": {"designModule": {}}}  # Missing study type
        ]
        
        filters = {"study_type": "INTERVENTIONAL"}
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 2  # Case insensitive matching
        
    def test_filter_studies_combined_filters(self):
        """Test filtering with multiple criteria"""
        studies = [
            {
                "hasResults": True,
                "protocolSection": {
                    "statusModule": {"overallStatus": "COMPLETED"},
                    "designModule": {"studyType": "INTERVENTIONAL"}
                }
            },
            {
                "hasResults": False,  # Should be filtered out
                "protocolSection": {
                    "statusModule": {"overallStatus": "COMPLETED"},
                    "designModule": {"studyType": "INTERVENTIONAL"}
                }
            },
            {
                "hasResults": True,
                "protocolSection": {
                    "statusModule": {"overallStatus": "RECRUITING"},  # Should be filtered out
                    "designModule": {"studyType": "INTERVENTIONAL"}
                }
            },
            {
                "hasResults": True,
                "protocolSection": {
                    "statusModule": {"overallStatus": "COMPLETED"},
                    "designModule": {"studyType": "OBSERVATIONAL"}  # Should be filtered out
                }
            }
        ]
        
        filters = {
            "has_results": True,
            "overall_status": ["COMPLETED"],
            "study_type": "INTERVENTIONAL"
        }
        filtered = self.client._filter_studies(studies, filters)
        
        assert len(filtered) == 1  # Only first study should pass all filters
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_fetch_studies_batch(self, mock_make_request):
        """Test fetching a single batch of studies"""
        mock_response = {
            "studies": [
                {"hasResults": True, "protocolSection": {}},
                {"hasResults": False, "protocolSection": {}}
            ],
            "totalCount": 1000,
            "nextPageToken": "test_token"
        }
        mock_make_request.return_value = mock_response
        
        result = self.client.fetch_studies_batch()
        
        assert "studies" in result
        assert result["total_count"] == 1000
        assert result["next_page_token"] == "test_token"
        assert result["has_more"] == True
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_fetch_studies_batch_with_filters(self, mock_make_request):
        """Test fetching batch with post-processing filters"""
        mock_response = {
            "studies": [
                {"hasResults": True, "protocolSection": {}},
                {"hasResults": False, "protocolSection": {}},
                {"hasResults": True, "protocolSection": {}}
            ],
            "totalCount": 3
        }
        mock_make_request.return_value = mock_response
        
        filters = {"has_results": True}
        result = self.client.fetch_studies_batch(query_filters=filters)
        
        # Should filter to only studies with results
        assert len(result["studies"]) == 2
        assert all(s["hasResults"] for s in result["studies"])
        
    @patch.object(ClinicalTrialsAPIClient, 'fetch_studies_batch')
    def test_fetch_studies_stream(self, mock_fetch_batch):
        """Test streaming studies with pagination"""
        # Mock two pages of results
        mock_fetch_batch.side_effect = [
            {
                "studies": [{"id": 1}, {"id": 2}],
                "next_page_token": "page2",
                "has_more": True
            },
            {
                "studies": [{"id": 3}, {"id": 4}],
                "next_page_token": None,
                "has_more": False
            }
        ]
        
        studies = list(self.client.fetch_studies_stream(max_pages=2))
        
        assert len(studies) == 4
        assert studies[0]["id"] == 1
        assert studies[3]["id"] == 4
        assert mock_fetch_batch.call_count == 2
        
    @patch.object(ClinicalTrialsAPIClient, 'fetch_studies_batch')
    def test_fetch_studies_stream_max_pages_limit(self, mock_fetch_batch):
        """Test stream respects max_pages limit"""
        mock_fetch_batch.return_value = {
            "studies": [{"id": 1}, {"id": 2}],
            "next_page_token": "next",
            "has_more": True
        }
        
        studies = list(self.client.fetch_studies_stream(max_pages=1))
        
        assert len(studies) == 2
        assert mock_fetch_batch.call_count == 1
        
    @patch.object(ClinicalTrialsAPIClient, 'fetch_studies_batch')
    def test_fetch_studies_stream_empty_batch(self, mock_fetch_batch):
        """Test stream handles empty batches correctly"""
        mock_fetch_batch.return_value = {
            "studies": [],
            "next_page_token": None,
            "has_more": False
        }
        
        studies = list(self.client.fetch_studies_stream())
        
        assert len(studies) == 0
        assert mock_fetch_batch.call_count == 1
        
    @patch.object(ClinicalTrialsAPIClient, 'fetch_studies_batch')
    def test_fetch_studies_stream_error_handling(self, mock_fetch_batch):
        """Test stream handles errors gracefully"""
        mock_fetch_batch.side_effect = Exception("API Error")
        
        studies = list(self.client.fetch_studies_stream())
        
        assert len(studies) == 0  # Should return empty iterator on error
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_fetch_study_by_nct_id(self, mock_make_request):
        """Test fetching specific study by NCT ID"""
        mock_response = {
            "studies": [
                {
                    "protocolSection": {
                        "identificationModule": {"nctId": "NCT12345678"}
                    }
                }
            ]
        }
        mock_make_request.return_value = mock_response
        
        study = self.client.fetch_study_by_nct_id("NCT12345678")
        
        assert study is not None
        assert study["protocolSection"]["identificationModule"]["nctId"] == "NCT12345678"
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_fetch_study_by_nct_id_not_found(self, mock_make_request):
        """Test fetching non-existent study"""
        mock_response = {"studies": []}
        mock_make_request.return_value = mock_response
        
        study = self.client.fetch_study_by_nct_id("NCT00000000")
        
        assert study is None
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_fetch_study_by_nct_id_error(self, mock_make_request):
        """Test error handling in single study fetch"""
        mock_make_request.side_effect = Exception("API Error")
        
        study = self.client.fetch_study_by_nct_id("NCT12345678")
        
        assert study is None
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_test_connection_success(self, mock_make_request):
        """Test successful connection test"""
        mock_response = {
            "studies": [{"protocolSection": {"identificationModule": {"nctId": "NCT12345678"}}}]
        }
        mock_make_request.return_value = mock_response
        
        result = self.client.test_connection()
        
        assert result == True
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_test_connection_no_studies(self, mock_make_request):
        """Test connection test with no studies returned"""
        mock_response = {"studies": []}
        mock_make_request.return_value = mock_response
        
        result = self.client.test_connection()
        
        assert result == False
        
    @patch.object(ClinicalTrialsAPIClient, '_make_request')
    def test_test_connection_error(self, mock_make_request):
        """Test connection test with error"""
        mock_make_request.side_effect = Exception("Connection failed")
        
        result = self.client.test_connection()
        
        assert result == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])