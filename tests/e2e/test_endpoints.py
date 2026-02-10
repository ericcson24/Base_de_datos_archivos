import urllib.request
import urllib.error
import urllib.parse
import json
import base64
import sys

def get_token():
    user_data = {"id": 1, "username": "admin", "role": "admin"}
    json_str = json.dumps(user_data)
    encoded = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
    return encoded

def print_separator(title):
    print(f"\n{'='*20} {title} {'='*20}")

def test_endpoint(url, method='GET', data=None, description=""):
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    if data and isinstance(data, dict):
        encoded_data = json.dumps(data).encode('utf-8')
    else:
        encoded_data = None
        
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    
    print(f"\n[TESTING] {description}")
    print(f"URL: {url}")
    if method == 'POST':
        print(f"Payload: {json.dumps(data)}")

    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            
            print(f"✅ STATUS: {status}")
            try:
                json_body = json.loads(body)
                print(f"RESPONSE JSON: {json.dumps(json_body, indent=2)}")
            except:
                print(f"RESPONSE RAW: {body[:500]}...") # Truncate if long html
            
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP ERROR: {e.code} {e.reason}")
        print(f"ERROR BODY: {e.read().decode('utf-8')}")
        return False
    except urllib.error.URLError as e:
        print(f"❌ CONNECTION ERROR: {e.reason}")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False

def run_tests():
    print_separator("STARTING CONNECTION TESTS")
    all_passed = True
    
    # 1. AI SERVICE (Calendar Event Creation)
    # Testing the endpoint I modified to emit notifications
    mock_event_data = {
        "query": "Reunion urgente 'Test Connection' mañana a las 10am",
        "assignMode": "me"
    }
    if not test_endpoint(
        "http://localhost/api/ai/create-event", 
        method='POST', 
        data=mock_event_data, 
        description="AI Service: Create Event (Triggers Notification)"
    ):
        all_passed = False

    # 2. NOTIFICATION SERVICE
    # Testing the REST endpoint I added to fetch notifications
    if not test_endpoint(
        "http://localhost/api/notifications/", 
        method='GET', 
        description="Notification Service: Get History"
    ):
        all_passed = False

    # 3. OUTLOOK SERVICE (Standard Events)
    # Just to ensure the rest of the calendar system is up
    if not test_endpoint(
        "http://localhost/api/events/", 
        method='GET', 
        description="Outlook Service: Get Calendar Events"
    ):
        all_passed = False

    print_separator("TEST SUMMARY")
    if all_passed:
        print(" ALL TESTS PASSED! System is healthy.")
    else:
        print(" SOME TESTS FAILED. Check logs above.")

if __name__ == "__main__":
    run_tests()
