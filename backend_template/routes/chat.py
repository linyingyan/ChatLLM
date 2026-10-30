# # routes/chat.py
# import httpx
# from fastapi import APIRouter, HTTPException, Depends
# from fastapi.responses import StreamingResponse
# from typing import List, Dict, Optional, AsyncGenerator
# import json
# from datetime import datetime
# from pydantic import BaseModel
#
#
#
# # 使用框架现有模块（不新增CurrentUser）
# from backend_template.database.conversation import ConversationService
# from backend_template.database.reasoning import ReasoningService
# from backend_template.api.deepseek import deepseek_stream_generator, DEEPSEEK_API_BASE, DEEPSEEK_API_KEY
#
#
# router = APIRouter(tags=["对话接口"])  # 不能再加 prefix 了，不然下面又有一个 chat，前端就要请求 chat/chat了
#
#
# # ------------------- 原始数据模型（保持完全一致） -------------------
# class ChatMessage(BaseModel):
#     role: str  # "user" | "assistant"
#     content: str
#
#
# class ChatRequest(BaseModel):
#     user_id: str  # 保持直接传递user_id
#     session_id: str
#     messages: List[ChatMessage]
#     stream: bool = True
#     model: Optional[str] = None
#     temperature: Optional[float] = 0.7
#     use_reasoning: Optional[bool] = None
#
#
# class ChatResponseChunk(BaseModel):
#     content: str
#     reasoning: Optional[str] = None
#
#
# # ------------------- 核心路由（解决CurrentUser报错） -------------------
# @router.post("/chat")
# async def chat_endpoint(request: ChatRequest):
#     """处理聊天请求（支持流式/非流式）"""
#     # 验证会话所有权
#     if not ConversationService.validate_session_ownership(request.user_id, request.session_id):
#         raise HTTPException(403, "无权访问此会话")
#
#     # 确定使用哪种模型（优先使用请求参数，否则根据会话类型自动选择）
#     is_reasoning = request.use_reasoning if request.use_reasoning is not None else ConversationService.is_reasoning_session(
#         request.session_id)
#     model = request.model or ("deepseek-reasoner" if is_reasoning else "deepseek-chat")
#
#     # 转换消息格式（始终包含完整历史）
#     api_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
#
#     if request.stream:
#         return StreamingResponse(
#             deepseek_stream_generator(
#                 session_id=request.session_id,
#                 messages=api_messages,
#                 model=model,
#                 temperature=request.temperature,
#                 is_reasoning=is_reasoning
#             ),
#             media_type="text/event-stream"
#         )
#     else:
#         return await handle_non_streaming_chat(
#             session_id=request.session_id,
#             messages=api_messages,
#             model=model,
#             temperature=request.temperature,
#             is_reasoning=is_reasoning
#         )
#
#
# # ------------------- 核心逻辑 -------------------
# async def deepseek_stream_generator(
#         session_id: str,
#         messages: List[Dict],
#         model: str,
#         temperature: float,
#         is_reasoning: bool
# ) -> AsyncGenerator[str, None]:
#     """支持完整历史记录的流式响应生成器"""
#     # 加载完整历史（包括所有用户和AI消息）
#     history = ConversationService.get_session_history(session_id)
#     full_messages = history + messages  # 包含当前用户最新提问
#
#     headers = {
#         "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
#         "Content-Type": "application/json"
#     }
#
#     payload = {
#         "messages": full_messages,
#         "model": model,
#         "stream": True,
#         "temperature": temperature
#     }
#
#     async with httpx.AsyncClient() as client:
#         async with client.stream(
#                 "POST",
#                 f"{DEEPSEEK_API_BASE}/chat/completions",
#                 headers=headers,
#                 json=payload,
#                 timeout=30.0
#         ) as response:
#             if response.status_code != 200:
#                 error = await response.aread()
#                 raise HTTPException(response.status_code, error.decode())
#
#             accumulated_content = ""
#             reasoning_content = ""
#             current_user_message = messages[-1]["content"] if messages else ""
#
#             async for chunk in response.aiter_lines():
#                 if chunk.startswith("data: "):
#                     data = chunk[6:].strip()
#                     if data and data != "[DONE]":
#                         try:
#                             chunk_data = json.loads(data)
#                             delta = chunk_data["choices"][0]["delta"]
#
#                             # 处理不同模式的响应
#                             content_piece = str(delta.get("content") or "")
#                             reasoning_piece = str(delta.get("reasoning_content", "") or "") if is_reasoning else None
#                             # print(f'reasoning_content的内容：{delta.get("reasoning_content", "")}')
#                             # print(f'reasoning_piece：{reasoning_piece}')
#
#                             accumulated_content += content_piece if content_piece is not None else ""
#                             if is_reasoning:
#                                 reasoning_content += str(reasoning_piece) if reasoning_piece is not None else ""
#
#                             # 构造标准化的响应块
#                             response_chunk = ChatResponseChunk(
#                                 content=content_piece,
#                                 reasoning=reasoning_piece
#                             ).dict()
#
#                             yield f"data: {json.dumps(response_chunk)}\n\n"
#
#                         except Exception as e:
#                             print(f"处理chunk时出错: {e}")
#
#             # 保存完整历史（区分模式）
#             if accumulated_content.strip():
#                 # 更新普通对话历史（始终包含完整上下文）
#                 new_history = full_messages + [{
#                     "role": "assistant",
#                     "content": accumulated_content
#                 }]
#                 ConversationService.update_session_history(session_id, new_history)
#
#                 # 深度思考模式额外保存推理过程
#                 if is_reasoning:
#                     reasoning_data = {
#                         "user_message": current_user_message,
#                         "assistant_response": accumulated_content,
#                         "reasoning_process": reasoning_content
#                     }
#                     ReasoningService.update_reasoning_history(session_id, reasoning_data)
#
#
# async def handle_non_streaming_chat(
#         session_id: str,
#         messages: List[Dict],
#         model: str,
#         temperature: float,
#         is_reasoning: bool
# ) -> Dict:
#     """处理非流式聊天请求"""
#     history = ConversationService.get_session_history(session_id)
#     full_messages = history + messages
#
#     async with httpx.AsyncClient() as client:
#         headers = {
#             "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
#             "Content-Type": "application/json"
#         }
#
#         payload = {
#             "messages": full_messages,
#             "model": model,
#             "stream": False,
#             "temperature": temperature
#         }
#
#         response = await client.post(
#             f"{DEEPSEEK_API_BASE}/chat/completions",
#             headers=headers,
#             json=payload
#         )
#
#         if response.status_code != 200:
#             raise HTTPException(response.status_code, response.text)
#
#         result = response.json()
#         ai_message = result["choices"][0]["message"]
#
#         # 更新普通历史
#         new_history = full_messages + [{
#             "role": "assistant",
#             "content": ai_message["content"]
#         }]
#         ConversationService.update_session_history(session_id, new_history)
#
#         # 深度思考模式处理
#         if is_reasoning:
#             reasoning_data = {
#                 "user_message": messages[-1]["content"] if messages else "",
#                 "assistant_response": ai_message["content"],
#                 "reasoning_process": ai_message.get("reasoning_content", "")
#             }
#             ReasoningService.update_reasoning_history(session_id, reasoning_data)
#
#         return {
#             "content": ai_message["content"],
#             "reasoning": ai_message.get("reasoning_content") if is_reasoning else None
#         }
#


