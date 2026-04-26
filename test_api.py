import urllib.request
import json

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/offer",
    data=b'{"user_lng": 8.6512, "user_lat": 49.8728, "temperature": 20, "weather_code": 0, "radius_m": 50000}',
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
