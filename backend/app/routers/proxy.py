from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
import logging

import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ProxyRequest(BaseModel):
    url: str
    method: str = "POST"
    headers: Optional[Dict[str, str]] = None
    body: Optional[Any] = None
    payload: Optional[str] = None  # Base64 encoded body for WAF bypass
    encoding: Optional[str] = None # 'base64'

# Whitelist of allowed domains for security
ALLOWED_DOMAINS = [
    "api.deepl.com",
    "api-free.deepl.com",
    "translation.googleapis.com",
    "api.cognitive.microsofttranslator.com",
    "api.replicate.com",
    "api.openai.com",
    "api.anthropic.com",
    "api.siliconflow.cn",
    "image.pollinations.ai",
    "api-inference.huggingface.co",
    "api.cloudflare.com",
    "openrouter.ai",
    "api.studio.nebius.ai",
    "open.bigmodel.cn",
    "ark.cn-beijing.volces.com",
    "pixabay.com",
    "api.unsplash.com",
    "libretranslate.com",
    "modelscope.cn",
    "api.stability.ai"
]

@router.post("/proxy")
async def proxy_request(request: ProxyRequest):
    """
    Proxies requests to external APIs to bypass CORS restrictions.
    Strictly validated against a whitelist of allowed domains.
    """
    try:
        # 1. Validate URL Domain
        from urllib.parse import urlparse
        parsed_url = urlparse(request.url)
        domain = parsed_url.netloc

        if domain not in ALLOWED_DOMAINS:
            # Check for subdomains if needed, or exact match
            # For strict security, we can require exact match or explicit suffix check
            is_allowed = False
            for allowed in ALLOWED_DOMAINS:
                if domain == allowed or domain.endswith("." + allowed):
                    is_allowed = True
                    break
            
            if not is_allowed:
                logger.warning(f"Blocked proxy request to unauthorized domain: {domain}")
                raise HTTPException(status_code=403, detail="Domain not allowed in proxy.")

        # 2. Prepare Headers
        # Remove host header to avoid conflicts
        headers = request.headers.copy() if request.headers else {}
        if 'host' in headers:
            del headers['host']
        if 'Host' in headers:
            del headers['Host']
            
        # Add User-Agent if missing
        if 'User-Agent' not in headers and 'user-agent' not in headers:
             headers['User-Agent'] = 'SEO-Copilot-Backend/1.0'

        # 3. Make Request
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.request(
                method=request.method,
                url=request.url,
                headers=headers,
                json=request.body if request.body else None
                # Note: valid for JSON APIs. For binary, we might need content handling changes.
            )
            
            # 4. Return Response
            # We return raw content to support images too if needed, but JSON is safer default
            if "application/json" in resp.headers.get("Content-Type", ""):
                 return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
            else:
                 # Fallback for others
                 return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("Content-Type", "application/octet-stream"))

    except Exception as e:
        logger.error(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proxy request failed: {str(e)}")
