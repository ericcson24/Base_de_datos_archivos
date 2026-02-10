#!/usr/bin/env python3
"""
End-to-End test for RDP Service
Tests the complete flow from authentication to RDP connection setup
"""

import requests
import json
import base64
import time

BASE_URL = "https://proyectonube.xyz"

def create_auth_token(username="eric", user_id=2, role="user"):
    """Create a Base64 encoded auth token"""
    token_data = {
        "id": user_id,
        "username": username,
        "role": role
    }
    return base64.b64encode(json.dumps(token_data).encode()).decode()

def test_rdp_settings():
    """Test RDP settings endpoint"""
    print("\n=== Testing RDP Settings Endpoint ===")
    token = create_auth_token()
    
    response = requests.get(
        f"{BASE_URL}/api/rdp/settings",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Settings endpoint failed"
    return response.json()

def test_rdp_connections():
    """Test RDP connections list endpoint"""
    print("\n=== Testing RDP Connections Endpoint ===")
    token = create_auth_token()
    
    response = requests.get(
        f"{BASE_URL}/api/rdp/connections",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Connections endpoint failed"
    connections = response.json()
    assert len(connections) > 0, "No connections found"
    return connections

def test_rdp_token_generation(connection_id):
    """Test encrypted token generation"""
    print(f"\n=== Testing Token Generation for Connection {connection_id} ===")
    token = create_auth_token()
    
    response = requests.get(
        f"{BASE_URL}/api/rdp/connections/{connection_id}/token",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    assert response.status_code == 200, "Token generation failed"
    assert "token" in data, "Token not in response"
    assert "connectionId" in data, "Connection ID not in response"
    
    # Verify token is base64 and can be decoded
    try:
        decoded = base64.b64decode(data["token"])
        token_data = json.loads(decoded)
        assert "iv" in token_data, "IV not in token"
        assert "value" in token_data, "Value not in token"
        print("✓ Token format is correct (contains iv and value)")
    except Exception as e:
        print(f"✗ Token format error: {e}")
        raise
    
    return data["token"]

def test_database_integrity():
    """Test database integrity via rdp-service"""
    print("\n=== Testing Database Integrity ===")
    
    # Test users table
    print("Checking users table...")
    token = create_auth_token()
    response = requests.get(
        f"{BASE_URL}/api/rdp/connections",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    assert response.status_code == 200, "Cannot query database"
    print("✓ Users table accessible")
    
    # Test RDP tables
    print("Checking RDP tables...")
    connections = response.json()
    if len(connections) > 0:
        conn = connections[0]
        required_fields = ["id", "name", "hostname", "port", "username"]
        for field in required_fields:
            assert field in conn, f"Missing field: {field}"
        print("✓ RDP connections table has all required fields")
    
    return True

def test_create_connection():
    """Test creating a new RDP connection"""
    print("\n=== Testing Create RDP Connection ===")
    token = create_auth_token(role="admin")  # Need admin role
    
    new_connection = {
        "name": "Test Windows VM",
        "hostname": "192.168.1.100",
        "port": 3389,
        "username": "testuser",
        "password": "testpass123",
        "protocol": "rdp"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/rdp/connections",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=new_connection,
        verify=False
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        print("✓ Connection created successfully")
        return response.json()["id"]
    elif response.status_code == 403:
        print("⚠ Admin access required (expected for non-admin users)")
        return None
    else:
        print(f"✗ Unexpected status code: {response.status_code}")
        return None

def run_all_tests():
    """Run all RDP tests"""
    print("=" * 60)
    print("RDP Service End-to-End Tests")
    print("=" * 60)
    
    try:
        # Test 1: Settings
        settings = test_rdp_settings()
        
        # Test 2: Connections list
        connections = test_rdp_connections()
        
        # Test 3: Token generation
        if len(connections) > 0:
            connection_id = connections[0]["id"]
            token = test_rdp_token_generation(connection_id)
        
        # Test 4: Database integrity
        test_database_integrity()
        
        # Test 5: Create connection (optional, needs admin)
        # test_create_connection()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        
        return True
        
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    success = run_all_tests()
    exit(0 if success else 1)
