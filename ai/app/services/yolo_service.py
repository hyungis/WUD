from ultralytics import YOLO
import os
from fastapi import HTTPException
from app.core.config import settings
from typing import Dict, List, Optional, Any
from pathlib import Path

class YoloService:
    _models: Dict[str, YOLO] = {}

    @classmethod
    def load_model(cls, model_path: str) -> YOLO:
        key = str(Path(model_path).resolve())
        if key in cls._models:
            return cls._models[key]
        try:
            print(f"Loading YOLO model from: {model_path}")
            model = YOLO(model_path)
            cls._models[key] = model
            return model
        except Exception as e:
            print(f"Failed to load YOLO model: {e}")
            raise Exception("Failed to load YOLO model")

    @classmethod
    def classify_image(cls, image_path: str, model_path: Optional[str] = None) -> List[Dict[str, Any]]:
        model_path = model_path or settings.yolo_model_path
        model = cls.load_model(model_path)
            
        try:
            print(f"Running YOLO on: {image_path} (model={model_path})")
            results = model(image_path)
            
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
            
            return classifications
        except Exception as e:
            print(f"Error classifying image: {str(e)}")
            raise HTTPException(status_code=500, detail=f"YOLO classification failed: {str(e)}")

    @staticmethod
    def summarize_detections(detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        detection list -> count/top confidence summary for prompt/raw payload.
        """
        counts: Dict[str, int] = {}
        best_conf: Dict[str, float] = {}
        for d in detections:
            name = str(d.get("class", "unknown"))
            conf = float(d.get("confidence", 0.0))
            counts[name] = counts.get(name, 0) + 1
            best_conf[name] = max(best_conf.get(name, 0.0), conf)
        return {
            "counts": counts,
            "bestConfidence": best_conf,
            "total": len(detections),
        }
