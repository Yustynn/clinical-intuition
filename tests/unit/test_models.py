"""
Tests for core dataclasses and enums.
"""
import pytest
from datetime import datetime
from models.core import (
    Study, StudyStatus, Endpoint, DirectionNorm, ResultNorm, SuccessLabel, 
    ConfidenceLevel, Card, Play, StatisticalAnalysis, Intervention, PrimaryOutcome
)


class TestEnums:
    """Test enum classes"""
    
    def test_study_status_enum(self):
        """Test StudyStatus enum values"""
        assert StudyStatus.COMPLETED.value == "COMPLETED"
        assert StudyStatus.TERMINATED.value == "TERMINATED"
        assert StudyStatus.RECRUITING.value == "RECRUITING"
        
    def test_direction_norm_enum(self):
        """Test DirectionNorm enum values"""
        assert DirectionNorm.IMPROVE.value == "improve"
        assert DirectionNorm.REDUCE.value == "reduce"
        assert DirectionNorm.INCREASE.value == "increase"
        assert DirectionNorm.NON_INFERIOR.value == "non-inferior"
        
    def test_success_label_enum(self):
        """Test SuccessLabel enum values"""
        assert SuccessLabel.YES.value == "Yes"
        assert SuccessLabel.NO.value == "No"
        assert SuccessLabel.UNCLEAR.value == "Unclear"
        
    def test_confidence_level_enum(self):
        """Test ConfidenceLevel enum values"""
        assert ConfidenceLevel.HIGH.value == "high"
        assert ConfidenceLevel.MEDIUM.value == "medium"
        assert ConfidenceLevel.LOW.value == "low"
        assert ConfidenceLevel.UNKNOWN.value == "unknown"


class TestStudy:
    """Test Study dataclass"""
    
    def test_study_creation_minimal(self):
        """Test creating study with minimal data"""
        study = Study(nct_id="NCT12345", brief_title="Test Study")
        
        assert study.nct_id == "NCT12345"
        assert study.brief_title == "Test Study"
        assert study.official_title is None
        assert study.conditions == []
        assert study.overall_status == StudyStatus.UNKNOWN
        assert study.has_results is False
        
    def test_study_creation_full(self, sample_study_data):
        """Test creating study with full data"""
        study = Study(**sample_study_data)
        
        assert study.nct_id == "NCT12345678"
        assert study.brief_title == "Test Clinical Trial for Behavioral Intervention"
        assert study.conditions == ["Depression", "Anxiety"]
        assert study.has_results is True
        assert study.sponsor == {"name": "Test University", "class": "Other"}
        
    def test_study_status_string_conversion(self):
        """Test automatic string to enum conversion for study status"""
        study = Study(nct_id="NCT12345", brief_title="Test", overall_status="COMPLETED")
        assert study.overall_status == StudyStatus.COMPLETED
        
    def test_study_status_invalid_string(self):
        """Test invalid status string defaults to UNKNOWN"""
        study = Study(nct_id="NCT12345", brief_title="Test", overall_status="INVALID_STATUS")
        assert study.overall_status == StudyStatus.UNKNOWN


class TestEndpoint:
    """Test Endpoint dataclass"""
    
    def test_endpoint_creation(self, sample_endpoint_data):
        """Test creating endpoint"""
        endpoint = Endpoint(**sample_endpoint_data)
        
        assert endpoint.nct_id == "NCT12345678"
        assert endpoint.is_primary is True
        assert endpoint.measure == "Change in Depression Score"
        assert endpoint.timeframe == "12 weeks"
        assert endpoint.intervention_names == ["Cognitive Behavioral Therapy"]
        assert endpoint.comparator_name == "Usual Care"
        
    def test_endpoint_direction_norm_conversion(self):
        """Test direction norm string to enum conversion"""
        endpoint = Endpoint(nct_id="NCT123", direction_norm="improve")
        assert endpoint.direction_norm == DirectionNorm.IMPROVE
        
    def test_endpoint_direction_norm_invalid(self):
        """Test invalid direction norm defaults to None"""
        endpoint = Endpoint(nct_id="NCT123", direction_norm="invalid_direction")
        assert endpoint.direction_norm is None


class TestStatisticalAnalysis:
    """Test StatisticalAnalysis dataclass"""
    
    def test_statistical_analysis_creation(self):
        """Test creating statistical analysis"""
        analysis = StatisticalAnalysis(
            param_type="Mean Difference",
            param_value=5.2,
            p_value=0.03,
            ci_low=1.1,
            ci_high=9.3,
            analysis_population="ITT"
        )
        
        assert analysis.param_type == "Mean Difference"
        assert analysis.param_value == 5.2
        assert analysis.p_value == 0.03
        assert analysis.ci_low == 1.1
        assert analysis.ci_high == 9.3
        assert analysis.analysis_population == "ITT"


