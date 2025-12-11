from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
import boto3
import os
import uuid
from app.auth import get_current_user

router = APIRouter()

# R2 Configuration loaded from environment variables
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "seo-assets")
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN")

def get_r2_client():
    if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY or not CLOUDFLARE_ACCOUNT_ID:
        raise HTTPException(status_code=500, detail="R2 configuration is missing on server.")
    
    return boto3.client(
        's3',
        endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto' # Cloudflare R2 uses 'auto'
    )

@router.post("/r2", summary="Upload file to Cloudflare R2")
async def upload_to_r2(
    file: UploadFile = File(...),
    folder: str = "uploads", # logical folder, e.g. 'article_images'
    current_user = Depends(get_current_user) # Require authentication
):
    """
    Uploads a file to Cloudflare R2.
    The file path will be: {user_id}/{folder}/{uuid}-{filename}
    Returns the public URL of the uploaded file.
    """
    
    # 1. Validate File
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename")

    # 2. Generate Safe Key (Path)
    # Structure: user_id / folder / uuid-filename
    # This ensures tenant isolation by prefix
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    user_id = str(current_user.id)
    r2_key = f"{user_id}/{folder}/{safe_filename}"
    
    # 3. Upload to R2
    s3_client = get_r2_client()
    
    try:
        # Read file content
        file_content = await file.read()
        
        s3_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=r2_key,
            Body=file_content,
            ContentType=file.content_type or "application/octet-stream"
            # ACL='public-read' is often not needed or supported depending on R2 bucket settings. 
            # We assume bucket allows public read or we use a custom domain.
        )
    except Exception as e:
        print(f"R2 Upload Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to R2: {str(e)}")
        
    # 4. Construct Public URL
    if R2_PUBLIC_DOMAIN:
        # Remove trailing slash if present
        domain = R2_PUBLIC_DOMAIN.rstrip("/")
        public_url = f"{domain}/{r2_key}"
    else:
        # Fallback (Not recommended for prod if public access isn't enabled)
        public_url = f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/{R2_BUCKET_NAME}/{r2_key}"
        
    return {
        "url": public_url,
        "key": r2_key,
        "filename": file.filename
    }
