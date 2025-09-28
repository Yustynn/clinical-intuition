#!/usr/bin/env python3
"""
Test script for the clinical trial ingestor.
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from storage.json_store import JSONStore
from ingestion.orchestrator import ClinicalTrialIngestor, IngestionConfig
from ingestion.api.client import APIConfig
from utils.logging import setup_logging
from utils.config import Config

def main():
    """Test the ingestor with a small number of studies"""
    print("🔬 Testing Clinical Trial Ingestor")
    print("=" * 50)
    
    # Set up logging
    config = Config()
    config.log_level = 'INFO'
    setup_logging(config)
    
    # Create temporary data directory
    data_dir = Path('./test_data')
    data_dir.mkdir(exist_ok=True)
    
    # Create storage
    store = JSONStore(data_dir)
    
    # Create API config for testing (small batches)
    api_config = APIConfig(
        page_size=50,  # Small pages for testing
        max_pages=2    # Only 2 pages max
    )
    
    # Create ingestion config for testing - proper prediction market filtering
    ingestion_config = IngestionConfig(
        max_studies_per_run=10,  # Only 10 studies for testing
        filter_has_results_only=True,   # Focus on studies with results (post-processing)
        filter_completed_only=True,     # Focus on completed studies
        save_raw_data=True,
        continue_on_error=True
    )
    
    # Create ingestor
    ingestor = ClinicalTrialIngestor(store, api_config, ingestion_config)
    
    # Test 1: Connection test
    print("\n1️⃣ Testing API connection...")
    if ingestor.test_connection():
        print("✅ Connection successful")
    else:
        print("❌ Connection failed")
        return 1
    
    # Test 2: Ingest a few studies
    print("\n2️⃣ Testing ingestion (max 10 studies)...")
    stats = ingestor.ingest_studies(max_studies=10)
    
    print(f"\n📊 RESULTS:")
    print(f"  Total fetched: {stats.total_fetched}")
    print(f"  Successfully processed: {stats.successfully_processed}")
    print(f"  Failed processing: {stats.failed_processing}")
    print(f"  Duplicates: {stats.duplicate_studies}")
    print(f"  Studies with results: {stats.studies_with_results}")
    print(f"  Success rate: {stats.success_rate:.2%}")
    print(f"  Duration: {stats.duration_seconds:.1f} seconds")
    
    # Test 3: Show storage stats
    print("\n3️⃣ Storage statistics:")
    storage_stats = store.get_stats()
    for key, value in storage_stats.items():
        print(f"  {key}: {value}")
    
    # Test 4: List a few studies
    print("\n4️⃣ Sample studies:")
    study_ids = store.list_studies()
    for i, study_id in enumerate(study_ids[:3]):
        study = store.get_study(study_id)
        if study:
            print(f"  {i+1}. {study.nct_id}: {study.brief_title[:50]}...")
            print(f"     Status: {study.overall_status.value}, Has results: {study.has_results}")
            print(f"     Primary outcomes: {len(study.primary_outcomes)}")
    
    print(f"\n✅ Test completed! Check {data_dir} for saved data.")
    return 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)