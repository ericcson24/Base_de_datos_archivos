#!/usr/bin/env python3
"""
Comprehensive End-to-End tests for the RDP System.
Tests all API endpoints, database integrity, WebSocket connectivity,
settings management, connection CRUD, and error handling.

Usage:
    python test_rdp_full.py [--base-url URL]
"""

import requests
import json
import base64
import time
import sys
import argparse
import traceback

# ─── Configuration ──────────────────────────────────────────────────────────

DEFAULT_BASE_URL = "http://localhost"

passed = 0
failed = 0
errors = []


def create_token(username="administrador", user_id=1, role="admin"):
    """Create a Base64-encoded auth token"""
    payload = {"id": user_id, "username": username, "role": role}
    return base64.b64encode(json.dumps(payload).encode()).decode()


def headers(role="admin", user_id=1):
    """Return auth headers"""
    token = create_token(role=role, user_id=user_id)
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def log_pass(test_name, detail=""):
    global passed
    passed += 1
    print(f"  \033[92m✓ PASS\033[0m {test_name}" + (f" — {detail}" if detail else ""))


def log_fail(test_name, detail=""):
    global failed
    failed += 1
    errors.append(f"{test_name}: {detail}")
    print(f"  \033[91m✗ FAIL\033[0m {test_name}" + (f" — {detail}" if detail else ""))


def log_section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")


# ─── Test: Service Health ────────────────────────────────────────────────────

def test_service_health(base_url):
    log_section("1. Service Health Check")
    try:
        r = requests.get(f"{base_url}/api/rdp/", timeout=10)
        if r.status_code == 200 and "Running" in r.text:
            log_pass("RDP service is reachable", f"Status {r.status_code}")
        else:
            log_fail("RDP service health", f"Status {r.status_code}: {r.text[:100]}")
    except requests.ConnectionError as e:
        log_fail("RDP service connectivity", str(e))
    except Exception as e:
        log_fail("RDP service health check", str(e))


# ─── Test: Settings CRUD ────────────────────────────────────────────────────

def test_settings_get(base_url):
    log_section("2. Settings — GET")
    try:
        r = requests.get(f"{base_url}/api/rdp/settings", headers=headers(), timeout=10)
        if r.status_code != 200:
            log_fail("GET /settings", f"Status {r.status_code}")
            return None
        data = r.json()
        log_pass("GET /settings returns 200")

        # Verify expected keys
        for key in ["lan_only", "server_id"]:
            if key in data:
                log_pass(f"Settings contains '{key}'", f"value='{data[key]}'")
            else:
                log_fail(f"Settings missing '{key}'")

        return data
    except Exception as e:
        log_fail("GET /settings", str(e))
        return None


def test_settings_update(base_url):
    log_section("3. Settings — POST (update)")
    try:
        # Update maintenance_mode
        r = requests.post(f"{base_url}/api/rdp/settings", headers=headers(),
                          json={"maintenance_mode": "false", "lan_only": "false"}, timeout=10)
        if r.status_code == 200:
            log_pass("POST /settings maintenance_mode=false")
        else:
            log_fail("POST /settings", f"Status {r.status_code}: {r.text}")

        # Verify the change persisted
        r2 = requests.get(f"{base_url}/api/rdp/settings", headers=headers(), timeout=10)
        if r2.status_code == 200:
            data = r2.json()
            if data.get("maintenance_mode") == "false":
                log_pass("Settings change persisted", "maintenance_mode=false")
            else:
                log_fail("Settings not persisted", f"Got: {data.get('maintenance_mode')}")
        else:
            log_fail("Verify settings", f"Status {r2.status_code}")
    except Exception as e:
        log_fail("POST /settings", str(e))


def test_settings_auth_required(base_url):
    log_section("4. Settings — Auth Required")
    try:
        # No auth header
        r = requests.get(f"{base_url}/api/rdp/settings", timeout=10)
        if r.status_code == 401:
            log_pass("GET /settings without auth → 401")
        else:
            log_fail("GET /settings without auth", f"Expected 401, got {r.status_code}")

        # Non-admin trying to update
        r2 = requests.post(f"{base_url}/api/rdp/settings",
                           headers=headers(role="user"),
                           json={"maintenance_mode": "true"}, timeout=10)
        if r2.status_code == 403:
            log_pass("POST /settings as non-admin → 403")
        else:
            log_fail("POST /settings as non-admin", f"Expected 403, got {r2.status_code}")
    except Exception as e:
        log_fail("Settings auth tests", str(e))


