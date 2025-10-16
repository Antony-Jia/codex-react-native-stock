"""简单测试配额API"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests

BASE_URL = "http://localhost:8000"

# 测试健康检查
print("测试健康检查...")
response = requests.get(f"{BASE_URL}/health")
print(f"状态码: {response.status_code}")
print(f"响应: {response.json()}")
print()

# 尝试不同的登录方式
print("测试登录 (form data)...")
response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "admin", "password": "admin123"}
)
print(f"状态码: {response.status_code}")
print(f"响应: {response.text[:200]}")
print()

print("测试登录 (json)...")
response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"username": "admin", "password": "admin123"}
)
print(f"状态码: {response.status_code}")
print(f"响应: {response.text[:200]}")
