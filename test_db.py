from livekit_server.agent_starter_python.src.firebase_db import FirebaseDB
import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/Users/prakash/Documents/satsang/satsangapp/marketing-server/satsang-ai-firebase-adminsdk.json"
import sys
sys.path.append("/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python/src")
from firebase_db import FirebaseDB
db = FirebaseDB()
# we don't know a room name, let's just see if method exists
print("method exists:", hasattr(db, "get_transcript_by_id"))
