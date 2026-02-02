import urllib.request
import json
import os

# Read API Key from .env manually to avoid dependency
def get_api_key():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GEMINI_API_KEY='):
                    return line.strip().split('=')[1]
    except:
        return None
    return None

key = get_api_key()
if not key:
    print("No GEMINI_API_KEY found in .env")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

print(f"Checking models at: https://generativelanguage.googleapis.com/v1beta/models?key=REDACTED")

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("✅ Models found:")
        for model in data.get('models', []):
            print(f"- {model['name']} ({model.get('displayName', '')})")
            if 'supportedGenerationMethods' in model:
                print(f"  Methods: {model['supportedGenerationMethods']}")
except urllib.error.HTTPError as e:
    print(f"❌ HTTP Error: {e.code} {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"❌ Error: {e}")
