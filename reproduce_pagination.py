
import requests
import json

AUTH_SERVER_URL = "https://satsang-auth-server-469389287554.us-central1.run.app"

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
        
        data1 = res.json()
        tracks1 = data1.get('tracks', [])
        ids1 = [t.get('id') for t in tracks1]
        print(f"Page 1: {len(tracks1)} tracks. IDs: {ids1}")
        
        total = data1.get('total', 0)
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
            
        data2 = res.json()
        tracks2 = data2.get('tracks', [])
        ids2 = [t.get('id') for t in tracks2]
        print(f"Page 2: {len(tracks2)} tracks. IDs: {ids2}")
        
        # Check overlap
        overlap = set(ids1).intersection(set(ids2))
        if overlap:
            print(f"ERROR: Found {len(overlap)} duplicate tracks between Page 1 and Page 2: {overlap}")
        else:
            print("SUCCESS: No overlap between Page 1 and Page 2.")

        if len(tracks2) == 0:
            print("WARNING: Page 2 returned 0 tracks despite total count indicating more.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_pagination()
