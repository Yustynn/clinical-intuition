"""
Tests for configuration management.
"""
import pytest
import os
from pathlib import Path
import yaml

from utils.config import Config, DatabaseConfig, APIConfig, ProcessingConfig, get_config


class TestDatabaseConfig:
    """Test DatabaseConfig dataclass"""
    
    def test_database_config_defaults(self):
        """Test default database configuration"""
        db_config = DatabaseConfig()
        
        assert db_config.type == "json"
        assert db_config.path is None
        assert db_config.url is None
        
    def test_database_config_custom(self):
        """Test custom database configuration"""
        db_config = DatabaseConfig(
            type="postgresql",
            url="postgresql://user:pass@localhost:5432/db"
        )
        
        assert db_config.type == "postgresql"
        assert db_config.url == "postgresql://user:pass@localhost:5432/db"


class TestAPIConfig:
    """Test APIConfig dataclass"""
    
    def test_api_config_defaults(self):
        """Test default API configuration"""
        api_config = APIConfig()
        
        assert api_config.clinicaltrials_base_url == "https://clinicaltrials.gov/api/v2/studies"
        assert api_config.openai_model == "gpt-4o-mini"
        assert api_config.request_timeout == 30
        assert api_config.rate_limit_delay == 0.1
        
    def test_api_config_custom(self):
        """Test custom API configuration"""
        api_config = APIConfig(
            openai_api_key="test-key-123",
            openai_model="gpt-4",
            request_timeout=60,
            rate_limit_delay=0.5
        )
        
        assert api_config.openai_api_key == "test-key-123"
        assert api_config.openai_model == "gpt-4"
        assert api_config.request_timeout == 60
        assert api_config.rate_limit_delay == 0.5


class TestProcessingConfig:
    """Test ProcessingConfig dataclass"""
    
    def test_processing_config_defaults(self):
        """Test default processing configuration"""
        proc_config = ProcessingConfig()
        
        assert proc_config.page_size == 1000
        assert proc_config.max_pages == 5
        assert proc_config.batch_size == 100
        assert proc_config.max_retries == 3
        assert proc_config.readability_threshold == 10.0
        assert proc_config.min_question_words == 8
        assert proc_config.max_question_words == 30
        assert proc_config.qc_sample_rate == 0.1
        
    def test_processing_config_custom(self):
        """Test custom processing configuration"""
        proc_config = ProcessingConfig(
            page_size=500,
            max_pages=10,
            batch_size=50,
            readability_threshold=8.0,
            qc_sample_rate=0.2
        )
        
        assert proc_config.page_size == 500
        assert proc_config.max_pages == 10
        assert proc_config.batch_size == 50
        assert proc_config.readability_threshold == 8.0
        assert proc_config.qc_sample_rate == 0.2


