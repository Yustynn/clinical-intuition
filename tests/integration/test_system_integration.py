"""
Integration tests for the complete system.
"""
import pytest
from datetime import datetime
from pathlib import Path

from utils.config import Config
from utils.logging import setup_logging, get_logger
from storage.json_store import JSONStore
from models.core import (
    Study, StudyStatus, Endpoint, DirectionNorm, 
    ResultNorm, SuccessLabel, ConfidenceLevel,
    Card, Play, StatisticalAnalysis
)


class TestFullSystemIntegration:
    """Test complete system integration scenarios"""
    
    def test_complete_study_processing_workflow(self, temp_dir):
        """Test the complete workflow from study to card"""
        # Setup system
        config = Config(
            data_dir=temp_dir / "data",
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        setup_logging(config)
        store = JSONStore(config.data_dir)
        
        logger = get_logger("integration_test")
        logger.info("Starting complete workflow test")
        
        # Step 1: Create and save a study
        study = Study(
            nct_id="NCT12345678",
            brief_title="Behavioral Intervention for Depression",
            official_title="A Randomized Controlled Trial of CBT vs Usual Care",
            conditions=["Major Depressive Disorder"],
            phases=["Phase 3"],
            study_type="Interventional",
            overall_status=StudyStatus.COMPLETED,
            has_results=True,
            sponsor="Research University",
            countries=["United States"]
        )
        
        study_id = store.save_study(study)
        logger.info(f"Saved study: {study_id}")
        
        # Step 2: Create and save endpoints for the study
        endpoint1 = Endpoint(
            nct_id=study.nct_id,
            is_primary=True,
            measure="Change in PHQ-9 Depression Score",
            timeframe="12 weeks",
            units="points",
            population_text="Adults with major depression",
            intervention_names=["Cognitive Behavioral Therapy"],
            comparator_name="Usual Care",
            direction_norm=DirectionNorm.REDUCE  # Lower depression scores are better
        )
        
        endpoint2 = Endpoint(
            nct_id=study.nct_id,
            is_primary=False,
            measure="Quality of Life Score",
            timeframe="12 weeks",
            units="points",
            population_text="Adults with major depression",
            intervention_names=["Cognitive Behavioral Therapy"],
            comparator_name="Usual Care",
            direction_norm=DirectionNorm.IMPROVE
        )
        
        endpoint1_id = store.save_endpoint(endpoint1)
        endpoint2_id = store.save_endpoint(endpoint2)
        logger.info(f"Saved endpoints: {endpoint1_id}, {endpoint2_id}")
        
        # Step 3: Create and save results for endpoints
        # Successful result for primary endpoint
        analysis1 = StatisticalAnalysis(
            param_type="Mean Difference",
            param_value=-3.2,  # Negative is good for depression scores
            p_value=0.008,
            ci_low=-5.1,
            ci_high=-1.3,
            analysis_population="ITT"
        )
        
        result1 = ResultNorm(
            endpoint_id=endpoint1_id,
            analysis=analysis1,
            success_label=SuccessLabel.YES,
            confidence=ConfidenceLevel.HIGH,
            rationale_snippet="CBT significantly reduced depression scores (p=0.008)",
            source_paths=["$.resultsSection.outcomeAnalyses[0]"],
            assessment_method="statistical_analysis"
        )
        
        # Non-significant result for secondary endpoint
        analysis2 = StatisticalAnalysis(
            param_type="Mean Difference",
            param_value=1.1,
            p_value=0.15,
            ci_low=-0.4,
            ci_high=2.6,
            analysis_population="ITT"
        )
        
        result2 = ResultNorm(
            endpoint_id=endpoint2_id,
            analysis=analysis2,
            success_label=SuccessLabel.NO,
            confidence=ConfidenceLevel.MEDIUM,
            rationale_snippet="No significant improvement in quality of life (p=0.15)",
            source_paths=["$.resultsSection.outcomeAnalyses[1]"],
            assessment_method="statistical_analysis"
        )
        
        store.save_result(result1)
        store.save_result(result2)
        logger.info("Saved results for both endpoints")
        
        # Step 4: Create and save cards from successful results
        # Only create card for successful result
        card1 = Card(
            endpoint_id=endpoint1_id,
            question_text="Did Cognitive Behavioral Therapy reduce depression scores at 12 weeks in adults with major depression vs usual care?",
            answer=True,  # YES result
            why_snippet="CBT significantly reduced PHQ-9 scores by 3.2 points (p=0.008)",
            readability_score=9.2,
            ambiguity_flags=[]
        )
        
        card1_id = store.save_card(card1)
        logger.info(f"Created card: {card1_id}")
        
        # Step 5: Simulate some plays
        plays = [
            Play(user_id="user_001", card_id=card1_id, guess=True, correct=True, response_time_ms=3200),
            Play(user_id="user_002", card_id=card1_id, guess=False, correct=False, response_time_ms=5100),
            Play(user_id=None, card_id=card1_id, guess=True, correct=True, response_time_ms=2800),  # Anonymous
        ]
        
        for play in plays:
            store.save_play(play)
        
        logger.info(f"Recorded {len(plays)} plays")
        
        # Step 6: Verify the complete workflow
        # Check stats
        stats = store.get_stats()
        assert stats["studies"] == 1
        assert stats["endpoints"] == 2
        assert stats["results"] == 2
        assert stats["cards"] == 1
        assert stats["plays"] == 3
        
        # Verify data integrity through retrieval
        retrieved_study = store.get_study(study_id)
        assert retrieved_study.nct_id == study.nct_id
        assert retrieved_study.has_results is True
        
        endpoints_for_study = store.list_endpoints_for_study(study.nct_id)
        assert len(endpoints_for_study) == 2
        
        primary_endpoints = [ep for ep in endpoints_for_study if ep.is_primary]
        assert len(primary_endpoints) == 1
        
        retrieved_result = store.get_result(endpoint1_id)
        assert retrieved_result.success_label == SuccessLabel.YES
        assert retrieved_result.confidence == ConfidenceLevel.HIGH
        
        retrieved_card = store.get_card(card1_id)
        assert retrieved_card.answer is True
        assert "Cognitive Behavioral Therapy" in retrieved_card.question_text
        
        all_cards = store.list_cards()
        assert len(all_cards) == 1
        
        logger.info("Complete workflow test successful!")
        
    def test_data_consistency_across_operations(self, temp_dir):
        """Test data consistency across multiple operations"""
        config = Config(data_dir=temp_dir / "data")
        store = JSONStore(config.data_dir)
        
        # Create related data
        study = Study(nct_id="NCT99999", brief_title="Consistency Test Study")
        endpoint = Endpoint(nct_id=study.nct_id, measure="Test Measure")
        
        study_id = store.save_study(study)
        endpoint_id = store.save_endpoint(endpoint)
        
        # Create result and card
        result = ResultNorm(endpoint_id=endpoint_id, success_label=SuccessLabel.YES)
        card = Card(endpoint_id=endpoint_id, question_text="Test question?", answer=True)
        
        store.save_result(result)
        card_id = store.save_card(card)
        
        # Create multiple plays
        for i in range(5):
            play = Play(
                user_id=f"user_{i:03d}",
                card_id=card_id,
                guess=(i % 2 == 0),  # Alternate guesses
                correct=(i % 2 == 0),
                response_time_ms=1000 + i * 500
            )
            store.save_play(play)
        
        # Verify consistency
        retrieved_study = store.get_study(study_id)
        retrieved_endpoint = store.get_endpoint(endpoint_id)
        retrieved_result = store.get_result(endpoint_id)
        retrieved_card = store.get_card(card_id)
        
        # Check relationships are maintained
        assert retrieved_endpoint.nct_id == retrieved_study.nct_id
        assert retrieved_result.endpoint_id == retrieved_endpoint.id
        assert retrieved_card.endpoint_id == retrieved_endpoint.id
        
        # Check stats match expected counts
        stats = store.get_stats()
        assert stats["studies"] == 1
        assert stats["endpoints"] == 1
        assert stats["results"] == 1
        assert stats["cards"] == 1
        assert stats["plays"] == 5
        
    def test_configuration_and_logging_integration(self, temp_dir):
        """Test configuration and logging work together properly"""
        # Create config
        config = Config(
            data_dir=temp_dir / "data",
            config_dir=temp_dir / "config",
            logs_dir=temp_dir / "logs",
            log_level="DEBUG"
        )
        
        # Setup logging
        setup_logging(config)
        
        # Save config to file
        config_file = config.config_dir / "test_config.yaml"
        config.to_file(config_file)
        
        # Load config from file
        loaded_config = Config.from_file(config_file)
        
        # Verify loaded config matches
        assert loaded_config.data_dir == config.data_dir
        assert loaded_config.log_level == config.log_level
        
        # Test logging works with loaded config
        logger = get_logger("config_integration_test")
        logger.info("Testing configuration and logging integration")
        
        # Test store works with loaded config
        store = JSONStore(loaded_config.data_dir)
        study = Study(nct_id="NCT_CONFIG_TEST", brief_title="Config Test Study")
        
        study_id = store.save_study(study)
        retrieved_study = store.get_study(study_id)
        
        assert retrieved_study is not None
        assert retrieved_study.nct_id == study.nct_id
        
        logger.info("Configuration and logging integration test successful!")
        
    def test_enum_consistency_across_serialization(self, temp_dir):
        """Test that enums maintain consistency across save/load cycles"""
        store = JSONStore(temp_dir / "data")
        
        # Test all enum combinations
        test_cases = [
            (StudyStatus.COMPLETED, DirectionNorm.IMPROVE, SuccessLabel.YES, ConfidenceLevel.HIGH),
            (StudyStatus.TERMINATED, DirectionNorm.REDUCE, SuccessLabel.NO, ConfidenceLevel.MEDIUM),
            (StudyStatus.RECRUITING, DirectionNorm.INCREASE, SuccessLabel.UNCLEAR, ConfidenceLevel.LOW),
            (StudyStatus.WITHDRAWN, DirectionNorm.NON_INFERIOR, SuccessLabel.YES, ConfidenceLevel.UNKNOWN),
        ]
        
        for i, (status, direction, success, confidence) in enumerate(test_cases):
            # Create objects with specific enum values
            study = Study(
                nct_id=f"NCT_ENUM_{i:02d}",
                brief_title=f"Enum Test Study {i}",
                overall_status=status
            )
            
            endpoint = Endpoint(
                nct_id=study.nct_id,
                measure=f"Test Measure {i}",
                direction_norm=direction
            )
            
            result = ResultNorm(
                endpoint_id="temp_id",
                success_label=success,
                confidence=confidence
            )
            
            # Save and retrieve
            study_id = store.save_study(study)
            endpoint_id = store.save_endpoint(endpoint)
            
            # Update result with actual endpoint ID
            result.endpoint_id = endpoint_id
            store.save_result(result)
            
            # Retrieve and verify enums are preserved
            retrieved_study = store.get_study(study_id)
            retrieved_endpoint = store.get_endpoint(endpoint_id)
            retrieved_result = store.get_result(endpoint_id)
            
            assert retrieved_study.overall_status == status
            assert retrieved_endpoint.direction_norm == direction
            assert retrieved_result.success_label == success
            assert retrieved_result.confidence == confidence
            
    def test_large_data_volume_handling(self, temp_dir):
        """Test system performance with larger data volumes"""
        store = JSONStore(temp_dir / "data")
        logger = get_logger("volume_test")
        
        # Create multiple studies with endpoints and results
        num_studies = 10
        endpoints_per_study = 3
        
        logger.info(f"Creating {num_studies} studies with {endpoints_per_study} endpoints each")
        
        for study_num in range(num_studies):
            study = Study(
                nct_id=f"NCT_VOLUME_{study_num:03d}",
                brief_title=f"Volume Test Study {study_num}",
                overall_status=StudyStatus.COMPLETED,
                has_results=True
            )
            
            study_id = store.save_study(study)
            
            for endpoint_num in range(endpoints_per_study):
                endpoint = Endpoint(
                    nct_id=study.nct_id,
                    measure=f"Measure {endpoint_num}",
                    timeframe=f"{(endpoint_num + 1) * 4} weeks",
                    is_primary=(endpoint_num == 0)
                )
                
                endpoint_id = store.save_endpoint(endpoint)
                
                # Create result for each endpoint
                result = ResultNorm(
                    endpoint_id=endpoint_id,
                    success_label=SuccessLabel.YES if endpoint_num % 2 == 0 else SuccessLabel.NO,
                    confidence=ConfidenceLevel.HIGH if endpoint_num == 0 else ConfidenceLevel.MEDIUM
                )
                
                store.save_result(result)
                
                # Create card for successful primary endpoints
                if endpoint.is_primary and result.success_label == SuccessLabel.YES:
                    card = Card(
                        endpoint_id=endpoint_id,
                        question_text=f"Did intervention improve {endpoint.measure}?",
                        answer=True
                    )
                    store.save_card(card)
        
        # Verify final stats
        stats = store.get_stats()
        logger.info(f"Final stats: {stats}")
        
        assert stats["studies"] == num_studies
        assert stats["endpoints"] == num_studies * endpoints_per_study
        assert stats["results"] == num_studies * endpoints_per_study
        # Cards only for successful primary endpoints 
        # Primary endpoint (endpoint_num == 0) has success if endpoint_num % 2 == 0 (which is True for 0)
        # So all studies will have successful primary endpoints
        expected_cards = num_studies
        assert stats["cards"] == expected_cards
        
        # Test retrieval performance
        all_studies = store.list_studies()
        assert len(all_studies) == num_studies
        
        # Test specific study retrieval
        test_study = store.get_study("NCT_VOLUME_005")
        assert test_study is not None
        assert test_study.brief_title == "Volume Test Study 5"
        
        # Test endpoints for specific study
        endpoints = store.list_endpoints_for_study("NCT_VOLUME_005")
        assert len(endpoints) == endpoints_per_study
        
        logger.info("Large volume test completed successfully")