"""
Enums for the clinical trial prediction market system.
"""
from enum import Enum


class StudyStatus(Enum):
    """Study overall status from ClinicalTrials.gov"""
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"
    SUSPENDED = "SUSPENDED"
    ACTIVE_NOT_RECRUITING = "ACTIVE_NOT_RECRUITING"
    RECRUITING = "RECRUITING"
    NOT_YET_RECRUITING = "NOT_YET_RECRUITING"
    ENROLLING_BY_INVITATION = "ENROLLING_BY_INVITATION"
    AVAILABLE = "AVAILABLE"
    NO_LONGER_AVAILABLE = "NO_LONGER_AVAILABLE"
    TEMPORARILY_NOT_AVAILABLE = "TEMPORARILY_NOT_AVAILABLE"
    APPROVED_FOR_MARKETING = "APPROVED_FOR_MARKETING"
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