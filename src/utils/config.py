"""
Configuration management for the clinical trial prediction system.
"""
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import yaml


@dataclass
class DatabaseConfig:
    """Database configuration"""
    type: str = "json"  # json, sqlite, postgresql
    path: Optional[str] = None  # For json/sqlite
    url: Optional[str] = None   # For postgresql


@dataclass
class APIConfig:
    """External API configuration"""
    clinicaltrials_base_url: str = "https://clinicaltrials.gov/api/v2/studies"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    request_timeout: int = 30
    rate_limit_delay: float = 0.1


@dataclass
class ProcessingConfig:
    """Data processing configuration"""
    page_size: int = 1000
    max_pages: int = 5
    batch_size: int = 100
    max_retries: int = 3
    
    # Quality gates
    readability_threshold: float = 10.0  # Flesch-Kincaid grade level
    min_question_words: int = 8
    max_question_words: int = 30
    
    # Sampling
    qc_sample_rate: float = 0.1  # 10% for manual QC


@dataclass
class Config:
    """Main application configuration"""
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    api: APIConfig = field(default_factory=APIConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    
    # Paths
    data_dir: Path = field(default_factory=lambda: Path("data"))
    config_dir: Path = field(default_factory=lambda: Path("config"))
    logs_dir: Path = field(default_factory=lambda: Path("logs"))
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"

    def __post_init__(self):
        # Ensure paths are Path objects
        self.data_dir = Path(self.data_dir)
        self.config_dir = Path(self.config_dir)
        self.logs_dir = Path(self.logs_dir)
        
        # Create directories if they don't exist
        self.data_dir.mkdir(exist_ok=True)
        self.config_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
        
        # Load OpenAI API key from environment if not set
        if not self.api.openai_api_key:
            self.api.openai_api_key = os.getenv("OPENAI_API_KEY")

    @classmethod
    def from_file(cls, config_path: Path) -> "Config":
        """Load configuration from YAML file"""
        if not config_path.exists():
            return cls()
        
        with open(config_path, 'r') as f:
            data = yaml.safe_load(f) or {}
        
        # Create nested configs
        config = cls()
        
        if 'database' in data:
            config.database = DatabaseConfig(**data['database'])
        
        if 'api' in data:
            config.api = APIConfig(**data['api'])
        
        if 'processing' in data:
            config.processing = ProcessingConfig(**data['processing'])
        
        # Set top-level attributes
        for key, value in data.items():
            if hasattr(config, key) and key not in ['database', 'api', 'processing']:
                if key in ['data_dir', 'config_dir', 'logs_dir']:
                    setattr(config, key, Path(value))
                else:
                    setattr(config, key, value)
        
        return config

    def to_file(self, config_path: Path):
        """Save configuration to YAML file"""
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            'database': {
                'type': self.database.type,
                'path': self.database.path,
                'url': self.database.url
            },
            'api': {
                'clinicaltrials_base_url': self.api.clinicaltrials_base_url,
                'openai_model': self.api.openai_model,
                'request_timeout': self.api.request_timeout,
                'rate_limit_delay': self.api.rate_limit_delay
            },
            'processing': {
                'page_size': self.processing.page_size,
                'max_pages': self.processing.max_pages,
                'batch_size': self.processing.batch_size,
                'max_retries': self.processing.max_retries,
                'readability_threshold': self.processing.readability_threshold,
                'min_question_words': self.processing.min_question_words,
                'max_question_words': self.processing.max_question_words,
                'qc_sample_rate': self.processing.qc_sample_rate
            },
            'data_dir': str(self.data_dir),
            'config_dir': str(self.config_dir),
            'logs_dir': str(self.logs_dir),
            'log_level': self.log_level,
            'log_format': self.log_format
        }
        
        with open(config_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False)


def get_config() -> Config:
    """Get configuration instance with environment overrides"""
    config_path = Path("config/config.yaml")
    config = Config.from_file(config_path)
    
    # Environment variable overrides
    if os.getenv("OPENAI_API_KEY"):
        config.api.openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if os.getenv("DATA_DIR"):
        config.data_dir = Path(os.getenv("DATA_DIR"))
        config.data_dir.mkdir(exist_ok=True)
    
    if os.getenv("LOG_LEVEL"):
        config.log_level = os.getenv("LOG_LEVEL")
    
    return config