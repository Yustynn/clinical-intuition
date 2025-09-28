"""
Tests for the working field mapping functionality.
"""
import pytest
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ingestion.processing.field_mapper import ClinicalTrialsFieldMapper, RawStudyData
from models.core import Study, StudyStatus, Intervention, PrimaryOutcome


class TestWorkingFieldMapper:
    """Test the field mapping functionality that's currently working"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.field_mapper = ClinicalTrialsFieldMapper()
    
    def test_field_mapper_initialization(self):
        """Test field mapper can be created"""
        mapper = ClinicalTrialsFieldMapper()
        assert mapper is not None
    
    def test_map_to_study_object_working(self):
        """Test the working map_to_study_object method"""
        # Create a working raw study data structure based on real API response
        raw_study_data = RawStudyData(
            nct_id="NCT12345678",
            protocol_section={
                "identificationModule": {
                    "nctId": "NCT12345678",
                    "briefTitle": "Test Behavioral Intervention Study",
                    "officialTitle": "A Test Study for Behavioral Interventions"
                },
                "statusModule": {
                    "overallStatus": "COMPLETED"
                },
                "designModule": {
                    "studyType": "INTERVENTIONAL"
                },
                "conditionsModule": {
                    "conditions": ["Depression", "Anxiety"]
                },
                "armsInterventionsModule": {
                    "interventions": [
                        {
                            "name": "Cognitive Behavioral Therapy",
                            "type": "BEHAVIORAL",
                            "description": "CBT intervention"
                        }
                    ]
                },
                "outcomesModule": {
                    "primaryOutcomes": [
                        {
                            "measure": "Depression Score",
                            "timeFrame": "8 weeks",
                            "description": "Primary depression outcome"
                        }
                    ]
                }
            },
            results_section={},
            derived_section=None,
            has_results=True
        )
        
        # Test that we can map to study object
        study = self.field_mapper.map_to_study_object(raw_study_data)
        
        # Basic assertions
        assert isinstance(study, Study)
        assert study.nct_id == "NCT12345678"
        assert study.brief_title == "Test Behavioral Intervention Study"
        assert study.has_results == True
        assert study.overall_status == StudyStatus.COMPLETED
        assert study.study_type == "INTERVENTIONAL"
        assert len(study.conditions) == 2
        assert "Depression" in study.conditions
        assert "Anxiety" in study.conditions
    
    def test_map_to_study_object_minimal(self):
        """Test mapping with minimal data"""
        raw_study_data = RawStudyData(
            nct_id="NCT00000001",
            protocol_section={
                "identificationModule": {
                    "nctId": "NCT00000001",
                    "briefTitle": "Minimal Study"
                }
            },
            results_section=None,
            derived_section=None,
            has_results=False
        )
        
        study = self.field_mapper.map_to_study_object(raw_study_data)
        
        assert isinstance(study, Study)
        assert study.nct_id == "NCT00000001"
        assert study.brief_title == "Minimal Study"
        assert study.has_results == False
    
    def test_handles_missing_sections_gracefully(self):
        """Test that missing sections don't crash the mapper"""
        raw_study_data = RawStudyData(
            nct_id="NCT00000002",
            protocol_section={
                "identificationModule": {
                    "nctId": "NCT00000002",
                    "briefTitle": "Study with Missing Sections"
                }
                # Missing other sections
            },
            results_section=None,
            derived_section=None,
            has_results=False
        )
        
        # Should not raise an exception
        study = self.field_mapper.map_to_study_object(raw_study_data)
        assert study.nct_id == "NCT00000002"