"""
Game models for prediction market cards and user interactions.
"""
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import Any, Dict, List, Optional


@dataclass
class Card:
    """Prediction market card for binary yes/no questions"""
    id: Optional[str] = None
    endpoint_id: str = ""
    
    # Question content
    question_text: str = ""
    answer: Optional[bool] = None  # True = Yes, False = No, None = Unclear
    why_snippet: str = ""
    
    # Gameplay metadata
    difficulty: Optional[float] = None  # 0.0-1.0, updated after gameplay
    flags: Dict[str, Any] = field(default_factory=dict)  # e.g., {"sensitive": True, "retired": False}
    
    # Quality metrics
    readability_score: Optional[float] = None
    ambiguity_flags: List[str] = field(default_factory=list)
    
    # Processing metadata
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

    @property
    def answer_label(self) -> str:
        """Human-readable answer label"""
        if self.answer is True:
            return "Y"
        elif self.answer is False:
            return "N"
        else:
            return "Unclear"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "endpoint_id": self.endpoint_id,
            "question_text": self.question_text,
            "answer": self.answer_label,
            "why_snippet": self.why_snippet,
            "difficulty": self.difficulty,
            "flags": self.flags,
            "readability_score": self.readability_score,
            "ambiguity_flags": self.ambiguity_flags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approved_by": self.approved_by
        }


@dataclass
class Play:
    """User interaction with a prediction card"""
    id: Optional[str] = None
    user_id: Optional[str] = None  # Anonymous users have None
    card_id: str = ""
    guess: bool = False  # True = Yes, False = No
    correct: Optional[bool] = None  # Computed from card.answer
    response_time_ms: Optional[int] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(UTC)