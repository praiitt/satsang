import json
import os
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("local_db")

class LocalDB:
    _instance = None
    _db_file = Path(__file__).parent / "music_tracks.json"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalDB, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        if not self._db_file.exists():
            try:
                with open(self._db_file, "w") as f:
                    json.dump([], f)
                logger.info(f"Created local DB at {self._db_file}")
            except Exception as e:
                logger.error(f"Failed to create local DB: {e}")

    def _read_db(self):
        try:
            if not self._db_file.exists():
                return []
            with open(self._db_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read local DB: {e}")
            return []

    def _write_db(self, data):
        try:
            with open(self._db_file, "w") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to write local DB: {e}")

    def save_music_track(self, user_id: str, track_data: dict):
        """Save a generated music track to local JSON file."""
        try:
            tracks = self._read_db()
            
            # Add metadata
            track_data["createdAt"] = datetime.utcnow().isoformat()
            track_data["userId"] = user_id
            
            tracks.append(track_data)
            self._write_db(tracks)
            logger.info(f"Saved track {track_data.get('title')} locally")
        except Exception as e:
            logger.error(f"Failed to save track locally: {e}")

    def get_user_tracks(self, user_id: str, limit: int = 5):
        """Get recent tracks for a user."""
        try:
            tracks = self._read_db()
            # Filter by user_id
            user_tracks = [t for t in tracks if t.get("userId") == user_id]
            # Sort by createdAt desc
            user_tracks.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return user_tracks[:limit]
        except Exception as e:
            logger.error(f"Failed to get tracks locally: {e}")
            return []
