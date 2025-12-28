import os
import shutil

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
# Ensure directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp"},
    "video": {".mp4", ".webm", ".mov"},
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file extension
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    file_type = None

    if ext in ALLOWED_EXTENSIONS["image"]:
        file_type = "image"
    elif ext in ALLOWED_EXTENSIONS["video"]:
        file_type = "video"

    if not file_type:
        raise HTTPException(status_code=400, detail="File type not allowed")

    # Validate file size (approximation, as we stream)
    # Ideally we'd check content-length header or count bytes while reading

    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check size after save (simple approach) or during chunks
        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    # Return URL (relative to backend host)
    return JSONResponse(
        {
            "filename": filename,
            "url": f"/uploads/{filename}",
            "type": file_type,
        }
    )


@router.get("")
async def list_media():
    """List all uploaded media files."""
    files = []
    try:
        if not os.path.exists(UPLOAD_DIR):
            return []

        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.isfile(file_path):
                continue

            ext = os.path.splitext(filename)[1].lower()
            file_type = None
            if ext in ALLOWED_EXTENSIONS["image"]:
                file_type = "image"
            elif ext in ALLOWED_EXTENSIONS["video"]:
                file_type = "video"

            if file_type:
                files.append(
                    {"name": filename, "url": f"/uploads/{filename}", "type": file_type}
                )

        # Sort by name or modification time if needed, for now just name
        files.sort(key=lambda x: x["name"])
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{filename}")
async def delete_media(filename: str):
    """Delete a specific media file."""
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Security check: ensure filename doesn't contain path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        return {"status": "success", "message": f"Deleted {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
