# Clinical Trial Prediction Market Data Pipeline

A comprehensive data ingestion and processing pipeline for behavioral intervention clinical trials from ClinicalTrials.gov, designed to support prediction market question generation.

## Overview

This system ingests behavioral intervention studies with posted results from ClinicalTrials.gov and structures the data for generating prediction market questions in the format:

> "Did [Intervention] [improve/reduce/increase] [Outcome] at [Timeframe] in [Population] vs [Comparator]?"

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run comprehensive ingestion (fetches all ~5,857 eligible studies)
./scripts/ingest_all.sh

# 3. Inspect results
jupyter notebook notebooks/working_inspection.ipynb
```

## Data Pipeline Architecture

```
ClinicalTrials.gov API
        ↓
    Ingestor (Filter & Fetch)
        ↓
    Field Mapper (Structure)
        ↓
    JSON Store (Storage)
        ↓
    [Future: Normalizer → Aligner → Builder → QC]
```

## Key Statistics

- **Total behavioral intervention studies**: 57,388
- **COMPLETED behavioral studies**: 34,545
- **Studies with results**: ~5,857 (17% of completed)
- **Processing rate**: ~55 studies/second
- **Estimated ingestion time**: 10-15 minutes for all studies

## Project Structure

```
.
├── src/
│   ├── ingestion/        # Stage 1: Raw data → Structured data
│   │   ├── api/
│   │   │   └── client.py     # ClinicalTrials.gov API v2 client
│   │   ├── processing/
│   │   │   └── field_mapper.py   # Maps API responses to data models
│   │   └── orchestrator.py      # Main ingestion coordinator
│   ├── extraction/       # Stage 2: Study data → Prediction cards (future)
│   ├── database/         # Stage 3: Cards → Production DB (future)
│   ├── models/           # Shared data models (Study, Intervention, Outcome)
│   ├── storage/          # Storage abstraction layer
│   │   └── json_store.py     # JSON-based storage
│   └── utils/            # Utilities (logging, config)
├── scripts/
│   ├── ingest_all.sh          # Shell wrapper for full ingestion
│   ├── ingest_all_studies.py  # Comprehensive ingestion with progress
│   ├── run_ingestor.py        # Production ingestion script
│   └── test_ingestor.py       # Test script for small batches
├── notebooks/
│   ├── working_inspection.ipynb  # Inspect ingested studies
│   └── simple_test.ipynb         # Basic functionality tests
├── tests/                # Test suite
└── data/                 # Output directory (created on first run)
    ├── studies/          # Individual study JSON files
    ├── raw_studies/      # Raw API responses (optional)
    └── metadata/         # Ingestion logs and stats
```

## Ingestion Scripts

### Full Ingestion (Recommended)

```bash
# Ingest ALL studies meeting criteria (~5,857 studies)
./scripts/ingest_all.sh

# Options:
#   -d, --data-dir DIR     Output directory (default: ./data)
#   -l, --log-level LEVEL  Log level (default: WARNING)
#   --save-raw             Save raw API responses
#   -y, --yes              Skip confirmation
```

### Production Script

```bash
# Flexible production ingestion
python3 scripts/run_ingestor.py \
    --max-studies 2000 \
    --data-dir ./production_data \
    --include-active \
    --save-raw
