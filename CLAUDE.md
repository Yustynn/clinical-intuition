# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a clinical trial prediction market project that generates binary yes/no prediction questions from real clinical trial outcomes. The project ingests completed trials with results from ClinicalTrials.gov v2 API, normalizes endpoints, and precomputes binary ground truth labels per card ("Success/Fail/Unclear").

### Current Phase: Data gathering & preprocessing (Phase 1)

The project is currently implementing:
- Pulling completed studies with results from CT.gov v2 API
- Selecting clear primary endpoints per card (intervention → outcome → timeframe → population)
- Normalizing timeframes, units, and directionality (improve/reduce/increase)
- Computing binary labels (Yes/No/Unclear) with rationale snippets
- Writing to a minimal database structure (studies, endpoints, results_norm, cards)

### Phase 2 Goals (Future)
- Web app with card feed (yes/no, instant feedback), streaks, shares
- Shared mini-stacks (3–5 cards), anon play → soft signup
- Admin curation: retire/merge/spot-audit

## Architecture Overview

### Data Pipeline Architecture
The project follows a multi-stage data processing pipeline:

1. **Ingestor** - Fetches studies from ClinicalTrials.gov API with filters
2. **Endpoint Normalizer** - Normalizes timeframes and determines direction
3. **Results Aligner** - Maps outcome values & analyses, computes success labels
4. **Card Builder** - Generates clear question text using LLM for rewriting
5. **QC Sampler** - Manual review sampling for quality assurance

### Current Implementation Status
The project currently has a Jupyter notebook (`old/Play_Clean.ipynb`) that demonstrates the data fetching and analysis pipeline. This contains:

- API functions to fetch behavioral intervention studies from ClinicalTrials.gov
- Success assessment logic for determining intervention outcomes
- Statistical analysis methods for results with proper p-values and confidence intervals
- Question generation for prediction market cards
- CSV export functionality

### Data Model Structure

```
studies:
- nct_id (pk), brief_title, official_title
- conditions (jsonb), phase, study_type
- first_posted, results_first_posted, last_update_posted
- sponsor (jsonb), status, countries (jsonb)
- raw (jsonb) - original doc for auditing

endpoints:
- id (pk), nct_id (fk), is_primary (bool)
- measure, timeframe, units, population_text
- intervention_names (jsonb), comparator_name
- direction_norm ENUM('improve','reduce','increase','non-inferior')

results_norm:
- endpoint_id (fk), param_type, param_value, p_value
- ci_low, ci_high, analysis_population
- success_label ENUM('Yes','No','Unclear')
- rationale_snippet, source_paths (jsonb)

cards:
- id (pk), endpoint_id (fk), question_text
- answer ENUM('Y','N'), why_snippet
- difficulty (float), flags (jsonb)
```

### Success Assessment Logic

The system uses a comprehensive two-tier approach:
1. **Statistical Analysis** (preferred): Analyzes actual results data with p-values, effect sizes, and confidence intervals
2. **Status-based Assessment** (fallback): Uses study completion status and termination reasons

Success determination follows these rules:
- Primary, prespecified timepoint only
- Between-group inference (avoid within-group pre–post)
- p < 0.05 unless non-inferiority specified
- If multiple primary outcomes/timepoints, choose one with clear clinical meaning
- Mismatched timeframes → Unclear

## Development Commands

This is a Jupyter notebook-based project. To work with the existing analysis:

### Running the Analysis
```bash
jupyter notebook old/Play_Clean.ipynb
```

### Python Dependencies
The notebook uses standard Python libraries:
- urllib.request and urllib.parse for API calls
- json for data parsing
- csv for export functionality
- typing for type hints
- collections.Counter for data analysis

No package manager configuration files exist yet - dependencies are imported directly in the notebook.

## API Integration

### ClinicalTrials.gov v2 API
- Base URL: `https://clinicaltrials.gov/api/v2/studies`
- Filters: `hasResults = true`, `overallStatus in [COMPLETED, TERMINATED, SUSPENDED]`
- Query: `AREA[InterventionType]BEHAVIORAL` for behavioral interventions
- Pagination: Uses API tokens for incremental crawling

### Key Fields Extracted
**Protocol fields:**
- identificationModule: nctId, briefTitle/officialTitle
- conditionsModule: conditions[]
- armsInterventionsModule: arms[], interventions[]
- outcomesModule.primaryOutcomes[]
- eligibilityModule: sex, minimumAge, maximumAge

**Results fields:**
- resultsSection.outcomeMeasures[] with values per resultGroupCode
- resultsSection.outcomeAnalyses[]: paramType, paramValue, pValue, CI bounds
- resultsSection.resultGroups[] for arm mapping

## LLM Integration Points

The system uses LLM for offline preprocessing only (no runtime calls):

1. **Card Question Rewriting** - Convert clinical outcomes to layperson yes/no questions
2. **Ambiguity Checks** - Flag unclear measures, missing timeframes
3. **Direction Mapping** - Confirm direction_norm mapping (improve/reduce/increase)

Prompt templates to implement:
- `rewrite_card_prompt.txt`
- `direction_mapping_prompt.txt` 
- `ambiguity_check_prompt.txt`

## Quality Gates

Automated checks for generated cards:
- Readability: Flesch–Kincaid ≤ 10th grade
- Structure: Single intervention, outcome, timeframe, population phrase
- Deduplication: By nctId + outcome.measure + timeframe
- Content filtering: Exclude sensitive topics from casual play

## Testing and Validation

Manual QC process:
- Sample X% of cards for human review
- Admin UI shows: question, why_snippet, stats, JSON pointers
- Actions: approve/retire/edit
- Track disagreement rate: human spot-check vs pipeline label