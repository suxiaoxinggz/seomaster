from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from .logger import logger
from typing import Optional

security = HTTPBearer()

def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        # For local dev without env vars fully set, we might want to warn or fail
        # But in production this must fail.
        # We can throw error here contentiously.
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        
    return create_client(supabase_url, supabase_key)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the JWT token using Supabase Auth.
    Returns the user object if valid.
    """
    token = credentials.credentials
    supabase = get_supabase_client()
    
    try:
        # Verify JWT
        # The supabase-py client's auth.get_user(token) handles verification against the project's JWT secret
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
             raise HTTPException(status_code=401, detail="Invalid Authentication Token")
             
        return response.user
        
    except Exception as e:
        logger.error(f"Auth Error: {e}") 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