class TestConfig:
    """Test main Config dataclass"""
    
    def test_config_defaults(self):
        """Test default configuration"""
        config = Config()
        
        assert isinstance(config.database, DatabaseConfig)
        assert isinstance(config.api, APIConfig)
        assert isinstance(config.processing, ProcessingConfig)
        assert config.data_dir == Path("data")
        assert config.config_dir == Path("config")
        assert config.logs_dir == Path("logs")
        assert config.log_level == "INFO"
        
    def test_config_custom(self, temp_dir):
        """Test custom configuration"""
        config = Config(
            data_dir=temp_dir / "custom_data",
            config_dir=temp_dir / "custom_config",
            logs_dir=temp_dir / "custom_logs",
            log_level="DEBUG"
        )
        
        assert config.data_dir == temp_dir / "custom_data"
        assert config.config_dir == temp_dir / "custom_config"
        assert config.logs_dir == temp_dir / "custom_logs"
        assert config.log_level == "DEBUG"
        
    def test_config_creates_directories(self, temp_dir):
        """Test that config creates necessary directories"""
        data_dir = temp_dir / "test_data"
        config_dir = temp_dir / "test_config"
        logs_dir = temp_dir / "test_logs"
        
        # Ensure directories don't exist initially
        assert not data_dir.exists()
        assert not config_dir.exists()
        assert not logs_dir.exists()
        
        config = Config(
            data_dir=data_dir,
            config_dir=config_dir,
            logs_dir=logs_dir
        )
        
        # Check directories were created
        assert config.data_dir.exists()
        assert config.config_dir.exists()
        assert config.logs_dir.exists()
        
    def test_config_loads_openai_key_from_env(self, temp_dir, monkeypatch):
        """Test that config loads OpenAI API key from environment"""
        # Set environment variable
        monkeypatch.setenv("OPENAI_API_KEY", "env-test-key")
        
        config = Config(data_dir=temp_dir)
        
        assert config.api.openai_api_key == "env-test-key"
        
    def test_config_file_operations(self, temp_dir):
        """Test saving and loading config to/from file"""
        config_file = temp_dir / "test_config.yaml"
        
        # Create custom config
        original_config = Config(
            database=DatabaseConfig(type="sqlite", path="/tmp/test.db"),
            api=APIConfig(openai_model="gpt-4", request_timeout=60),
            processing=ProcessingConfig(page_size=500, max_pages=3),
            data_dir=temp_dir / "data",
            log_level="DEBUG"
        )
        
        # Save to file
        original_config.to_file(config_file)
        
        # Verify file exists and has content
        assert config_file.exists()
        
        with open(config_file, 'r') as f:
            saved_data = yaml.safe_load(f)
        
        assert saved_data['database']['type'] == "sqlite"
        assert saved_data['api']['openai_model'] == "gpt-4"
        assert saved_data['processing']['page_size'] == 500
        assert saved_data['log_level'] == "DEBUG"
        
        # Load from file
        loaded_config = Config.from_file(config_file)
        
        assert loaded_config.database.type == "sqlite"
        assert loaded_config.database.path == "/tmp/test.db"
        assert loaded_config.api.openai_model == "gpt-4"
        assert loaded_config.api.request_timeout == 60
        assert loaded_config.processing.page_size == 500
        assert loaded_config.processing.max_pages == 3
        assert loaded_config.log_level == "DEBUG"
        
    def test_config_from_nonexistent_file(self, temp_dir):
        """Test loading config from non-existent file returns defaults"""
        nonexistent_file = temp_dir / "nonexistent.yaml"
        
        config = Config.from_file(nonexistent_file)
        
        # Should return default config
        assert config.database.type == "json"
        assert config.api.openai_model == "gpt-4o-mini"
        assert config.processing.page_size == 1000
        assert config.log_level == "INFO"
        
    def test_config_from_partial_file(self, temp_dir):
        """Test loading config from file with partial data"""
        config_file = temp_dir / "partial_config.yaml"
        
        # Create partial config file
        partial_data = {
            'database': {'type': 'postgresql'},
            'log_level': 'WARNING'
        }
        
        with open(config_file, 'w') as f:
            yaml.dump(partial_data, f)
        
        config = Config.from_file(config_file)
        
        # Should have partial overrides with defaults for missing values
        assert config.database.type == "postgresql"
        assert config.database.path is None  # Default
        assert config.api.openai_model == "gpt-4o-mini"  # Default
        assert config.log_level == "WARNING"  # Override


class TestGetConfig:
    """Test get_config function"""
    
    def test_get_config_default(self):
        """Test get_config returns default configuration"""
        config = get_config()
        
        assert isinstance(config, Config)
        assert config.database.type == "json"
        assert config.api.openai_model == "gpt-4o-mini"
        
    def test_get_config_with_env_overrides(self, monkeypatch):
        """Test get_config with environment variable overrides"""
        # Set environment variables
        monkeypatch.setenv("OPENAI_API_KEY", "env-override-key")
        monkeypatch.setenv("DATA_DIR", "/tmp/custom_data")
        monkeypatch.setenv("LOG_LEVEL", "ERROR")
        
        config = get_config()
        
        assert config.api.openai_api_key == "env-override-key"
        assert config.data_dir == Path("/tmp/custom_data")
        assert config.log_level == "ERROR"
        
    def test_get_config_creates_directories(self, temp_dir, monkeypatch):
        """Test get_config creates necessary directories"""
        custom_data_dir = temp_dir / "custom_data"
        monkeypatch.setenv("DATA_DIR", str(custom_data_dir))
        
        config = get_config()
        
        assert config.data_dir.exists()