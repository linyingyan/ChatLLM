# database/reasoning.py
import json
from datetime import datetime
from typing import Dict, List
from ..config.db_util import get_db_cursor

class ReasoningService:
    @staticmethod
    def get_reasoning_history(session_id: str) -> Dict[str, List[Dict]]:
        """获取指定会话的完整推理过程"""
        try:
            with get_db_cursor() as (cursor, _):
                cursor.execute(
                    "SELECT reasoning_json FROM session WHERE session_id = %s",
                    (session_id,)
                )
                result = cursor.fetchone()
                if result and result["reasoning_json"]:
                    data = json.loads(result["reasoning_json"])
                    # 确保返回标准结构
                    return {
                        "conversations": data.get("conversations", [])
                    }
                return {"conversations": []}
        except Exception as e:
            print(f"[ERROR] 获取推理历史失败: {e}")
            return {"conversations": []}
    @staticmethod
    def update_reasoning_history(
            session_id: str,
            reasoning_data: Dict[str, str]
    ):
        """
        更新推理过程记录

        参数:
            reasoning_data: {
                "user_message": "用户提问内容",
                "assistant_response": "AI最终回复",
                "reasoning_process": "完整推理过程",
                "timestamp": "可选时间戳"
            }
        """
        try:
            # 添加时间戳
            if "timestamp" not in reasoning_data:
                reasoning_data["timestamp"] = datetime.now().isoformat()

            with get_db_cursor() as (cursor, conn):
                # 获取现有记录
                cursor.execute(
                    "SELECT reasoning_json FROM session WHERE session_id = %s",
                    (session_id,)
                )
                result = cursor.fetchone()

                # 构建新数据
                existing = {"conversations": []}
                if result and result["reasoning_json"]:
                    existing = json.loads(result["reasoning_json"])

                existing["conversations"].append(reasoning_data)

                # 更新数据库
                cursor.execute("""
                    UPDATE session 
                    SET 
                        reasoning_json = %s,
                        updated_at = NOW()
                    WHERE session_id = %s
                """, (json.dumps(existing), session_id))
                conn.commit()
        except Exception as e:
            print(f"[ERROR] 更新推理记录失败: {e}")
            raise

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
    def toggle_session_reasoning(session_id: str) -> bool:
        """切换会话的深度思考模式"""
        try:
            with get_db_cursor() as (cursor, conn):
                # 获取当前状态
                cursor.execute(
                    "SELECT is_reasoning FROM session WHERE session_id = %s FOR UPDATE",
                    (session_id,)
                )
                result = cursor.fetchone()
                if not result:
                    raise ValueError("会话不存在")

                new_state = not bool(result["is_reasoning"])

                # 更新状态
                cursor.execute(
                    "UPDATE session SET is_reasoning = %s WHERE session_id = %s",
                    (new_state, session_id)
                )
                conn.commit()

                return new_state
        except Exception as e:
            print(f"[ERROR] 切换会话模式失败: {e}")
            raise