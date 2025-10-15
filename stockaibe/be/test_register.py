# -*- coding: utf-8 -*-
"""Test registration endpoint"""
import sys
sys.path.insert(0, 'src')

from sqlmodel import Session
from stockaibe_be.core import engine, get_password_hash
from stockaibe_be.models import User
from sqlmodel import SQLModel, select, func

print("1. Creating database tables...")
try:
    SQLModel.metadata.create_all(engine)
    print("   [OK] Tables created")
except Exception as e:
    print(f"   [FAIL] Table creation failed: {e}")
    sys.exit(1)

print("\n2. Testing user creation...")
try:
    with Session(engine) as db:
        # Check existing users
        count_statement = select(func.count()).select_from(User)
        user_count = db.exec(count_statement).one()
        print(f"   Current user count: {user_count}")
        
        # Create test user
        user = User(
            username="testuser",
            full_name="Test User",
            hashed_password=get_password_hash("test123"),
            is_superuser=user_count == 0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"   [OK] User created: {user.username} (ID: {user.id}, Superuser: {user.is_superuser})")
except Exception as e:
    print(f"   [FAIL] User creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3. Testing API endpoint...")
try:
    import httpx
    response = httpx.post(
        "http://localhost:8000/api/auth/register",
        json={"username": "apitest", "password": "test123", "full_name": "API Test"}
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text}")
    if response.status_code == 200:
        print("   [OK] API endpoint working")
    else:
        print(f"   [FAIL] API returned error")
except Exception as e:
    print(f"   [FAIL] API test failed: {e}")
    import traceback
    traceback.print_exc()

print("\nTest completed!")
