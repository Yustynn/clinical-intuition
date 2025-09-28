#!/usr/bin/env python3
"""
Comprehensive ingestion script for ALL behavioral intervention studies with results.
This script will fetch all ~5,857 studies meeting our criteria from ClinicalTrials.gov.
"""
import sys
import argparse
import time
import json
from pathlib import Path
from datetime import datetime, UTC
from typing import Dict, List, Optional
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from storage.json_store import JSONStore
from ingestion.orchestrator import ClinicalTrialIngestor, IngestionConfig, IngestionStats
from ingestion.api.client import APIConfig
from utils.logging import setup_logging, get_logger
from utils.config import Config

# Rich library for progress bars (fallback to simple progress if not available)
try:
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeRemainingColumn, MofNCompleteColumn
    from rich.table import Table
    from rich.panel import Panel
    from rich.live import Live
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    print("ℹ️  Install 'rich' for better progress display: pip install rich")

logger = get_logger(__name__)


class ProgressTracker:
    """Track and display ingestion progress"""
    
    def __init__(self, use_rich: bool = True):
        self.use_rich = use_rich and RICH_AVAILABLE
        self.start_time = time.time()
        self.studies_fetched = 0
        self.studies_processed = 0
        self.studies_with_results = 0
        self.studies_failed = 0
        self.errors: List[Dict] = []
        self.progress = None
        self.task = None
        
    def start(self, estimated_total: int = 35000):
        """Start progress tracking"""
        if self.use_rich:
            self.progress = Progress(
                SpinnerColumn(),
                "[progress.description]{task.description}",
                BarColumn(),
                MofNCompleteColumn(),
                "•",
                TimeRemainingColumn(),
                "•",
                TextColumn("[cyan]{task.fields[status]}", justify="left"),
                console=console,
                refresh_per_second=2
            )
            self.task = self.progress.add_task(
                "[cyan]Ingesting studies...", 
                total=estimated_total,
                status="Starting..."
            )
            self.progress.start()
    
    def update(self, studies_fetched: int, studies_processed: int, 
               studies_with_results: int, studies_failed: int, current_status: str = ""):
        """Update progress display"""
        self.studies_fetched = studies_fetched
        self.studies_processed = studies_processed
        self.studies_with_results = studies_with_results
        self.studies_failed = studies_failed
        
        if self.use_rich and self.progress and self.task is not None:
            # Update progress bar
            self.progress.update(
                self.task, 
                completed=studies_fetched,
                status=f"Results: {studies_with_results} | Failed: {studies_failed}"
            )
        else:
            # Simple progress display
            elapsed = time.time() - self.start_time
            rate = studies_fetched / elapsed if elapsed > 0 else 0
            print(f"\r📊 Fetched: {studies_fetched:,} | "
                  f"With Results: {studies_with_results:,} | "
                  f"Failed: {studies_failed:,} | "
                  f"Rate: {rate:.1f}/s", end="")
    
    def log_error(self, error_msg: str, study_id: Optional[str] = None):
        """Log an error"""
        error_entry = {
            'timestamp': datetime.now().isoformat(),
            'study_id': study_id,
            'error': error_msg
        }
        self.errors.append(error_entry)
        logger.error(f"Error processing {study_id or 'unknown'}: {error_msg}")
    
    def finish(self):
        """Finish progress tracking and show summary"""
        if self.use_rich and self.progress:
            self.progress.stop()
        
        elapsed_time = time.time() - self.start_time
        
        # Create summary
        if self.use_rich:
            # Rich summary table
            table = Table(title="Ingestion Summary", show_header=True, header_style="bold magenta")
            table.add_column("Metric", style="cyan", no_wrap=True)
            table.add_column("Value", justify="right", style="green")
            
            table.add_row("Total Fetched", f"{self.studies_fetched:,}")
            table.add_row("Successfully Processed", f"{self.studies_processed:,}")
            table.add_row("Studies with Results", f"{self.studies_with_results:,}")
            table.add_row("Failed", f"{self.studies_failed:,}")
            table.add_row("Success Rate", f"{(self.studies_with_results/max(1, self.studies_fetched))*100:.1f}%")
            table.add_row("Time Elapsed", f"{elapsed_time:.1f} seconds")
            table.add_row("Processing Rate", f"{self.studies_fetched/max(1, elapsed_time):.1f} studies/sec")
            
            console.print("\n")
            console.print(table)
            
            if self.errors:
                console.print(f"\n⚠️  {len(self.errors)} errors occurred. Check error log for details.", style="yellow")
        else:
            # Simple summary
            print(f"\n\n{'='*60}")
            print("INGESTION SUMMARY")
            print(f"{'='*60}")
            print(f"Total Fetched: {self.studies_fetched:,}")
            print(f"Successfully Processed: {self.studies_processed:,}")
            print(f"Studies with Results: {self.studies_with_results:,}")
            print(f"Failed: {self.studies_failed:,}")
            print(f"Success Rate: {(self.studies_with_results/max(1, self.studies_fetched))*100:.1f}%")
            print(f"Time Elapsed: {elapsed_time:.1f} seconds")
            print(f"Processing Rate: {self.studies_fetched/max(1, elapsed_time):.1f} studies/sec")
            
            if self.errors:
                print(f"\n⚠️  {len(self.errors)} errors occurred. Check error log for details.")


