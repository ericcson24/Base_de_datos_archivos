import requests
import json
import base64
import time
import os

BASE_URL = "http://localhost/api/ai"
# Headers for User 1 (Admin) and User 2 (Normal) will be generated in tests

def get_auth_headers(user_id, username, role="user"):
    payload = json.dumps({
        "id": user_id,
        "role": role,
        "username": username
    })
    token = base64.b64encode(payload.encode()).decode()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_user_isolation():
    print("\n[TEST] User Isolation (Project Blueberry)")
    
    # User 1 Search
    headers_u1 = get_auth_headers(1, "admin", "admin")
    headers_u1["x-test-mode"] = "isolation"
    resp_u1 = requests.post(f"{BASE_URL}/search", json={"query": "budget project blueberry"}, headers=headers_u1)
    
    if resp_u1.status_code == 200:
        ans1 = resp_u1.json().get("response", "")
        print(f"User 1 sees: {ans1}")
        if "1,000,000" in ans1 and "5,000,000" not in ans1:
            print("[PASS] User 1 sees 2024 budget only")
        else:
            print("[FAIL] User 1 isolation check failed (or Gemini rewrote text)")
    else:
        print(f"[FAIL] User 1 search error: {resp_u1.status_code}")
        print(resp_u1.text)

    time.sleep(5)

    # User 2 Search
    headers_u2 = get_auth_headers(2, "bob", "user")
    headers_u2["x-test-mode"] = "isolation"
    resp_u2 = requests.post(f"{BASE_URL}/search", json={"query": "budget project blueberry"}, headers=headers_u2)
    
    if resp_u2.status_code == 200:
        ans2 = resp_u2.json().get("response", "")
        print(f"User 2 sees: {ans2}")
        if "5,000,000" in ans2 and "1,000,000" not in ans2:
            print("[PASS] User 2 sees 2025 budget only")
        else:
            print("[FAIL] User 2 isolation check failed")
    else:
        print(f"[FAIL] User 2 error: {resp_u2.text}")
    
    # Contrast Test (Cross-Document within User 2 if we add another file? Or just check smart answer)
    # The user wanted "contrast between documents". Let's assume User 2 has 2024 AND 2025 files.
    # But for now, strict isolation is the first step.

def test_smart_highlighting():
    print("\n[TEST] Smart Highlighting & File Opening")
    headers = get_auth_headers(1, "admin", "admin")
    headers["x-test-mode"] = "isolation"
    resp = requests.post(f"{BASE_URL}/search", json={"query": "who is the manager"}, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        highlights = data.get("highlights", [])
        if highlights:
            print(f"[PASS] Got {len(highlights)} highlights")
            print(f"Sample: {highlights[0]}")
        else:
            print("[FAIL] No highlights returned (Feature not implemented yet)")
            print(f"Response: {data.get('response')}")
            
def test_dynamic_edit():
    print("\n[TEST] Dynamic Edit / Suggestions")
    headers = get_auth_headers(1, "admin", "admin")
    payload = {
        "text": "The project status is pending",
        "instruction": "Make it sound more professional and formal"
    }
    # Hypothetical endpoint
    resp = requests.post(f"{BASE_URL}/edit", json=payload, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        suggestion = data.get("suggestion", "")
        print(f"[PASS] Suggestion: {suggestion}")
    elif resp.status_code == 404:
        print("[FAIL] Endpoint /edit not implemented")
    else:
        print(f"[FAIL] Error: {resp.status_code}")

if __name__ == "__main__":
    # Wait for service
    # time.sleep(2)
    test_user_isolation()
    test_smart_highlighting()
    test_dynamic_edit()
