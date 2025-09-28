"""
Study-related models for clinical trials.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from .enums import StudyStatus


@dataclass
class Study:
    """Clinical trial study from ClinicalTrials.gov"""
    nct_id: str
    brief_title: str
    official_title: Optional[str] = None
    conditions: List[str] = field(default_factory=list)
    phases: List[str] = field(default_factory=list)  # Changed from phase to phases to match API
    study_type: Optional[str] = None
    overall_status: StudyStatus = StudyStatus.UNKNOWN
    why_stopped: Optional[str] = None
    has_results: bool = False
    
    # Dates
    first_posted: Optional[datetime] = None
    results_first_posted: Optional[datetime] = None
    last_update_posted: Optional[datetime] = None
    
    # Metadata - simplified sponsor field
    sponsor: str = "Unknown Sponsor"
    countries: List[str] = field(default_factory=list)
    
    # Interventions and outcomes
    interventions: List['Intervention'] = field(default_factory=list)
    primary_outcomes: List['PrimaryOutcome'] = field(default_factory=list)
    
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