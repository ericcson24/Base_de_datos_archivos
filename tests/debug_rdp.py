import requests
import json
import base64
import websocket # pip install websocket-client
import time
import threading
import sys

# Configuration
BASE_URL = "http://localhost/api/rdp"
USER_PAYLOAD = json.dumps({
    "id": 1,
    "role": "admin",
    "username": "administrador"
})
TOKEN = base64.b64encode(USER_PAYLOAD.encode()).decode()
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def print_pass(msg):
    print(f"\033[92m[PASS] {msg}\033[0m")

def print_fail(msg):
    print(f"\033[91m[FAIL] {msg}\033[0m")

def check_endpoint(name, method, endpoint, payload=None):
    url = f"{BASE_URL}{endpoint}"
    print(f"\n--- Testing {name} ---")
    print(f"{method} {url}")
    try:
        if method == 'GET':
            response = requests.get(url, headers=HEADERS)
        else:
            response = requests.post(url, headers=HEADERS, json=payload)
        
        if response.status_code in [200, 201]:
            print_pass(f"{name} (Status: {response.status_code})")
            return response
        else:
            print_fail(f"{name} (Status: {response.status_code})")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print_fail(f"{name} Error: {e}")
        return None

def test_websocket(token, connection_id):
    print(f"\n--- Testing WebSocket Connection (ID: {connection_id}) ---")
    # Direct port 5008 to bypass nginx for raw socket test, 
    # ensuring backend is accepting connections.
    ws_url = f"ws://localhost:5008/?token={token}&id={connection_id}"
    print(f"Connecting to {ws_url}")
    
    connected = False
    
    def on_open(ws):
        nonlocal connected
        connected = True
        print_pass("WebSocket Handshake Successful")
        # Keep open briefly then close
        def close_later():
            time.sleep(2)
            ws.close()
        threading.Thread(target=close_later).start()

    def on_message(ws, message):
        # Guacamole protocol usually sends "args" opcode first
        print(f"Received Data: {message[:20]}...")

    def on_error(ws, error):
        print(f"WS Error: {error}")

    def on_close(ws, close_status_code, close_msg):
        print("WebSocket Closed")

    ws = websocket.WebSocketApp(ws_url,
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)
    
    wst = threading.Thread(target=ws.run_forever)
    wst.daemon = True
    wst.start()
    
    # Wait for connection
    start_time = time.time()
    while time.time() - start_time < 5:
        if connected:
            break
        time.sleep(0.1)
        
    if not connected:
        print_fail("WebSocket Handshake Timeout or Failure")
    
    # Ensure thread cleanup
    ws.close()

if __name__ == "__main__":
    print("=== RDP SYSTEM TEST SUITE ===")
    
    # 1. Initialize Default Connection
    res_init = check_endpoint("Initialize Default", "POST", "/initialize-default")
    
    if res_init:
        data = res_init.json()
        conn = data.get('connection')
        if conn:
            conn_id = conn.get('id')
            server_id = conn.get('server_id')
            print(f"  > Connection ID: {conn_id}")
            print(f"  > Server ID: {server_id}")
            print(f"  > Hostname: {conn.get('hostname')}")
            
            # 2. Verify List
            res_list = check_endpoint("List Connections", "GET", "/connections")
            if res_list:
                conns = res_list.json()
                found = any(c['id'] == conn_id for c in conns)
                if found:
                    print_pass(f"Connection {conn_id} found in list")
                else:
                    print_fail(f"Connection {conn_id} NOT found in list")
            
            # 3. Test Connection Capability
            test_websocket(TOKEN, conn_id)

            # 4. Create Custom Connection (Simulation)
            print("\n--- Testing Custom Connection Creation ---")
            payload = {
                "name": "Test Server",
                "hostname": "192.168.1.100",
                "port": 3389,
                "username": "testuser",
                "password": "password"
            }
            res_create = check_endpoint("Create Connection", "POST", "/connections", payload)
            if res_create:
                print_pass("Custom Connection Created")
                # Clean up (find id and delete?)
                # We can't easily find ID from this response as it returns virtual_ip usually, 
                # but let's assume it works if status is 200.
                pass

        else:
            print_fail("No connection object in response")
    
    print("\n=== TEST COMPLETED ===")
    sys.exit(0)