```

### Test Ingestion

```bash
# Quick test with 10 studies
python3 scripts/test_ingestor.py
```

## Filtering Criteria

### API-Level Filters (Efficient)
- ✅ **Behavioral interventions**: `AREA[InterventionType]BEHAVIORAL`
- ✅ **Completed status**: `AREA[OverallStatus]COMPLETED`

### Post-Processing Filters (Required)
- ✅ **Has results**: `hasResults=True`
- ✅ **Interventional studies**: `studyType=INTERVENTIONAL`
- ✅ **Valid interventions**: At least one intervention defined
- ✅ **Primary outcomes**: At least one primary outcome defined

### Excluded Studies
- ❌ Studies without posted results
- ❌ Observational studies
- ❌ Studies with status: RECRUITING, TERMINATED, WITHDRAWN
- ❌ Studies missing core data fields

## Data Models

### Study
Core study object containing:
- Identification (NCT ID, title)
- Status information
- Design details (phases, study type)
- Interventions list
- Outcomes (primary/secondary)
- Results data (if available)
- Population/eligibility criteria

### Intervention
- Name and type
- Description
- Associated arm/group information

### Outcome
- Measure name
- Time frame
- Description
- Associated results

## API Integration

The system uses ClinicalTrials.gov API v2 with:
- Bulk fetching (1000 studies per request)
- Comprehensive field extraction
- Automatic pagination
- Rate limiting (0.1s between requests)
- Retry logic for transient failures

## Performance Optimizations

1. **API-level filtering** reduces data transfer by 40%
2. **Bulk comprehensive field fetching** improves speed by 78x
3. **Streaming processing** for memory efficiency
4. **Parallel field extraction** where possible

## Data Quality

- **Success rate**: ~17% of COMPLETED behavioral studies have results
- **Validation**: Strict filtering ensures high-quality data
- **Error tracking**: Failed studies logged with reasons
- **Duplicate detection**: Prevents redundant processing

## Development

### Setup

```bash
# Clone repository
git clone <repository-url>
cd prediction-preregistered-trial

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/
```

### Testing

```bash
# Unit tests
pytest tests/test_api_client.py
pytest tests/test_field_mapper.py

# Integration tests
pytest tests/test_ingestor_simple.py

# Manual testing
python3 scripts/test_ingestor.py
```

### Notebooks

Use Jupyter notebooks for data exploration:

```bash
jupyter notebook notebooks/working_inspection.ipynb
```

## Troubleshooting

### Common Issues

1. **0% success rate**
   - Normal for small samples (< 50 studies)
   - Try `--max-studies 200` or more

2. **Import errors**
   - Run from project root directory
   - Ensure src/ is in Python path

3. **Network timeouts**
   - Increase timeout: `--timeout 60`
   - Add delays: `--sleep-delay 0.2`

4. **API rate limits**
   - Default 0.1s delay prevents this
   - Increase if needed: `--sleep-delay 0.5`

### Debug Mode

```bash
# Enable debug logging and save raw responses
python3 scripts/ingest_all_studies.py \
    --log-level DEBUG \
    --save-raw \
    --data-dir ./debug_data
```

## Output Format

### Study JSON Structure

```json
{
  "nct_id": "NCT12345678",
  "brief_title": "Study Title",
  "overall_status": "COMPLETED",
  "has_results": true,
  "interventions": [...],
  "primary_outcomes": [...],
  "results": {...}
}
```

### Metadata Format

```json
{
  "timestamp": "2025-09-28T12:00:00",
  "total_fetched": 35000,
  "studies_with_results": 5857,
  "success_rate": 0.17,
  "duration_seconds": 600
}
```

## Future Pipeline Stages

### Normalizer (Planned)
- Standardize intervention names
- Normalize outcome measures
- Clean population descriptions

### Aligner (Planned)
- Match interventions to comparators
- Align timeframes
- Group related outcomes

### Builder (Planned)
- Generate prediction questions
- Create market cards
- Format for prediction platforms

### Quality Control (Planned)
- Validate question clarity
- Check statistical power
- Verify result availability

## Requirements

- Python 3.8+
- ~200 MB disk space for full dataset
- Internet connection for API access
- Optional: `rich` library for enhanced progress display

```bash
pip install rich  # Optional, for better progress bars
```

## License

[Add license information]

## Contributing

[Add contribution guidelines]

## Support

For issues or questions:
- Check troubleshooting section above
- Review error logs in `data/ingestion_errors_*.json`
- Open an issue with error details and configuration used