# routes/chat.py

import json
from typing import List, Dict, Optional, AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, HTTPException, FastAPI, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI

# 导入您项目中的模块
from backend_template.database.conversation import ConversationService
from backend_template.api.deepseek import DEEPSEEK_API_BASE, DEEPSEEK_API_KEY

# 1. 导入我们新的 Stdio 客户端和 Session 工厂
from backend_template.mcpnow.client import NanhaiToolClient, get_mcp_session, cleanup_mcp_session
from mcp import ClientSession  # 导入 ClientSession 类型注解


# --- FastAPI 生命周期管理 ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时执行
    print("FastAPI 应用启动，开始初始化 MCP Session...")
    await get_mcp_session()  # 预热并创建单例会话
    yield
    # 应用关闭时执行
    print("FastAPI 应用关闭，开始清理 MCP Session...")
    await cleanup_mcp_session()


# =========================================================================
# **重要**: 请确保将这个 lifespan 应用到你的主 FastAPI 应用实例上！
# 例如，在你的 main.py 中:
# from routes.chat import lifespan
# app = FastAPI(lifespan=lifespan)
# =========================================================================

# 依赖注入函数
async def get_tool_client() -> NanhaiToolClient:
    session = await get_mcp_session()
    if not session:
        raise HTTPException(status_code=503, detail="MCP 服务会话不可用。")
    return NanhaiToolClient(session)


# --- 初始化 ---
router = APIRouter(tags=["对话接口"])

deepseek_client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_BASE)


# --- 数据模型 (保持不变) ---
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    messages: List[ChatMessage]
    stream: bool = True
    model: Optional[str] = "deepseek-chat"
    temperature: Optional[float] = 0.7
    use_mcp: bool = False  # 是否使用 MCP 工具决策逻辑
    mcp_list: List[str] = ["nanhai_mcp"]  # 默认使用 nanhai_mcp 工具柜（暂未用到，现在前端已写死，假装可使用其他工具，但其实并不行，这里设置该字段是考虑后面扩展）


