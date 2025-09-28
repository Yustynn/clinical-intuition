"""
Tests for JSON storage functionality.
"""
import pytest
import json
from datetime import datetime
from pathlib import Path

from storage.json_store import JSONStore, JSONEncoder
from models.core import (
    Study, StudyStatus, Endpoint, DirectionNorm, 
    ResultNorm, SuccessLabel, ConfidenceLevel,
    Card, Play, StatisticalAnalysis
)


class TestJSONEncoder:
    """Test custom JSON encoder"""
    
    def test_encode_datetime(self):
        """Test encoding datetime objects"""
        encoder = JSONEncoder()
        dt = datetime(2023, 1, 15, 10, 30, 45)
        
        result = encoder.default(dt)
        assert result == "2023-01-15T10:30:45"
        
    def test_encode_enum(self):
        """Test encoding enum objects"""
        encoder = JSONEncoder()
        
        status_result = encoder.default(StudyStatus.COMPLETED)
        direction_result = encoder.default(DirectionNorm.IMPROVE)
        
        assert status_result == "COMPLETED"
        assert direction_result == "improve"
        
    def test_encode_dataclass(self):
        """Test encoding dataclass objects"""
        encoder = JSONEncoder()
        study = Study(nct_id="NCT123", brief_title="Test Study")
        
        result = encoder.default(study)
        
        assert isinstance(result, dict)
        assert result["nct_id"] == "NCT123"
        assert result["brief_title"] == "Test Study"
        
    def test_encode_regular_dict(self):
        """Test encoding regular dictionary"""
        encoder = JSONEncoder()
        regular_dict = {"key": "value", "number": 42}
        
        # Regular dicts should raise TypeError in default()
        with pytest.raises(TypeError):
            encoder.default(regular_dict)


class TestJSONStore:
    """Test JSON storage operations"""
    
    def test_json_store_initialization(self, temp_dir):
        """Test JSON store initialization"""
        store = JSONStore(temp_dir)
        
        assert store.data_dir == temp_dir
        assert store.studies_dir.exists()
        assert store.endpoints_dir.exists()
        assert store.results_dir.exists()
        assert store.cards_dir.exists()
        assert store.plays_dir.exists()
        
    def test_generate_id(self, json_store):
        """Test ID generation"""
        id1 = json_store._generate_id()
        id2 = json_store._generate_id()
        
        assert isinstance(id1, str)
        assert isinstance(id2, str)
        assert id1 != id2
        assert len(id1) == 36  # UUID4 length
        
    def test_get_file_path(self, json_store):
        """Test file path generation"""
        study_path = json_store._get_file_path("study", "NCT123")
        endpoint_path = json_store._get_file_path("endpoint", "ep_456")
        
        assert study_path == json_store.studies_dir / "NCT123.json"
        assert endpoint_path == json_store.endpoints_dir / "ep_456.json"


class TestStudyOperations:
    """Test study storage operations"""
    
    def test_save_and_get_study(self, json_store, sample_study_data):
        """Test saving and retrieving a study"""
        study = Study(**sample_study_data)
        
        # Save study
        study_id = json_store.save_study(study)
        assert study_id == study.nct_id
        
        # Retrieve study
        retrieved_study = json_store.get_study(study_id)
        
        assert retrieved_study is not None
        assert retrieved_study.nct_id == study.nct_id
        assert retrieved_study.brief_title == study.brief_title
        assert retrieved_study.conditions == study.conditions
        assert retrieved_study.has_results == study.has_results
        
    def test_get_nonexistent_study(self, json_store):
        """Test retrieving non-existent study"""
        result = json_store.get_study("NCT_NONEXISTENT")
        assert result is None
        
    def test_study_timestamps(self, json_store):
        """Test study timestamp handling"""
        study = Study(nct_id="NCT123", brief_title="Test Study")
        
        # Initially no timestamps
        assert study.created_at is None
        assert study.updated_at is None
        
        # Save study
        json_store.save_study(study)
        
        # Retrieve and check timestamps were added
        retrieved_study = json_store.get_study("NCT123")
        assert retrieved_study.created_at is not None
        assert retrieved_study.updated_at is not None
        assert isinstance(retrieved_study.created_at, datetime)
        assert isinstance(retrieved_study.updated_at, datetime)
        
    def test_list_studies(self, json_store):
        """Test listing all study IDs"""
        # Initially empty
        studies = json_store.list_studies()
        assert studies == []
        
        # Add some studies
        study1 = Study(nct_id="NCT111", brief_title="Study 1")
        study2 = Study(nct_id="NCT222", brief_title="Study 2")
        
        json_store.save_study(study1)
        json_store.save_study(study2)
        
        # Check list
        studies = json_store.list_studies()
        assert len(studies) == 2
        assert "NCT111" in studies
        assert "NCT222" in studies


