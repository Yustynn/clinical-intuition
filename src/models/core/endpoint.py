"""
Endpoint-related models for clinical trial prediction cards.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from .enums import DirectionNorm


@dataclass
class Endpoint:
    """Normalized endpoint for prediction card generation"""
    id: Optional[str] = None
    nct_id: str = ""
    is_primary: bool = True
    
    # Outcome definition
    measure: str = ""
    timeframe: str = ""
    units: Optional[str] = None
    population_text: Optional[str] = None
    
    # Intervention mapping
    intervention_names: List[str] = field(default_factory=list)
    comparator_name: Optional[str] = None
    
    # Normalization
    direction_norm: Optional[DirectionNorm] = None
    
    # Processing metadata
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        if isinstance(self.direction_norm, str):
            try:
                self.direction_norm = DirectionNorm(self.direction_norm)
            except (ValueError, TypeError):
                self.direction_norm = None