# --- 核心路由 ---
# --- 核心路由 ---
# --- 核心路由 ---
@router.post("/chat")
async def chat_endpoint(
        request: ChatRequest,
        mcp_client: NanhaiToolClient = Depends(get_tool_client)
):
    # ... (前面的用户验证、历史加载逻辑不变) ...
    if not ConversationService.validate_session_ownership(request.user_id, request.session_id):
        raise HTTPException(403, "无权访问此会话")

    history = ConversationService.get_session_history(request.session_id)
    api_messages = history + [{"role": msg.role, "content": msg.content} for msg in request.messages]

    tools = []
    if request.use_mcp:
        tools = await mcp_client.get_tools()

    # 如果用户明确要求非流式，我们走一个简化的非流式路径 (可选，但推荐)
    # 这样可以避免不必要的复杂处理
    if not request.stream:
        # 你的 handle_non_streaming_chat 函数可以放在这里
        # return await handle_non_streaming_chat_with_tools(...)
        # 为了简单，我们先只处理流式
        pass

    # 如果用户要求进行mcp调用决策，才进行两步式调用，否则直接进行普通的流式输出结果（避免每次都多此一举，拉长响应时间）
    if request.use_mcp:
        # --- 对于流式请求，进行两步式调用 ---
        # 步骤 1: 第一次非流式调用，仅用于决策是否使用工具
        print("用户需要进行mcp工具调用判断，正在进行第一步决策判断...")
        try:
            first_response = await deepseek_client.chat.completions.create(
                model=request.model,
                messages=api_messages,
                tools=tools if tools else None,
                tool_choice="auto",
                temperature=request.temperature,
                stream=False  # 明确指定为 False
            )
            response_message = first_response.choices[0].message
            api_messages.append(response_message.model_dump(exclude_unset=True))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"调用 DeepSeek API 决策时失败: {str(e)}")

        # 步骤 2: 根据决策结果，构建最终的流式响应

        # 情况一：模型决定调用工具
        if response_message.tool_calls:
            tool_outputs = []
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                function_response = await mcp_client.call_tool(
                    tool_name=function_name,
                    params=function_args
                )
                tool_outputs.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(function_response),
                })
            api_messages.extend(tool_outputs)

            # 将带有工具结果的消息列表，传递给 stream_final_response 进行真正的流式请求
            return StreamingResponse(
                stream_final_response(api_messages, request),
                media_type="text/event-stream"
            )

        # 情况二：模型决定不调用工具
        else:
            # 即使模型在第一次非流式调用中已经给出了答案 (response_message.content),
            # 我们为了获得真正的流式体验，要“假装”没看到这个答案。
            # 我们把包含模型第一轮思考（但没有工具调用）的消息历史，
            # 再次发送给 stream_final_response，让它来完成真正的流式输出。
            # 此时的 api_messages 包含 [..., user_message, assistant_message_without_tool_calls]
            print("模型未调用工具，将启动最终的流式生成...")
            return StreamingResponse(
                stream_final_response(api_messages, request),
                media_type="text/event-stream"
            )
    else:
        print("用户说不需要调用mcp工具，直接流式返回结果...")
        return StreamingResponse(
            stream_final_response(api_messages, request),
            media_type="text/event-stream"
        )


# --- 辅助函数 (关键修改) ---
async def stream_final_response(messages: List[Dict], request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    一个统一的最终响应生成器。
    它接收一个包含所有思考步骤的完整消息列表，
    以流式方式请求最终答案，并在最后将清理过的历史保存到数据库。
    """
    print(f"stream_final_response 接收到 {len(messages)} 条消息，开始流式请求...")
    accumulated_content = ""
    try:
        stream = await deepseek_client.chat.completions.create(
            model=request.model,
            messages=messages,  # 传入包含所有思考过程的完整上下文
            temperature=request.temperature,
            stream=True
        )
        async for chunk in stream:
            content_piece = chunk.choices[0].delta.content or ""
            if content_piece:
                accumulated_content += content_piece
                response_chunk = {"content": content_piece, "reasoning": None}
                yield f"data: {json.dumps(response_chunk)}\n\n"

    finally:
        # 无论成功与否，只要生成了内容，就执行保存逻辑
        if accumulated_content:
            # 构建最终的助手回答消息
            final_assistant_message = {"role": "assistant", "content": accumulated_content}

            # 将最终回答追加到包含所有思考步骤的完整消息列表后面
            final_history_for_cleaning = messages + [final_assistant_message]

            # 调用我们新的、带清理功能的 update_session_history
            # 它会自动处理并只保存干净的用户-助手对话
            ConversationService.update_session_history(request.session_id, final_history_for_cleaning)
            print("完整对话历史已通过清理并保存。")