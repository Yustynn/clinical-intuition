import ujson as json
import os

from glob import glob
from tqdm import tqdm
from typing import Any

from models import PValue, Intervention, Group, PrimaryOutcome, ValidStudy

RAW_STUDIES_DIR = "../raw_studies"


def parse_p_value(p: str) -> PValue | None:
    """
    Parse a p-value string and return a tuple of (comparison, value).


    Args:
        p (str): A p-value string that may contain comparison operators like '<', '>', '=' 
                 or just a numeric value
                 
    Returns:
        tuple: A tuple containing (comparison_operator, numeric_value) where:
               - comparison_operator is one of '<', '>', '=' or None if parsing failed
               - numeric_value is the float value or None if parsing failed
               
    Examples:
        parse_p_value('<0.05') -> PValue("<", 0.05)
        parse_p_value('0.032') -> PValue("=", 0.032)
        parse_p_value('>0.1') -> PValue(">", 0.1)
        parse_p_value('invalid') -> None
    """

    # remove whitespace that sometimes occurs (e.g., "< 0.05" --> "<0.05")
    p = ''.join(c for c in p if c != ' ')
    if p.startswith("<"):
        try:
            val = float(p[1:].strip())
            return PValue("<", val)
        except ValueError:
            return None
    elif p.startswith(">"):
        try:
            val = float(p[1:].strip())
            return PValue(">", val)
        except ValueError:
            return None
    elif p.startswith("="):
        try:
            val = float(p[1:].strip())
            return PValue("=", val)
        except ValueError:
            return None
    else:
        try:
            val = float(p)
            return PValue("=", val)
        except ValueError:
            return None

valid_studies: list[ValidStudy] = []

def extract_interventions(protocol_section: dict[str, Any]) -> list[Intervention]:
    """Extract intervention information"""

    arms_module = protocol_section.get('armsInterventionsModule', {})
    interventions_data = arms_module.get('interventions', [])
    
    interventions = []
    for i, intervention_data in enumerate(interventions_data):
        intervention = Intervention(
            name=intervention_data.get('name', f'Intervention {i+1}'),
            type=intervention_data.get('type', 'OTHER'),
            description=intervention_data.get('description', ''),
            arm_group_labels=intervention_data.get('armGroupLabels', [])
        )
        interventions.append(intervention)
    
    return interventions

def load_raw_studies_with_p_values(raw_studies_dir: str = RAW_STUDIES_DIR, max_studies_with_results: int | None = None) -> list[dict]:
    paths = glob(os.path.join(raw_studies_dir, "*.json"))

    raw_studies = []
    for path in tqdm(paths):
        if max_studies_with_results and len(raw_studies) >= max_studies_with_results:
            break

        with open(path, "r") as f:
            s = json.load(f)
            if "api_response" in s:
                s = s["api_response"]
            if s["hasResults"]:
                raw_studies.append(s)

    print(f"Loaded {len(raw_studies)} raw studies with results")

    raw_studies_p = []
    for s in raw_studies:
        has_p_value = False

        outcomes = s["resultsSection"]["outcomeMeasuresModule"]["outcomeMeasures"]
        primary_outcomes_results = [o for o in outcomes if o["type"] == "PRIMARY"]
        for o in primary_outcomes_results:
            if has_p_value:
                break

            if "analyses" in o:
                for analysis in o["analyses"]:
                    if "pValue" in analysis:
                        has_p_value = True
                        raw_studies_p.append(s)
                        break
    frac_p_val = len(raw_studies_p) / len(raw_studies)
    print(f"{len(raw_studies_p)} out of {len(raw_studies)} ({frac_p_val*100:<.2f}%) studies have p-values reported in primary outcomes analyses.")

    return raw_studies_p


def process_raw_study_with_p_values(s: dict[str, Any]) -> ValidStudy | None:
    primary_outcomes = []
    nct_id = s["protocolSection"]["identificationModule"]["nctId"]
    outcomes = s["resultsSection"]["outcomeMeasuresModule"]["outcomeMeasures"]
    interventions = extract_interventions(s["protocolSection"])
    arm_group_labels_to_intervention: dict[str, list[Intervention]] = {}

    for intervention in interventions:
        for label in intervention.arm_group_labels:
            label = label.lower()
            if label not in arm_group_labels_to_intervention:
                arm_group_labels_to_intervention[label] = []
            arm_group_labels_to_intervention[label].append(intervention)

    pos = [o for o in outcomes if o["type"] == "PRIMARY"]
    for i, o in enumerate(pos):
        if "analyses" in o:
            for analysis in o["analyses"]:
                group_id_to_count = {}
                for denom in o["denoms"]:
                    if denom["units"].lower() != "participants":
                        continue
                    for c in denom["counts"]:
                        group_id_to_count[c["groupId"]] = c["value"]
                
                if "pValue" in analysis:
                    p_value = parse_p_value(analysis["pValue"])
                    if p_value is None:
                        continue

                    primary_outcomes.append(PrimaryOutcome(
                        nct_id=nct_id,
                        id=f"{nct_id}_po_{i}",
                        title=o["title"],
                        description=o.get("description", ""),
                        population_description=o.get("populationDescription", ""),
                        timeframe=o.get("timeFrame", ""),
                        groups=[
                            Group(
                                id=g["id"],
                                title=g["title"],
                                description=g.get("description", ""),
                                interventions=arm_group_labels_to_intervention.get(g["title"].lower(), []),
                                num_participants=group_id_to_count.get(g["id"], 0)
                            ) for g in o["groups"] if g["id"] in analysis["groupIds"]
                        ],
                        p_value=p_value
                    ))

    if primary_outcomes:
        dmod = s["protocolSection"]["descriptionModule"]
        return ValidStudy(
            nct_id=nct_id,
            title=s["protocolSection"]["identificationModule"]["briefTitle"],
            description=dmod.get("detailedDescription", ""),
            brief_description=dmod.get("briefSummary", ""),
            primary_outcomes=primary_outcomes,
            interventions=interventions,
            conditions=s["protocolSection"]["conditionsModule"].get("conditions", []),
            keywords=s["protocolSection"]["conditionsModule"].get("keywords", []),
        )



def main(raw_studies_dir: str = RAW_STUDIES_DIR, max_studies: int | None = None) -> list[ValidStudy]:
    if max_studies is not None:
        raw_studies_p = load_raw_studies_with_p_values(raw_studies_dir, max_studies*10) # heuristic
    else:
        raw_studies_p = load_raw_studies_with_p_values(raw_studies_dir)
    valid_studies = []
    for s in raw_studies_p:
        study = process_raw_study_with_p_values(s)
        if study:
            valid_studies.append(study)
        if max_studies and len(valid_studies) >= max_studies:
            break

    return valid_studies