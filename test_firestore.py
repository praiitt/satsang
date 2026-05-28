import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("./satsangServiceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

docs = db.collection("session_transcripts").order_by("createdAt", direction=firestore.Query.DESCENDING).limit(10).stream()

for doc in docs:
    data = doc.to_dict()
    print(f"userId: {data.get('userId')} - time: {data.get('createdAt')}")
