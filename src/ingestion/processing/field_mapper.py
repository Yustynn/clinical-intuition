"""
Field mapping and data extraction from ClinicalTrials.gov API responses.
"""
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
from dataclasses import dataclass

from models.core import Study, StudyStatus, Intervention, PrimaryOutcome
from utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RawStudyData:
    """Container for raw study data from API"""
    nct_id: str
    protocol_section: Dict[str, Any]
    results_section: Optional[Dict[str, Any]]
    derived_section: Optional[Dict[str, Any]]
    has_results: bool


@dataclass
class ParticipantInfo:
    """Structured participant information"""
    total_enrolled: Optional[int] = None
    analyzed_population: Optional[int] = None
    sex_distribution: Optional[Dict[str, int]] = None
    age_min: Optional[str] = None
    age_max: Optional[str] = None
    std_ages: Optional[List[str]] = None
    healthy_volunteers: Optional[bool] = None
    eligibility_criteria: Optional[str] = None


@dataclass
class ArmGroupInfo:
    """Information about study arms and groups"""
    arm_group_label: str
    arm_group_type: Optional[str] = None
    arm_group_description: Optional[str] = None
    intervention_names: Optional[List[str]] = None


@dataclass
class ResultMeasurement:
    """Raw result measurement data"""
    group_id: str
    value: Optional[str] = None
    spread: Optional[str] = None
    lower_limit: Optional[str] = None
    upper_limit: Optional[str] = None
    comment: Optional[str] = None


@dataclass
class OutcomeAnalysis:
    """Statistical analysis of outcome"""
    param_type: Optional[str] = None
    param_value: Optional[float] = None
    p_value: Optional[str] = None
    p_value_comment: Optional[str] = None
    statistical_method: Optional[str] = None
    ci_percent: Optional[str] = None
    ci_lower_limit: Optional[float] = None
    ci_upper_limit: Optional[float] = None
    estimate_comment: Optional[str] = None
    groups_description: Optional[str] = None
    non_inferiority_type: Optional[str] = None


