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
                cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
                
                # Robust search for credential file using Path relative to this script
                # Script is in .../satsang/livekit_server/agent-starter-python/src/firebase_db.py
                # Root is .../satsang/satsangServiceAccount.json
                
                current_file = Path(__file__).resolve()
                src_dir = current_file.parent # src
                agent_dir = src_dir.parent # agent-starter-python
                livekit_dir = agent_dir.parent # livekit_server
                repo_root = livekit_dir.parent # satsang (root)
                
                potential_paths = [
                    os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
                    os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
                    str(repo_root / "satsangServiceAccount.json"), # Best guess based on repo structure
                    str(agent_dir / "satsangServiceAccount.json"),
                    "satsangServiceAccount.json",
                    "../satsangServiceAccount.json",
                    "../../satsangServiceAccount.json", 
                    "../../../satsangServiceAccount.json",
                    "/home/prakash/satsang/satsangServiceAccount.json",
                    "/home/prakash/testproj/satsang/satsangServiceAccount.json" # Add the observed VM path
                ]
                
                final_cred_path = None
                for path in potential_paths:
                    if path and os.path.exists(path):
                        final_cred_path = path
                        logger.info(f"✅ Found credential file at: {final_cred_path}")
                        break
                
                if final_cred_path:
                    cred = credentials.Certificate(final_cred_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("✅ Firebase initialized with certificate")
                else:
                    logger.warning(f"⚠️ No credential file found. Checked: {[p for p in potential_paths if p]}")
                    # Try initializing without explicit creds
                    firebase_admin.initialize_app()
            
            self.db = firestore.client()
            self._initialized = True
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    def save_music_track(self, user_id: str, track_data: dict, track_id: str = None):
        """Save a generated music track to Firestore."""
        if not self.db:
            logger.warning("Firebase not initialized, skipping save")
            return

        try:
            # Add timestamp
            track_data["createdAt"] = datetime.utcnow()
            track_data["userId"] = user_id
            
            # Save to 'music_tracks' collection
            if track_id:
                self.db.collection("music_tracks").document(track_id).set(track_data, merge=True)
            else:
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
    def get_satsang_plan(self, plan_id: str):
        """Get a pre-generated satsang plan."""
        if not self.db:
            return None

        try:
            doc = self.db.collection("satsang_plans").document(plan_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Failed to get satsang plan: {e}")
            return None
