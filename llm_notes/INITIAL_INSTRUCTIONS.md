From: ChatGPT https://chatgpt.com/g/g-p-68d4fc73fc908191b1c434b36d210be2-prediction-markets/c/68d80daf-4308-832a-b1c3-b05a18c0550b
Datetime: 2025-09-28 01:50

Clinical Trial Intuition — Spec (Data Pipeline → Card Game)
0) One-liner

A fast, binary yes/no game about real clinical trial outcomes. We ingest completed trials with posted results from ClinicalTrials.gov v2 API, clean + normalize endpoints, and precompute a binary ground truth per card (“Success/Fail/Unclear”). Gameplay is instant; no LLM calls at runtime.

1) Goals (Phase 1 → Phase 2)
Phase 1 (this sprint): Data gathering & preprocessing

Pull completed studies with results from CT.gov v2 API.

Select one clear primary endpoint per card (intervention → outcome → timeframe → population).

Normalize timeframes, units, and directionality (improve/reduce/increase).

Compute binary label (Yes/No/Unclear) with rationale snippet and pointers to raw stats.

Write to a minimal DB (studies, endpoints, results_norm, cards).

Phase 2 (later): Product surfaces

Web app with card feed (yes/no, instant feedback), streaks, shares.

Shared mini-stacks (3–5 cards), anon play → soft signup.

Admin curation: retire/merge/spot-audit.

Non-Goals (now): live predictions, medical advice, active/ongoing trials.

2) Users & Value

Prediction-market / rationalist / science crowd who enjoy “how well do I calibrate?” micro-games.

Value: fast feedback loop → intuition for what tends to work in interventions.

3) Data Source (CT.gov v2)

Base: ClinicalTrials.gov Study Data Structure (JSON).

Filter:

hasResults = true

overallStatus in [COMPLETED, TERMINATED, SUSPENDED] (tune as needed)

(Optional) studyType = Interventional

Pagination: use API tokens; store last_run_at and last_update_posted to re-crawl incrementally.

4) Fields to Extract (minimal but sufficient)
4.1 Protocol (to compose the question)

identificationModule: nctId, briefTitle/officialTitle

conditionsModule: conditions[]

designModule: studyType, phase

armsInterventionsModule:

arms[] (titles/descriptions) → label intervention arm(s) and comparator

interventions[] (name + type: drug/device/behavioral/etc.)

outcomesModule.primaryOutcomes[]: pick one (fields: measure, timeFrame, description, population?)

eligibilityModule: sex, minimumAge, maximumAge, + (optional) parse a short population phrase from criteria

4.2 Results (to decide success)

resultsSection.outcomeMeasures[] with values per resultGroupCode and timeFrame matching the chosen primary outcome.

resultsSection.outcomeAnalyses[]:

paramType (e.g., Mean Difference, Risk Ratio)

paramValue, pValue (+ modifier), dispersionType, CI low/high

analysisPopulationDescription, nonInferiorityType (if present)

resultsSection.resultGroups[] to map arm ↔ results safely.

(Optional QC) participantFlow, baselineCharacteristics, adverseEventsModule.

4.3 Housekeeping

Dates: studyFirstPostDate, resultsFirstPostDate, lastUpdatePostDate

sponsorCollaboratorsModule

referencesModule (publications if any)

5) Normalization & Labeling Logic
5.1 Endpoint selection

Heuristic (rule-first, LLM-second if needed):

Prefer primary outcomes.

Prefer patient-relevant and unambiguous measures.

Pick a single timepoint (normalize semantics like “Week 12”, “6 months”).

Collapse verbose scales to a common-sense label (map dictionary, e.g., “EQ-5D” → “quality of life”).

5.2 Directionality

Infer direction from measure name/description:

“lower is better”: pain, CAPS-IV (PTSD), HbA1c, LDL, etc.

“higher is better”: step count, sleep duration, SPPB, QoL (most).

Store normalized direction_norm ∈ {improve, reduce, increase, non-inferior}.

5.3 Success decision (binary)

Given chosen endpoint and matched results:

If a between-group inferential stat exists at the exact timepoint:

If effect aligns with direction_norm and pValue < 0.05 (two-sided unless specified) → Success = Yes.

Else if clearly opposite or non-sig → Success = No.

If only descriptive summaries or mismatched timeframes → Success = Unclear (exclude from cards).

Capture: paramType, paramValue, pValue, ci_low/high, analysisPopulationDescription and a rationaleSnippet (one line).

(Later: add non-inferiority logic, multiplicity notes, or effect-size thresholds.)

6) LLM Tasks (Phase 1, offline only)

Use a small model to:

Rewrite outcome to layperson card
Input: intervention/comparator, primary outcome text, timeframe, short population.
Output: “Did [Intervention] [improve/reduce/increase] [Outcome] at [Timeframe] in [Population] vs [Comparator]?”

Ambiguity checks

Flag unclear measures (“change of what?”), multi-endpoint conflation, missing timeframe.

Direction sanity

Confirm direction_norm mapping (fallback to manual rules if LLM is unsure).

No LLM during gameplay. Cache all outputs.

Prompt skeletons (for Claude Code to implement):

rewrite_card_prompt.txt

direction_mapping_prompt.txt

ambiguity_check_prompt.txt

7) Quality Gates (automated)

Readability: Flesch–Kincaid ≤ 10th grade (or similar metric).

Ambiguity: must contain single intervention, outcome, timeframe, population phrase.

Dupes: de-dupe by nctId + outcome.measure + timeframe.

Exclusions: sensitive active-harm topics (configurable list) from casual play.

8) Data Model (MVP)
tables

studies

