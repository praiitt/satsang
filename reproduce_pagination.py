
import requests
import json

AUTH_SERVER_URL = "http://localhost:4000"

def test_pagination():
    print(f"Testing pagination against {AUTH_SERVER_URL}...")
    
    # Page 1
    try:
        url = f"{AUTH_SERVER_URL}/suno/community-tracks?page=1&limit=5"
        print(f"Fetching: {url}")
        res = requests.get(url)
        if res.status_code != 200:
            print(f"FAILED Page 1: {res.status_code} {res.text}")
            return
        
        data = res.json()
        print(f"Page 1 Success. Total: {data.get('total')}, Page: {data.get('page')}, Tracks: {len(data.get('tracks'))}")
        
        total = data.get('total', 0)
        if total <= 5:
            print("Not enough tracks to test page 2. Need > 5 tracks.")
            return

        # Page 2
        url = f"{AUTH_SERVER_URL}/suno/community-tracks?page=2&limit=5"
        print(f"Fetching: {url}")
        res = requests.get(url)
        if res.status_code != 200:
            print(f"FAILED Page 2: {res.status_code} {res.text}")
            return
            
        data = res.json()
        print(f"Page 2 Success. Total: {data.get('total')}, Page: {data.get('page')}, Tracks: {len(data.get('tracks'))}")
        
        if len(data.get('tracks')) == 0:
            print("WARNING: Page 2 returned 0 tracks despite total count indicating more.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_pagination()