def save_error_log(errors: List[Dict], output_dir: Path):
    """Save error log to file"""
    if not errors:
        return
    
    error_log_path = output_dir / f"ingestion_errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(error_log_path, 'w') as f:
        json.dump(errors, f, indent=2)
    
    if RICH_AVAILABLE:
        console.print(f"📝 Error log saved to: {error_log_path}", style="yellow")
    else:
        print(f"📝 Error log saved to: {error_log_path}")


def run_comprehensive_ingestion(args):
    """Run comprehensive ingestion of all studies meeting criteria"""
    
    # Display header
    if RICH_AVAILABLE:
        console.print(Panel.fit(
            "[bold cyan]Clinical Trials Comprehensive Ingestion[/bold cyan]\n"
            "Fetching ALL behavioral intervention studies with results",
            border_style="cyan"
        ))
    else:
        print("🚀 Clinical Trials Comprehensive Ingestion")
        print("=" * 60)
        print("Fetching ALL behavioral intervention studies with results")
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
    
    # Show initial storage stats
    initial_stats = store.get_stats()
    if RICH_AVAILABLE:
        console.print(f"\n📊 Initial storage: {initial_stats.get('studies', 0)} studies", style="dim")
    else:
        print(f"\n📊 Initial storage: {initial_stats.get('studies', 0)} studies")
    
    # Create API configuration for production
    api_config = APIConfig(
        page_size=1000,  # Max page size for efficiency
        max_pages=100,   # Enough to get all ~35K studies
        timeout=args.timeout,
        sleep_between_requests=args.sleep_delay
    )
    
    # Create ingestion configuration
    ingestion_config = IngestionConfig(
        max_studies_per_run=args.max_studies,
        filter_has_results_only=True,
        filter_completed_only=not args.include_active,
        save_raw_data=args.save_raw,
        continue_on_error=True,
        retry_attempts=args.retry_attempts,
        retry_delay=args.retry_delay
    )
    
    # Create ingestor
    ingestor = ClinicalTrialIngestor(store, api_config, ingestion_config)
    
    # Test connection
    if RICH_AVAILABLE:
        console.print("\n🔌 Testing API connection...", style="yellow")
    else:
        print("\n🔌 Testing API connection...")
    
    if not ingestor.test_connection():
        if RICH_AVAILABLE:
            console.print("❌ API connection failed. Aborting.", style="red")
        else:
            print("❌ API connection failed. Aborting.")
        return 1
    
    if RICH_AVAILABLE:
        console.print("✅ API connection successful", style="green")
    else:
        print("✅ API connection successful")
    
    # Initialize progress tracker
    tracker = ProgressTracker(use_rich=not args.no_progress)
    tracker.start(estimated_total=35000)  # ~35K COMPLETED behavioral studies
    
    # Custom progress callback
    def progress_callback(stats):
        """Callback for progress updates"""
        tracker.update(
            studies_fetched=stats.total_fetched,
            studies_processed=stats.successfully_processed,
            studies_with_results=stats.studies_with_results,
            studies_failed=stats.failed_processing,
            current_status=f"Page {stats.pages_processed}" if hasattr(stats, 'pages_processed') else ""
        )
    
    # Run ingestion with progress tracking
    try:
        # Start ingestion
        if RICH_AVAILABLE:
            console.print("\n🏃 Starting comprehensive ingestion...\n", style="cyan")
        else:
            print("\n🏃 Starting comprehensive ingestion...\n")
        
        # Monkey-patch the logger to capture progress
        original_logger_info = ingestor.logger.info
        
        def progress_logger(msg):
            # Call original logger
            original_logger_info(msg)
            
            # Parse progress messages
            if "Progress:" in msg:
                # Extract numbers from progress message
                import re
                numbers = re.findall(r'\d+', msg)
                if len(numbers) >= 3:
                    processed, successful, failed = int(numbers[0]), int(numbers[1]), int(numbers[2])
                    tracker.update(
                        studies_fetched=processed,
                        studies_processed=successful,
                        studies_with_results=successful,  # Approximate
                        studies_failed=failed
                    )
        
        ingestor.logger.info = progress_logger
        
        # Run the ingestion
        stats = ingestor.ingest_studies(max_studies=args.max_studies)
        
        # Final update with actual stats
        tracker.update(
            studies_fetched=stats.total_fetched,
            studies_processed=stats.successfully_processed,
            studies_with_results=stats.studies_with_results,
            studies_failed=stats.failed_processing
        )
        
        # Finish progress tracking
        tracker.finish()
        
        # Save error log if any
        if tracker.errors:
            save_error_log(tracker.errors, data_dir)
        
        # Show final storage stats
        final_stats = store.get_stats()
        new_studies = final_stats.get('studies', 0) - initial_stats.get('studies', 0)
        
        if RICH_AVAILABLE:
            console.print(f"\n📁 Data saved to: {data_dir}", style="green")
            console.print(f"📈 New studies added: {new_studies}", style="green")
            if args.save_raw:
                console.print(f"📁 Raw data saved to: {data_dir}/raw_studies/", style="green")
        else:
            print(f"\n📁 Data saved to: {data_dir}")
            print(f"📈 New studies added: {new_studies}")
            if args.save_raw:
                print(f"📁 Raw data saved to: {data_dir}/raw_studies/")
        
        # Save ingestion metadata
        metadata_path = data_dir / f"ingestion_metadata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        metadata = {
            'timestamp': datetime.now().isoformat(),
            'total_fetched': stats.total_fetched,
            'successfully_processed': stats.successfully_processed,
            'studies_with_results': stats.studies_with_results,
            'failed_processing': stats.failed_processing,
            'duplicate_studies': stats.duplicate_studies,
            'duration_seconds': stats.duration_seconds,
            'success_rate': stats.success_rate,
            'filters_applied': {
                'intervention_type': 'BEHAVIORAL',
                'overall_status': 'COMPLETED' if not args.include_active else 'ALL',
                'has_results': True,
                'study_type': 'INTERVENTIONAL'
            }
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        if RICH_AVAILABLE:
            console.print(f"📝 Metadata saved to: {metadata_path}", style="dim")
        else:
            print(f"📝 Metadata saved to: {metadata_path}")
        
        return 0
        
    except KeyboardInterrupt:
        tracker.finish()
        if RICH_AVAILABLE:
            console.print("\n⚠️  Ingestion interrupted by user", style="yellow")
        else:
            print("\n⚠️  Ingestion interrupted by user")
        return 1
    except Exception as e:
        tracker.finish()
        tracker.log_error(str(e))
        if RICH_AVAILABLE:
            console.print(f"\n❌ Ingestion failed: {e}", style="red")
        else:
            print(f"\n❌ Ingestion failed: {e}")
        return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Ingest ALL behavioral intervention studies with results from ClinicalTrials.gov",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Data configuration
    parser.add_argument(
        "--data-dir", 
        type=str, 
        default="./data",
        help="Directory to store ingested data"
    )
    
    # Filtering options
    parser.add_argument(
        "--max-studies",
        type=int,
        default=100000,
        help="Maximum number of studies to process (default: 100000 for all)"
    )
    
    parser.add_argument(
        "--include-active",
        action="store_true",
        help="Include active studies (not just completed)"
    )
    
    parser.add_argument(
        "--save-raw",
        action="store_true",
        help="Save raw API responses for debugging"
    )
    
    # API configuration
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
    
    # Display options
    parser.add_argument(
        "--no-progress",
        action="store_true",
        help="Disable progress bar (useful for logging)"
    )
    
    # Logging
    parser.add_argument(
        "--log-level",
        type=str,
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level"
    )
    
    # Confirmation
    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Skip confirmation prompt"
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Confirmation prompt
    if not args.yes:
        if RICH_AVAILABLE:
            console.print("\n⚠️  This will fetch approximately:", style="yellow")
            if args.max_studies >= 10000:
                console.print("   • 35,000 COMPLETED behavioral studies", style="yellow")
                console.print("   • ~5,857 studies with results", style="yellow")
                console.print("   • This may take 10-15 minutes", style="yellow")
            else:
                console.print(f"   • Up to {args.max_studies} studies", style="yellow")
                console.print(f"   • ~{int(args.max_studies * 0.17)} studies with results (estimated)", style="yellow")
                console.print("   • This should take a few minutes", style="yellow")
            response = console.input("\nContinue? [y/N] ")
        else:
            print("\n⚠️  This will fetch approximately:")
            if args.max_studies >= 10000:
                print("   • 35,000 COMPLETED behavioral studies")
                print("   • ~5,857 studies with results")
                print("   • This may take 10-15 minutes")
            else:
                print(f"   • Up to {args.max_studies} studies")
                print(f"   • ~{int(args.max_studies * 0.17)} studies with results (estimated)")
                print("   • This should take a few minutes")
            response = input("\nContinue? [y/N] ")
        
        if response.lower() != 'y':
            print("Aborted.")
            return 0
    
    # Run comprehensive ingestion
    return run_comprehensive_ingestion(args)


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)