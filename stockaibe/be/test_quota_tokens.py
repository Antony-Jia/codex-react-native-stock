"""测试配额剩余令牌功能"""
import requests
import time
import json
import sys
import io

# 设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

def login():
    """登录获取token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"登录失败: {response.text}")
        return None

def get_quotas(token):
    """获取配额列表"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/quotas", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"获取配额失败: {response.text}")
        return None

def acquire_token(quota_id, cost=1):
    """消耗令牌"""
    response = requests.post(
        f"{BASE_URL}/api/limiter/acquire",
        json={
            "qid": quota_id,
            "cost": cost,
            "success": True,
            "latency_ms": 100.0,
            "message": "测试消耗"
        }
    )
    if response.status_code == 200:
        return response.json()
    else:
        print(f"消耗令牌失败: {response.text}")
        return None

def main():
    print("=== 测试配额剩余令牌功能 ===\n")
    
    # 1. 登录
    print("1. 登录...")
    token = login()
    if not token:
        return
    print("✓ 登录成功\n")
    
    # 2. 获取配额列表
    print("2. 获取配额列表...")
    quotas = get_quotas(token)
    if not quotas:
        return
    
    print(f"✓ 获取到 {len(quotas)} 个配额:\n")
    for quota in quotas:
        current_tokens = quota.get('current_tokens', 'N/A')
        print(f"  - {quota['id']}: {quota['name']}")
        print(f"    容量: {quota['capacity']}, 补充速率: {quota['refill_rate']}/s")
        print(f"    当前令牌: {current_tokens}")
        print()
    
    # 3. 选择第一个配额进行测试
    if quotas:
        test_quota = quotas[0]
        quota_id = test_quota['id']
        print(f"3. 测试配额 '{quota_id}' 的令牌消耗...\n")
        
        # 消耗一些令牌
        for i in range(3):
            print(f"  第 {i+1} 次消耗令牌...")
            result = acquire_token(quota_id, cost=5)
            if result:
                print(f"  ✓ 允许: {result['allow']}, 剩余: {result['remain']:.2f}")
            time.sleep(1)
        
        print()
        
        # 4. 再次获取配额列表，查看令牌变化
        print("4. 再次获取配额列表，查看令牌变化...\n")
        quotas = get_quotas(token)
        if quotas:
            for quota in quotas:
                if quota['id'] == quota_id:
                    current_tokens = quota.get('current_tokens', 'N/A')
                    print(f"  配额 '{quota_id}':")
                    print(f"  当前令牌: {current_tokens}")
                    print(f"  容量: {quota['capacity']}")
                    if isinstance(current_tokens, (int, float)):
                        percent = (current_tokens / quota['capacity']) * 100
                        print(f"  使用率: {percent:.1f}%")
        
        print("\n5. 等待10秒，观察令牌恢复...")
        time.sleep(10)
        
        quotas = get_quotas(token)
        if quotas:
            for quota in quotas:
                if quota['id'] == quota_id:
                    current_tokens = quota.get('current_tokens', 'N/A')
                    print(f"  10秒后令牌数: {current_tokens}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    main()
