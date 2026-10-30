import os
import shutil
import time
import traceback
from datetime import datetime

from fastapi import Form, Query
from typing import Annotated, List, Dict, Union

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from backend_template.database.knowledge import KnowledgeDB
from .rag import router as rag_router, insert_kb
from .rag import rag_create_kb  # 直接导入函数
from fastapi import UploadFile, File
from .file_extract import extract_content
from .rag import delete_kb as rag_delete_kb  # 导入rag的删除功能
from .rag import delete_files as rag_delete_files  # 导入RAG的文件删除功能

router = APIRouter(prefix="/api/knowledge", tags=["知识库管理"])


# ---- 统一请求模型定义 ----
class InsertRequest(BaseModel):
    file_content: str
    knowledge_base_id: str
    file_id: str


class CreateKBRequest(BaseModel):
    knowledge_base_id: str
    kb_name: str
    user_id: str


class DeleteKBRequest(BaseModel):
    knowledge_base_id: str


class DeleteFilesRequest(BaseModel):
    knowledge_base_id: str
    file_ids: List[str]


class ListFilesRequest(BaseModel):
    knowledge_base_id: str  # 必填字段


class FileResponse(BaseModel):
    file_id: str
    file_name: str


class ListFilesResponse(BaseModel):
    files: List[FileResponse]

class KnowledgeBaseInfo(BaseModel):
    kb_name: str
    knowledge_base_id: str
    created_at: datetime

class ListKnowledgeBaseResponse(BaseModel):
    status: str
    data: Dict[str, Union[List[KnowledgeBaseInfo], int]]
    message: Union[str, None] = None

# # ---- 路由定义 ----
# @router.post("/upload")
# async def upload_file(
#         knowledge_base_id: Annotated[str, Form()],
#         file_id: Annotated[str, Form()],
#         kb_name: Annotated[str, Form()],  # 新增参数
#         file: UploadFile = File(...)
# ):
#     try:
#         # 调试输出（验证参数是否接收成功）
#         print(f"接收参数: kb_id={knowledge_base_id}, file_id={file_id}")
#         # 1. 提取文件内容（保持您原有的提取逻辑）
#         file_content = await extract_content(file)
#         if not file_content:
#             raise HTTPException(400, "文件内容为空或格式不支持")
#
#         # 2. 直接调用rag.py中的insert_kb函数（核心修改）
#         insert_result = insert_kb(InsertRequest(
#             file_content=file_content,
#             knowledge_base_id=knowledge_base_id,
#             file_id=file_id
#         ))
#
#         # 3. 记录元数据到数据库
#         KnowledgeDB.add_file_record(
#             file_id=file_id,
#             file_name=file.filename,
#             knowledge_base_id=knowledge_base_id,
#             kb_name=kb_name
#         )
#
#         return {
#             "status": "success",
#             "file_id": file_id,
#             "rag_status": insert_result  # 直接返回RAG处理结果
#         }
#
#     except HTTPException as he:
#         raise he
#     except Exception as e:
#         raise HTTPException(500, f"文件处理失败: {str(e)}")

@router.post("/upload")
async def upload_file(
        knowledge_base_id: Annotated[List[str], Form()],
        file_id: Annotated[str, Form()],  # 用户传入的原始ID
        kb_name: Annotated[str, Form()],
        file: UploadFile = File(...)
):
    try:
        file_content = await extract_content(file)
        if not file_content:
            raise HTTPException(400, "文件内容为空或格式不支持")

        results = []
        for kb_id in knowledge_base_id:
            # 自动生成复合主键（关键修改）
            unique_file_id = f"{file_id}_{kb_id}_{int(time.time())}"

            insert_result = insert_kb(InsertRequest(
                file_content=file_content,
                knowledge_base_id=kb_id,
                file_id=unique_file_id  # 使用唯一ID
            ))

            KnowledgeDB.add_file_record(
                file_id=unique_file_id,  # 存储唯一ID
                file_name=file.filename,
                knowledge_base_id=kb_id,
                kb_name=kb_name
            )

            results.append({
                "kb_id": kb_id,
                "stored_id": unique_file_id,  # 返回实际存储的ID
                "status": insert_result
            })

        return {
            "status": "success",
            "original_file_id": file_id,  # 返回用户原始ID
            "results": results
        }

    except Exception as e:
        raise HTTPException(500, f"文件处理失败: {str(e)}")

