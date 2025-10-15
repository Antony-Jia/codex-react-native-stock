# -*- coding: utf-8 -*-
"""Test API directly"""
import sys
sys.path.insert(0, 'src')

from sqlmodel import Session, SQLModel
from stockaibe_be.core import engine
from stockaibe_be.api.auth import register
from stockaibe_be.schemas import UserCreate

print("1. Creating database tables...")
SQLModel.metadata.create_all(engine)
print("   [OK] Tables created")

print("\n2. Testing register function directly...")
try:
    with Session(engine) as db:
        user_in = UserCreate(
            username="directtest",
            password="test123",
            full_name="Direct Test"
        )
        result = register(user_in, db)
        print(f"   [OK] User registered: {result.username} (ID: {result.id})")
except Exception as e:
    print(f"   [FAIL] Registration failed: {e}")
    import traceback
    traceback.print_exc()

print("\nTest completed!")
