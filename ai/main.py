from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routes import api
from app.services.daily_rabbitmq_rpc_service import daily_ai_rpc_consumer
from app.services.rabbitmq_rpc_service import deep_ai_rpc_consumer
from app.services.yolo_service import YoloService
from app.core.config import settings
from pathlib import Path


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up AI Server...")
    # Preload HTP models if available.

    try:
        base_dir = Path(__file__).resolve().parent
        yolo_models_dir = (base_dir / "yolo_models").resolve()
        for model_name in ("house.pt", "tree.pt", "person.pt"):
            model_path = str(yolo_models_dir / model_name)
            if Path(model_path).exists():
                YoloService.load_model(model_path)
    except Exception as e:
        print(f"[Startup] HTP YOLO preload failed: {e}")

    deep_ai_rpc_consumer.start()
    daily_ai_rpc_consumer.start()
    try:
        yield
    finally:
        daily_ai_rpc_consumer.stop()
        deep_ai_rpc_consumer.stop()
        print("Shutting down AI Server...")


app = FastAPI(
    title="Daily AI Analysis API",
    description="API for image classification and LLM analysis from S3 objects",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(api.router, prefix="/internal/ai")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
