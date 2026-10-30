# database/conversation.py
from datetime import datetime
import json
import uuid
from typing import List, Dict, Optional
from fastapi import HTTPException
from backend_template.config.db_util import get_db_cursor

class ConversationService:
    @staticmethod
    def create_new_session(
            user_id: str,
            initial_message: Optional[str] = None,
            is_reasoning: bool = False
    ) -> Dict:
        """
        创建新会话（自动生成session_id）

        参数:
            user_id: 用户ID
            initial_message: 初始消息
            is_reasoning: 是否为深度思考会话
        """
        session_id = f"sess_{uuid.uuid4().hex[:8]}"
        title = (initial_message[:20] + "...") if initial_message else "新对话"
        created_at = datetime.now().isoformat()

        initial_history = []
        if initial_message:
            initial_history.append({
                "role": "user",
                "content": initial_message,
                "timestamp": created_at
            })

        try:
            with get_db_cursor() as (cursor, conn):
                # 插入session表
                cursor.execute(
                    """INSERT INTO session 
                    (session_id, title, history_json, reasoning_json, is_reasoning, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (
                        session_id,
                        title,
                        json.dumps(initial_history),
                        json.dumps({"conversations": []}) if is_reasoning else None,
                        is_reasoning,
                        created_at,
                        created_at
                    )
                )

                # 插入user_session关联表
                cursor.execute(
                    """INSERT INTO user_session 
                    (user_id, session_id)
                    VALUES (%s, %s)""",
                    (user_id, session_id)
                )

                conn.commit()

            return {
                "session_id": session_id,
                "title": title,
                "is_reasoning": is_reasoning,
                "created_at": created_at,
                "updated_at": created_at,
                "preview": initial_message or "新对话"
            }
        except Exception as e:
            print(f"[ERROR] 创建会话失败: {e}")
            raise HTTPException(500, "创建会话失败")

    @staticmethod
    def get_user_sessions(user_id: str) -> List[Dict]:
        """获取用户的所有会话列表（按更新时间倒序）"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute("""
                    SELECT 
                        s.session_id,
                        s.title,
                        s.is_reasoning,
                        s.created_at,
                        s.updated_at,
                        JSON_UNQUOTE(JSON_EXTRACT(s.history_json, '$[0].content')) as preview
                    FROM session s
                    JOIN user_session us ON s.session_id = us.session_id
                    WHERE us.user_id = %s
                    ORDER BY s.updated_at DESC
                    LIMIT 100  # 防止返回过多数据
                """, (user_id,))

                sessions = []
                for row in cursor.fetchall():
                    try:
                        sessions.append({
                            "session_id": row["session_id"],
                            "title": row["title"],
                            "is_reasoning": bool(row["is_reasoning"]),
                            "created_at": row["created_at"],
                            "updated_at": row["updated_at"],
                            "preview": row["preview"] or "无历史消息"
                        })
                    except Exception as e:
                        print(f"[WARN] 解析会话数据失败: {e}")
                        continue

                return sessions
        except Exception as e:
            print(f"[ERROR] 获取会话列表失败: {e}")
            return []

    @staticmethod
    def get_session_history(session_id: str) -> List[Dict]:
        """获取指定会话的完整历史消息。"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute(
                    "SELECT history_json FROM session WHERE session_id = %s",
                    (session_id,)
                )
                result = cursor.fetchone()
                if result and result["history_json"]:
                    # 直接加载并返回 JSON，不做任何字段过滤
                    # 数据库里存了什么，就返回什么
                    history = json.loads(result["history_json"])
                    return history
                return []
        except Exception as e:
            print(f"[ERROR] 获取会话历史失败: {e}")
            return []

    @staticmethod
    def update_session_history(session_id: str, history: List[Dict]):
        """更新会话历史（会自动更新timestamp）"""
        try:
            # 确保每条消息都有时间戳
            for msg in history:
                if "timestamp" not in msg:
                    msg["timestamp"] = datetime.now().isoformat()

            with get_db_cursor() as (cursor, conn):
                cursor.execute("""
                    UPDATE session 
                    SET 
                        history_json = %s,
                        updated_at = NOW()
                    WHERE session_id = %s
                """, (json.dumps(history), session_id))
                conn.commit()
        except Exception as e:
            print(f"[ERROR] 更新会话历史失败: {e}")
            raise

    # 还是保留所有 'tool' 角色的消息，前端会把他渲染成特殊的类似于 “思考” 的框框，显示出我们是有调用工具的
    # @staticmethod
    # def update_session_history(session_id: str, history: List[Dict]):
    #     """
    #     更新会话历史。
    #     在保存前，对历史记录进行清理，只保留对下一轮对话有用的部分。
    #     """
    #
    #     # --- 清理逻辑 ---
    #     # 移除所有包含 'tool_calls' 的助手消息（这是中间思考步骤）
    #     # 同时移除所有 'tool' 角色的消息（因为它们的上下文已经被最终答案包含了）
    #     # 只保留 'user' 和最终的 'assistant' 回答
    #     cleaned_history = [
    #         msg for msg in history
    #         if msg.get("role") not in ["tool"] and "tool_calls" not in msg
    #     ]
    #
    #     # 确保每条消息都有时间戳
    #     for msg in cleaned_history:
    #         if "timestamp" not in msg:
    #             msg["timestamp"] = datetime.now().isoformat()
    #
    #     print(f"原始历史有 {len(history)} 条, 清理后剩 {len(cleaned_history)} 条准备保存。")
    #
    #     try:
    #         with get_db_cursor() as (cursor, conn):
    #             cursor.execute("""
    #                   UPDATE session
    #                   SET
    #                       history_json = %s,
    #                       updated_at = NOW()
    #                   WHERE session_id = %s
    #               """, (json.dumps(cleaned_history), session_id))
    #             conn.commit()
    #     except Exception as e:
    #         print(f"[ERROR] 更新会|话历史失败: {e}")
    #         raise

    @staticmethod
    def validate_session_ownership(user_id: str, session_id: str) -> bool:
        """验证会话是否属于该用户"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute(
                    "SELECT 1 FROM user_session WHERE user_id = %s AND session_id = %s",
                    (user_id, session_id)
                )
                return bool(cursor.fetchone())
        except Exception as e:
            print(f"[ERROR] 验证会话所有权失败: {e}")
            return False

    @staticmethod
    def is_reasoning_session(session_id: str) -> bool:
        """检查是否为深度思考会话"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute(
                    "SELECT is_reasoning FROM session WHERE session_id = %s",
                    (session_id,)
                )
                result = cursor.fetchone()
                return bool(result["is_reasoning"]) if result else False
        except Exception as e:
            print(f"[ERROR] 检查会话类型失败: {e}")
            return False

    @staticmethod
    def get_session_detail_info(session_id) -> Dict:
        """根据session_id获取该会话所有详细信息，包含历史消息、推理消息等"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute(
                    "SELECT * FROM session WHERE session_id = %s",
                    (session_id,)
                )
                result = cursor.fetchone()
                return result
        except Exception as e:
            print(f"[ERROR] 检查会话类型失败: {e}")
            return {}

    @staticmethod
    def delete_session_by_id(session_id: str):
        """
        根据 session_id 删除会话及其关联记录
        """
        try:
            with get_db_cursor() as (cursor, conn):
                # 删除 user_session 表中的关联记录
                cursor.execute(
                    "DELETE FROM user_session WHERE session_id = %s",
                    (session_id,)
                )

                # 删除 session 表中的记录
                cursor.execute(
                    "DELETE FROM session WHERE session_id = %s",
                    (session_id,)
                )

                conn.commit()
        except Exception as e:
            print(f"[ERROR] 删除会话失败: {e}")
            raise