nct_id (pk)

brief_title, official_title

conditions (jsonb)

phase, study_type

first_posted, results_first_posted, last_update_posted

sponsor (jsonb)

status, countries (jsonb)

raw (jsonb) (optional: original doc for auditing)

endpoints (0..n per study; 0..1 chosen for card)

id (pk), nct_id (fk)

is_primary (bool)

measure, timeframe, units?, population_text?

intervention_names (jsonb), comparator_name

direction_norm ENUM('improve','reduce','increase','non-inferior')

results_norm

endpoint_id (fk)

param_type, param_value, p_value, p_modifier?

ci_low, ci_high, dispersion_type?

analysis_population

success_label ENUM('Yes','No','Unclear')

rationale_snippet text

source_paths jsonb (JSON pointers to exact nodes used)

cards

id (pk), endpoint_id (fk)

question_text

answer ENUM('Y','N') // exclude if Unclear

why_snippet

difficulty float // init null; update after gameplay

flags jsonb // e.g., sensitive, retired

plays

id, user_id?, card_id, guess bool, correct bool, ts

9) Services / Jobs
9.1 Ingestor (cron or CLI)

Inputs: since_date?, pagination token.

Steps:

Fetch studies with filters.

Upsert into studies.raw.

Extract protocol fields; create candidate endpoints.

9.2 Endpoint Normalizer

For each candidate endpoint:

Normalize timeframe (e.g., “Weeks 12–24” → “Week 12” if prespecified; otherwise mark Unclear).

Determine direction_norm via rules + LLM check.

Map arms/interventions → label one intervention, one comparator.

9.3 Results Aligner

Use resultGroups to map group codes.

Find outcome values & analyses at the exact timeframe.

Extract stats; compute success_label + rationale_snippet.

9.4 Card Builder

If success_label ∈ {Yes, No}:

Ask LLM to rewrite a clear question_text.

Run quality gates; store to cards.

If Unclear: mark excluded; keep in results_norm for auditing.

9.5 QC Sampler

Sample X% of cards for manual review.

Admin UI shows: question, why_snippet, stats, JSON pointers, “approve/retire/edit” actions.

10) Internal APIs (for MVP app)

GET /cards?limit=&after= → cached questions (no LLM call)

GET /cards/:id → details + why_snippet + NCT link

POST /plays → { card_id, guess } → returns { correct, others_pct, rationale_snippet }

POST /report → { card_id, reason, text }

POST /share → returns magic link token to single card or mini-stack

(For Phase 1, only /cards and /cards/:id are necessary for basic preview tooling.)

11) Labeling Rules (explicit)

Primary, prespecified timepoint only.

Between-group inference (avoid within-group pre–post).

p < 0.05 unless non-inferiority specified; then follow margin sign.

If multiple primary outcomes/timepoints, choose one: prefer the one with clear clinical meaning and complete stats.

If mismatch (e.g., result at 12 weeks, outcome says 24 weeks) → Unclear.

12) Prompts (sketch)

rewrite_card_prompt.txt

System: You convert clinical outcomes into a layperson yes/no question.
User:
Intervention: {intervention}
Comparator: {comparator}
Outcome measure: {measure} (units: {units?})
Direction: {direction_norm}
Timeframe: {timeframe}
Population: {population_phrase}

Write a single sentence in this template:
"Did {Intervention} {verb} {Outcome} at {Timeframe} in {Population} vs {Comparator}?"
- choose verb from direction: improve/reduce/increase
- avoid jargon; <= 22 words; no abbreviations unless household (HbA1c OK).
Return only the question text.


ambiguity_check_prompt.txt

Return JSON { ok:boolean, reasons:string[] }
Check: one intervention, one comparator, one outcome, one timeframe, a readable population phrase.

13) Metrics (Phase 1)

% of eligible studies → % with a card-worthy endpoint (pass rate)

% Unclear due to missing analysis

Avg processing time per study

Disagreement rate: human spot-check vs pipeline label

(Phase 2 KPIs: time per card <10s, cards/session, share rate, anon→signup conversion.)

14) Risks & Mitigations

Inconsistent results mapping → always resolve via resultGroups; store JSON pointers.

Ambiguous directionality → rules first, LLM confirmation, fallback to Unclear.

Sensitive topics → tag via keyword lists + reporter feedback; down-weight or exclude.

Multiple primary outcomes → deterministic tie-break rules; log fallbacks.

15) Milestones

M1: Ingest + Store Raw

CLI to fetch studies (filters/pagination), persist studies.raw & key protocol fields.

M2: Endpoint & Result Alignment

Select primary endpoint; align groups; extract stats; label success.

M3: LLM Cleanup + QC Gates

Rewrite question; run ambiguity/readability; write cards.

M4: Minimal Preview UI

Internal only: list cards, view details + why_snippet.

16) Example Output (single card record)
{
  "card": {
    "id": "card_8f3a",
    "endpoint_id": "ep_42",
    "question_text": "Did treadmill training increase daily energy expenditure at 6 months in stroke survivors vs stretching?",
    "answer": "Y",
    "why_snippet": "Between-group mean difference favored treadmill at 6 months (p=0.02; n=142).",
    "difficulty": null,
    "flags": []
  },
  "results_norm": {
    "param_type": "Mean Difference",
    "param_value": 138.4,
    "p_value": 0.02,
    "ci_low": 20.1,
    "ci_high": 256.7,
    "analysis_population": "ITT",
    "success_label": "Yes",
    "source_paths": [
      "$.resultsSection.outcomeAnalyses[1]",
      "$.resultsSection.outcomeMeasures[0].measurements[2]"
    ]
  }
}
