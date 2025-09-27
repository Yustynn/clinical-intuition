"""
JSON-based data storage for development and prototyping.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from dataclasses import asdict
from enum import Enum
import uuid

from models.core import Study, Endpoint, ResultNorm, Card, Play, StatisticalAnalysis
from utils.logging import get_logger

logger = get_logger(__name__)

T = TypeVar('T')


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for dataclasses and datetime objects"""
    
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Enum):
            return obj.value
        elif hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        return super().default(obj)


class JSONStore:
    """Simple JSON-based storage for development"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for each data type
        self.studies_dir = self.data_dir / "studies"
        self.endpoints_dir = self.data_dir / "endpoints" 
        self.results_dir = self.data_dir / "results"
        self.cards_dir = self.data_dir / "cards"
        self.plays_dir = self.data_dir / "plays"
        
        for dir_path in [self.studies_dir, self.endpoints_dir, self.results_dir, self.cards_dir, self.plays_dir]:
            dir_path.mkdir(exist_ok=True)
        
        logger.info(f"JSON store initialized at {self.data_dir}")

    def _generate_id(self) -> str:
        """Generate a unique ID"""
        return str(uuid.uuid4())

    def _get_file_path(self, data_type: str, item_id: str) -> Path:
        """Get file path for storing an item"""
        type_mapping = {
            "study": self.studies_dir,
            "endpoint": self.endpoints_dir,
            "result": self.results_dir,
            "card": self.cards_dir,
            "play": self.plays_dir
        }
        return type_mapping[data_type] / f"{item_id}.json"

    def _save_item(self, data_type: str, item_id: str, data: Dict[str, Any]):
        """Save an item to JSON file"""
        file_path = self._get_file_path(data_type, item_id)
        
        # Add metadata
        data["_id"] = item_id
        data["_updated_at"] = datetime.utcnow().isoformat()
        
        with open(file_path, 'w') as f:
            json.dump(data, f, cls=JSONEncoder, indent=2)

    def _load_item(self, data_type: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Load an item from JSON file"""
        file_path = self._get_file_path(data_type, item_id)
        
        if not file_path.exists():
            return None
        
        with open(file_path, 'r') as f:
            return json.load(f)

    def _list_items(self, data_type: str) -> List[str]:
        """List all item IDs of a given type"""
        type_mapping = {
            "study": self.studies_dir,
            "endpoint": self.endpoints_dir,
            "result": self.results_dir,
            "card": self.cards_dir,
            "play": self.plays_dir
        }
        
        dir_path = type_mapping[data_type]
        return [f.stem for f in dir_path.glob("*.json")]

    def save_study(self, study: Study) -> str:
        """Save a study and return its ID"""
        study_id = study.nct_id
        study.updated_at = datetime.utcnow()
        
        if study.created_at is None:
            study.created_at = datetime.utcnow()
        
        data = asdict(study)
        self._save_item("study", study_id, data)
        
        logger.debug(f"Saved study {study_id}")
        return study_id

    def get_study(self, nct_id: str) -> Optional[Study]:
        """Get a study by NCT ID"""
        data = self._load_item("study", nct_id)
        if not data:
            return None
        
        # Remove metadata fields
        data.pop("_id", None)
        data.pop("_updated_at", None)
        
        # Parse datetime fields
        for field in ["created_at", "updated_at", "first_posted", "results_first_posted", "last_update_posted"]:
            if data.get(field):
                data[field] = datetime.fromisoformat(data[field])
        
        return Study(**data)

    def list_studies(self) -> List[str]:
        """List all study NCT IDs"""
        return self._list_items("study")

    def save_endpoint(self, endpoint: Endpoint) -> str:
        """Save an endpoint and return its ID"""
        if not endpoint.id:
            endpoint.id = self._generate_id()
        
        endpoint.created_at = datetime.utcnow()
        
        data = asdict(endpoint)
        self._save_item("endpoint", endpoint.id, data)
        
        logger.debug(f"Saved endpoint {endpoint.id}")
        return endpoint.id

    def get_endpoint(self, endpoint_id: str) -> Optional[Endpoint]:
        """Get an endpoint by ID"""
        data = self._load_item("endpoint", endpoint_id)
        if not data:
            return None
        
        # Remove metadata fields
        data.pop("_id", None)
        data.pop("_updated_at", None)
        
        # Parse datetime fields
        if data.get("created_at"):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        
        return Endpoint(**data)

    def list_endpoints_for_study(self, nct_id: str) -> List[Endpoint]:
        """List all endpoints for a study"""
        endpoints = []
        for endpoint_id in self._list_items("endpoint"):
            endpoint = self.get_endpoint(endpoint_id)
            if endpoint and endpoint.nct_id == nct_id:
                endpoints.append(endpoint)
        return endpoints

    def save_result(self, result: ResultNorm) -> str:
        """Save a result and return its ID"""
        result_id = f"result_{result.endpoint_id}"
        result.created_at = datetime.utcnow()
        
        data = asdict(result)
        self._save_item("result", result_id, data)
        
        logger.debug(f"Saved result for endpoint {result.endpoint_id}")
        return result_id

    def get_result(self, endpoint_id: str) -> Optional[ResultNorm]:
        """Get a result by endpoint ID"""
        result_id = f"result_{endpoint_id}"
        data = self._load_item("result", result_id)
        if not data:
            return None
        
        # Remove metadata fields
        data.pop("_id", None)
        data.pop("_updated_at", None)
        
        # Parse datetime fields
        if data.get("created_at"):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        
        # Reconstruct nested StatisticalAnalysis if present
        if data.get("analysis") and isinstance(data["analysis"], dict):
            data["analysis"] = StatisticalAnalysis(**data["analysis"])
        
        return ResultNorm(**data)

    def save_card(self, card: Card) -> str:
        """Save a card and return its ID"""
        if not card.id:
            card.id = self._generate_id()
        
        if card.created_at is None:
            card.created_at = datetime.utcnow()
        
        data = asdict(card)
        self._save_item("card", card.id, data)
        
        logger.debug(f"Saved card {card.id}")
        return card.id

    def get_card(self, card_id: str) -> Optional[Card]:
        """Get a card by ID"""
        data = self._load_item("card", card_id)
        if not data:
            return None
        
        # Remove metadata fields
        data.pop("_id", None)
        data.pop("_updated_at", None)
        
        # Parse datetime fields
        for field in ["created_at", "approved_at"]:
            if data.get(field):
                data[field] = datetime.fromisoformat(data[field])
        
        return Card(**data)

    def list_cards(self, limit: Optional[int] = None) -> List[Card]:
        """List all cards, optionally with a limit"""
        cards = []
        card_ids = self._list_items("card")
        
        if limit:
            card_ids = card_ids[:limit]
        
        for card_id in card_ids:
            card = self.get_card(card_id)
            if card:
                cards.append(card)
        
        # Sort by creation time, newest first
        cards.sort(key=lambda c: c.created_at or datetime.min, reverse=True)
        return cards

    def save_play(self, play: Play) -> str:
        """Save a play and return its ID"""
        if not play.id:
            play.id = self._generate_id()
        
        if play.created_at is None:
            play.created_at = datetime.utcnow()
        
        data = asdict(play)
        self._save_item("play", play.id, data)
        
        logger.debug(f"Saved play {play.id}")
        return play.id

    def get_play(self, play_id: str) -> Optional[Play]:
        """Get a play by ID"""
        data = self._load_item("play", play_id)
        if not data:
            return None
        
        # Remove metadata fields
        data.pop("_id", None)
        data.pop("_updated_at", None)
        
        # Parse datetime fields
        if data.get("created_at"):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        
        return Play(**data)

    def get_stats(self) -> Dict[str, int]:
        """Get storage statistics"""
        return {
            "studies": len(self._list_items("study")),
            "endpoints": len(self._list_items("endpoint")),
            "results": len(self._list_items("result")),
            "cards": len(self._list_items("card")),
            "plays": len(self._list_items("play"))
        }