class TestEndpointOperations:
    """Test endpoint storage operations"""
    
    def test_save_and_get_endpoint(self, json_store, sample_endpoint_data):
        """Test saving and retrieving an endpoint"""
        endpoint = Endpoint(**sample_endpoint_data)
        
        # Save endpoint
        endpoint_id = json_store.save_endpoint(endpoint)
        assert endpoint.id == endpoint_id
        
        # Retrieve endpoint
        retrieved_endpoint = json_store.get_endpoint(endpoint_id)
        
        assert retrieved_endpoint is not None
        assert retrieved_endpoint.id == endpoint_id
        assert retrieved_endpoint.nct_id == endpoint.nct_id
        assert retrieved_endpoint.measure == endpoint.measure
        assert retrieved_endpoint.timeframe == endpoint.timeframe
        
    def test_endpoint_id_generation(self, json_store):
        """Test automatic endpoint ID generation"""
        endpoint = Endpoint(nct_id="NCT123", measure="Test Measure")
        
        # ID should be None initially
        assert endpoint.id is None
        
        # Save endpoint
        endpoint_id = json_store.save_endpoint(endpoint)
        
        # ID should be generated
        assert endpoint_id is not None
        assert endpoint.id == endpoint_id
        
    def test_list_endpoints_for_study(self, json_store):
        """Test listing endpoints for a specific study"""
        # Create endpoints for different studies
        endpoint1 = Endpoint(nct_id="NCT123", measure="Measure 1")
        endpoint2 = Endpoint(nct_id="NCT123", measure="Measure 2")
        endpoint3 = Endpoint(nct_id="NCT456", measure="Measure 3")
        
        json_store.save_endpoint(endpoint1)
        json_store.save_endpoint(endpoint2)
        json_store.save_endpoint(endpoint3)
        
        # List endpoints for NCT123
        endpoints_123 = json_store.list_endpoints_for_study("NCT123")
        assert len(endpoints_123) == 2
        
        measures = [ep.measure for ep in endpoints_123]
        assert "Measure 1" in measures
        assert "Measure 2" in measures
        
        # List endpoints for NCT456
        endpoints_456 = json_store.list_endpoints_for_study("NCT456")
        assert len(endpoints_456) == 1
        assert endpoints_456[0].measure == "Measure 3"


class TestResultOperations:
    """Test result storage operations"""
    
    def test_save_and_get_result(self, json_store):
        """Test saving and retrieving a result"""
        analysis = StatisticalAnalysis(
            param_type="Mean Difference",
            param_value=5.2,
            p_value=0.03
        )
        
        result = ResultNorm(
            endpoint_id="ep_123",
            analysis=analysis,
            success_label=SuccessLabel.YES,
            confidence=ConfidenceLevel.HIGH,
            rationale_snippet="Significant improvement"
        )
        
        # Save result
        result_id = json_store.save_result(result)
        assert result_id == "result_ep_123"
        
        # Retrieve result
        retrieved_result = json_store.get_result("ep_123")
        
        assert retrieved_result is not None
        assert retrieved_result.endpoint_id == "ep_123"
        assert retrieved_result.analysis.param_value == 5.2
        assert retrieved_result.success_label == SuccessLabel.YES
        assert retrieved_result.confidence == ConfidenceLevel.HIGH


