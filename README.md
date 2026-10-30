# ChatLLM · Agent 与 MCP 智能问答平台

面向企业信息查询场景的大学实训项目源码，包含对话、智能体、MCP 工具调用与文档知识库检索。此次整理保留原有项目结构和已有 Git 提交历史，补充配置说明，并移除上传内容中的密钥与运行数据。

> 本仓库是学习与作品展示用的项目快照。需要自行准备模型服务、MySQL 表结构和知识库材料；旧工具链有未完成迁移的依赖风险，不应直接作为公网生产服务。

## 功能与实现

- **流式问答**：对接 DeepSeek/OpenAI 兼容接口，管理会话与上下文。
- **智能体管理**：内置与自定义智能体、系统提示词和会话关联。
- **MCP 工具调用**：通过 MCP Streamable HTTP 连接知识库工具，按问题调用检索能力。
- **知识库问答**：文件文本提取、文本分块、远程 embedding 与 FAISS 向量检索。
- **用户与数据管理**：用户注册/登录、会话和知识库相关数据库操作。

功能范围以本仓库源码为准。前端使用 **React + TypeScript + Umi Max + Ant Design Pro**；后端使用 **Python + FastAPI + SQLAlchemy/PyMySQL + MCP + FAISS**。

## 目录

```text
backend_template/             FastAPI 主后端
  api/                        模型接口
  config/                     数据库、JWT、MCP 配置
  database/                   数据模型与 SQL 操作
  routes/                     对话、用户、智能体、知识库接口
  mcpnow/                     MCP 客户端
  mcp_server.py               知识库 MCP 服务
frontend/ai-plat1/             React / Umi 前端
  config/                     路由与代理
  src/                        页面、服务、组件
  public/                     静态资源
```

## 本地配置与启动

建议在独立的 Python 3.11 环境中运行后端，前端使用 Node.js LTS 与 `pnpm@8.15.9`。

### 1. 后端

在仓库根目录：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend_template/requirements.txt
cp backend_template/.env.example backend_template/.env
```

在本地 `.env` 中配置 `DB_*`、`DEEPSEEK_API_KEY`、`SILICONFLOW_API_KEY` 与随机 `SECRET_KEY`。不要把真实密钥提交到 Git。

**数据库前提：**原始压缩包未包含 MySQL 建表迁移/SQL 导出。路由使用多张业务表，单独执行 SQLAlchemy `create_all()` 不能补齐全部表。需要使用原项目的匹配表结构或自行依据数据层补建；本仓库不包含原数据库、用户或聊天记录。

MCP 服务与主 API 需要分别运行。当前 MCP 客户端默认连接 `http://localhost:8000/mcp`。主 API 在 `8001` 端口运行，前端开发服务使用 `8000` 时会冲突，所以示例把前端端口设为 `3000`：

```bash
# Terminal 1, from repository root
cd backend_template
python mcp_server.py

# Terminal 2, from repository root, after configuring .env and the database
cd backend_template
python main.py
```

MCP 服务需提前准备知识库目录 `backend_template/rag/database/nanhai/` 下的 `faiss.index` 与 `chunks.jsonl`。原压缩包的索引和文本没有上传；创建知识库后应重新生成，不能用别人的向量文件假装已就绪。MCP 服务尚未做端到端验证，见 `docs/VALIDATION.md`。

### 2. 前端

```bash
cd frontend/ai-plat1
cp .env.example .env
npx pnpm@8.15.9 install --frozen-lockfile --ignore-scripts
npx pnpm@8.15.9 exec max setup
PORT=3000 npx pnpm@8.15.9 dev
```

Windows PowerShell 可使用 `$env:PORT=3000` 后再执行启动命令。API 地址配置在 `.env` 的 `UMI_APP_API_URL` 和 `UMI_APP_LEGACY_API_URL` 中；这些变量会进入浏览器，不能存放服务密钥。变量用法依据 [Umi 环境变量文档](https://umijs.org/docs/guides/env-variables/)。

构建命令：

```bash
npx pnpm@8.15.9 build
```

## 本次整理与验证

- 将硬编码的数据库连接、服务密钥和旧机器地址改为本地配置。
- 添加 `.env.example` 与根目录 `.gitignore`。
- 不上传 `.env`、虚拟环境、缓存、FAISS 索引、数据库和历史调试输出。
- 保留原归档副本；未重写课程业务逻辑，也未声称已经完成全功能部署。
- 离线检查可执行 `python3 scripts/check_source.py`，不连接数据库或模型服务。
- 验证结果和仍需准备的依赖见 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 来源与许可

这是实训团队项目的整理版，个人贡献主要涉及后端智能体与 MCP 相关模块；不将整个前端模板和团队代码声明为个人独立原创。

前端基于 [Ant Design Pro](https://github.com/ant-design/ant-design-pro)，其 MIT 许可保留在 `docs/ANT_DESIGN_PRO_LICENSE`。原始归档未包含项目整体的独立授权文件，本次未替团队代码新增开源许可；公开展示不自动等同于授予整个项目任意使用的许可。
