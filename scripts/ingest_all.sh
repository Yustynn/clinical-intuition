#!/bin/bash
# Script to ingest ALL behavioral intervention studies with results from ClinicalTrials.gov
# This will fetch approximately 5,857 studies meeting our criteria

# Default values
DATA_DIR="./data"
LOG_LEVEL="WARNING"
SAVE_RAW=false
SKIP_CONFIRM=false

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--data-dir)
            DATA_DIR="$2"
            shift 2
            ;;
        -l|--log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --save-raw)
            SAVE_RAW=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRM=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Ingest ALL behavioral intervention studies with results"
            echo ""
            echo "Options:"
            echo "  -d, --data-dir DIR     Data directory (default: ./data)"
            echo "  -l, --log-level LEVEL  Log level: DEBUG,INFO,WARNING,ERROR (default: WARNING)"
            echo "  --save-raw             Save raw API responses"
            echo "  -y, --yes              Skip confirmation prompt"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "This will fetch approximately:"
            echo "  • 35,000 COMPLETED behavioral studies from the API"
            echo "  • ~5,857 studies with results after filtering"
            echo "  • Estimated time: 10-15 minutes"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Display header
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Clinical Trials Comprehensive Ingestion${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Show configuration
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  📁 Data directory: ${DATA_DIR}"
echo -e "  📝 Log level: ${LOG_LEVEL}"
echo -e "  💾 Save raw data: ${SAVE_RAW}"
echo ""

# Warning and confirmation
if [ "$SKIP_CONFIRM" = false ]; then
    echo -e "${YELLOW}⚠️  This operation will:${NC}"
    echo "  • Fetch ~35,000 COMPLETED behavioral studies"
    echo "  • Filter to ~5,857 studies with results"
    echo "  • Take approximately 10-15 minutes"
    echo "  • Use ~100-200 MB of disk space"
    echo ""
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 0
    fi
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is required but not installed.${NC}"
    exit 1
fi

# Create data directory
mkdir -p "$DATA_DIR"

# Build command
CMD="python3 scripts/ingest_all_studies.py"
CMD="$CMD --data-dir \"$DATA_DIR\""
CMD="$CMD --log-level $LOG_LEVEL"
CMD="$CMD --yes"  # Skip Python script's confirmation

if [ "$SAVE_RAW" = true ]; then
    CMD="$CMD --save-raw"
fi

# Show start time
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "${GREEN}Starting ingestion at: $START_TIME${NC}"
echo ""

# Run the ingestion
eval $CMD
EXIT_CODE=$?

# Show end time
END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo ""
echo -e "${GREEN}Completed at: $END_TIME${NC}"

# Show results
if [ $EXIT_CODE -eq 0 ]; then
    # Count results
    STUDY_COUNT=$(ls "$DATA_DIR"/studies/*.json 2>/dev/null | wc -l | xargs)
    echo ""
    echo -e "${GREEN}✅ Success!${NC}"
    echo -e "  📊 Total studies saved: ${STUDY_COUNT}"
    echo -e "  📁 Data location: ${DATA_DIR}"
    
    # Show sample studies
    if [ $STUDY_COUNT -gt 0 ]; then
        echo ""
        echo -e "${BLUE}Sample studies:${NC}"
        ls "$DATA_DIR"/studies/*.json 2>/dev/null | head -5 | while read f; do
            basename "$f"
        done
    fi
else
    echo -e "${RED}❌ Ingestion failed with exit code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE