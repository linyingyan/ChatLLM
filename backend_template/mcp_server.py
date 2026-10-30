# mcp_server.py

from mcp.server.fastmcp import FastMCP
import os
import json
import faiss  # <--- 新增依赖
import numpy as np  # <--- 新增依赖

# ==================== 关键：导入您的 embedding 函数 ====================
# 请确保这个导入路径是正确的，它需要和您的 RAG 代码中的 embedding 函数一致
# 假设您的 get_embedding 函数在 rag/utils.py 文件中
from routes.rag import get_embedding

# =====================================================================

# --- 工具的固定配置 ---
# 我们可以把这些作为常量，让代码更清晰
KNOWLEDGE_BASE_ID = "nanhai"
TOP_K = 3

# 1. 初始化 FastMCP 服务器实例 (不变)
mcp = FastMCP(
    service_name="nanhai_knowledge_service",
    title="南海科技院知识库（RAG版）"
)


# 2. 使用 @mcp.tool() 装饰器定义新的 RAG 工具
@mcp.tool()
def query_nanhai_knowledge(query: str) -> str:
    """
    当用户询问关于'南海'或'南海科技院'的详细问题时，使用此工具进行语义检索。此工具能理解问题的深层含义。

    :param query: 用户的完整问题，而不是简单的关键词。例如 "介绍一下广东大亚湾海洋生态系统国家野外科学观测研究站的历史和成就"。
    :return: 从知识库中检索到的最相关的文本片段，或未找到信息的提示。
    """
    print(f"[MCP Server-RAG] 收到查询请求: '{query}'")

    try:
        # --- 将您的 RAG 逻辑移植到这里 ---
        kb_dir = os.path.join("rag", "database", KNOWLEDGE_BASE_ID)
        index_path = os.path.join(kb_dir, "faiss.index")
        chunks_path = os.path.join(kb_dir, "chunks.jsonl")

        if not os.path.exists(index_path) or not os.path.exists(chunks_path):
            error_msg = f"错误：知识库 '{KNOWLEDGE_BASE_ID}' 在服务器端未找到或为空。"
            print(f"[MCP Server-RAG] {error_msg}")
            return error_msg

        # 加载索引和元数据
        index = faiss.read_index(index_path)
        with open(chunks_path, "r", encoding="utf-8") as cf:
            metas = [json.loads(line) for line in cf]

        # 向量化查询并进行搜索
        print(f"[MCP Server-RAG] 正在为查询生成 embedding...")
        query_emb = get_embedding(query)
        query_emb = np.expand_dims(query_emb, axis=0).astype('float32')  # 确保数据类型正确

        print(f"[MCP Server-RAG] 正在 FAISS 索引中搜索 top {TOP_K} 结果...")
        D, I = index.search(query_emb, TOP_K)

        # 检查是否找到了有效结果
        if I.size == 0 or I[0][0] == -1:
            return f"在知识库中没有找到与您的问题 '{query}' 高度相关的信息。"

        # --- 适配输出格式：将结果列表转换为单一字符串 ---
        retrieved_texts = []
        for idx in I[0]:
            if 0 <= idx < len(metas):
                retrieved_texts.append(metas[idx]['text'])

        if not retrieved_texts:
            return f"在知识库中没有找到与您的问题 '{query}' 相关的信息。"

        # 将多个文本块格式化成一个对 LLM 更友好的字符串
        formatted_results = "根据知识库检索，找到以下相关信息：\n\n"
        for i, text in enumerate(retrieved_texts, 1):
            formatted_results += f"--- 相关片段 {i} ---\n{text}\n\n"

        print(f"[MCP Server-RAG] 查询完成，返回 {len(retrieved_texts)} 个文本片段。")
        return formatted_results.strip()

    except Exception as e:
        error_msg = f"服务器在执行 RAG 查询时发生严重错误: {e}"
        print(f"[MCP Server-RAG] {error_msg}")
        return error_msg


# 3. 启动服务器 (不变)
if __name__ == "__main__":
    mcp.run(transport="streamable-http", mount_path="/mcp")