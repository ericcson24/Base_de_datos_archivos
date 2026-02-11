"""Test the full guacd handshake through WebSocket to verify the protocol fix."""
import websocket
import base64
import json
import time
import sys

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "localhost"

# Admin token
token = base64.b64encode(json.dumps({
    "id": 1, "username": "administrador", "role": "admin"
}).encode()).decode()

# Use connection ID 3 (System Desktop / host.docker.internal)
ws_url = f"ws://{BASE_URL}/api/rdp?token={token}&id=3"
print(f"Connecting to: {ws_url}")

try:
    ws = websocket.create_connection(
        ws_url,
        subprotocols=["guacamole"],
        timeout=10
    )
    print(f"WebSocket connected, protocol: {ws.subprotocol}")
    
    # Wait for data from the guacd handshake
    # If the handshake works, guacd sends 'ready' which rdp-service forwards
    messages = []
    for i in range(5):
        try:
            data = ws.recv()
            if data:
                msg_preview = data[:150] if len(data) > 150 else data
                print(f"  Message {i+1}: {msg_preview}")
                messages.append(data)
        except websocket.WebSocketTimeoutException:
            print(f"  Message {i+1}: timeout (no more data)")
            break
        except websocket.WebSocketConnectionClosedException:
            print(f"  Message {i+1}: connection closed by server")
            break
        except Exception as e:
            print(f"  Message {i+1}: {type(e).__name__}: {e}")
            break
    
    ws.close()
    
    # Check if we got a 'ready' instruction
    got_ready = any("ready" in m for m in messages)
    got_error = any("error" in m.lower() for m in messages)
    
    if got_ready:
        print("\n✓ HANDSHAKE SUCCESS - received 'ready' from guacd")
        print("  (Connection will close after ready because no RDP target is available)")
    elif got_error:
        print("\n✗ HANDSHAKE ERROR - guacd returned an error")
        for m in messages:
            if "error" in m.lower():
                print(f"  Error: {m}")
    elif messages:
        print(f"\n? HANDSHAKE PARTIAL - received {len(messages)} messages but no 'ready'")
    else:
        print("\n✗ HANDSHAKE FAILED - no messages received from guacd")
        
except Exception as e:
    print(f"Connection error: {type(e).__name__}: {e}")

# Check rdp-service logs
print("\n--- rdp-service should show the handshake with version in connect ---")
print("Run: docker compose logs rdp-service --tail 20")
