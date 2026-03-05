import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # AWS Config
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region_name: str = "ap-northeast-2"
    s3_bucket_name: str = ""
    
    # LLM config
    upstage_api_key: str = ""
    
    # YOLO Model Path
    yolo_model_path: str = "yolov8n.pt" # default

    # Model Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
