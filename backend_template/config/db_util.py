from contextlib import contextmanager
import time
from typing import Iterator, Tuple
from backend_template.config.db_config import DatabaseConfig
import pymysql

MAX_RETRIES = 3
RETRY_DELAY = 1

@contextmanager
def get_db_cursor() -> Iterator[Tuple[pymysql.cursors.DictCursor, pymysql.connections.Connection]]:
    """获取数据库游标（带重试机制）"""
    connection = None
    cursor = None
    retry_count = 0

    while retry_count < MAX_RETRIES:
        try:
            connection = DatabaseConfig.get_connection()
            cursor = connection.cursor()  # PyMySQL不需要dictionary参数
            
            yield cursor, connection
            connection.commit()  # 成功时提交事务
            break
            
        except pymysql.Error as err:
            retry_count += 1
            if connection: 
                try:
                    connection.rollback()  # 出错时回滚
                except:
                    pass
            print(f"数据库错误(尝试 {retry_count}/{MAX_RETRIES}): {err}")
            if retry_count >= MAX_RETRIES:
                raise RuntimeError(f"数据库操作失败，已达最大重试次数: {err}")
            time.sleep(RETRY_DELAY)
            
        finally:
            if cursor:
                cursor.close()
            if connection:  # 直接关闭，不需要检查is_connected
                try:
                    connection.close()  # 实际是归还到连接池
                except:
                    pass