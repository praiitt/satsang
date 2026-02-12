
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

def check_latest_transcript():
    # Initialize Firebase
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if not cred_path:
             # Try default path or specific path used in project
             cred_path = "../../service-account-key.json" # Adjust as needed based on where this script is run
             
        # Check if file exists
        if not os.path.exists(cred_path):
             # Try absolute path found
             cred_path = "/Users/prakash/Documents/satsang/satsangapp/satsangServiceAccount.json"

        if not os.path.exists(cred_path):
            print(f"Error: Credential file not found at {cred_path}")
            return

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    
    print("Checking 'session_transcripts' collection...")
    
    # Get the most recent transcripts
    docs = db.collection("session_transcripts").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(5).stream()
    
    found = False
    for doc in docs:
        found = True
        data = doc.to_dict()
        print(f"ID: {doc.id}")
        print(f"Created At: {data.get('createdAt')}")
        print(f"Agent: {data.get('agentName')}")
        print(f"Room: {data.get('roomName')}")
        print(f"Transcript Length: {len(data.get('transcript', []))}")
        print("Transcript Preview:")
        for msg in data.get('transcript', [])[:3]: # Show first 3 messages
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')[:50] + "..."
            print(f"  {role}: {content}")
        print("-" * 20)

    if not found:
        print("No transcripts found in 'session_transcripts' collection.")

if __name__ == "__main__":
    check_latest_transcript()
