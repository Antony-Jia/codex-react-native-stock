"""创建管理员用户"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlmodel import Session, select
from src.stockaibe_be.core.database import engine
from src.stockaibe_be.models.models import User
from src.stockaibe_be.core.security import get_password_hash

def create_admin():
    """创建管理员用户"""
    with Session(engine) as session:
        # 检查是否已存在admin用户
        statement = select(User).where(User.username == "admin")
        existing_user = session.exec(statement).first()
        
        if existing_user:
            print("管理员用户已存在")
            print(f"用户名: {existing_user.username}")
            print(f"ID: {existing_user.id}")
            return
        
        # 创建新的管理员用户
        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrator",
            is_active=True,
            is_superuser=True
        )
        
        session.add(admin)
        session.commit()
        session.refresh(admin)
        
        print("✓ 管理员用户创建成功!")
        print(f"用户名: {admin.username}")
        print(f"密码: admin123")
        print(f"ID: {admin.id}")

if __name__ == "__main__":
    create_admin()
