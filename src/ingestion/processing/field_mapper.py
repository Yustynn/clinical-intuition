"""
Field mapping and data extraction from ClinicalTrials.gov API responses.
"""
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
from dataclasses import dataclass

from models.core import Study, StudyStatus, Intervention, PrimaryOutcome, SecondaryOutcome
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
    
    def extract_secondary_outcomes(self, protocol_section: Dict[str, Any]) -> List[SecondaryOutcome]:
        """Extract secondary outcome information"""
        outcomes_module = protocol_section.get('outcomesModule', {})
        secondary_outcomes_data = outcomes_module.get('secondaryOutcomes', [])
        
        outcomes = []
        for i, outcome_data in enumerate(secondary_outcomes_data):
            outcome = SecondaryOutcome(
                measure=outcome_data.get('measure', f'Secondary Outcome {i+1}'),
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
        
        # Organization study ID and secondary IDs (may not be available)
        org_study_id_info = identification.get('orgStudyIdInfo', {})
        organization_study_id = org_study_id_info.get('id', '') if org_study_id_info else ''
        
        secondary_id_infos = identification.get('secondaryIdInfos', [])
        secondary_ids = [id_info.get('id', '') for id_info in secondary_id_infos if id_info.get('id')] if secondary_id_infos else []
        
        # Descriptions
        description_module = protocol.get('descriptionModule', {})
        brief_summary = description_module.get('briefSummary', '')
        detailed_description = description_module.get('detailedDescription', '')
        
        # Status and dates
        status_module = protocol.get('statusModule', {})
        overall_status = self.map_study_status(status_module.get('overallStatus'))
        why_stopped = status_module.get('whyStopped', '')
        
        # Parse available date fields (some may not be in API response)
        study_first_submitted = self.parse_date(status_module.get('studyFirstSubmitDate'))
        first_posted = self.parse_date(status_module.get('studyFirstPostDate'))
        results_first_submitted = self.parse_date(status_module.get('resultsFirstSubmitDate'))
        results_first_posted = self.parse_date(status_module.get('resultsFirstPostDate'))
        last_update_posted = self.parse_date(status_module.get('lastUpdatePostDate'))
        study_start_date = self.parse_date(status_module.get('studyStartDate'))
        primary_completion_date = self.parse_date(status_module.get('primaryCompletionDate'))
        completion_date = self.parse_date(status_module.get('completionDate'))
        
        # Sponsor and collaborators (some fields may not be available)
        sponsor_module = protocol.get('sponsorCollaboratorsModule', {})
        lead_sponsor = sponsor_module.get('leadSponsor', {})
        lead_sponsor_name = lead_sponsor.get('name', 'Unknown Sponsor') if lead_sponsor else 'Unknown Sponsor'
        lead_sponsor_class = lead_sponsor.get('class', '') if lead_sponsor else ''
        
        collaborators_data = sponsor_module.get('collaborators', [])
        collaborators = [collab.get('name', '') for collab in collaborators_data if collab.get('name')] if collaborators_data else []
        
        responsible_party = sponsor_module.get('responsibleParty', {})
        responsible_party_type = responsible_party.get('type', '') if responsible_party else ''
        responsible_party_investigator = responsible_party.get('investigatorFullName', '') if responsible_party else ''
        
        # Design details (some fields may not be available)
        design_module = protocol.get('designModule', {})
        study_type = design_module.get('studyType', 'Unknown')
        phases = design_module.get('phases', [])
        
        design_info = design_module.get('designInfo', {})
        allocation = design_info.get('allocation', '') if design_info else ''
        intervention_model = design_info.get('interventionModel', '') if design_info else ''
        intervention_model_description = design_info.get('interventionModelDescription', '') if design_info else ''
        primary_purpose = design_info.get('primaryPurpose', '') if design_info else ''
        
        masking_info = design_info.get('maskingInfo', {}) if design_info else {}
        masking = masking_info.get('masking', '') if masking_info else ''
        masking_description = masking_info.get('maskingDescription', '') if masking_info else ''
        
        enrollment_info = design_module.get('enrollmentInfo', {})
        enrollment_count = self._safe_int(enrollment_info.get('count')) if enrollment_info else None
        enrollment_type = enrollment_info.get('type', '') if enrollment_info else ''
        
        target_duration = design_module.get('targetDuration', '')
        
        # Conditions
        conditions_module = protocol.get('conditionsModule', {})
        conditions = conditions_module.get('conditions', [])
        
        # Eligibility (may not be available)
        eligibility_module = protocol.get('eligibilityModule', {})
        minimum_age = eligibility_module.get('minimumAge', '') if eligibility_module else ''
        maximum_age = eligibility_module.get('maximumAge', '') if eligibility_module else ''
        sex = eligibility_module.get('sex', '') if eligibility_module else ''
        accepts_healthy_volunteers = eligibility_module.get('healthyVolunteers') if eligibility_module else None
        if accepts_healthy_volunteers == 'Accepts Healthy Volunteers':
            accepts_healthy_volunteers = True
        elif accepts_healthy_volunteers == 'No':
            accepts_healthy_volunteers = False
        else:
            accepts_healthy_volunteers = None
        eligibility_criteria = eligibility_module.get('eligibilityCriteria', '') if eligibility_module else ''
        
        # Locations (may not be available)
        contacts_locations_module = protocol.get('contactsLocationsModule', {})
        locations_data = contacts_locations_module.get('locations', []) if contacts_locations_module else []
        
        # Extract countries and locations
        countries = set()
        locations = []
        for location in locations_data:
            if location.get('country'):
                countries.add(location['country'])
            
            city = location.get('city', '')
            state = location.get('state', '')
            if city and state:
                locations.append(f"{city}, {state}")
            elif city:
                locations.append(city)
        
        # Oversight (may not be available)
        oversight_module = protocol.get('oversightModule', {})
        oversight_has_dmc = oversight_module.get('oversightHasDmc') if oversight_module else None
        is_fda_regulated_drug = oversight_module.get('isFdaRegulatedDrug') if oversight_module else None
        is_fda_regulated_device = oversight_module.get('isFdaRegulatedDevice') if oversight_module else None
        
        # Create the Study object
        study = Study(
            nct_id=raw_data.nct_id,
            brief_title=brief_title,
            official_title=official_title,
            brief_summary=brief_summary,
            detailed_description=detailed_description,
            conditions=conditions,
            phases=phases,
            study_type=study_type,
            primary_purpose=primary_purpose,
            overall_status=overall_status,
            why_stopped=why_stopped,
            has_results=raw_data.has_results,
            
            # Dates
            first_posted=first_posted,
            results_first_posted=results_first_posted,
            last_update_posted=last_update_posted,
            study_first_submitted=study_first_submitted,
            study_start_date=study_start_date,
            primary_completion_date=primary_completion_date,
            completion_date=completion_date,
            results_first_submitted=results_first_submitted,
            
            # Sponsor information
            lead_sponsor_name=lead_sponsor_name,
            lead_sponsor_class=lead_sponsor_class,
            collaborators=collaborators,
            responsible_party_type=responsible_party_type,
            responsible_party_investigator=responsible_party_investigator,
            
            # Design details
            allocation=allocation,
            intervention_model=intervention_model,
            intervention_model_description=intervention_model_description,
            masking=masking,
            masking_description=masking_description,
            
            # Enrollment
            enrollment_count=enrollment_count,
            enrollment_type=enrollment_type,
            target_duration=target_duration,
            
            # Geographic
            countries=list(countries),
            locations=locations,
            
            # Eligibility
            minimum_age=minimum_age,
            maximum_age=maximum_age,
            sex=sex,
            accepts_healthy_volunteers=accepts_healthy_volunteers,
            eligibility_criteria=eligibility_criteria,
            
            # Additional metadata
            organization_study_id=organization_study_id,
            secondary_ids=secondary_ids,
            oversight_has_dmc=oversight_has_dmc,
            is_fda_regulated_drug=is_fda_regulated_drug,
            is_fda_regulated_device=is_fda_regulated_device,
            
            # Interventions and outcomes
            interventions=self.extract_interventions(protocol),
            primary_outcomes=self.extract_primary_outcomes(protocol),
            secondary_outcomes=self.extract_secondary_outcomes(protocol)
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