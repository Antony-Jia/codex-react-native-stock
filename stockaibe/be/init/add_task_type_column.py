"""
数据库迁移脚本：为 scheduler_tasks 表添加 task_type 列

使用方法：
    conda activate stockai
    python add_task_type_column.py
    
或者直接使用 psql：
    psql -U stockai -d stockai_limiter -f migrations/add_task_type_column.sql
"""
import os
import sys

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("❌ 错误: 未安装 psycopg2")
    print("请先激活 conda 环境: conda activate stockai")
    sys.exit(1)


def get_db_url_from_env():
    """从环境变量或默认值获取数据库连接信息"""
    # 尝试从 .env 文件读取
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('LIMITER_DATABASE_URL='):
                    return line.split('=', 1)[1].strip()
    
    # 默认连接
    return "postgresql://stockai:stockai_password@localhost:5432/stockai_limiter"


def parse_db_url(url):
    """解析数据库 URL"""
    # postgresql://user:password@host:port/database
    url = url.replace('postgresql://', '')
    user_pass, host_db = url.split('@')
    user, password = user_pass.split(':')
    host_port, database = host_db.split('/')
    host, port = host_port.split(':')
    
    return {
        'host': host,
        'port': int(port),
        'database': database,
        'user': user,
        'password': password
    }


def add_task_type_column():
    """为 scheduler_tasks 表添加 task_type 列"""
    
    print("开始数据库迁移：添加 task_type 列")
    
    try:
        # 获取数据库连接信息
        db_url = get_db_url_from_env()
        db_config = parse_db_url(db_url)
        
        print(f"连接到数据库: {db_config['host']}:{db_config['port']}/{db_config['database']}")
        
        # 连接数据库
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 检查列是否已存在
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='scheduler_tasks' 
            AND column_name='task_type'
        """)
        
        result = cursor.fetchone()
        
        if result:
            print("✅ task_type 列已存在，无需迁移")
            cursor.close()
            conn.close()
            return
        
        # 添加 task_type 列
        print("正在添加 task_type 列...")
        cursor.execute("""
            ALTER TABLE scheduler_tasks 
            ADD COLUMN task_type VARCHAR(20) DEFAULT 'scheduler' NOT NULL
        """)
        
        print("✅ 成功添加 task_type 列")
        
        # 验证
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name='scheduler_tasks' 
            AND column_name='task_type'
        """)
        result = cursor.fetchone()
        
        if result:
            print(f"验证成功: column={result[0]}, type={result[1]}, default={result[2]}")
        else:
            print("❌ 验证失败：列未找到")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ 数据库错误: {e}")
        raise
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        raise


if __name__ == "__main__":
    try:
        add_task_type_column()
        print("\n✅ 数据库迁移成功！")
        print("现在可以重新启动应用了。")
    except Exception as e:
        print(f"\n❌ 数据库迁移失败: {e}")
        sys.exit(1)
