FROM python:3.10-slim

WORKDIR /app

# 시스템 의존성 설치 (OpenCV 등)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 용량 최적화 및 속도 향상을 위해 PyTorch CPU 버전 우선 설치
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 나머지 FastAPI 및 기타 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# YOLOv8 가중치 다운로드
RUN wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt -O yolov8n.pt || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
