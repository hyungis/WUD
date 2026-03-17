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
    def classify_image(
        cls,
        image_path: str,
        model_path: Optional[str] = None,
        imgsz: int = 640,
        conf: float = 0.25
    ) -> List[Dict[str, Any]]:
        model_path = model_path or settings.yolo_model_path
        model = cls.load_model(model_path)
            
        try:
            print(f"Running YOLO on: {image_path} (model={model_path}, imgsz={imgsz}, conf={conf})")
            results = model.predict(
                source=image_path,
                imgsz=imgsz,
                conf=conf,
                verbose=False
            )
            
            classifications = []
            
            # YOLO 결과 파싱 (모델에 따라 파싱 방식이 다를 수 있음. 기본 classification 모델 기준)
            for result in results:
                # 1) detection 결과 우선 처리
                if result.boxes is not None and len(result.boxes) > 0:
                    orig_shape = getattr(result, "orig_shape", None)
                    if orig_shape is not None and len(orig_shape) >= 2:
                        orig_h, orig_w = int(orig_shape[0]), int(orig_shape[1])
                    else:
                        orig_h, orig_w = 640, 640

                    if orig_h <= 0:
                        orig_h = 640
                    if orig_w <= 0:
                        orig_w = 640

                    for box in result.boxes:
                        try:
                            cls_idx = (
                                int(box.cls.item())
                                if hasattr(box.cls, "item")
                                else int(box.cls)
                            )
                            conf_score = (
                                float(box.conf.item())
                                if hasattr(box.conf, "item")
                                else float(box.conf)
                            )

                            # Ultralytics box.xyxy는 보통 shape (1, 4)
                            coords = box.xyxy[0].tolist()
                            if coords is None or len(coords) != 4:
                                classifications.append(
                                    {
                                        "class": result.names[cls_idx],
                                        "confidence": conf_score,
                                    }
                                )
                                continue

                            x1, y1, x2, y2 = [float(v) for v in coords]
                            w_box = max(0.0, x2 - x1)
                            h_box = max(0.0, y2 - y1)
                            cx = (x1 + x2) / 2.0
                            cy = (y1 + y2) / 2.0

                            classifications.append(
                                {
                                    "class": result.names[cls_idx],
                                    "confidence": conf_score,
                                    "bbox": [
                                        round(x1, 2),
                                        round(y1, 2),
                                        round(x2, 2),
                                        round(y2, 2),
                                    ],
                                    "xCenterRatio": round(cx / orig_w, 4),
                                    "yCenterRatio": round(cy / orig_h, 4),
                                    "widthRatio": round(w_box / orig_w, 4),
                                    "heightRatio": round(h_box / orig_h, 4),
                                    "areaRatio": round(
                                        (w_box * h_box) / (orig_w * orig_h), 4
                                    ),
                                }
                            )
                        except Exception as box_e:
                            print(f"[YOLO] bbox parse failed: {box_e}")
                            try:
                                fallback_cls_idx = (
                                    int(box.cls.item())
                                    if hasattr(box.cls, "item")
                                    else int(box.cls)
                                )
                                fallback_conf = (
                                    float(box.conf.item())
                                    if hasattr(box.conf, "item")
                                    else float(box.conf)
                                )
                                classifications.append(
                                    {
                                        "class": result.names[fallback_cls_idx],
                                        "confidence": fallback_conf,
                                    }
                                )
                            except Exception:
                                classifications.append(
                                    {
                                        "class": "unknown",
                                        "confidence": 0.0,
                                    }
                                )

                # 2) classification 결과 처리
                elif result.probs is not None:
                    top5_indices = result.probs.top5
                    top5_confidences = result.probs.top5conf
                    names = result.names

                    for i, conf_score in zip(top5_indices, top5_confidences):
                        try:
                            cls_idx = int(i.item()) if hasattr(i, "item") else int(i)
                            score = (
                                float(conf_score.item())
                                if hasattr(conf_score, "item")
                                else float(conf_score)
                            )
                            classifications.append(
                                {
                                    "class": names[cls_idx],
                                    "confidence": score,
                                }
                            )
                        except Exception as cls_e:
                            print(f"[YOLO] classification parse failed: {cls_e}")
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