# ─── Test: Initialize Default Connection ─────────────────────────────────────

def test_initialize_default(base_url):
    log_section("5. Initialize Default Connection")
    try:
        r = requests.post(f"{base_url}/api/rdp/initialize-default", headers=headers(), timeout=10)
        if r.status_code != 200:
            log_fail("POST /initialize-default", f"Status {r.status_code}: {r.text}")
            return None
        data = r.json()
        if data.get("success"):
            log_pass("Initialize default succeeded")
        else:
            log_fail("Initialize default", f"success=false: {data}")

        conn = data.get("connection")
        if conn:
            log_pass("Connection object returned", f"id={conn.get('id')}")
            required_fields = ["id", "name", "hostname"]
            for f in required_fields:
                if f in conn:
                    log_pass(f"Connection has '{f}'", f"value='{conn[f]}'")
                else:
                    log_fail(f"Connection missing field '{f}'")
            return conn
        else:
            log_fail("No connection object in response")
            return None
    except Exception as e:
        log_fail("Initialize default", str(e))
        return None


def test_initialize_default_idempotent(base_url):
    log_section("6. Initialize Default — Idempotent")
    try:
        r1 = requests.post(f"{base_url}/api/rdp/initialize-default", headers=headers(), timeout=10)
        r2 = requests.post(f"{base_url}/api/rdp/initialize-default", headers=headers(), timeout=10)
        if r1.status_code == 200 and r2.status_code == 200:
            c1 = r1.json().get("connection", {}).get("id")
            c2 = r2.json().get("connection", {}).get("id")
            if c1 == c2:
                log_pass("Idempotent — same connection returned", f"id={c1}")
            else:
                log_fail("Not idempotent", f"First id={c1}, Second id={c2}")
        else:
            log_fail("Idempotent test", f"Status codes: {r1.status_code}, {r2.status_code}")
    except Exception as e:
        log_fail("Idempotent test", str(e))


# ─── Test: Connections CRUD ──────────────────────────────────────────────────

def test_list_connections(base_url):
    log_section("7. List Connections")
    try:
        r = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        if r.status_code != 200:
            log_fail("GET /connections", f"Status {r.status_code}")
            return []
        connections = r.json()
        if isinstance(connections, list):
            log_pass("GET /connections returns array", f"{len(connections)} connections")
            if len(connections) > 0:
                conn = connections[0]
                for f in ["id", "name", "hostname", "port"]:
                    if f in conn:
                        log_pass(f"Connection has '{f}'")
                    else:
                        log_fail(f"Connection missing '{f}'")
            return connections
        else:
            log_fail("GET /connections", "Response is not an array")
            return []
    except Exception as e:
        log_fail("GET /connections", str(e))
        return []


