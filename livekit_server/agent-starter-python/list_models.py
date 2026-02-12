
import os
import asyncio
from dotenv import load_dotenv
from google.genai import Client

load_dotenv(".env.local")

def list_models():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not found")
        return

    # Use synchronous Client
    client = Client(api_key=api_key)
    
    print("Listing models...")
    try:
        # Pager object, iterate to get models
        pager = client.models.list() 
        for model in pager:
            print(f"Model Name: {model.name}")
            # print(f"Object: {model}") 
            print("-" * 20)
            
    except Exception as e:
        print(f"Error listing models: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    list_models()

