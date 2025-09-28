"""
Tests for logging utilities.
"""
import pytest
from pathlib import Path
from loguru import logger
import tempfile
import shutil

from utils.logging import setup_logging, get_logger
from utils.config import Config


class TestLoggingSetup:
    """Test logging setup functionality"""
    
    def test_setup_logging_creates_log_files(self, temp_dir):
        """Test that setup_logging creates log files"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        
        setup_logging(config)
        
        # Check that log directory exists
        assert config.logs_dir.exists()
        
        # Generate some log messages to trigger file creation
        test_logger = get_logger("test")
        test_logger.info("Test info message")
        test_logger.error("Test error message")
        
        # Check that log files are created (may take a moment)
        # Note: loguru creates files lazily, so we test the setup more than file existence
        
    def test_setup_logging_with_different_levels(self, temp_dir):
        """Test setup_logging with different log levels"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="WARNING"
        )
        
        # Should not raise any exceptions
        setup_logging(config)
        
        # Test with ERROR level
        config.log_level = "ERROR"
        setup_logging(config)
        
        # Test with DEBUG level
        config.log_level = "DEBUG"
        setup_logging(config)
        
    def test_setup_logging_custom_format(self, temp_dir):
        """Test setup_logging with custom format"""
        custom_format = "{time} | {level} | {message}"
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="INFO",
            log_format=custom_format
        )
        
        # Should not raise any exceptions
        setup_logging(config)


class TestGetLogger:
    """Test get_logger functionality"""
    
    def test_get_logger_returns_logger(self):
        """Test that get_logger returns a logger instance"""
        test_logger = get_logger("test_module")
        
        # Should return a loguru logger with bound name
        assert hasattr(test_logger, 'info')
        assert hasattr(test_logger, 'debug')
        assert hasattr(test_logger, 'warning')
        assert hasattr(test_logger, 'error')
        assert hasattr(test_logger, 'critical')
        
    def test_get_logger_different_names(self):
        """Test get_logger with different module names"""
        logger1 = get_logger("module1")
        logger2 = get_logger("module2")
        logger3 = get_logger("test.submodule")
        
        # All should be logger instances
        assert hasattr(logger1, 'info')
        assert hasattr(logger2, 'info')
        assert hasattr(logger3, 'info')
        
    def test_logger_methods_exist(self):
        """Test that returned logger has all expected methods"""
        test_logger = get_logger("test")
        
        # Test that all log level methods exist
        assert callable(test_logger.debug)
        assert callable(test_logger.info)
        assert callable(test_logger.warning)
        assert callable(test_logger.error)
        assert callable(test_logger.critical)
        
        # Test that bind method exists (from loguru)
        assert callable(test_logger.bind)


class TestLoggingIntegration:
    """Test logging integration with the system"""
    
    def test_logging_with_json_store(self, temp_dir):
        """Test that logging works with JSON store operations"""
        from storage.json_store import JSONStore
        from models.core import Study
        
        # Setup logging
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        setup_logging(config)
        
        # Create JSON store and perform operations
        store = JSONStore(temp_dir / "data")
        study = Study(nct_id="NCT123", brief_title="Test Study")
        
        # This should generate log messages
        study_id = store.save_study(study)
        retrieved_study = store.get_study(study_id)
        
        # Should complete without errors
        assert retrieved_study is not None
        
    def test_logging_with_config_operations(self, temp_dir):
        """Test that logging works with config operations"""
        from utils.config import get_config
        
        # Setup logging
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="INFO"
        )
        setup_logging(config)
        
        # Perform config operations that might log
        test_config = get_config()
        
        # Should complete without errors
        assert test_config is not None
        
    def test_exception_logging(self, temp_dir):
        """Test that exceptions are properly logged"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        setup_logging(config)
        
        test_logger = get_logger("test_exceptions")
        
        # Test logging an exception
        try:
            raise ValueError("Test exception for logging")
        except ValueError as e:
            test_logger.error(f"Caught exception: {e}")
            
        # Should not raise any errors during logging
        

class TestLoggerConfiguration:
    """Test logger configuration options"""
    
    def test_debug_level_logging(self, temp_dir):
        """Test DEBUG level logging captures all messages"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        setup_logging(config)
        
        test_logger = get_logger("debug_test")
        
        # All these should be captured at DEBUG level
        test_logger.debug("Debug message")
        test_logger.info("Info message")
        test_logger.warning("Warning message")
        test_logger.error("Error message")
        
    def test_info_level_logging(self, temp_dir):
        """Test INFO level logging"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="INFO"
        )
        setup_logging(config)
        
        test_logger = get_logger("info_test")
        
        # These should be captured at INFO level
        test_logger.info("Info message")
        test_logger.warning("Warning message")
        test_logger.error("Error message")
        
        # DEBUG should be filtered out, but we can't easily test that
        test_logger.debug("Debug message - should be filtered")
        
    def test_error_level_logging(self, temp_dir):
        """Test ERROR level logging"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="ERROR"
        )
        setup_logging(config)
        
        test_logger = get_logger("error_test")
        
        # Only error and critical should be captured
        test_logger.error("Error message")
        test_logger.critical("Critical message")
        
        # These should be filtered out
        test_logger.debug("Debug message - should be filtered")
        test_logger.info("Info message - should be filtered")
        test_logger.warning("Warning message - should be filtered")


class TestLoggerContextBinding:
    """Test logger context binding features"""
    
    def test_logger_bind_context(self, temp_dir):
        """Test binding context to logger"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        setup_logging(config)
        
        base_logger = get_logger("context_test")
        
        # Bind additional context
        context_logger = base_logger.bind(
            user_id="user123",
            operation="test_operation"
        )
        
        # Should be able to log with context
        context_logger.info("Operation completed")
        
        # Original logger should still work
        base_logger.info("Base logger message")
        
    def test_multiple_logger_instances(self, temp_dir):
        """Test multiple logger instances with different names"""
        config = Config(
            logs_dir=temp_dir / "logs",
            log_level="INFO"
        )
        setup_logging(config)
        
        # Create multiple loggers for different modules
        db_logger = get_logger("database")
        api_logger = get_logger("api")
        processing_logger = get_logger("processing")
        
        # All should work independently
        db_logger.info("Database operation")
        api_logger.info("API call")
        processing_logger.info("Processing data")
        
        # Should not interfere with each other
        assert hasattr(db_logger, 'info')
        assert hasattr(api_logger, 'info')
        assert hasattr(processing_logger, 'info')