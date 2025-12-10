from fastapi import APIRouter, Depends, HTTPException, Request, Body
from app.auth import get_current_user
import httpx
import os
import base64
from ..logger import logger

router = APIRouter()

DFS_BASE_URL = "https://api.dataforseo.com/v3"

@router.post("/{endpoint:path}")
async def proxy_dataforseo(
    endpoint: str, 
    request: Request,
    payload: dict = Body(...),
    user = Depends(get_current_user) # Require Authentication
):
    """
    Proxy requests to DataForSEO.
    User must be authenticated via Supabase JWT.
    Credentials are injected here on the server side.
    """
    dfs_login = os.getenv("DATAFORSEO_LOGIN")
    dfs_password = os.getenv("DATAFORSEO_PASSWORD")
    
    if not dfs_login or not dfs_password:
        raise HTTPException(status_code=500, detail="Server misconfiguration: Missing DataForSEO credentials")

    # Basic Auth for DataForSEO
    # httpx handles auth tuple well, but manual header is also fine
    
    target_url = f"{DFS_BASE_URL}/{endpoint}"
    
    # We increase timeout because SEO tasks can be slow
    timeout = httpx.Timeout(60.0, connect=10.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                target_url,
                json=payload,
                auth=(dfs_login, dfs_password)
            )
            
            # Pass back the status code and data
            # DataForSEO might return 200 OK even on logical errors, so we just pass it through
            return response.json()
            
        except httpx.RequestError as exc:
            logger.error(f"An error occurred while requesting {exc.request.url!r}.")
            raise HTTPException(status_code=500, detail="DataForSEO connection failed")
        except httpx.HTTPStatusError as exc:
            logger.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
            raise HTTPException(status_code=exc.response.status_code, detail="DataForSEO API error")
