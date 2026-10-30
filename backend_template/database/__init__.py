from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend_template.config.db_config import DatabaseConfig  # 修改导入类

# 从DatabaseConfig类获取数据库配置
DB_CONFIG = DatabaseConfig.DB_CONFIG

# 构建数据库URL - 移除auth_plugin参数
DATABASE_URL = URL.create(
    "mysql+pymysql", username=DB_CONFIG["user"], password=DB_CONFIG["password"],
    host=DB_CONFIG["host"], port=DB_CONFIG["port"], database=DB_CONFIG["database"],
)

# 创建数据库引擎
engine = create_engine(DATABASE_URL)
# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# 创建声明式基类
Base = declarative_base()

# 数据库依赖项
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()