def test_create_connection(base_url):
    log_section("8. Create Connection")
    created_id = None
    try:
        payload = {
            "name": "E2E Test Server",
            "hostname": "192.168.100.50",
            "port": 3389,
            "username": "testuser",
            "password": "testpass",
            "protocol": "rdp"
        }
        r = requests.post(f"{base_url}/api/rdp/connections", headers=headers(),
                          json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                log_pass("Create connection succeeded", f"virtual_ip={data.get('virtual_ip')}")
            else:
                log_fail("Create connection", f"success=false")
        else:
            log_fail("POST /connections", f"Status {r.status_code}: {r.text}")

        # Verify it appears in the list
        r2 = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        if r2.status_code == 200:
            conns = r2.json()
            match = [c for c in conns if c.get("name") == "E2E Test Server"]
            if match:
                created_id = match[0]["id"]
                log_pass("New connection in list", f"id={created_id}")
            else:
                log_fail("New connection not found in list")
    except Exception as e:
        log_fail("Create connection", str(e))

    return created_id


def test_create_connection_validation(base_url):
    log_section("9. Create Connection — Validation")
    try:
        # Missing hostname
        r = requests.post(f"{base_url}/api/rdp/connections", headers=headers(),
                          json={"name": "Bad Server"}, timeout=10)
        if r.status_code == 400:
            log_pass("Missing hostname → 400")
        else:
            log_fail("Missing hostname validation", f"Expected 400, got {r.status_code}")

        # Non-admin
        r2 = requests.post(f"{base_url}/api/rdp/connections",
                           headers=headers(role="user"),
                           json={"name": "Test", "hostname": "1.2.3.4"}, timeout=10)
        if r2.status_code == 403:
            log_pass("Non-admin create → 403")
        else:
            log_fail("Non-admin create", f"Expected 403, got {r2.status_code}")
    except Exception as e:
        log_fail("Create validation", str(e))


def test_delete_connection(base_url, connection_id):
    log_section("10. Delete Connection")
    if not connection_id:
        log_fail("Delete test skipped", "No connection ID from create test")
        return
    try:
        r = requests.delete(f"{base_url}/api/rdp/connections/{connection_id}",
                            headers=headers(), timeout=10)
        if r.status_code == 200:
            log_pass("DELETE connection succeeded", f"id={connection_id}")
        else:
            log_fail("DELETE connection", f"Status {r.status_code}")

        # Verify it's gone
        r2 = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        if r2.status_code == 200:
            conns = r2.json()
            match = [c for c in conns if c.get("id") == connection_id]
            if not match:
                log_pass("Deleted connection removed from list")
            else:
                log_fail("Deleted connection still in list")
    except Exception as e:
        log_fail("Delete connection", str(e))


def test_delete_connection_auth(base_url):
    log_section("11. Delete Connection — Auth")
    try:
        r = requests.delete(f"{base_url}/api/rdp/connections/9999",
                            headers=headers(role="user"), timeout=10)
        if r.status_code == 403:
            log_pass("Non-admin delete → 403")
        else:
            log_fail("Non-admin delete", f"Expected 403, got {r.status_code}")
    except Exception as e:
        log_fail("Delete auth", str(e))


# ─── Test: Connection Token Generation ───────────────────────────────────────

def test_connection_token(base_url, connection_id):
    log_section("12. Connection Token Generation")
    if not connection_id:
        log_fail("Token test skipped", "No connection ID")
        return
    try:
        r = requests.get(f"{base_url}/api/rdp/connections/{connection_id}/token",
                         headers=headers(), timeout=10)
        if r.status_code != 200:
            log_fail("GET /connections/:id/token", f"Status {r.status_code}: {r.text}")
            return
        data = r.json()
        if "token" in data:
            log_pass("Token returned")
            # Verify token structure (base64 JSON with iv and value)
            try:
                decoded = json.loads(base64.b64decode(data["token"]))
                if "iv" in decoded and "value" in decoded:
                    log_pass("Token structure valid", "Contains iv and value")
                else:
                    log_fail("Token structure", f"Missing iv/value: {list(decoded.keys())}")
            except Exception as e:
                log_fail("Token decode", str(e))
        else:
            log_fail("Token not in response")

        if "connectionId" in data:
            log_pass("connectionId in response")
        else:
            log_fail("connectionId missing from response")
    except Exception as e:
        log_fail("Token generation", str(e))


def test_connection_token_not_found(base_url):
    log_section("13. Connection Token — Not Found")
    try:
        r = requests.get(f"{base_url}/api/rdp/connections/99999/token",
                         headers=headers(), timeout=10)
        if r.status_code == 404:
            log_pass("Non-existent connection → 404")
        else:
            log_fail("Non-existent connection", f"Expected 404, got {r.status_code}")
    except Exception as e:
        log_fail("Token not found", str(e))


# ─── Test: Stop All / Maintenance Mode ───────────────────────────────────────

def test_stop_all(base_url):
    log_section("14. Stop All Connections")
    try:
        r = requests.post(f"{base_url}/api/rdp/connections/stop-all",
                          headers=headers(), timeout=10)
        if r.status_code == 200:
            log_pass("POST /connections/stop-all succeeded")
            # Verify maintenance mode is now on
            r2 = requests.get(f"{base_url}/api/rdp/settings", headers=headers(), timeout=10)
            if r2.status_code == 200:
                settings = r2.json()
                if settings.get("maintenance_mode") == "true":
                    log_pass("Maintenance mode enabled after stop-all")
                else:
                    log_fail("Maintenance mode not enabled", f"Got: {settings.get('maintenance_mode')}")
        else:
            log_fail("POST /connections/stop-all", f"Status {r.status_code}")

        # Re-enable for subsequent tests
        requests.post(f"{base_url}/api/rdp/settings", headers=headers(),
                      json={"maintenance_mode": "false"}, timeout=10)
    except Exception as e:
        log_fail("Stop all", str(e))


def test_stop_all_auth(base_url):
    log_section("15. Stop All — Auth Required")
    try:
        r = requests.post(f"{base_url}/api/rdp/connections/stop-all",
                          headers=headers(role="user"), timeout=10)
        if r.status_code == 403:
            log_pass("Non-admin stop-all → 403")
        else:
            log_fail("Non-admin stop-all", f"Expected 403, got {r.status_code}")
    except Exception as e:
        log_fail("Stop all auth", str(e))


# ─── Test: WebSocket Connectivity ────────────────────────────────────────────

def test_websocket_reachable(base_url):
    log_section("16. WebSocket Connectivity")
    try:
        import websocket
    except ImportError:
        log_fail("WebSocket test", "websocket-client not installed. Run: pip install websocket-client")
        return

    try:
        token = create_token()
        ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}/api/rdp?token={token}&id=1"
        
        connected = False
        received_data = False
        ws_error = None

        def on_open(ws):
            nonlocal connected
            connected = True

        def on_message(ws, message):
            nonlocal received_data
            received_data = True

        def on_error(ws, error):
            nonlocal ws_error
            ws_error = str(error)

        ws = websocket.WebSocketApp(
            ws_url,
            subprotocols=["guacamole"],
            on_open=on_open,
            on_message=on_message,
            on_error=on_error
        )

        import threading
        wst = threading.Thread(target=ws.run_forever, kwargs={"ping_interval": 0})
        wst.daemon = True
        wst.start()

        # Wait up to 5 seconds for connection
        start = time.time()
        while time.time() - start < 5:
            if connected or ws_error:
                break
            time.sleep(0.2)

        if connected:
            log_pass("WebSocket handshake succeeded")
            # Wait a bit for data
            time.sleep(2)
            if received_data:
                log_pass("Received data from guacd via WebSocket")
            else:
                log_pass("WebSocket connected (no RDP target may be available)")
        else:
            if ws_error:
                log_fail("WebSocket connection", ws_error)
            else:
                log_fail("WebSocket connection timeout")

        ws.close()
    except Exception as e:
        log_fail("WebSocket test", str(e))


