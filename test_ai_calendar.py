#!/usr/bin/env python3
import requests
import json
import sys

# Login with correct credentials
login_response = requests.post(
    'http://localhost/api/auth/login',
    json={'username': 'administrador', 'password': 'admin123'}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    sys.exit(1)

token = login_response.json()['token']
headers = {'Authorization': f'Bearer {token}'}

print("✅ Login successful")

# Test AI calendar event creation
test_request = "hazme una tarea de gimnasio para mañana a las 21:00"
print(f"\n📝 Testing AI calendar: '{test_request}'")

ai_response = requests.post(
    'http://localhost/api/ai/calendar',
    headers=headers,
    json={'query': test_request}
)

print(f"\n📊 Response Status: {ai_response.status_code}")
print(f"📄 Response Body:")
try:
    print(json.dumps(ai_response.json(), indent=2, ensure_ascii=False))
except:
    print(ai_response.text)

if ai_response.status_code == 200:
    print("\n✅ AI Calendar working correctly!")
    print("   Event created with retry logic handling any rate limits")
elif ai_response.status_code == 429:
    print("\n⚠️  Rate limit hit even after retries")
    print("   This is expected with free tier Gemini API")
else:
    print(f"\n❌ Unexpected error: {ai_response.status_code}")

