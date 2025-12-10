from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.responses import StreamingResponse
from app.auth import get_current_user
import httpx
import os
import json

router = APIRouter()

@router.post("/openai-compatible")
async def proxy_openai(
    request: Request,
    payload: dict = Body(...),
    user = Depends(get_current_user)
):
    """
    Proxies requests to OpenAI-compatible endpoints.
    The frontend sends the model ID and prompt, but the API Key is injected here.
    Supports streaming.
    """
    # 1. Determine Provider and Get Key
    model_id = payload.get("model")
    
    # Simple mapping logic - in a real SaaS, this might come from a DB of provider configs
    # For now, we assume standard env vars based on model prefix or default to OpenAI
    
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    
    # logic to swap keys based on model if needed (e.g. Gemini, DeepSeek)
    if "gemini" in model_id:
         api_key = os.getenv("GEMINI_API_KEY")
         base_url = "https://generativelanguage.googleapis.com/v1beta/openai" # Gemini OpenAI-compat URL
    elif "deepseek" in model_id:
         api_key = os.getenv("DEEPSEEK_API_KEY")
         base_url = "https://api.deepseek.com"
         
    if not api_key:
        raise HTTPException(status_code=500, detail="Server Configuration Error: Missing API Key for this model type")

    target_url = f"{base_url}/chat/completions"
    
    # 2. Prepare Request to Upstream
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # 3. Handle Streaming
    if payload.get("stream"):
        return StreamingResponse(
            stream_upstream(target_url, headers, payload),
            media_type="text/event-stream"
        )
    
    # 4. Handle Standard Request
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            upstream_response = await client.post(target_url, json=payload, headers=headers)
            upstream_response.raise_for_status()
            return upstream_response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Upstream Provider Error: {e.response.text}")
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

async def stream_upstream(url, headers, payload):
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                return

            async for chunk in response.aiter_bytes():
                yield chunk
