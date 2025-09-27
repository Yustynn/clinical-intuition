"""
Core dataclasses for the clinical trial prediction market system.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import json


class StudyStatus(Enum):
    """Study overall status from ClinicalTrials.gov"""
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"
    SUSPENDED = "SUSPENDED"
    ACTIVE_NOT_RECRUITING = "ACTIVE_NOT_RECRUITING"
    RECRUITING = "RECRUITING"
    NOT_YET_RECRUITING = "NOT_YET_RECRUITING"
    WITHDRAWN = "WITHDRAWN"
    UNKNOWN = "UNKNOWN"


class DirectionNorm(Enum):
    """Normalized direction for outcome measures"""
    IMPROVE = "improve"
    REDUCE = "reduce"
    INCREASE = "increase"
    NON_INFERIOR = "non-inferior"


class SuccessLabel(Enum):
    """Binary success classification for interventions"""
    YES = "Yes"
    NO = "No"
    UNCLEAR = "Unclear"


class ConfidenceLevel(Enum):
    """Confidence level in success assessment"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


@dataclass
class Study:
    """Clinical trial study from ClinicalTrials.gov"""
    nct_id: str
    brief_title: str
    official_title: Optional[str] = None
    conditions: List[str] = field(default_factory=list)
    phase: Optional[str] = None
    study_type: Optional[str] = None
    overall_status: StudyStatus = StudyStatus.UNKNOWN
    why_stopped: Optional[str] = None
    has_results: bool = False
    
    # Dates
    first_posted: Optional[datetime] = None
    results_first_posted: Optional[datetime] = None
    last_update_posted: Optional[datetime] = None
    
    # Metadata
    sponsor: Dict[str, Any] = field(default_factory=dict)
    countries: List[str] = field(default_factory=list)
    
    # Raw data for auditing
    raw_data: Optional[Dict[str, Any]] = None
    
    # Processing metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if isinstance(self.overall_status, str):
            try:
                self.overall_status = StudyStatus(self.overall_status)
            except ValueError:
                self.overall_status = StudyStatus.UNKNOWN


@dataclass
class Intervention:
    """Intervention arm from a clinical trial"""
    name: str
    type: str
    description: Optional[str] = None
    arm_group_labels: List[str] = field(default_factory=list)


@dataclass
class PrimaryOutcome:
    """Primary outcome measure from a clinical trial"""
    measure: str
    time_frame: str
    description: Optional[str] = None
    population: Optional[str] = None


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


@dataclass
class Card:
    """Prediction market card for binary yes/no questions"""
    id: Optional[str] = None
    endpoint_id: str = ""
    
    # Question content
    question_text: str = ""
    answer: Optional[bool] = None  # True = Yes, False = No, None = Unclear
    why_snippet: str = ""
    
    # Gameplay metadata
    difficulty: Optional[float] = None  # 0.0-1.0, updated after gameplay
    flags: Dict[str, Any] = field(default_factory=dict)  # e.g., {"sensitive": True, "retired": False}
    
    # Quality metrics
    readability_score: Optional[float] = None
    ambiguity_flags: List[str] = field(default_factory=list)
    
    # Processing metadata
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

    @property
    def answer_label(self) -> str:
        """Human-readable answer label"""
        if self.answer is True:
            return "Y"
        elif self.answer is False:
            return "N"
        else:
            return "Unclear"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "endpoint_id": self.endpoint_id,
            "question_text": self.question_text,
            "answer": self.answer_label,
            "why_snippet": self.why_snippet,
            "difficulty": self.difficulty,
            "flags": self.flags,
            "readability_score": self.readability_score,
            "ambiguity_flags": self.ambiguity_flags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approved_by": self.approved_by
        }


@dataclass
class Play:
    """User interaction with a prediction card"""
    id: Optional[str] = None
    user_id: Optional[str] = None  # Anonymous users have None
    card_id: str = ""
    guess: bool = False  # True = Yes, False = No
    correct: Optional[bool] = None  # Computed from card.answer
    response_time_ms: Optional[int] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()