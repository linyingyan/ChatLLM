# 数据模型
from datetime import datetime

from pydantic import BaseModel
from typing import List, Dict, Optional



class CreateAgentRequest(BaseModel):
    user_id: str
    name: str
    system_prompt: str


class AgentInfo(BaseModel):
    agent_id: str
    name: str
    system_prompt: str
    created_at: datetime
    user_id: str


class CreateAgentResponse(BaseModel):
    agent_id: str
    name: str


class GetAgentsResponse(BaseModel):
    builtin_agents: List[AgentInfo]
    custom_agents: List[AgentInfo]
