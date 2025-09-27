"""
Logging utilities for the clinical trial prediction system.
"""
import sys
from pathlib import Path
from loguru import logger

from .config import Config


def setup_logging(config: Config):
    """Configure loguru logging with the specified configuration"""
    # Remove default handler
    logger.remove()
    
    # Console handler with color
    logger.add(
        sys.stderr,
        level=config.log_level,
        format=config.log_format,
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # File handler for all logs
    log_file = config.logs_dir / "application.log"
    logger.add(
        log_file,
        level="DEBUG",
        format=config.log_format,
        rotation="10 MB",
        retention="1 week",
        compression="gz",
        backtrace=True,
        diagnose=True
    )
    
    # Separate file for errors
    error_log_file = config.logs_dir / "errors.log"
    logger.add(
        error_log_file,
        level="ERROR",
        format=config.log_format,
        rotation="10 MB",
        retention="1 month",
        compression="gz",
        backtrace=True,
        diagnose=True
    )
    
    logger.info(f"Logging configured. Log level: {config.log_level}")
    logger.info(f"Logs directory: {config.logs_dir}")


def get_logger(name: str):
    """Get a logger instance with the given name"""
    return logger.bind(name=name)