class ClinicalTrialsFieldMapper:
    """Maps raw API data to structured objects"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
    
    def extract_raw_study_data(self, api_response: Dict[str, Any]) -> RawStudyData:
        """Extract and validate raw study data from API response"""
        protocol_section = api_response.get('protocolSection', {})
        identification = protocol_section.get('identificationModule', {})
        
        nct_id = identification.get('nctId')
        if not nct_id:
            raise ValueError("Study missing required NCT ID")
        
        return RawStudyData(
            nct_id=nct_id,
            protocol_section=protocol_section,
            results_section=api_response.get('resultsSection'),
            derived_section=api_response.get('derivedSection'),
            has_results=api_response.get('hasResults', False)
        )
    
    def map_study_status(self, status_str: Optional[str]) -> StudyStatus:
        """Map API status string to StudyStatus enum"""
        if not status_str:
            return StudyStatus.UNKNOWN
        
        status_mapping = {
            'COMPLETED': StudyStatus.COMPLETED,
            'TERMINATED': StudyStatus.TERMINATED,
            'SUSPENDED': StudyStatus.SUSPENDED,
            'WITHDRAWN': StudyStatus.WITHDRAWN,
            'ACTIVE_NOT_RECRUITING': StudyStatus.ACTIVE_NOT_RECRUITING,
            'RECRUITING': StudyStatus.RECRUITING,
            'NOT_YET_RECRUITING': StudyStatus.NOT_YET_RECRUITING,
            'ENROLLING_BY_INVITATION': StudyStatus.ENROLLING_BY_INVITATION,
            'AVAILABLE': StudyStatus.AVAILABLE,
            'NO_LONGER_AVAILABLE': StudyStatus.NO_LONGER_AVAILABLE,
            'TEMPORARILY_NOT_AVAILABLE': StudyStatus.TEMPORARILY_NOT_AVAILABLE,
            'APPROVED_FOR_MARKETING': StudyStatus.APPROVED_FOR_MARKETING
        }
        
        return status_mapping.get(status_str.upper(), StudyStatus.UNKNOWN)
    
    def parse_date(self, date_dict: Optional[Dict[str, Any]]) -> Optional[datetime]:
        """Parse date from API format to datetime"""
        if not date_dict or not isinstance(date_dict, dict):
            return None
        
        try:
            year = date_dict.get('year')
            month = date_dict.get('month', 1)
            day = date_dict.get('day', 1)
            
            if year:
                return datetime(int(year), int(month), int(day))
        except (ValueError, TypeError) as e:
            self.logger.warning(f"Failed to parse date {date_dict}: {e}")
        
        return None
    
    def extract_interventions(self, protocol_section: Dict[str, Any]) -> List[Intervention]:
        """Extract intervention information"""
        arms_module = protocol_section.get('armsInterventionsModule', {})
        interventions_data = arms_module.get('interventions', [])
        
        interventions = []
        for i, intervention_data in enumerate(interventions_data):
            intervention = Intervention(
                name=intervention_data.get('name', f'Intervention {i+1}'),
                type=intervention_data.get('type', 'OTHER'),
                description=intervention_data.get('description', ''),
                arm_group_labels=intervention_data.get('armGroupLabels', [])
            )
            interventions.append(intervention)
        
        return interventions
    
    def extract_primary_outcomes(self, protocol_section: Dict[str, Any]) -> List[PrimaryOutcome]:
        """Extract primary outcome information"""
        outcomes_module = protocol_section.get('outcomesModule', {})
        primary_outcomes_data = outcomes_module.get('primaryOutcomes', [])
        
        outcomes = []
        for i, outcome_data in enumerate(primary_outcomes_data):
            outcome = PrimaryOutcome(
                measure=outcome_data.get('measure', f'Primary Outcome {i+1}'),
                time_frame=outcome_data.get('timeFrame', 'Not specified'),
                description=outcome_data.get('description', '')
            )
            outcomes.append(outcome)
        
        return outcomes
    
    def map_to_study_object(self, raw_data: RawStudyData) -> Study:
        """Map raw study data to Study dataclass"""
        protocol = raw_data.protocol_section
        
        # Basic identification
        identification = protocol.get('identificationModule', {})
        brief_title = identification.get('briefTitle', '')
        official_title = identification.get('officialTitle', '')
        
        # Status and dates
        status_module = protocol.get('statusModule', {})
        overall_status = self.map_study_status(status_module.get('overallStatus'))
        
        first_posted = self.parse_date(status_module.get('studyFirstPostDate'))
        results_first_posted = self.parse_date(status_module.get('resultsFirstPostDate'))
        last_update_posted = self.parse_date(status_module.get('lastUpdatePostDate'))
        
        # Conditions
        conditions_module = protocol.get('conditionsModule', {})
        conditions = conditions_module.get('conditions', [])
        
        # Design
        design_module = protocol.get('designModule', {})
        study_type = design_module.get('studyType', 'Unknown')
        phases = design_module.get('phases', [])
        
        # Sponsor
        sponsor_module = protocol.get('sponsorCollaboratorsModule', {})
        lead_sponsor = sponsor_module.get('leadSponsor', {})
        sponsor_name = lead_sponsor.get('name', 'Unknown Sponsor')
        
        # Create the Study object
        study = Study(
            nct_id=raw_data.nct_id,
            brief_title=brief_title,
            official_title=official_title,
            overall_status=overall_status,
            study_type=study_type,
            phases=phases,
            conditions=conditions,
            sponsor=sponsor_name,
            first_posted=first_posted,
            results_first_posted=results_first_posted,
            last_update_posted=last_update_posted,
            has_results=raw_data.has_results,
            interventions=self.extract_interventions(protocol),
            primary_outcomes=self.extract_primary_outcomes(protocol)
        )
        
        return study
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int"""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None