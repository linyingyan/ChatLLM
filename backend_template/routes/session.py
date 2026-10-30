# routes/session.py
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend_template.config.db_util import get_db_cursor
from backend_template.database.conversation import ConversationService

router = APIRouter(prefix="/sessions", tags=["创建会话接口"])


# ------------------- 数据模型 -------------------
class NewSessionRequest(BaseModel):
    user_id: str
    initial_message: Optional[str] = None
    use_reasoning: bool = False


class SessionInfo(BaseModel):
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    preview: str
    is_reasoning: bool


class SessionDetailInfo(BaseModel):
    session_id: str
    history_json: Optional[str] = None
    title: str
    is_pin: Optional[bool] = None
    created_at: datetime
    updated_at: datetime
    reasoning_json: Optional[str] = None
    is_reasoning: bool
    agent_id: Optional[str] = None



@router.post("/new")
async def create_session(request: NewSessionRequest):
    return ConversationService.create_new_session(
        user_id=request.user_id,
        initial_message=request.initial_message,
        is_reasoning=request.use_reasoning
    )

@router.delete("/delete")
async def delete_session(session_id: str):
    """
    删除指定会话，包括 session 表和 user_session 表的相关记录
    """
    try:
        ConversationService.delete_session_by_id(session_id)
        return {"message": f"会话 {session_id} 删除成功"}
    except Exception as e:
        print(f"[ERROR] 删除会话失败: {e}")
        raise HTTPException(500, f"删除会话失败: {str(e)}")



@router.get("/list", response_model=List[SessionInfo])
async def list_user_sessions(user_id: str):
    """获取用户的所有会话列表"""
    try:
        return ConversationService.get_user_sessions(user_id)
    except Exception as e:
        raise HTTPException(500, f"获取会话列表失败: {str(e)}")


@router.post("/toggle-reasoning")
async def toggle_reasoning_mode(session_id: str, user_id: str):
    """切换会话的深度思考模式"""
    if not ConversationService.validate_session_ownership(user_id, session_id):
        raise HTTPException(403, "无权访问此会话")

    try:
        current_mode = ConversationService.is_reasoning_session(session_id)
        new_mode = not current_mode

        with get_db_cursor() as (cursor, conn):
            cursor.execute(
                "UPDATE session SET is_reasoning = %s WHERE session_id = %s",
                (new_mode, session_id)
            )
            conn.commit()

        return {"is_reasoning": new_mode}
    except Exception as e:
        raise HTTPException(500, f"切换模式失败: {str(e)}")


@router.get("/get_session_detail_info", response_model=SessionDetailInfo)
async def list_user_sessions(session_id: str):
    """获取用户的所有会话列表"""
    try:
        data = ConversationService.get_session_detail_info(session_id)
        if not data:
            raise HTTPException(status_code=404, detail="未找到会话")
        return SessionDetailInfo(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话详情失败: {str(e)}")