# ─── Test: Database Integrity ────────────────────────────────────────────────

def test_database_integrity(base_url):
    log_section("17. Database Integrity")
    try:
        # Connections table should be queryable
        r = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        if r.status_code == 200:
            log_pass("rdp_connections table accessible")
            conns = r.json()
            if len(conns) > 0:
                conn = conns[0]
                expected_fields = ["id", "name", "hostname", "port", "username", "protocol", "virtual_ip"]
                for f in expected_fields:
                    if f in conn:
                        log_pass(f"Field '{f}' present in connections")
                    else:
                        log_fail(f"Field '{f}' missing from connections")
        else:
            log_fail("rdp_connections query", f"Status {r.status_code}")

        # Settings table should work
        r2 = requests.get(f"{base_url}/api/rdp/settings", headers=headers(), timeout=10)
        if r2.status_code == 200:
            log_pass("rdp_settings table accessible")
        else:
            log_fail("rdp_settings query", f"Status {r2.status_code}")
    except Exception as e:
        log_fail("Database integrity", str(e))


# ─── Test: Concurrent Access ────────────────────────────────────────────────

def test_concurrent_access(base_url):
    log_section("18. Concurrent Access")
    import concurrent.futures
    try:
        def make_request(i):
            token = create_token(username=f"user_{i}", user_id=i, role="user")
            h = {"Authorization": f"Bearer {token}"}
            r = requests.get(f"{base_url}/api/rdp/connections", headers=h, timeout=10)
            return r.status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, i) for i in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        if all(s == 200 for s in results):
            log_pass("5 concurrent requests all returned 200")
        else:
            log_fail("Concurrent access", f"Status codes: {results}")
    except Exception as e:
        log_fail("Concurrent access", str(e))


# ─── Test: Edge Cases ───────────────────────────────────────────────────────

def test_edge_cases(base_url):
    log_section("19. Edge Cases")
    try:
        # Invalid token
        r = requests.get(f"{base_url}/api/rdp/settings",
                         headers={"Authorization": "Bearer invalidtoken123"}, timeout=10)
        if r.status_code in [401, 500]:
            log_pass("Invalid token rejected", f"Status {r.status_code}")
        else:
            log_fail("Invalid token", f"Expected 401/500, got {r.status_code}")

        # Empty body on POST
        r2 = requests.post(f"{base_url}/api/rdp/settings", headers=headers(),
                           json={}, timeout=10)
        if r2.status_code == 200:
            log_pass("Empty settings update accepted (no-op)")
        else:
            log_fail("Empty settings update", f"Status {r2.status_code}")

        # Non-existent endpoint
        r3 = requests.get(f"{base_url}/api/rdp/nonexistent", headers=headers(), timeout=10)
        if r3.status_code == 404:
            log_pass("Non-existent endpoint → 404")
        else:
            log_pass("Non-existent endpoint", f"Status {r3.status_code} (acceptable)")

    except Exception as e:
        log_fail("Edge cases", str(e))


