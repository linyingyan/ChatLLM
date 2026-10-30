# backend_template/mcpnow/client.py

import asyncio
from typing import List, Dict, Any, Optional
from contextlib import AsyncExitStack

# 1. 从官方路径导入 streamablehttp_client 和 ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

# --- 全局单例管理 ---
_mcp_session: Optional[ClientSession] = None
_mcp_exit_stack = AsyncExitStack()
_mcp_lock = asyncio.Lock()


class NanhaiToolClient:
    """
    一个使用官方 streamablehttp_client 与 MCP 服务器通信的客户端。
    它管理一个与服务器的 ClientSession 的生命周期。
    """

    def __init__(self, session: ClientSession):
        if not session:
            raise ValueError("ClientSession 不能为空")
        self.session = session
        print("MCP 客户端已通过注入的 ClientSession 初始化。")

    async def get_tools(self) -> List[Dict[str, Any]]:
        """
        从 MCP 服务器动态获取所有可用工具的定义。
        """
        print("[MCP Client] 正在通过 Streamable HTTP 获取工具定义...")
        try:
            response = await self.session.list_tools()

            openai_tools = [{
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema,
                }
            } for tool in response.tools]

            print(f"[MCP Client] 成功获取并转换了 {len(openai_tools)} 个工具的定义。")
            return openai_tools
        except Exception as e:
            print(f"[MCP Client] 错误：获取工具定义失败: {e}")
            return []

    # ==================== 缩进修正 ====================
    # 下面的 call_tool 方法现在被正确地缩进到了 NanhaiToolClient 类内部
    async def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Any:
        """
        通过 ClientSession 调用服务器上的指定工具。
        """
        print(f"[MCP Client] 正在通过 Streamable HTTP 调用工具 '{tool_name}'，参数: {params}")
        try:
            response = await self.session.call_tool(tool_name, params)
            print(f"[MCP Client] 工具 '{tool_name}' 调用成功。")
            print(f"[MCP Client] 工具 '{tool_name}' 调用的返回结果为：{response}")
            return response
        except Exception as e:
            error_msg = f"错误：调用工具 '{tool_name}' 时发生异常: {e}"
            print(f"[MCP Client] {error_msg}")
            return error_msg
    # =================================================


# --- 后续的工厂函数和清理函数保持不变 ---

async def get_mcp_session() -> ClientSession:
    """
    一个异步工厂函数，用于创建和管理 ClientSession 的单例实例。
    """
    global _mcp_session
    async with _mcp_lock:
        if _mcp_session is None:
            print("首次连接，正在创建 Streamable HTTP ClientSession...")
            try:
                # 确保这里的 URL 和 mcp_server 的挂载路径一致
                server_full_url = "http://localhost:8000/mcp"
                http_client_context = streamablehttp_client(server_full_url)

                read_stream, write_stream, _ = await _mcp_exit_stack.enter_async_context(http_client_context)
                session_context = ClientSession(read_stream, write_stream)
                _mcp_session = await _mcp_exit_stack.enter_async_context(session_context)
                await _mcp_session.initialize()
                print(f"MCP ClientSession 创建并初始化成功！(Connected to {server_full_url})")
            except Exception as e:
                print(f"创建 MCP ClientSession 失败: {e}")
                await _mcp_exit_stack.aclose()
                raise
    return _mcp_session


async def cleanup_mcp_session():
    """
    在应用关闭时清理 MCP 会话和资源。
    """
    global _mcp_exit_stack
    print("正在清理 MCP 会话资源...")
    await _mcp_exit_stack.aclose()
    print("MCP 会话资源清理完毕。")