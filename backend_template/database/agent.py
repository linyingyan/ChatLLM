# db/agent.py

from typing import List
from ..config.db_util import get_db_cursor
from ..models.agent import *

def get_builtin_agents(user_id: str) -> List[AgentInfo]:
    agents = []
    with get_db_cursor() as (cursor, conn):
        cursor.execute("SELECT * FROM agent WHERE user_id = %s AND is_builtin = TRUE", (user_id,))
        for row in cursor.fetchall():
            agents.append(AgentInfo(**row))
    return agents

def get_custom_agents(user_id: str) -> List[AgentInfo]:
    agents = []
    with get_db_cursor() as (cursor, conn):
        cursor.execute("SELECT * FROM agent WHERE user_id = %s AND is_builtin = FALSE", (user_id,))
        for row in cursor.fetchall():
            agents.append(AgentInfo(**row))
    return agents

def create_agent_db(
    agent_id: str,
    user_id: str,
    name: str,
    system_prompt: str,
    created_at: str
) -> None:
    with get_db_cursor() as (cursor, conn):
        cursor.execute(
            """
            INSERT INTO agent (agent_id, user_id, name, system_prompt, is_builtin, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (agent_id, user_id, name, system_prompt, False, created_at)
        )
        conn.commit()

def get_certain_agent(agent_id: str) -> AgentInfo:
    with get_db_cursor() as (cursor, conn):
        cursor.execute(
            """
            SELECT *
            FROM agent
            WHERE agent_id = %s
            """,
            (agent_id,)
        )
        return AgentInfo(**cursor.fetchone())

def delete_agent_db(agent_id: str):
    with get_db_cursor() as (cursor, conn):
        cursor.execute(
            """
            DELETE FROM agent
            WHERE agent_id = %s""",
            (agent_id,)
        )
        conn.commit()