@router.post("/create_kb")
async def create_knowledge_base(req: CreateKBRequest):
    """创建知识库（原子化操作）"""
    t0 = time.time()
    try:
        # 1. RAG创建知识库
        rag_response = rag_create_kb(req.knowledge_base_id)  # 直接调用（无需await）
        t1 = time.time()
        print("知识库创建耗时：", t1 - t0)

        # 2. 数据库记录
        KnowledgeDB.create_knowledge_base(
            user_id=req.user_id,
            knowledge_base_id=req.knowledge_base_id,
            kb_name=req.kb_name
        )

        t2 = time.time()
        print("数据库操作耗时：", t2 - t1)

        return {
            "status": "success",
            "knowledge_base_id": req.knowledge_base_id,
            "kb_name": req.kb_name
        }
    except HTTPException as he:
        # 回滚已创建的目录
        kb_dir = os.path.join("rag", "database", req.knowledge_base_id)
        if os.path.exists(kb_dir):
            shutil.rmtree(kb_dir)
        raise he
    except Exception as e:
        raise HTTPException(500, f"创建知识库失败: {str(e)}")


@router.post("/delete_knowledge_base")
async def delete_knowledge_base(req: DeleteKBRequest):
    """
    主导删除知识库（协调数据库和RAG的删除）
    请求体示例：
    {
        "knowledge_base_id": "kb001"
    }
    """
    try:
        # 1. 删除数据库记录（KnowledgeDB实现）
        KnowledgeDB.delete_files_by_kb(req.knowledge_base_id)
        KnowledgeDB.delete_knowledge_base(req.knowledge_base_id)

        # 2. 调用RAG模块删除物理文件
        rag_response = rag_delete_kb(req)  # 调用rag.py的删除函数

        return {
            "status": "success",
            "database_deleted": True,
            "rag_deleted": rag_response["status"] == "success",
            "knowledge_base_id": req.knowledge_base_id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(500, f"删除知识库失败: {str(e)}")


@router.post("/delete_files")
async def delete_files(req: DeleteFilesRequest):
    """
    主导删除文件（协调数据库和RAG的删除）
    请求体示例：
    {
        "knowledge_base_id": "kb001",
        "file_ids": ["file1", "file2"]
    }
    """
    try:
        # 1. 删除数据库记录
        deleted_db_files = KnowledgeDB.delete_files(req.knowledge_base_id, req.file_ids)

        # 2. 调用RAG模块删除物理文件和重建索引
        rag_response = rag_delete_files(req)

        return {
            "status": "success",
            "database_deleted": deleted_db_files,
            "rag_deleted": rag_response["deleted_files"],
            "knowledge_base_id": req.knowledge_base_id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(500, f"删除文件失败: {str(e)}")


@router.get("/list_files")
async def list_files(
        knowledge_base_id: str = Query(...)
):

    try:
        # 调用数据层
        raw_files = KnowledgeDB.get_files_by_kb(knowledge_base_id)

        # 数据格式化
        files = [{
            **file,
            "created_at": file["created_at"].isoformat()
            if isinstance(file.get("created_at"), datetime) else None
        } for file in raw_files]

        return {
            "status": "success",
            "data": {
                "files": files,
                "count": len(files)
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"查询失败: {str(e) if str(e) else '未知错误'}"
            }
        )

@router.get("/list_knowledge_base")
async def list_knowledge_base(user_id: str = Query(...)):
    try:
        kb_list = KnowledgeDB.get_knowledge_bases_by_user_id(user_id)
        return {
            "status": "success",
            "data": kb_list  # 直接返回完整字典列表
        }
    except Exception as e:
        raise HTTPException(500, detail={"message": str(e)})