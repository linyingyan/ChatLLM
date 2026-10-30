from datetime import datetime
from typing import List, Dict, Optional
from contextlib import contextmanager
from backend_template.config.db_config import DatabaseConfig
import pymysql  # 改用PyMySQL

class KnowledgeDB:
    """完全适配API截图要求的数据库操作类"""

    @staticmethod
    @contextmanager
    def _get_cursor():
        """获取数据库游标（自动管理连接）"""
        connection = None
        cursor = None
        try:
            connection = DatabaseConfig.get_connection()
            cursor = connection.cursor(pymysql.cursors.DictCursor)  # 使用PyMySQL的字典游标
            yield cursor
            connection.commit()  # 执行成功时提交事务
        except Exception as e:
            if connection: 
                connection.rollback()  # 出错时回滚
            raise RuntimeError(f"数据库操作失败: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection:  # 直接关闭，不需要检查is_connected
                connection.close()  # 实际是归还到连接池

    @staticmethod
    def create_knowledge_base(user_id: str, knowledge_base_id: str, kb_name: str) -> bool:
        """创建知识库记录（完整参数版）"""
        with KnowledgeDB._get_cursor() as cursor:
            try:
                # 主表记录
                cursor.execute(
                    """
                    INSERT INTO user_knowledge_base 
                    (user_id, knowledge_base_id) 
                    VALUES (%s, %s)
                    """,
                    (user_id, knowledge_base_id)
                )

                # 文件表记录（包含所有字段）
                cursor.execute(
                    """
                    INSERT INTO knowledge_files 
                    (file_id, knowledge_base_id, file_name, kb_name)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        f"init_{knowledge_base_id}",
                        knowledge_base_id,
                        "default.txt",
                        kb_name
                    )
                )
                return True
            except pymysql.Error as e:
                raise RuntimeError(f"创建知识库失败: {e}")

    @staticmethod
    def add_file_record(file_id: str, file_name: str, knowledge_base_id: str, kb_name: str):
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO knowledge_files 
                (file_id, file_name, knowledge_base_id, kb_name)
                VALUES (%s, %s, %s, %s)
                """,
                (file_id, file_name, knowledge_base_id, kb_name)
            )

    @staticmethod
    def get_file_info(file_id: str) -> Optional[Dict]:
        """获取文件信息"""
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM knowledge_files WHERE file_id = %s",
                (file_id,)
            )
            return cursor.fetchone()

    @staticmethod
    def get_files_by_kb(knowledge_base_id: str) -> List[Dict]:
        """获取知识库文件列表"""
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    file_id, 
                    file_name,
                    created_at
                FROM knowledge_files 
                WHERE knowledge_base_id = %s
                ORDER BY created_at DESC
            """, (knowledge_base_id,))
            return cursor.fetchall()

    @staticmethod
    def get_knowledge_bases_by_user_id(user_id: str):
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute("""
                SELECT kf.kb_name, ukb.knowledge_base_id, kf.created_at
                FROM user_knowledge_base ukb
                JOIN knowledge_files kf ON ukb.knowledge_base_id = kf.knowledge_base_id
                WHERE ukb.user_id = %s
            """, (user_id,))

            results = cursor.fetchall()
            for item in results:
                if 'created_at' in item and isinstance(item['created_at'], datetime):
                    item['created_at'] = item['created_at'].isoformat()
            return results

    @staticmethod
    def delete_files(knowledge_base_id: str, file_ids: List[str]) -> int:
        """删除指定文件记录"""
        with KnowledgeDB._get_cursor() as cursor:
            placeholders = ','.join(['%s'] * len(file_ids))
            cursor.execute(
                f"""
                DELETE FROM knowledge_files 
                WHERE knowledge_base_id = %s 
                AND file_id IN ({placeholders})
                """,
                [knowledge_base_id] + file_ids
            )
            return cursor.rowcount

    @staticmethod
    def delete_knowledge_base(knowledge_base_id: str):
        """删除知识库主记录"""
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM user_knowledge_base WHERE knowledge_base_id = %s",
                (knowledge_base_id,)
            )

    @staticmethod
    def delete_files_by_kb(knowledge_base_id: str):
        """删除知识库关联的所有文件记录"""
        with KnowledgeDB._get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM knowledge_files WHERE knowledge_base_id = %s",
                (knowledge_base_id,)
            )