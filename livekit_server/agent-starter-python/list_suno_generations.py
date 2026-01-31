
import requests
import json
import os

API_KEY = "14d80237cfc1b421ee612b6d7a31ff40"
BASE_URL = "https://api.sunoapi.org/api/v1"

def check_usage():
    url = f"{BASE_URL}/get_limit"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    print(f"\nChecking Usage for Unified Key...")
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Usage Info:")
            print(f"   Credits Left: {data.get('credits_left')}")
            print(f"   Monthly Limit: {data.get('monthly_limit')}")
            print(f"   Monthly Usage: {data.get('monthly_usage')}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

def main():
    check_usage()
    
if __name__ == "__main__":
    main()
