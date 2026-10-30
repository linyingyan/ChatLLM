from sqlalchemy import Column, Integer, String
from . import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)  # 用户名唯一
    password_hash = Column(String(200))  # 存储加密后的密码