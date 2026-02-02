import requests
import json
import base64
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost/api/ai"  # Using the gateway URL
# Mock Admin User Token
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
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(text):
    print(f"\n{Color.BLUE}{'='*50}")
    print(f" {text}")
    print(f"{'='*50}{Color.RESET}")

def print_result(name, success, details=""):
    if success:
        print(f"{Color.GREEN}✓ [PASS] {name}{Color.RESET}")
    else:
        print(f"{Color.RED}✗ [FAIL] {name}{Color.RESET}")
        if details:
            print(f"  {Color.YELLOW}Details: {details}{Color.RESET}")

def run_test(name, func):
    try:
        print(f"Running: {name}...")
        func()
        print(f"{Color.YELLOW}Waiting 20s to respect rate limits...{Color.RESET}")
        time.sleep(20)
    except Exception as e:
        print_result(name, False, str(e))

# --- TESTS ---

def test_health_check():
    print_header("Health Check")
    start = time.time()
    resp = requests.get(f"{BASE_URL}/health_check", timeout=5) # Nginx maps /api/ai/ -> ai-service/
    # Actually exposed as /health in ai-service, but gateway maps /api/ai/ to root? 
    # Validating Nginx config: 
    # location /api/ai/ { proxy_pass http://ai-service:5009/; ... }
    # So /api/ai/health -> http://ai-service:5009/health
    
    resp = requests.get(f"http://localhost/api/ai/health", timeout=5)
    
    if resp.status_code == 200:
        data = resp.json()
        print_result("Service Health", True, f"Status: {data.get('status')}, Gemini: {data.get('gemini')}")
    else:
        print_result("Service Health", False, f"Status Code: {resp.status_code}")

