import asyncio
import json
import urllib.request
import urllib.error

API_KEY = "72770afa-26ec-4140-be68-f3e4b2f3f526:ad01bdcf32bca0111124c8692b612fc6"

url = "https://queue.fal.run/fal-ai/stable-audio"
headers = {
    "Authorization": f"Key {API_KEY}",
    "Content-Type": "application/json"
}
data = json.dumps({"prompt": "A relaxing acoustic guitar melody"}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print("SUCCESS! Fal API responded with:", json.dumps(result, indent=2))
        request_id = result.get("request_id")
        print(f"To check status, you would query: https://queue.fal.run/fal-ai/stable-audio/requests/{request_id}")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code} {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"ERROR: {e}")