class TestCardOperations:
    """Test card storage operations"""
    
    def test_save_and_get_card(self, json_store, sample_card_data):
        """Test saving and retrieving a card"""
        card = Card(**sample_card_data)
        
        # Save card
        card_id = json_store.save_card(card)
        assert card.id == card_id
        
        # Retrieve card
        retrieved_card = json_store.get_card(card_id)
        
        assert retrieved_card is not None
        assert retrieved_card.id == card_id
        assert retrieved_card.endpoint_id == card.endpoint_id
        assert retrieved_card.question_text == card.question_text
        assert retrieved_card.answer == card.answer
        
    def test_list_cards(self, json_store):
        """Test listing cards"""
        # Initially empty
        cards = json_store.list_cards()
        assert cards == []
        
        # Add some cards
        card1 = Card(endpoint_id="ep1", question_text="Question 1?", answer=True)
        card2 = Card(endpoint_id="ep2", question_text="Question 2?", answer=False)
        card3 = Card(endpoint_id="ep3", question_text="Question 3?", answer=None)
        
        json_store.save_card(card1)
        json_store.save_card(card2)
        json_store.save_card(card3)
        
        # List all cards
        all_cards = json_store.list_cards()
        assert len(all_cards) == 3
        
        # List with limit
        limited_cards = json_store.list_cards(limit=2)
        assert len(limited_cards) == 2
        
        # Cards should be sorted by creation time (newest first)
        questions = [card.question_text for card in limited_cards]
        # Should have 2 cards as requested
        assert len(questions) == 2
        # Should include cards from the ones we created
        for question in questions:
            assert question in ["Question 1?", "Question 2?", "Question 3?"]


class TestPlayOperations:
    """Test play storage operations"""
    
    def test_save_and_get_play(self, json_store):
        """Test saving and retrieving a play"""
        play = Play(
            user_id="user_123",
            card_id="card_456",
            guess=True,
            correct=True,
            response_time_ms=2500
        )
        
        # Save play
        play_id = json_store.save_play(play)
        assert play.id == play_id
        
        # Retrieve play
        retrieved_play = json_store.get_play(play_id)
        
        assert retrieved_play is not None
        assert retrieved_play.id == play_id
        assert retrieved_play.user_id == "user_123"
        assert retrieved_play.card_id == "card_456"
        assert retrieved_play.guess is True
        assert retrieved_play.correct is True
        assert retrieved_play.response_time_ms == 2500


class TestStorageStats:
    """Test storage statistics"""
    
    def test_get_stats_empty(self, json_store):
        """Test stats for empty store"""
        stats = json_store.get_stats()
        
        expected = {
            "studies": 0,
            "endpoints": 0,
            "results": 0,
            "cards": 0,
            "plays": 0
        }
        
        assert stats == expected
        
    def test_get_stats_with_data(self, json_store, sample_study_data, sample_endpoint_data, sample_card_data):
        """Test stats with some data"""
        # Add some data
        study = Study(**sample_study_data)
        endpoint = Endpoint(**sample_endpoint_data)
        card = Card(**sample_card_data)
        play = Play(card_id="card_123", guess=True)
        
        json_store.save_study(study)
        json_store.save_endpoint(endpoint)
        json_store.save_card(card)
        json_store.save_play(play)
        
        # Add a result
        result = ResultNorm(endpoint_id=endpoint.id, success_label=SuccessLabel.YES)
        json_store.save_result(result)
        
        stats = json_store.get_stats()
        
        assert stats["studies"] == 1
        assert stats["endpoints"] == 1
        assert stats["results"] == 1
        assert stats["cards"] == 1
        assert stats["plays"] == 1


class TestJSONFilePersistence:
    """Test JSON file persistence and format"""
    
    def test_study_json_format(self, json_store, sample_study_data):
        """Test that saved study JSON has correct format"""
        study = Study(**sample_study_data)
        study_id = json_store.save_study(study)
        
        # Read the raw JSON file
        file_path = json_store.studies_dir / f"{study_id}.json"
        assert file_path.exists()
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Check structure
        assert data["nct_id"] == study.nct_id
        assert data["brief_title"] == study.brief_title
        assert data["conditions"] == study.conditions
        assert data["overall_status"] == "UNKNOWN"  # Enum value
        assert "_id" in data
        assert "_updated_at" in data
        
    def test_enum_serialization_in_json(self, json_store):
        """Test that enums are properly serialized in JSON files"""
        endpoint = Endpoint(
            nct_id="NCT123",
            direction_norm=DirectionNorm.IMPROVE
        )
        
        endpoint_id = json_store.save_endpoint(endpoint)
        
        # Read the raw JSON file
        file_path = json_store.endpoints_dir / f"{endpoint_id}.json"
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Enum should be serialized as string value
        assert data["direction_norm"] == "improve"