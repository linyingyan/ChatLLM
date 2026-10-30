import asyncio
import os
from typing import List

from fastapi import UploadFile, APIRouter
from docx import Document
import fitz  # 应该 pip install PyMuPDF，而不是 pip install fitz
import openpyxl
import json
import xlrd
from pptx import Presentation
import io

router = APIRouter(prefix="/file_extract", tags=["文件内容提取接口"])


# 提取单个文件中的所有内容，支持 docx、pdf、txt、xlsx、xls、ppt、pptx，其余类型返回空
async def extract_content(file: UploadFile) -> str:
    filename = file.filename.lower()
    file_bytes = await file.read()
    file_stream = io.BytesIO(file_bytes)

    try:
        if filename.endswith(".docx"):
            doc = Document(file_stream)
            return "\n".join(p.text for p in doc.paragraphs)

        elif filename.endswith(".pdf"):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            return "\n".join(p.get_text() for p in doc)

        elif filename.endswith(".txt"):
            return file_bytes.decode("utf-8")

        elif filename.endswith(".xlsx"):
            wb = openpyxl.load_workbook(file_stream)
            return "\n".join([
                str(cell.value) for row in wb.active.iter_rows()
                for cell in row if cell.value
            ])

        # elif filename.endswith(".doc") or filename.endswith(".ppt"):
        #     return textract.process(file.name, input_stream=file_stream).decode("utf-8")

        elif filename.endswith(".xls"):
            workbook = xlrd.open_workbook(file_contents=file_bytes)
            sheet = workbook.sheet_by_index(0)
            return "\n".join([
                str(sheet.cell_value(r, c)) for r in range(sheet.nrows)
                for c in range(sheet.ncols) if sheet.cell_value(r, c)
            ])

        elif filename.endswith(".pptx"):
            prs = Presentation(file_stream)
            return "\n".join([
                shape.text for slide in prs.slides
                for shape in slide.shapes if hasattr(shape, "text")
            ])

        else:
            print(f"❌ 不支持的文件类型：{file.filename}")
            return ""
    except Exception as e:
        print(f"⚠️ 文件解析失败: {file.filename} - {e}")
        return ""


async def process_document(file: UploadFile):
    content = await extract_content(file)
    return {"filename": file.filename, "file_content": content}


@router.post("/batch_process_docs")
async def batch_process_docs(files: List[UploadFile]):
    """
    批量处理一批文件，提取其中的所有内容，可以支持docx、pdf、txt、xlsx
    :param files: 一个文件对象列表
    :return: 一个字典，格式为：
        {
          "results": [
            {
              "filename": "产品介绍1.docx",
              "file_content": "这款产品采用先进的XXX技术，轻便高效..."
            },
            {
              "filename": "产品介绍2.pdf",
              " file_content ": "小红书推荐款！具有独特的功能Y和Z..."
            },
            {
              "filename": "产品说明.txt",
              " file_content ": "专业参数齐全，搭配AI智能处理器..."
            }
            // 共 n 项，每项独立
          ]
        }
    """
    tasks = [process_document(file) for file in files]
    results = await asyncio.gather(*tasks)
    return {"results": results}
