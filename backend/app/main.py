from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
import urllib.request
import urllib.error
import json
import sys

from app.core.config import settings
from app.database.session import engine, Base
from app.api.endpoints import auth, patients, super_admin, timeline

# Import models so Base recognizes them before table creation
from app.models import family_account, patient, user, hospital, rag, audit

# Ensure static directory exists
os.makedirs("static/uploads", exist_ok=True)

# Automatically create missing database tables on startup
if "pytest" not in sys.modules:
    Base.metadata.create_all(bind=engine)

def _check_ollama_connection() -> bool:
    try:
        url = f"{settings.OLLAMA_API_URL.rstrip('/')}/api/embed"
        payload = json.dumps({"model": settings.EMBEDDING_MODEL, "input": "ping"}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            _ = json.loads(resp.read().decode("utf-8"))
        print("✅ Ollama embedding service is reachable.", flush=True)
        return True
    except Exception as e:
        print(f"❌ Failed to reach Ollama embedding service: {e}", flush=True)
        return False

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Explicitly enable CORS middleware for localhost development ports and custom headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:5178",
        "http://127.0.0.1:5178",
        "http://localhost:5179",
        "http://127.0.0.1:5179",
        "http://localhost:5180",
        "http://127.0.0.1:5180"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    _check_ollama_connection()

# Include endpoint routers under versioned paths
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(patients.router, prefix=f"{settings.API_V1_STR}/patients", tags=["patients"])
app.include_router(timeline.router, prefix=f"{settings.API_V1_STR}/patients/timeline", tags=["patient-timeline"])
app.include_router(super_admin.router, prefix="/api/v1/super-admin", tags=["super-admin"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Sahyog Healthcare API Portal."}

@app.get("/health/ollama")
def ollama_health():
    reachable = _check_ollama_connection()
    return {"ollama_reachable": reachable}
