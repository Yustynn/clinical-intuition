from dataclasses import dataclass

@dataclass
class PValue:
    comparator: str
    value: float

@dataclass
class Intervention:
    name: str
    type: str
    description: str
    arm_group_labels: list[str]

@dataclass
class Group:
    id: str
    title: str
    description: str
    num_participants: int
    interventions: list[Intervention]

@dataclass
class PrimaryOutcome:
    nct_id: str
    id: str
    title: str
    description: str
    population_description: str
    timeframe: str
    groups: list[Group]
    p_value: PValue

    def check_success(self) -> bool | None:
        if self.p_value.comparator in ("<", "<=", "="):
            return self.p_value.value <= 0.05
        elif self.p_value.comparator in (">", ">="):
            return False
        else:
            raise ValueError(f"Unknown comparator: {self.p_value.comparator}")



@dataclass
class ValidStudy:
    nct_id: str
    title: str
    description: str
    conditions: list[str]
    keywords: list[str]
    brief_description: str
    primary_outcomes: list[PrimaryOutcome]
    interventions: list[Intervention]
    decks: list[str]

