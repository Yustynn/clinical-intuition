"""
Pytest configuration and shared fixtures for testing.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
import sys

# Add src to Python path for testing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from utils.config import Config, DatabaseConfig, APIConfig, ProcessingConfig
from database.json_store import JSONStore


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing"""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path)


@pytest.fixture
def test_config(temp_dir):
    """Create a test configuration"""
    config = Config(
        database=DatabaseConfig(type="json", path=str(temp_dir / "test.db")),
        api=APIConfig(
            clinicaltrials_base_url="https://test-api.example.com",
            openai_api_key="test-key",
            openai_model="gpt-4o-mini",
            request_timeout=10,
            rate_limit_delay=0.0
        ),
        processing=ProcessingConfig(
            page_size=100,
            max_pages=2,
            batch_size=10,
            max_retries=2,
            readability_threshold=8.0,
            min_question_words=5,
            max_question_words=25,
            qc_sample_rate=0.2
        ),
        data_dir=temp_dir / "data",
        config_dir=temp_dir / "config",
        logs_dir=temp_dir / "logs",
        log_level="DEBUG"
    )
    return config


@pytest.fixture
def json_store(test_config):
    """Create a JSON store for testing"""
    return JSONStore(test_config.data_dir)


@pytest.fixture
def sample_study_data():
    """Sample study data for testing"""
    return {
        "nct_id": "NCT12345678",
        "brief_title": "Test Clinical Trial for Behavioral Intervention",
        "official_title": "A Randomized Controlled Trial of Behavioral Intervention for Test Condition",
        "conditions": ["Depression", "Anxiety"],
        "phase": "Phase 2",
        "study_type": "Interventional",
        "has_results": True,
        "sponsor": {"name": "Test University", "class": "Other"},
        "countries": ["United States", "Canada"]
    }


@pytest.fixture
def sample_endpoint_data():
    """Sample endpoint data for testing"""
    return {
        "nct_id": "NCT12345678",
        "is_primary": True,
        "measure": "Change in Depression Score",
        "timeframe": "12 weeks",
        "units": "points on scale",
        "population_text": "Adults with major depression",
        "intervention_names": ["Cognitive Behavioral Therapy"],
        "comparator_name": "Usual Care"
    }


@pytest.fixture
def sample_card_data():
    """Sample card data for testing"""
    return {
        "endpoint_id": "endpoint_123",
        "question_text": "Did Cognitive Behavioral Therapy improve depression scores at 12 weeks in adults with major depression vs usual care?",
        "answer": True,
        "why_snippet": "CBT showed significant improvement with p<0.05",
        "readability_score": 8.5,
        "ambiguity_flags": []
    }