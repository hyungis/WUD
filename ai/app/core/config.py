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

    # SSAFY GMS(OpenAI compatible) config
    gms_key: str = ""
    gms_base_url: str = "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
    gms_chat_completions_path: str = "/chat/completions"
    gms_model: str = "gpt-4o"
    
    # YOLO Model Path
    yolo_model_path: str = "yolov8n.pt" # default

    # Model Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
