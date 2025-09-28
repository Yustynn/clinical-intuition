Based on the requirements for generating prediction questions in the format "Did [Intervention]
  [improve/reduce/increase] [Outcome] at [Timeframe] in [Population] vs [Comparator]?" and your emphasis on
   participant counts and group details, here are the key fields we need from the ClinicalTrials.gov API:

  Core Protocol Fields

  identificationModule:
  - nctId - Study identifier
  - briefTitle / officialTitle - Study titles
  - acronym - Short study name

  statusModule:
  - overallStatus - COMPLETED, TERMINATED, etc.
  - whyStopped - Reason if terminated early
  - startDateStruct / completionDateStruct - Study timeline

  designModule:
  - studyType - Interventional/Observational
  - phases - Phase 1/2/3/4
  - designInfo.allocation - Randomized/Non-randomized
  - designInfo.interventionModel - Parallel/Crossover/etc.
  - designInfo.masking - Blinding details

  Population & Participants

  eligibilityModule:
  - sex - Male/Female/All
  - minimumAge / maximumAge - Age range
  - healthyVolunteers - Healthy vs patients
  - eligibilityCriteria - Inclusion/exclusion text

  participantFlowModule: ⭐ Critical for participant counts
  - groups[].title - Group names
  - groups[].description - Group descriptions
  - periods[].milestones[].participants[].count - Enrollment numbers
  - periods[].milestones[].participants[].groupId - Per-group counts

  baselineCharacteristicsModule: ⭐ Critical for population details
  - groups[] - Baseline group definitions
  - measures[].title - Demographics (Age, Sex, Race, etc.)
  - measures[].classes[].categories[].measurements[] - Actual values per group

  Interventions & Comparators

  armsInterventionsModule:
  - armGroups[].label - Arm names (e.g., "Intervention", "Control")
  - armGroups[].type - EXPERIMENTAL/ACTIVE_COMPARATOR/PLACEBO_COMPARATOR/NO_INTERVENTION
  - armGroups[].description - Detailed arm description
  - armGroups[].interventionNames[] - Links to interventions
  - interventions[].name - Intervention name
  - interventions[].type - DRUG/DEVICE/BEHAVIORAL/PROCEDURE/etc.
  - interventions[].description - How administered
  - interventions[].armGroupLabels[] - Which arms get this intervention

  Outcomes & Timeframes

  outcomesModule:
  - primaryOutcomes[].measure - Primary endpoint description
  - primaryOutcomes[].timeFrame - When measured (e.g., "12 weeks")
  - primaryOutcomes[].description - Detailed explanation
  - secondaryOutcomes[] - Same structure for secondary endpoints

  Results Data

  resultsSection.participantFlowModule: ⭐ Critical for final N
  - groups[].title / description - Final group definitions
  - periods[].title - Study phases
  - periods[].milestones[].title - "Started", "Completed", "Not Completed"
  - periods[].milestones[].participants[].count - Final numbers per group

  resultsSection.baselineCharacteristicsModule:
  - Final baseline characteristics with actual enrolled participants

  resultsSection.outcomeMeasuresModule: ⭐ Critical for success determination
  - outcomeMeasures[].title - Matches primary outcome
  - outcomeMeasures[].timeFrame - Measurement timepoint
  - outcomeMeasures[].groups[].title - Result group names
  - outcomeMeasures[].classes[].categories[].measurements[] - Actual values
    - .value - Mean, count, etc.
    - .spread - SD, CI, etc.
    - .groupId - Which group
    - .comment - Additional notes

  resultsSection.outcomeAnalysesModule: ⭐ Critical for statistical significance
  - outcomeAnalyses[].groupIds[] - Which groups compared
  - outcomeAnalyses[].paramType - "Mean Difference", "Risk Ratio", etc.
  - outcomeAnalyses[].paramValue - Effect size
  - outcomeAnalyses[].pValue - Statistical significance
  - outcomeAnalyses[].pValueComment - "<0.05", etc.
  - outcomeAnalyses[].ciNumSides / ciPercent / ciLowerLimit / ciUpperLimit - Confidence intervals
  - outcomeAnalyses[].analysisPopulationDescription - ITT, PP, etc.

  Essential Mappings for Question Generation

  [Intervention]: interventions[].name where armGroups[].type == "EXPERIMENTAL"
  [Comparator]: interventions[].name where armGroups[].type contains "COMPARATOR" or "CONTROL"[Outcome]:
  primaryOutcomes[].measure
  [Timeframe]: primaryOutcomes[].timeFrame
  [Population]: Derived from eligibilityModule + baselineCharacteristicsModule

  Participant Count Strategy

  1. Enrollment Intent: designModule.enrollmentInfo.count
  2. Actual Baseline: baselineCharacteristicsModule.groups[].count
  3. Final Analysis: resultsSection.participantFlowModule → "Completed" milestone counts
  4. Per-Group Breakdown: Track each arm separately for proper N reporting

  This structure gives us everything needed for:
  - Rich question generation with proper population descriptions
  - Accurate group comparisons with real participant counts
  - Statistical validity assessment with proper effect sizes and p-values
  - Robust success labeling based on pre-specified primary endpoints