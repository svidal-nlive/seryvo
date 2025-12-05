"""Quick script to check database users."""
import asyncio
from sqlalchemy import select
from app.core.database import async_session_maker
from app.core.security import verify_password
from app.models import User

async def check_users():
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == "admin@seryvo.com"))
        user = result.scalar_one_or_none()
        if user:
            print(f"User: {user.email}")
            print(f"Hash: {user.password_hash[:50]}...")
            print(f"Verify 'admin123': {verify_password('admin123', user.password_hash)}")
        else:
            print("User not found!")

if __name__ == "__main__":
    asyncio.run(check_users())
