# -*- coding: utf-8 -*-
"""Test startup connections"""
import sys
sys.path.insert(0, 'src')

print("1. Testing configuration import...")
try:
    from stockaibe_be.core import settings
    print("   [OK] Configuration loaded")
    print(f"   - Database: {settings.database_url}")
    print(f"   - Redis: {settings.redis_url}")
except Exception as e:
    print(f"   [FAIL] Configuration failed: {e}")
    sys.exit(1)

print("\n2. Testing database connection...")
try:
    from stockaibe_be.core.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print(f"   [OK] Database connected: {result.scalar()}")
except Exception as e:
    print(f"   [FAIL] Database connection failed: {e}")
    print(f"   Hint: Make sure PostgreSQL is running")

print("\n3. Testing Redis connection...")
try:
    from stockaibe_be.core.redis_client import get_redis
    redis_client = get_redis()
    redis_client.ping()
    print(f"   [OK] Redis connected")
except Exception as e:
    print(f"   [FAIL] Redis connection failed: {e}")
    print(f"   Hint: Make sure Redis is running")

print("\n4. Testing app loading...")
try:
    from stockaibe_be.main import app
    print(f"   [OK] FastAPI app loaded")
    print(f"   - Title: {app.title}")
    print(f"   - Version: {app.version}")
except Exception as e:
    print(f"   [FAIL] App loading failed: {e}")
    sys.exit(1)

print("\nAll tests completed!")
