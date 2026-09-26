from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import router as api_router

app = FastAPI(
    title="Marine Ecosystem Intelligence Mission Control",
    version="1.0.0",
    description="Scientific telemetry arbitration and anomaly synthesis engine."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "operational",
        "system": "marine-ecosystem-intelligence",
        "version": "1.0.0"
    }