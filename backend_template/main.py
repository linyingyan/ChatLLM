# 保证在任何目录下执行main.py，都能正确导入包
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes.chat import lifespan  # <-- 导入 lifespan

# 导入路由模块
from routes import auth, chat, agent, session, file_extract, knowledge, rag
from backend_template.database import engine, Base
from backend_template.routes import user, chat, agent, knowledge , session,rag,file_extract


def create_app() -> FastAPI:
    """应用工厂模式，严格匹配您图片中的架构"""

    # 1. 只创建一次 FastAPI 实例，并直接传入 lifespan
    app = FastAPI(
        title="ChatLLM API",
        description="基于分层架构的AI问答平台",
        version="1.0",
        lifespan=lifespan  # <--- 在这里应用 lifespan
    )

    # 2. 将 CORS 中间件添加到这个唯一的 app 实例上
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 开发时用 "*" 很方便，生产环境建议指定具体来源
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 3. 将所有路由挂载到这个唯一的 app 实例上
    app.include_router(user.router)
    app.include_router(auth.router)
    app.include_router(chat.router)
    app.include_router(agent.router)
    app.include_router(session.router)
    app.include_router(file_extract.router)
    app.include_router(knowledge.router)
    app.include_router(rag.router)

    return app


# --- 下面的部分保持不变 ---
if __name__ == "__main__":
    # 启动配置（生产环境应使用环境变量）
    # 假设你有这个模块
    # from backend_template.config.db_config import DatabaseConfig
    # DatabaseConfig.init_pool()

    # uvicorn.run 的 app 路径需要指向你的项目模块
    # "main:create_app" 适用于 main.py 在项目根目录的情况
    uvicorn.run(
        app="main:create_app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        factory=True  # 启用工厂模式
    )