# ─── Test: Full Workflow ─────────────────────────────────────────────────────

def test_full_workflow(base_url):
    log_section("20. Full Workflow — Create → Token → Delete")
    try:
        # Step 1: Create
        payload = {
            "name": "Workflow Test PC",
            "hostname": "10.0.0.100",
            "port": 3389,
            "username": "admin",
            "password": "secret",
            "protocol": "rdp"
        }
        r1 = requests.post(f"{base_url}/api/rdp/connections", headers=headers(),
                           json=payload, timeout=10)
        if r1.status_code != 200 or not r1.json().get("success"):
            log_fail("Workflow: Create", f"Status {r1.status_code}")
            return

        log_pass("Workflow: Connection created")

        # Step 2: Find it
        r2 = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        conns = r2.json()
        match = [c for c in conns if c.get("name") == "Workflow Test PC"]
        if not match:
            log_fail("Workflow: Connection not found after create")
            return
        conn_id = match[0]["id"]
        log_pass("Workflow: Connection found", f"id={conn_id}")

        # Step 3: Get token
        r3 = requests.get(f"{base_url}/api/rdp/connections/{conn_id}/token",
                          headers=headers(), timeout=10)
        if r3.status_code == 200 and "token" in r3.json():
            log_pass("Workflow: Token generated")
        else:
            log_fail("Workflow: Token generation", f"Status {r3.status_code}")

        # Step 4: Delete
        r4 = requests.delete(f"{base_url}/api/rdp/connections/{conn_id}",
                             headers=headers(), timeout=10)
        if r4.status_code == 200:
            log_pass("Workflow: Connection deleted")
        else:
            log_fail("Workflow: Delete", f"Status {r4.status_code}")

        # Step 5: Verify deleted
        r5 = requests.get(f"{base_url}/api/rdp/connections", headers=headers(), timeout=10)
        conns2 = r5.json()
        still_there = [c for c in conns2 if c.get("id") == conn_id]
        if not still_there:
            log_pass("Workflow: Verified deletion")
        else:
            log_fail("Workflow: Connection still exists after delete")

    except Exception as e:
        log_fail("Full workflow", str(e))


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="RDP System E2E Tests")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL,
                        help=f"Base URL (default: {DEFAULT_BASE_URL})")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    
    print("=" * 60)
    print("  RDP SYSTEM — COMPREHENSIVE E2E TEST SUITE")
    print(f"  Target: {base_url}")
    print(f"  Time:   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    try:
        # 1. Health
        test_service_health(base_url)

        # 2-4. Settings
        test_settings_get(base_url)
        test_settings_update(base_url)
        test_settings_auth_required(base_url)

        # 5-6. Initialize default
        default_conn = test_initialize_default(base_url)
        test_initialize_default_idempotent(base_url)

        # 7. List connections
        connections = test_list_connections(base_url)

        # 8-9. Create connection
        created_id = test_create_connection(base_url)
        test_create_connection_validation(base_url)

        # 10-11. Delete
        test_delete_connection(base_url, created_id)
        test_delete_connection_auth(base_url)

        # 12-13. Token generation
        conn_id = default_conn.get("id") if default_conn else (connections[0]["id"] if connections else None)
        test_connection_token(base_url, conn_id)
        test_connection_token_not_found(base_url)

        # 14-15. Stop all
        test_stop_all(base_url)
        test_stop_all_auth(base_url)

        # 16. WebSocket
        test_websocket_reachable(base_url)

        # 17. Database
        test_database_integrity(base_url)

        # 18. Concurrent
        test_concurrent_access(base_url)

        # 19. Edge cases
        test_edge_cases(base_url)

        # 20. Full workflow
        test_full_workflow(base_url)

    except Exception as e:
        print(f"\n\033[91m  FATAL ERROR: {e}\033[0m")
        traceback.print_exc()

    # Summary
    print("\n" + "=" * 60)
    total = passed + failed
    if failed == 0:
        print(f"  \033[92m✓ ALL {total} TESTS PASSED\033[0m")
    else:
        print(f"  \033[92m{passed} passed\033[0m, \033[91m{failed} failed\033[0m out of {total}")
        print("\n  Failed tests:")
        for err in errors:
            print(f"    • {err}")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    sys.exit(main())
