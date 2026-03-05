from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routes import api
from app.services.yolo_service import YoloService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load YOLO model here if needed
    print("Starting up AI Server...")
    YoloService.load_model()
    yield
    # Shutdown
    print("Shutting down AI Server...")

app = FastAPI(
    title="Daily AI Analysis API",
    description="API for image classification and LLM analysis from S3 objects",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(api.router, prefix="/internal/ai")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