def test_ai_commands():
    print_header("AI Command Tests (Panel Actions)")

    # 1. Change Theme
    payload = {"query": "ponme el tema oscuro por favor"}
    resp = requests.post(f"{BASE_URL}/command", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        success = data.get("action") == "change_theme" and data.get("value") == "dark"
        print_result("Change Theme (Dark)", success, f"Action: {data.get('action')}, Value: {data.get('value')}")
    else:
        print_result("Change Theme (Dark)", False, resp.text)
    
    time.sleep(5)

    # 2. Navigation
    payload = {"query": "quiero ver mi perfil"}
    resp = requests.post(f"{BASE_URL}/command", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        success = data.get("action") == "navigate" and data.get("value") == "profile"
        print_result("Navigate (Profile)", success, f"Action: {data.get('action')}, Value: {data.get('value')}")
    else:
        print_result("Navigate (Profile)", False, resp.text)

def test_search_endpoint():
    print_header("Search Endpoint Tests")
    
    # Test 1: Basic Search
    payload = {"query": "presupuesto anual"}
    resp = requests.post(f"{BASE_URL}/search", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        print_result("Basic Search", data.get("success"), f"Results: {len(data.get('files', []))}")
    else:
        print_result("Basic Search", False, f"Status {resp.status_code}: {resp.text}")
    
    time.sleep(5) # Throttle

    # Test 2: Empty Query
    payload = {"query": "   "}
    resp = requests.post(f"{BASE_URL}/search", json=payload, headers=HEADERS)
    if resp.status_code == 400:
        print_result("Empty Query Handling", True)
    else:
        print_result("Empty Query Handling", False, f"Expected 400, got {resp.status_code}")

    # Test 3: Complex Query (Simulating semantic understanding)
    time.sleep(5) # Throttle
    payload = {"query": "documentos excel de contabilidad del año 2024"}
    resp = requests.post(f"{BASE_URL}/search", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        print_result("Complex Semantic Search", data.get("success"))
        # print(f"  AI Response: {data.get('response')[:100]}...")
    else:
        print_result("Complex Semantic Search", False, resp.text)

def test_create_event_endpoint():
    print_header("Create Event Endpoint Tests")
    
    # Test 1: Relative Date (Tomorrow)
    payload = {
        "query": "reunión de equipo mañana a las 3pm",
        "assignMode": "me"
    }
    resp = requests.post(f"{BASE_URL}/create-event", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        event = data.get("event", {})
        print_result("Create Event (Tomorrow)", data.get("success"), f"Created: {event.get('title')} at {event.get('start')}")
    else:
        print_result("Create Event (Tomorrow)", False, resp.text)

    # Test 2: Specific Date
    # Calculate a date 2 days from now
    time.sleep(10) # Throttle 
    target_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    payload = {
        "query": f"entrega de proyecto el {target_date} a las 10:00",
        "assignMode": "me"
    }
    resp = requests.post(f"{BASE_URL}/create-event", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        parsed = data.get("parsedData", {})
        success = parsed.get("date") == target_date
        print_result("Create Event (Specific Date)", success, f"Target: {target_date}, Got: {parsed.get('date')}")
    else:
        print_result("Create Event (Specific Date)", False, resp.text)
        
    # Test 3: Ambiguous/Invalid
    time.sleep(10) # Throttle 
    payload = {
        "query": "esto no es un evento",
        "assignMode": "me"
    }
    resp = requests.post(f"{BASE_URL}/create-event", json=payload, headers=HEADERS)
    # Depending on AI, it might return success=false in json or 400
    if resp.status_code == 400 or (resp.status_code == 200 and resp.json().get("success") is False):
        print_result("Invalid Event Handling", True)
    else:
        print_result("Invalid Event Handling", False, f"Status: {resp.status_code}")

def test_analyze_document_endpoint():
    print_header("Analyze Document Tests")
    
    sample_content = """
    ACTA DE REUNIÓN DE PROYECTO
    Fecha: 2026-01-15
    Asistentes: Juan, María, Pedro.
    
    Temas tratados:
    1. Revisión de presupuesto: Se aprobó el incremento del 10% para marketing.
    2. Cronograma: Se detectó un retraso de 2 semanas en el módulo de frontend.
    3. Próximos pasos: Contratar un diseñador UX senior antes del fin de mes.
    
    Acuerdos:
    - María gestionará la contratación.
    - Juan actualizará el diagrama de Gantt.
    """
    
    # Test 1: Summary
    payload = {
        "documentId": 999,
        "content": sample_content,
        "filename": "Acta_Reunion.txt",
        "analysisType": "summary"
    }
    resp = requests.post(f"{BASE_URL}/analyze-document", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        print_result("Document Summary", True, f"Response length: {len(data.get('analysis', ''))}")
    else:
        print_result("Document Summary", False, resp.text)

    # Test 2: Suggestions
    time.sleep(10) # Throttle 
    payload["analysisType"] = "suggestions"
    resp = requests.post(f"{BASE_URL}/analyze-document", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        print_result("Edit Suggestions", True)
    else:
        print_result("Edit Suggestions", False, resp.text)

def test_explain_text_endpoint():
    print_header("Explain Text Tests")
    
    payload = {
        "documentId": 999,
        "fragment": "incremento del 10% para marketing",
        "documentTitle": "Acta de Reunión"
    }
    resp = requests.post(f"{BASE_URL}/explain-text", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        print_result("Explain Fragment", True, f"Explanation len: {len(data.get('explanation', ''))}")
    else:
        print_result("Explain Fragment", False, resp.text)

def test_highlight_analysis():
    print_header("Highlight Analysis Tests")
    
    content = "Es crucial revisar la cláusula de penalización por retraso, ya que impone un 5% diario sobre el total del contrato."
    payload = {
        "documentId": 888,
        "content": content
    }
    resp = requests.post(f"{BASE_URL}/highlight-analysis", json=payload, headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        highlights = data.get("highlights", [])
        print_result("Highlight Analysis", True, f"Highlights found: {len(highlights)}")
    else:
        print_result("Highlight Analysis", False, resp.text)

if __name__ == "__main__":
    print(f"Running AI Service E2E Tests against {BASE_URL}")
    run_test("Health Check", test_health_check)
    run_test("Commands (Panel)", test_ai_commands)
    run_test("Search", test_search_endpoint)
    run_test("Create Event", test_create_event_endpoint)
    # run_test("Analyze Document", test_analyze_document_endpoint)
    # run_test("Explain Text", test_explain_text_endpoint)
    # run_test("Highlight Analysis", test_highlight_analysis)
    print("\nEnd of Tests")
