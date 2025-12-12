from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env file (for local development)
load_dotenv()

# Import routers (we will create these next)
# Import routers
# Import routers
from app.routers import dataforseo, llm, stripe_webhook, upload, proxy

# ... (app init) ...

app = FastAPI(title="SEO Copilot Backend", version="1.0.0")

# CORS Configuration
# In production (Docker), requests come from Nginx on the same network or localhost, 
# but we set specific origins to be safe if Nginx headers are passed through.
origins = [
    "http://localhost:3000",
    "http://localhost:3060",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3060",
    # Add your production domain if needed, though Nginx usually handles this
    # "https://app.yourdomain.com", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
def root():
    return {"message": "SEO Copilot API Gateway is running"}

# Include Routers
app.include_router(dataforseo.router, prefix="/api/dataforseo", tags=["DataForSEO"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(proxy.router, prefix="/api", tags=["Proxy"])

@app.get("/config")
def get_config():
    """
    Expose public configuration to the frontend (SaaS mode).
    This allows the frontend to initialize Supabase without user manual input.
    WARNING: NEVER expose SUPABASE_SERVICE_KEY here.
    """
    return {
        "supabaseUrl": os.getenv("SUPABASE_URL", ""),
        "supabaseAnonKey": os.getenv("SUPABASE_ANON_KEY", "")
    }

