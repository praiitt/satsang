import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime
import pathlib

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
                
                current_file = pathlib.Path(__file__).resolve()
                src_dir = current_file.parent # src
                agent_dir = src_dir.parent # agent-starter-python
                livekit_dir = agent_dir.parent # livekit_server
                repo_root = livekit_dir.parent # satsang (root)
                
                potential_paths = [
                    os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
                    os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
                    str(agent_dir / "satsangServiceAccount.json"), # First priority: agent-starter-python directory
                    str(repo_root / "satsangServiceAccount.json"), # Second: repo root
                    "satsangServiceAccount.json",
                    "../satsangServiceAccount.json",
                    "../../satsangServiceAccount.json", 
                    "../../../satsangServiceAccount.json",
                    "/home/prakash/satsang/satsangServiceAccount.json",
                    "/home/prakash/testproj/satsang/satsangServiceAccount.json",
                    "/home/prakash/testproj/prod_v1/satsang/satsangServiceAccount.json" # Explicitly add the prod path
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
            # Add timestamp and userId
            track_data["createdAt"] = datetime.utcnow()
            track_data["userId"] = user_id
            track_data["status"] = track_data.get("status", "PENDING")
            track_data["tracks"] = track_data.get("tracks", [])  # Initialize tracks array for callback
            track_data["isPublic"] = track_data.get("isPublic", False)
            
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

    def get_user_coins(self, user_id: str) -> int:
        """Get the current coin balance for a user from coinBalances collection."""
        if not self.db or not user_id or user_id == "default_user":
            return 0
        try:
            doc = self.db.collection("coinBalances").document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                # totalCoins is the field used in rraasi-coin-service
                return data.get("totalCoins", 0)
            return 0
        except Exception as e:
            logger.error(f"Failed to get user coins for {user_id}: {e}")
            return 0
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

    def save_chat_message(self, user_id: str, agent_name: str, role: str, content: str):
        """Save a chat message to Firestore."""
        if not self.db:
            return

        try:
            timestamp = datetime.utcnow()
            message_data = {
                "userId": user_id,
                "agentId": agent_name,
                "role": role,
                "content": content,
                "timestamp": timestamp,
                "createdAt": timestamp
            }
            
            self.db.collection("chat_history").add(message_data)
            # logger.info(f"Saved {role} message for {user_id}")
        except Exception as e:
            logger.error(f"Failed to save chat message: {e}")

    def get_chat_history(self, user_id: str, agent_name: str, limit: int = 20):
        """Get recent chat history for a user and agent."""
        if not self.db:
            return []

        try:
            docs = (
                self.db.collection("chat_history")
                .where("userId", "==", user_id)
                .where("agentId", "==", agent_name)
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            
            # Return reversed (oldest first) for context loading
            history = []
            for doc in docs:
                data = doc.to_dict()
                history.append(data)
            
            return list(reversed(history))
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            return []

    
    def save_session_transcript(self, room_name: str, session_data: dict, transcript: list):
        """Save the full session transcript to Firestore."""
        if not self.db:
            return

        try:
            doc_data = {
                "roomName": room_name,
                "createdAt": datetime.utcnow(),
                "transcript": transcript,
                **session_data  # userId, agentName, etc.
            }
            
            # Use room_name as document ID for easy lookup
            self.db.collection("session_transcripts").document(room_name).set(doc_data, merge=True)
            logger.info(f"✅ Saved session transcript for room {room_name} ({len(transcript)} messages)")
        except Exception as e:
            logger.error(f"❌ Failed to save session transcript: {e}")

    def save_recording_ref(self, room_name: str, recording_url: str, agent_name: str, user_id: str):
        """Save a reference to an OGG audio recording in Firestore 'recordings' collection."""
        if not self.db:
            return
        try:
            doc_data = {
                "roomName": room_name,
                "recordingUrl": recording_url,
                "agentName": agent_name,
                "userId": user_id,
                "format": "ogg",
                "createdAt": datetime.utcnow(),
            }
            self.db.collection("recordings").document(room_name).set(doc_data, merge=True)
            logger.info(f"✅ Saved recording ref for room {room_name}: {recording_url}")
        except Exception as e:
            logger.error(f"❌ Failed to save recording ref: {e}")

    def get_last_transcript(self, user_id: str, agent_name: str) -> list:
        """
        Retrieve the transcript messages from the user's most recent session with this agent.
        Returns a list of {role, content} dicts ordered oldest-first, ready for LLM context injection.
        Returns [] if nothing found.
        """
        if not self.db or not user_id or user_id == "default_user":
            return []
        try:
            docs = (
                self.db.collection("session_transcripts")
                .where("userId", "==", user_id)
                .where("agentName", "==", agent_name)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(1)
                .stream()
            )
            for doc in docs:
                data = doc.to_dict()
                raw = data.get("transcript", [])
                # Return only role+content for context injection
                return [
                    {"role": m.get("role", "user"), "content": m.get("content", "")}
                    for m in raw
                    if m.get("content")
                ]
            return []
        except Exception as e:
            logger.error(f"❌ Failed to get last transcript: {e}")
            return []

    def get_transcript_by_id(self, room_name: str) -> list:
        """
        Retrieve the transcript messages from a specific session by its room name.
        """
        if not self.db or not room_name:
            return []
        try:
            doc_ref = self.db.collection("session_transcripts").document(room_name)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                raw = data.get("transcript", [])
                return [
                    {"role": m.get("role", "user"), "content": m.get("content", "")}
                    for m in raw
                    if m.get("content")
                ]
            return []
        except Exception as e:
            logger.error(f"❌ Failed to get transcript by id: {e}")
            return []

    def update_spiritual_state(self, user_id: str, state_update: dict):
        """
        Updates the user's spiritual state in the 'user_spiritual_states' collection.
        This state is shared across the ecosystem (e.g. used by Spiritual Studio).
        """
        if not self.db or not user_id or user_id == "default_user":
            return
            
        try:
            doc_ref = self.db.collection("user_spiritual_states").document(user_id)
            
            # Merge with existing data, updating timestamp
            update_data = {
                **state_update,
                "updatedAt": datetime.utcnow(),
                "lastAgentInteraction": "vedic-astrology-agent"
            }
            
            # Add createdAt if it doesn't exist (handled via set with merge)
            doc_ref.set(update_data, merge=True)
            logger.info(f"✅ Updated spiritual state for user {user_id}")
        except Exception as e:
            logger.error(f"❌ Failed to update spiritual state: {e}")

