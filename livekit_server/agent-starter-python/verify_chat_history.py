
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('rraasiServiceAccount.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_latest_session():
    print("🔍 Checking for latest meditation session...")
    
    # Query for the most recent session
    docs = db.collection('meditation_sessions')\
             .order_by('completedAt', direction=firestore.Query.DESCENDING)\
             .limit(1)\
             .stream()
    
    found = False
    for doc in docs:
        found = True
        data = doc.to_dict()
        print(f"\n✅ Found Session ID: {doc.id}")
        print(f"   User ID: {data.get('userId')}")
        print(f"   Completed At: {data.get('completedAt')}")
        
        chat_history = data.get('chatHistory', [])
        print(f"   Chat History Length: {len(chat_history)}")
        
        if chat_history:
            print("\n📜 Transcript Preview:")
            for msg in chat_history:
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')
                print(f"   [{role.upper()}]: {content}")
        else:
            print("\n⚠️ No chat history found in this session.")
            
    if not found:
        print("\n❌ No sessions found in 'meditation_sessions' collection.")

if __name__ == "__main__":
    check_latest_session()
