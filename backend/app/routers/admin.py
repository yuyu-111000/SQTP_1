import io
import time
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..db import get_db
from ..models import Resource, Subject, User
from ..schemas import ResourceOut
from ..routers.subjects import resource_to_out

import openpyxl

router = APIRouter(prefix="/admin", tags=["admin"])


TEMPLATE_HEADERS = ["标题", "URL", "描述", "详细介绍", "标签(逗号分隔)", "平台", "所属学科ID"]


@router.get("/template")
def download_template(
    current_admin: User = Depends(get_current_admin),
):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "资源批量导入"
    ws.append(TEMPLATE_HEADERS)

    # Add example row
    ws.append([
        "示例：数据结构课程笔记",
        "https://example.com/ds-notes",
        "一份详尽的数据结构学习笔记",
        "本资源涵盖了线性表、栈、队列、树、图等核心数据结构，配有大量习题和动画演示，适合考研复习和期末备考。",
        "课程,笔记,考研",
        "GitHub",
        "cs_base",
    ])

    # Set column widths
    widths = [30, 40, 30, 45, 25, 15, 15]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=resource_import_template.xlsx"},
    )


@router.post("/import-excel")
async def import_excel(
    file: UploadFile,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 文件")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        ws = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件")

    rows = list(ws.iter_rows(min_row=2, values_only=True))  # skip header
    if not rows:
        raise HTTPException(status_code=400, detail="Excel 文件中没有数据行")

    # Preload subjects for validation
    subject_ids = {s.id for s in db.query(Subject).all()}

    created = 0
    errors = []
    now = int(time.time() * 1000)

    for i, row in enumerate(rows, start=2):  # row 2 onwards
        if not row or not any(cell for cell in row):
            continue  # skip empty rows
        if len(row) < 7:
            errors.append({"row": i, "error": "列数不足，需要7列"})
            continue

        title, url, description, detailed_desc, tags_str, platform, subject_id = row[:7]

        if not title or not url:
            errors.append({"row": i, "error": "标题和URL为必填项"})
            continue
        if not subject_id:
            errors.append({"row": i, "error": "所属学科ID为必填项"})
            continue
        if str(subject_id).strip() not in subject_ids:
            errors.append({"row": i, "error": f"学科ID '{subject_id}' 不存在"})
            continue

        resource = Resource(
            id=f"res_{uuid4().hex[:12]}",
            subject_id=str(subject_id).strip(),
            title=str(title).strip(),
            url=str(url).strip(),
            description=str(description).strip() if description else None,
            detailed_description=str(detailed_desc).strip() if detailed_desc else None,
            platform=str(platform).strip() if platform else None,
            tags=str(tags_str).strip() if tags_str else None,
            created_at=now,
            status="approved",
            visibility="public",
            submitter_id=current_admin.id,
            client_id="default",
        )
        db.add(resource)
        created += 1

    db.commit()

    return {"created": created, "errors": errors}
