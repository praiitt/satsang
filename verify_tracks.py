import requests
import json

AUTH_SERVER_URL = "https://satsang-auth-server-6ougd45dya-el.a.run.app"

def get_all_tracks():
    page = 1
    limit = 50 
    all_tracks = []
    
    print(f"Fetching tracks from {AUTH_SERVER_URL}...")
    
    while True:
        url = f"{AUTH_SERVER_URL}/suno/community-tracks?page={page}&limit={limit}"
        try:
            print(f"Fetching page {page}...")
            resp = requests.get(url)
            if resp.status_code != 200:
                print(f"Error: {resp.status_code} - {resp.text}")
                break
                
            data = resp.json()
            tracks = data.get('tracks', [])
            total = data.get('total', 0)
            
            all_tracks.extend(tracks)
            print(f"  Got {len(tracks)} tracks. (Total reported by API: {total})")
            
            if not data.get('hasMore', False):
                break
                
            page += 1
        except Exception as e:
            print(f"Exception: {e}")
            break
            
    print(f"\n--- Summary ---")
    print(f"Total Unique Tracks Fetched: {len(all_tracks)}")
    print(f"First Track: {all_tracks[0]['title'] if all_tracks else 'None'}")
    print(f"Last Track: {all_tracks[-1]['title'] if all_tracks else 'None'}")

if __name__ == "__main__":
    get_all_tracks()
