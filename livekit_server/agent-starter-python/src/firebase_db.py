import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime

logger = logging.getLogger("firebase_db")

class FirebaseDB:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseDB, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.db = None
        try:
            # Check if already initialized
            if not firebase_admin._apps:
                # Use default credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
                # or try to find serviceAccountKey.json
                cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                if not cred_path and os.path.exists("serviceAccountKey.json"):
                    cred_path = "serviceAccountKey.json"
                
                if cred_path:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                else:
                    # Try initializing without explicit creds (e.g. cloud run)
                    firebase_admin.initialize_app()
            
            self.db = firestore.client()
            self._initialized = True
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    def save_music_track(self, user_id: str, track_data: dict):
        """Save a generated music track to Firestore."""
        if not self.db:
            logger.warning("Firebase not initialized, skipping save")
            return

        try:
            # Add timestamp
            track_data["createdAt"] = datetime.utcnow()
            track_data["userId"] = user_id
            
            # Save to 'music_tracks' collection
            self.db.collection("music_tracks").add(track_data)
            logger.info(f"Saved track {track_data.get('title')} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to save track: {e}")

    def get_user_tracks(self, user_id: str, limit: int = 5):
        """Get recent tracks for a user."""
        if not self.db:
            return []

        try:
            docs = (
                self.db.collection("music_tracks")
                .where("userId", "==", user_id)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Failed to get tracks: {e}")
            return []
