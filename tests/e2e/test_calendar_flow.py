import requests
import json
import base64
import time
from datetime import datetime, timedelta, timezone

# Configuration
BASE_URL = "http://localhost/api/events"
AI_BASE_URL = "http://localhost/api/ai"
USER_PAYLOAD = json.dumps({
    "id": 1,
    "role": "admin",
    "username": "admin"
})
TOKEN = base64.b64encode(USER_PAYLOAD.encode()).decode()
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    RESET = '\033[0m'

def print_result(name, success, details=""):
    if success:
        print(f"{Color.GREEN}✓ [PASS] {name}{Color.RESET}")
    else:
        print(f"{Color.RED}✗ [FAIL] {name}{Color.RESET}")
        if details:
            print(f"  Details: {details}")

def test_create_event():
    print(f"\nTesting Create Event...")
    # Use timezone aware UTC
    now_utc = datetime.now(timezone.utc)
    start_time = (now_utc + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
    end_time = (now_utc + timedelta(days=1, hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    payload = {
        "subject": "E2E Test Event",
        "body": "This is a test event created by E2E automation.",
        "startTime": start_time,
        "endTime": end_time,
        "location": "Test Lab",
        "isAllDay": False
    }
    
    url = f"{BASE_URL}/events" # POST /events
    
    print(f"POST {url}")
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get("success"):
                ms_id = data.get('microsoftId')
                print_result("Create Event", True, f"ID: {ms_id}")
                return ms_id
            else:
                print_result("Create Event", False, f"Success false. Msg: {data}")
        else:
            print_result("Create Event", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("Create Event", False, str(e))
    return None

def test_get_events(event_id):
    print(f"\nTesting Get Events...")
    # GET / (root) lists events
    url = f"{BASE_URL}/" 
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            events = response.json()
            # Expecting array of events
            found = False
            found_event = None
            
            if isinstance(events, list):
                for e in events:
                    # Check field mapping based on code review
                    # formattedEvents returns { id, microsoftId, title ... }
                    # We have event_id which matches microsoftId form create response
                    if str(e.get('microsoftId')) == str(event_id) or str(e.get('id')) == str(event_id):
                        found = True
                        found_event = e
                        break
            
            if found:
                print_result("Get Events List", True, f"Found event {event_id}. Title: {found_event.get('title')}")
            else:
                print_result("Get Events List", False, f"Event {event_id} not found in list of {len(events)} events")
            return found
        else:
            print_result("Get Events List", False, f"Status: {response.status_code}")
    except Exception as e:
        print_result("Get Events List", False, str(e))
    return False

def test_update_event(event_id):
    print(f"\nTesting Update Event...")
    new_subject = "E2E Test Event UPDATED"
    payload = {
        "subject": new_subject
    }
    
    url = f"{BASE_URL}/events/{event_id}" # PATCH /events/:id
    try:
        response = requests.patch(url, headers=HEADERS, json=payload)
        if response.status_code == 200:
            print_result("Update Event", True)
            return True
        else:
            print_result("Update Event", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("Update Event", False, str(e))
    return False

def test_delete_event(event_id):
    print(f"\nTesting Delete Event...")
    url = f"{BASE_URL}/events/{event_id}" # DELETE /events/:id
    try:
        response = requests.delete(url, headers=HEADERS)
        if response.status_code == 200:
            print_result("Delete Event", True)
            return True
        else:
            print_result("Delete Event", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("Delete Event", False, str(e))
    return False

def test_ai_agent_create():
    print(f"\nTesting AI Agent Create (Natural Language)...")
    query = "Schedule a meeting called 'AI Agent Test' tomorrow at 4pm for 1 hour"
    
    url = f"{AI_BASE_URL}/create-event"
    payload = { "query": query }
    
    print(f"POST {url} with query='{query}'")
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                ms_id = data.get("microsoftId")
                print_result("AI Agent Create", True, f"Created event via AI. ID: {ms_id}")
                return ms_id
            else:
                 print_result("AI Agent Create", False, f"Success=false. Res: {data}")
        else:
            print_result("AI Agent Create", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("AI Agent Create", False, str(e))
    return None

def test_ai_agent_update(event_id, new_time_str):
    print(f"\nTesting AI Agent Update (Natural Language)...")
    query = f"Reschedule 'AI Agent Test' to {new_time_str}"
    
    url = f"{AI_BASE_URL}/create-event" 
    payload = { "query": query }
    
    print(f"POST {url} with query='{query}'")
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result("AI Agent Update", True, f"Updated event via AI. Msg: {data.get('message')}")
                return True
            else:
                 print_result("AI Agent Update", False, f"Success=false. Res: {data}")
        else:
            print_result("AI Agent Update", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("AI Agent Update", False, str(e))
    return False

def test_ai_agent_delete(title):
    print(f"\nTesting AI Agent Delete (Natural Language)...")
    query = f"Cancel the meeting called '{title}'"
    
    url = f"{AI_BASE_URL}/create-event"
    payload = { "query": query }
    
    print(f"POST {url} with query='{query}'")
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result("AI Agent Delete", True, f"Deleted event via AI. Msg: {data.get('message')}")
                return True
            else:
                 print_result("AI Agent Delete", False, f"Success=false. Res: {data}")
        else:
            print_result("AI Agent Delete", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("AI Agent Delete", False, str(e))
    return False

def run_all():
    print("=== CALENDAR END-TO-END TESTS ===")
    
    # --- STANDARD API FLOW ---
    print("\n--- STANDARD API FLOW ---")
    event_id = test_create_event()
    
    if event_id:
        time.sleep(2)
        if test_get_events(event_id):
            if test_update_event(event_id):
                time.sleep(1)
                test_delete_event(event_id)
                
                # Verify deletion
                time.sleep(1)
                found = False
                try:
                    res = requests.get(f"{BASE_URL}/", headers=HEADERS)
                    if res.status_code == 200:
                        events = res.json()
                        for e in events:
                            if str(e.get('microsoftId')) == str(event_id) or str(e.get('id')) == str(event_id):
                                found = True
                                break
                except: pass
                
                if not found:
                    print_result("Verify Deletion", True, "Event no longer in list")
                else:
                    print_result("Verify Deletion", False, "Event still found in list")
        else:
            test_delete_event(event_id)

    # --- AI AGENT FLOW ---
    print("\n--- AI AGENT FLOW ---")
    ai_event_id = test_ai_agent_create()
    
    if ai_event_id:
        time.sleep(2)
        if test_get_events(ai_event_id):
            
            # AI Update
            if test_ai_agent_update(ai_event_id, "next Friday at 10am"):
                 time.sleep(2)
                 
                 # AI Delete
                 test_ai_agent_delete("AI Agent Test")
                 
                 # Verify AI Deletion
                 time.sleep(2)
                 found = False
                 try:
                    res = requests.get(f"{BASE_URL}/", headers=HEADERS)
                    if res.status_code == 200:
                        events = res.json()
                        for e in events:
                            if str(e.get('microsoftId')) == str(ai_event_id) or str(e.get('id')) == str(ai_event_id):
                                found = True
                                break
                 except: pass
                 
                 if not found:
                    print_result("Verify AI Deletion", True, "Event no longer in list")
                 else:
                    print_result("Verify AI Deletion", False, "Event still found in list")
        else:
            test_delete_event(ai_event_id)

if __name__ == "__main__":
    run_all()
