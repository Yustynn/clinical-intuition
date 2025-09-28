#!/usr/bin/env python3
"""
Production script for running the clinical trial ingestor.
Ingests behavioral intervention studies with results from ClinicalTrials.gov.
"""
import sys
import argparse
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from storage.json_store import JSONStore
from ingestion.orchestrator import ClinicalTrialIngestor, IngestionConfig
from ingestion.api.client import APIConfig
from utils.logging import setup_logging
from utils.config import Config


def create_production_configs(args):
    """Create production configurations based on arguments"""
    
    # API configuration for production
    api_config = APIConfig(
        page_size=args.page_size,
        max_pages=args.max_pages,
        timeout=args.timeout,
        sleep_between_requests=args.sleep_delay
    )
    
    # Ingestion configuration for production
    ingestion_config = IngestionConfig(
        max_studies_per_run=args.max_studies,
        filter_has_results_only=True,  # Always filter for results
        filter_completed_only=not args.include_active,  # Include active studies if requested
        save_raw_data=args.save_raw,
        continue_on_error=True,
        retry_attempts=args.retry_attempts,
        retry_delay=args.retry_delay
    )
    
    return api_config, ingestion_config


def run_ingestion(args):
    """Run the clinical trial ingestion process"""
    
    print("🚀 Clinical Trial Ingestor - Production Run")
    print("=" * 60)
    print(f"Target: Behavioral intervention studies with results")
    print(f"Max studies: {args.max_studies}")
    print(f"Data directory: {args.data_dir}")
    print("=" * 60)
    
    # Set up logging
    config = Config()
    config.log_level = args.log_level.upper()
    setup_logging(config)
    
    # Create data directory
    data_dir = Path(args.data_dir)
    data_dir.mkdir(exist_ok=True)
    
    # Create storage
    store = JSONStore(data_dir)
    
    # Create configurations
    api_config, ingestion_config = create_production_configs(args)
    
    # Create ingestor
    ingestor = ClinicalTrialIngestor(store, api_config, ingestion_config)
    
    # Test connection first
    print("\n🔌 Testing API connection...")
    if not ingestor.test_connection():
        print("❌ API connection failed. Aborting.")
        return 1
    print("✅ API connection successful")
    
    # Show current storage stats
    current_stats = store.get_stats()
    print(f"\n📊 Current Storage Stats:")
    for key, value in current_stats.items():
        print(f"  {key}: {value}")
    
    # Run ingestion
    print(f"\n🏃 Starting ingestion run...")
    start_time = time.time()
    
    try:
        stats = ingestor.ingest_studies(max_studies=args.max_studies)
        
        # Calculate total time
        total_time = time.time() - start_time
        
        # Display results
        print(f"\n🎯 INGESTION RESULTS")
        print("=" * 60)
        print(f"Total fetched: {stats.total_fetched}")
        print(f"Successfully processed: {stats.successfully_processed}")
        print(f"Failed processing: {stats.failed_processing}")
        print(f"Duplicate studies: {stats.duplicate_studies}")
        print(f"Studies with results: {stats.studies_with_results}")
        print(f"Success rate: {stats.success_rate:.2%}")
        print(f"Duration: {total_time:.1f} seconds")
        
        if stats.successfully_processed > 0:
            rate = stats.successfully_processed / total_time
            print(f"Processing rate: {rate:.1f} studies with results/second")
        
        # Show updated storage stats
        updated_stats = store.get_stats()
        print(f"\n📈 Updated Storage Stats:")
        for key, value in updated_stats.items():
            change = value - current_stats.get(key, 0)
            if change > 0:
                print(f"  {key}: {value} (+{change})")
            else:
                print(f"  {key}: {value}")
        
        # Show sample of newly processed studies
        if stats.successfully_processed > 0:
            print(f"\n📋 Sample of newly processed studies:")
            study_ids = store.list_studies()
            for i, study_id in enumerate(study_ids[-min(3, stats.successfully_processed):]):
                study = store.get_study(study_id)
                if study and study.has_results:
                    print(f"  {i+1}. {study.nct_id}: {study.brief_title[:60]}...")
                    print(f"     Status: {study.overall_status.value}, Interventions: {len(study.interventions)}")
        
        # Performance assessment
        if stats.success_rate > 0.03:  # > 3%
            print(f"\n✅ EXCELLENT performance: {stats.success_rate:.1%} success rate")
        elif stats.success_rate > 0.01:  # > 1%
            print(f"\n🟡 GOOD performance: {stats.success_rate:.1%} success rate")
        else:
            print(f"\n🔴 LOW performance: {stats.success_rate:.1%} success rate")
        
        print(f"\n📁 Data saved to: {data_dir}")
        if args.save_raw:
            print(f"📁 Raw API data saved to: {data_dir}/raw_studies/")
        
        return 0
        
    except KeyboardInterrupt:
        print(f"\n⚠️ Ingestion interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Ingestion failed with error: {e}")
        return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Run clinical trial ingestor for behavioral intervention studies",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Data configuration
    parser.add_argument(
        "--data-dir", 
        type=str, 
        default="./data",
        help="Directory to store ingested data"
    )
    
    # Ingestion parameters
    parser.add_argument(
        "--max-studies", 
        type=int, 
        default=1000,
        help="Maximum number of studies to process in this run"
    )
    
    parser.add_argument(
        "--include-active",
        action="store_true",
        help="Include active studies (not just completed/terminated)"
    )
    
    parser.add_argument(
        "--save-raw",
        action="store_true",
        help="Save raw API responses for debugging"
    )
    
    # API configuration
    parser.add_argument(
        "--page-size",
        type=int,
        default=1000,
        help="Number of studies per API request page"
    )
    
    parser.add_argument(
        "--max-pages",
        type=int,
        default=50,
        help="Maximum number of pages to fetch"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="API request timeout in seconds"
    )
    
    parser.add_argument(
        "--sleep-delay",
        type=float,
        default=0.1,
        help="Delay between API requests in seconds"
    )
    
    # Error handling
    parser.add_argument(
        "--retry-attempts",
        type=int,
        default=3,
        help="Number of retry attempts for failed studies"
    )
    
    parser.add_argument(
        "--retry-delay",
        type=float,
        default=1.0,
        help="Delay between retry attempts in seconds"
    )
    
    # Logging
    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level"
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run ingestion
    return run_ingestion(args)


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)