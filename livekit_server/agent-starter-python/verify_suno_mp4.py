
import requests
import json
import time

API_KEY = "14d80237cfc1b421ee612b6d7a31ff40"
BASE_URL = "https://api.sunoapi.org/api/v1"

# User provided IDs
TASK_ID = "8549bcb8cdc893fe3cd30f849055e8fb"
AUDIO_ID = "af021eae-242d-46e6-9aed-111509ac4b02"

def check_status():
    url = f"{BASE_URL}/generate/record-info"
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }
    params = {
        "taskId": TASK_ID
    }

    print(f"Checking status for Task ID: {TASK_ID}")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_status()
