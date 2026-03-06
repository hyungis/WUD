from ultralytics import YOLO
import os
from fastapi import HTTPException
from app.core.config import settings

class YoloService:
    _model = None

    @classmethod
    def load_model(cls):
        if cls._model is None:
            try:
                # 로컬에 있는 모델 파일 로드 (예: yolov8n.pt)
                model_path = settings.yolo_model_path
                print(f"Loading YOLO model from: {model_path}")
                cls._model = YOLO(model_path)
            except Exception as e:
                print(f"Failed to load YOLO model: {e}")
                raise Exception("Failed to load YOLO model")

    @classmethod
    def classify_image(cls, image_path: str) -> list:
        if cls._model is None:
            cls.load_model()
            
        try:
            print(f"Running YOLO classification on: {image_path}")
            results = cls._model(image_path)
            
            classifications = []
            
            # YOLO 결과 파싱 (모델에 따라 파싱 방식이 다를 수 있음. 기본 classification 모델 기준)
            for result in results:
                if result.probs is not None:
                    # Classification 결과
                    top5_indices = result.probs.top5
                    top5_confidences = result.probs.top5conf
                    names = result.names
                    
                    for i, conf in zip(top5_indices, top5_confidences):
                        classifications.append({
                            "class": names[i],
                            "confidence": float(conf)
                        })
                elif result.boxes is not None:
                     # Object Detection 결과인 경우
                     for box in result.boxes:
                         classifications.append({
                             "class": result.names[int(box.cls)],
                             "confidence": float(box.conf)
                         })
                         
            # 임시로 만들어진 이미지 파일 삭제
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except OSError:
                    pass
            
            return classifications
        except Exception as e:
            print(f"Error classifying image: {str(e)}")
            raise HTTPException(status_code=500, detail=f"YOLO classification failed: {str(e)}")
