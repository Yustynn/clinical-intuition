"""
Result and analysis models for clinical trial outcomes.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from .enums import SuccessLabel, ConfidenceLevel


@dataclass
class StatisticalAnalysis:
    """Statistical analysis results from clinical trial"""
    param_type: Optional[str] = None  # e.g., "Mean Difference", "Risk Ratio"
    param_value: Optional[float] = None
    p_value: Optional[float] = None
    p_modifier: Optional[str] = None  # e.g., "<", "≤"
    ci_low: Optional[float] = None
    ci_high: Optional[float] = None
    dispersion_type: Optional[str] = None
    analysis_population: Optional[str] = None


@dataclass
class ResultNorm:
    """Normalized results with success assessment"""
    endpoint_id: str
    
    # Statistical analysis
    analysis: Optional[StatisticalAnalysis] = None
    
    # Success classification
    success_label: SuccessLabel = SuccessLabel.UNCLEAR
    confidence: ConfidenceLevel = ConfidenceLevel.UNKNOWN
    rationale_snippet: str = ""
    
    # Audit trail
    source_paths: List[str] = field(default_factory=list)  # JSON pointers
    assessment_method: str = "unknown"  # "statistical_analysis" or "status_only"
    
    # Processing metadata
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if isinstance(self.success_label, str):
            try:
                self.success_label = SuccessLabel(self.success_label)
            except ValueError:
                self.success_label = SuccessLabel.UNCLEAR
        
        if isinstance(self.confidence, str):
            try:
                self.confidence = ConfidenceLevel(self.confidence)
            except ValueError:
                self.confidence = ConfidenceLevel.UNKNOWN