class TestResultNorm:
    """Test ResultNorm dataclass"""
    
    def test_result_norm_creation(self):
        """Test creating result norm"""
        analysis = StatisticalAnalysis(
            param_type="Mean Difference",
            param_value=5.2,
            p_value=0.03
        )
        
        result = ResultNorm(
            endpoint_id="ep_123",
            analysis=analysis,
            success_label=SuccessLabel.YES,
            confidence=ConfidenceLevel.HIGH,
            rationale_snippet="Significant improvement observed",
            assessment_method="statistical_analysis"
        )
        
        assert result.endpoint_id == "ep_123"
        assert result.analysis.param_value == 5.2
        assert result.success_label == SuccessLabel.YES
        assert result.confidence == ConfidenceLevel.HIGH
        assert result.assessment_method == "statistical_analysis"
        
    def test_result_norm_enum_conversion(self):
        """Test enum string conversion in ResultNorm"""
        result = ResultNorm(
            endpoint_id="ep_123",
            success_label="Yes",
            confidence="high"
        )
        
        assert result.success_label == SuccessLabel.YES
        assert result.confidence == ConfidenceLevel.HIGH
        
    def test_result_norm_invalid_enums(self):
        """Test invalid enum strings default properly"""
        result = ResultNorm(
            endpoint_id="ep_123",
            success_label="invalid_label",
            confidence="invalid_confidence"
        )
        
        assert result.success_label == SuccessLabel.UNCLEAR
        assert result.confidence == ConfidenceLevel.UNKNOWN


class TestCard:
    """Test Card dataclass"""
    
    def test_card_creation(self, sample_card_data):
        """Test creating card"""
        card = Card(**sample_card_data)
        
        assert card.endpoint_id == "endpoint_123"
        assert card.question_text.startswith("Did Cognitive Behavioral Therapy")
        assert card.answer is True
        assert card.why_snippet == "CBT showed significant improvement with p<0.05"
        assert card.readability_score == 8.5
        
    def test_card_answer_label_property(self):
        """Test answer_label property"""
        card_yes = Card(endpoint_id="ep1", answer=True)
        card_no = Card(endpoint_id="ep2", answer=False)
        card_unclear = Card(endpoint_id="ep3", answer=None)
        
        assert card_yes.answer_label == "Y"
        assert card_no.answer_label == "N"
        assert card_unclear.answer_label == "Unclear"
        
    def test_card_to_dict(self):
        """Test card to_dict method"""
        card = Card(
            id="card_123",
            endpoint_id="ep_456",
            question_text="Test question?",
            answer=True,
            why_snippet="Test reason",
            difficulty=0.7,
            flags={"sensitive": False}
        )
        
        card_dict = card.to_dict()
        
        assert card_dict["id"] == "card_123"
        assert card_dict["endpoint_id"] == "ep_456"
        assert card_dict["question_text"] == "Test question?"
        assert card_dict["answer"] == "Y"
        assert card_dict["why_snippet"] == "Test reason"
        assert card_dict["difficulty"] == 0.7
        assert card_dict["flags"] == {"sensitive": False}


class TestPlay:
    """Test Play dataclass"""
    
    def test_play_creation(self):
        """Test creating play"""
        play = Play(
            user_id="user_123",
            card_id="card_456",
            guess=True,
            correct=True,
            response_time_ms=2500
        )
        
        assert play.user_id == "user_123"
        assert play.card_id == "card_456"
        assert play.guess is True
        assert play.correct is True
        assert play.response_time_ms == 2500
        assert isinstance(play.created_at, datetime)
        
    def test_play_anonymous_user(self):
        """Test play with anonymous user"""
        play = Play(
            user_id=None,
            card_id="card_456",
            guess=False
        )
        
        assert play.user_id is None
        assert play.card_id == "card_456"
        assert play.guess is False


class TestIntervention:
    """Test Intervention dataclass"""
    
    def test_intervention_creation(self):
        """Test creating intervention"""
        intervention = Intervention(
            name="Cognitive Behavioral Therapy",
            type="BEHAVIORAL",
            description="CBT intervention for depression",
            arm_group_labels=["CBT Group", "Treatment Arm"]
        )
        
        assert intervention.name == "Cognitive Behavioral Therapy"
        assert intervention.type == "BEHAVIORAL"
        assert intervention.description == "CBT intervention for depression"
        assert intervention.arm_group_labels == ["CBT Group", "Treatment Arm"]


class TestPrimaryOutcome:
    """Test PrimaryOutcome dataclass"""
    
    def test_primary_outcome_creation(self):
        """Test creating primary outcome"""
        outcome = PrimaryOutcome(
            measure="Change in Depression Score",
            time_frame="12 weeks",
            description="Change from baseline in PHQ-9 score",
            population="Adults with major depression"
        )
        
        assert outcome.measure == "Change in Depression Score"
        assert outcome.time_frame == "12 weeks"
        assert outcome.description == "Change from baseline in PHQ-9 score"
        assert outcome.population == "Adults with major depression"