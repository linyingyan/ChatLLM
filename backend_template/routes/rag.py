import os
import json
import faiss
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import requests
from typing import List
import shutil
from fastapi import APIRouter


router = APIRouter()

EMBEDDING_SERVICE_URL = "https://api.siliconflow.cn/v1/embeddings"

# embedding服务函数
def get_embedding(text: str):
    url = EMBEDDING_SERVICE_URL
    payload = {
        "model": "BAAI/bge-large-zh-v1.5",
        "input": text,
        "encoding_format": "float"
    }
    headers = {
        "Authorization": f"Bearer {os.environ['SILICONFLOW_API_KEY']}",
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Embedding service error: {response.text}")
    result = response.json()
    embedding = result["data"][0]["embedding"]
    return np.array(embedding, dtype=np.float32)

# 用于切分文本的简单函数
def split_text(text: str, chunk_size: int = 512, overlap: int = 80) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

class InsertRequest(BaseModel):
    file_content: str
    knowledge_base_id: str
    file_id: str

class QueryRequest(BaseModel):
    query: str
    knowledge_base_id: str
    top_k: int = 3

class CreateKbRequest(BaseModel):
    knowledge_base_id: str

class DeleteFilesRequest(BaseModel):
        knowledge_base_id: str
        file_ids: List[str]

class DeleteKBRequest(BaseModel):
        knowledge_base_id: str


def rag_create_kb(knowledge_base_id: str = Body(...)):  # 改为直接接收参数
    kb_dir = os.path.join("rag", "database", knowledge_base_id)
    os.makedirs(kb_dir, exist_ok=True)
    return {"status": "success"}

@router.post("/insert")
def insert_kb(req: InsertRequest):
    kb_dir = os.path.join("rag", "database", req.knowledge_base_id)
    if not os.path.exists(kb_dir):
        raise HTTPException(status_code=404, detail="Knowledge base not found.")

    file_path = os.path.join(kb_dir, f"{req.file_id}.txt")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(req.file_content)

    chunks = split_text(req.file_content)
    chunk_embeddings = []
    chunk_metadatas = []

    for idx, chunk in enumerate(chunks):
        emb = get_embedding(chunk)
        chunk_embeddings.append(emb)
        chunk_metadatas.append({
            "file_id": req.file_id,
            "chunk_id": idx,
            "text": chunk
        })

    chunks_path = os.path.join(kb_dir, "chunks.jsonl")
    with open(chunks_path, "a", encoding="utf-8") as cf:
        for meta in chunk_metadatas:
            cf.write(json.dumps(meta, ensure_ascii=False) + "\n")

    index_path = os.path.join(kb_dir, "faiss.index")
    dim = len(chunk_embeddings[0])

    if os.path.exists(index_path):
        index = faiss.read_index(index_path)
    else:
        index = faiss.IndexFlatL2(dim)

    index.add(np.stack(chunk_embeddings))
    faiss.write_index(index, index_path)

    return {"status": "success", "chunks_added": len(chunks)}

# 查询接口
@router.post("/query")
def query_kb(req: QueryRequest):
    kb_dir = os.path.join("rag", "database", req.knowledge_base_id)
    index_path = os.path.join(kb_dir, "faiss.index")
    chunks_path = os.path.join(kb_dir, "chunks.jsonl")

    if not os.path.exists(index_path) or not os.path.exists(chunks_path):
        raise HTTPException(status_code=404, detail="Knowledge base not found or empty.")

    index = faiss.read_index(index_path)

    with open(chunks_path, "r", encoding="utf-8") as cf:
        metas = [json.loads(line) for line in cf]

    query_emb = get_embedding(req.query)
    query_emb = np.expand_dims(query_emb, axis=0)
    D, I = index.search(query_emb, req.top_k)

    results = []
    for idx in I[0]:
        if idx < len(metas):
            results.append(metas[idx]['text'])

    return {"results": results}


@router.post("/delete_files")
def delete_files(req: DeleteFilesRequest):
    kb_dir = os.path.join("rag", "database", req.knowledge_base_id)
    if not os.path.exists(kb_dir):
        raise HTTPException(status_code=404, detail="Knowledge base not found.")

    deleted_files = []
    for file_id in req.file_ids:
        file_path = os.path.join(kb_dir, f"{file_id}.txt")
        if os.path.exists(file_path):
            os.remove(file_path)
            deleted_files.append(file_id)

    chunks_path = os.path.join(kb_dir, "chunks.jsonl")
    index_path = os.path.join(kb_dir, "faiss.index")

    if not os.path.exists(chunks_path):
        return {"status": "success", "deleted_files": deleted_files}

    with open(chunks_path, "r", encoding="utf-8") as cf:
        all_chunks = [json.loads(line) for line in cf]

    new_chunks = [chunk for chunk in all_chunks if chunk["file_id"] not in req.file_ids]

    if new_chunks:
        embeddings = [get_embedding(chunk['text']) for chunk in new_chunks]
        dim = len(embeddings[0])
        index = faiss.IndexFlatL2(dim)
        index.add(np.stack(embeddings))
        faiss.write_index(index, index_path)

        with open(chunks_path, "w", encoding="utf-8") as cf:
            for chunk in new_chunks:
                cf.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    else:
        if os.path.exists(index_path):
            os.remove(index_path)
        if os.path.exists(chunks_path):
            os.remove(chunks_path)

    return {"status": "success", "deleted_files": deleted_files}

@router.post("/delete_kb")
def delete_kb(req: DeleteKBRequest):
    kb_dir = os.path.join("rag", "database", req.knowledge_base_id)
    if not os.path.exists(kb_dir):
        raise HTTPException(status_code=404, detail="Knowledge base not found.")
    shutil.rmtree(kb_dir)
    return {"status": "success", "deleted_kb": req.knowledge_base_id}