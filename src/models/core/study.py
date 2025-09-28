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
    
    # Descriptions
    brief_summary: Optional[str] = None
    detailed_description: Optional[str] = None
    
    # Study classification
    conditions: List[str] = field(default_factory=list)
    phases: List[str] = field(default_factory=list)  # Changed from phase to phases to match API
    study_type: Optional[str] = None
    primary_purpose: Optional[str] = None
    overall_status: StudyStatus = StudyStatus.UNKNOWN
    why_stopped: Optional[str] = None
    has_results: bool = False
    
    # Dates - expanded set
    first_posted: Optional[datetime] = None
    results_first_posted: Optional[datetime] = None
    last_update_posted: Optional[datetime] = None
    study_first_submitted: Optional[datetime] = None
    study_start_date: Optional[datetime] = None
    primary_completion_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    results_first_submitted: Optional[datetime] = None
    
    # Sponsor and collaborator information
    lead_sponsor_name: str = "Unknown Sponsor"
    lead_sponsor_class: Optional[str] = None
    collaborators: List[str] = field(default_factory=list)
    responsible_party_type: Optional[str] = None
    responsible_party_investigator: Optional[str] = None
    
    # Study design details
    allocation: Optional[str] = None
    intervention_model: Optional[str] = None
    intervention_model_description: Optional[str] = None
    masking: Optional[str] = None
    masking_description: Optional[str] = None
    
    # Enrollment and population
    enrollment_count: Optional[int] = None
    enrollment_type: Optional[str] = None
    target_duration: Optional[str] = None
    
    # Geographic information
    countries: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)  # City, State format
    
    # Eligibility
    minimum_age: Optional[str] = None
    maximum_age: Optional[str] = None
    sex: Optional[str] = None
    accepts_healthy_volunteers: Optional[bool] = None
    eligibility_criteria: Optional[str] = None
    
    # Additional metadata
    organization_study_id: Optional[str] = None
    secondary_ids: List[str] = field(default_factory=list)
    oversight_has_dmc: Optional[bool] = None  # Data Monitoring Committee
    is_fda_regulated_drug: Optional[bool] = None
    is_fda_regulated_device: Optional[bool] = None
    
    # Interventions and outcomes
    interventions: List['Intervention'] = field(default_factory=list)
    primary_outcomes: List['PrimaryOutcome'] = field(default_factory=list)
    secondary_outcomes: List['SecondaryOutcome'] = field(default_factory=list)
    
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
    
    @property
    def sponsor(self) -> str:
        """Backward compatibility property for the old sponsor field"""
        return self.lead_sponsor_name


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
class SecondaryOutcome:
    """Secondary outcome measure from a clinical trial"""
    measure: str
    time_frame: str
    description: Optional[str] = None
    population: Optional[str] = None