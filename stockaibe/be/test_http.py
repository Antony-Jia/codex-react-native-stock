# -*- coding: utf-8 -*-
"""Test HTTP endpoint"""
import httpx

print("Testing registration endpoint...")
try:
    response = httpx.post(
        "http://localhost:8000/api/auth/register",
        json={"username": "httptest", "password": "test123", "full_name": "HTTP Test"},
        timeout=10.0
    )
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
