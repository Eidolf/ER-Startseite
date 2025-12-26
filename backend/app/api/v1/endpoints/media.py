import shutil
import os
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from typing import List

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
# Ensure directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp"},
    "video": {".mp4", ".webm", ".mov"}
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    file_type = None
    
    if ext in ALLOWED_EXTENSIONS["image"]:
        file_type = "image"
    elif ext in ALLOWED_EXTENSIONS["video"]:
        file_type = "video"
    
    if not file_type:
        raise HTTPException(status_code=400, detail="File type not allowed")

    # Validate file size (approximation, as we stream)
    # Ideally we'd check content-length header or count bytes while reading
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Check size after save (simple approach) or during chunks
        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Return URL (relative to backend host)
    return JSONResponse({
        "filename": file.filename,
        "url": f"/uploads/{file.filename}",
        "type": file_type
    })
