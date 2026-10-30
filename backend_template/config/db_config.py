import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import pymysql
from dbutils.pooled_db import PooledDB

class DatabaseConfig:
    DB_CONFIG = {
        'host': os.getenv("DB_HOST", "127.0.0.1"),
        'user': os.getenv("DB_USER", "chatllm"),
        'password': os.getenv("DB_PASSWORD", ""),
        'database': os.getenv("DB_NAME", "chatllm"),
        'port': int(os.getenv("DB_PORT", "3306")),
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor  # 在这里指定返回字典格式
    }

    connection_pool = None

    @classmethod
    def init_pool(cls):
        if cls.connection_pool is None:
            cls.connection_pool = PooledDB(
                creator=pymysql,
                mincached=2,
                maxcached=5,
                maxconnections=20,
                blocking=True,
                **cls.DB_CONFIG
            )

    @classmethod
    def get_connection(cls):
        try:
            if cls.connection_pool is None:
                cls.init_pool()
            return cls.connection_pool.connection()
        except pymysql.Error as e:
            raise RuntimeError(f"获取数据库连接失败: {e}")