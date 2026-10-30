from fastapi import FastAPI, HTTPException, APIRouter
import uuid
from datetime import datetime
from backend_template.models import *
from backend_template.database.agent import *

router = APIRouter(tags=["agent服务"])

# 模拟数据存储（实际项目中应使用数据库）
# agents_db: Dict[str, List[AgentInfo]] = {}

@router.get("/get_agents", response_model=GetAgentsResponse)
async def get_agents(user_id: str):
    """
    获取指定用户的所有agent信息

    Args:
        user_id: 用户ID

    Returns:
        包含所有agent信息的JSON格式数据
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id参数不能为空")

    builtin_agents = get_builtin_agents(user_id)
    custom_agents = get_custom_agents(user_id)

    return GetAgentsResponse(
        builtin_agents=builtin_agents,
        custom_agents=custom_agents
    )


@router.post("/create_agent", response_model=CreateAgentResponse)
async def create_agent(request: CreateAgentRequest):
    """
    创建新的agent

    Args:
        request: 包含user_id, name, system_prompt的请求体

    Returns:
        包含分配的agent ID和名称的JSON格式数据
    """
    # 参数验证
    if not request.user_id:
        raise HTTPException(status_code=400, detail="user_id不能为空")
    if not request.name:
        raise HTTPException(status_code=400, detail="name不能为空")
    if not request.system_prompt:
        raise HTTPException(status_code=400, detail="system_prompt不能为空")

    agent_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()

    # 写入数据库
    create_agent_db(
        agent_id=agent_id,
        user_id=request.user_id,
        name=request.name,
        system_prompt=request.system_prompt,
        created_at=created_at
    )

    return CreateAgentResponse(
        agent_id=agent_id,
        name=request.name
    )


# 额外的实用接口
@router.get("/agent", response_model=AgentInfo)
async def get_agent_by_id(agent_id: str):
    """根据ID获取特定agent信息"""
    agent = get_certain_agent(agent_id)
    return agent


@router.delete("/delete_agent")
async def delete_agent(agent_id: str):
    """删除指定的agent"""
    # if user_id not in agents_db:
    #     raise HTTPException(status_code=404, detail="用户未找到")

    delete_agent_db(agent_id)
    return {"message": f"Agent '{agent_id}' 已删除"}


# 健康检查接口
@router.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(router, host="0.0.0.0", port=8000)