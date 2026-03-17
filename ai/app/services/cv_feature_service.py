"""
HTP 보조 CV 모듈: "어떻게 그려졌는지" 정량화.
LLM이 근거로 사용할 시각 feature를 추출하며, 심리 해석은 하지 않는다.
"""
from __future__ import annotations

import json
from typing import Any

import cv2
import numpy as np


def extract_global_features(image_path: str) -> dict[str, Any]:
    """
    이미지 전체에서 실제 그려진 영역 기반의 전역 feature 추출.
    실패 시 안전한 기본값을 담은 dict 반환.
    """
    default: dict[str, Any] = {
        "imageWidth": 0,
        "imageHeight": 0,
        "drawingBBox": [0, 0, 0, 0],
        "drawingAreaRatio": 0.0,
        "drawingCenterXRatio": 0.5,
        "drawingCenterYRatio": 0.5,
        "blankPixelRatio": 1.0,
        "inkPixelRatio": 0.0,
        "horizontalBias": "center",
        "verticalBias": "center",
        "drawingSizeLevel": "unknown",
        "connectedComponentsCount": 0,
    }
    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"[CV] Failed to read image: {image_path}")
            return default

        h, w = img.shape[:2]
        if h == 0 or w == 0:
            return default

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 너무 흰 이미지 보정
        ink_ratio = np.sum(thresh > 0) / (w * h)
        if ink_ratio < 0.001:
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
            )
        ink_ratio = float(np.sum(thresh > 0) / (w * h))
        blank_ratio = 1.0 - ink_ratio

        pts = np.column_stack(np.where(thresh > 0))
        if len(pts) == 0:
            out = default.copy()
            out["imageWidth"] = w
            out["imageHeight"] = h
            out["blankPixelRatio"] = blank_ratio
            out["inkPixelRatio"] = ink_ratio
            return out

        # pts: (y, x) order from np.where
        y_coords = pts[:, 0]
        x_coords = pts[:, 1]
        x1, x2 = int(x_coords.min()), int(x_coords.max())
        y1, y2 = int(y_coords.min()), int(y_coords.max())
        drawing_bbox = [x1, y1, x2, y2]

        drawing_area = (x2 - x1 + 1) * (y2 - y1 + 1)
        drawing_area_ratio = float(drawing_area / (w * h)) if (w * h) > 0 else 0.0

        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        cx_ratio = cx / w if w > 0 else 0.5
        cy_ratio = cy / h if h > 0 else 0.5

        # horizontalBias
        if cx_ratio < 0.4:
            h_bias = "left"
        elif cx_ratio > 0.6:
            h_bias = "right"
        else:
            h_bias = "center"

        # verticalBias
        if cy_ratio < 0.4:
            v_bias = "upper"
        elif cy_ratio > 0.6:
            v_bias = "lower"
        else:
            v_bias = "center"

        # drawingSizeLevel (drawingAreaRatio 기준)
        if drawing_area_ratio < 0.05:
            size_level = "very_small"
        elif drawing_area_ratio < 0.15:
            size_level = "small"
        elif drawing_area_ratio < 0.4:
            size_level = "medium"
        elif drawing_area_ratio < 0.9:
            size_level = "large"
        else:
            size_level = "medium"  # 거의 전체 = large에 가깝지만

        num_labels, _ = cv2.connectedComponents(thresh)
        cc_count = max(0, int(num_labels) - 1)  # 배경 제외

        return {
            "imageWidth": w,
            "imageHeight": h,
            "drawingBBox": drawing_bbox,
            "drawingAreaRatio": round(drawing_area_ratio, 4),
            "drawingCenterXRatio": round(cx_ratio, 4),
            "drawingCenterYRatio": round(cy_ratio, 4),
            "blankPixelRatio": round(blank_ratio, 4),
            "inkPixelRatio": round(ink_ratio, 4),
            "horizontalBias": h_bias,
            "verticalBias": v_bias,
            "drawingSizeLevel": size_level,
            "connectedComponentsCount": cc_count,
        }
    except Exception as e:
        print(f"[CV] extract_global_features error: {e}")
        return default


def build_object_features(
    detections: list[dict[str, Any]],
    img_width: int,
    img_height: int,
) -> dict[str, Any]:
    """
    YOLO detection 리스트를 bbox/ratio가 포함된 object feature 구조로 변환.
    이미 bbox, xCenterRatio 등이 있으면 그대로 활용.
    """
    if img_width <= 0 or img_height <= 0:
        return {"detections": [], "imageWidth": 0, "imageHeight": 0}

    enhanced: list[dict[str, Any]] = []
    for d in detections:
        cls_name = str(d.get("class", "unknown"))
        conf = float(d.get("confidence", 0.0))
        bbox = d.get("bbox")
        if bbox is None or len(bbox) < 4:
            enhanced.append({
                "class": cls_name,
                "confidence": conf,
                "bbox": [0, 0, 0, 0],
                "xCenterRatio": 0.5,
                "yCenterRatio": 0.5,
                "widthRatio": 0.0,
                "heightRatio": 0.0,
                "areaRatio": 0.0,
            })
            continue
        x1, y1, x2, y2 = [float(bbox[i]) for i in range(4)]
        w_box = max(0, x2 - x1)
        h_box = max(0, y2 - y1)
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        x_center_ratio = cx / img_width if img_width > 0 else 0.5
        y_center_ratio = cy / img_height if img_height > 0 else 0.5
        width_ratio = w_box / img_width if img_width > 0 else 0.0
        height_ratio = h_box / img_height if img_height > 0 else 0.0
        area_ratio = width_ratio * height_ratio

        enhanced.append({
            "class": cls_name,
            "confidence": conf,
            "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
            "xCenterRatio": round(x_center_ratio, 4),
            "yCenterRatio": round(y_center_ratio, 4),
            "widthRatio": round(width_ratio, 4),
            "heightRatio": round(height_ratio, 4),
            "areaRatio": round(area_ratio, 4),
        })
    return {
        "detections": enhanced,
        "imageWidth": img_width,
        "imageHeight": img_height,
    }


def _ratio_to_size_level(ratio: float) -> str:
    if ratio <= 0:
        return "unknown"
    if ratio < 0.02:
        return "very_small"
    if ratio < 0.08:
        return "small"
    if ratio < 0.25:
        return "medium"
    return "large"


def _ratio_to_bias(ratio: float) -> str:
    if ratio < 0.4:
        return "left"
    if ratio > 0.6:
        return "right"
    return "center"


def _build_interpretable_features(
    global_features: dict[str, Any],
    object_features: dict[str, Any],
    image_type: str,
) -> dict[str, Any]:
    """
    global + object features를 바탕으로 LLM 친화적 범주형 feature 생성.
    """
    detections = object_features.get("detections", [])
    by_class: dict[str, list[dict]] = {}
    for d in detections:
        c = str(d.get("class", "unknown"))
        by_class.setdefault(c, []).append(d)

    # 대표 bbox: areaRatio 가장 큰 것
    def get_best(key: str) -> dict[str, Any] | None:
        arr = by_class.get(key, [])
        if not arr:
            return None
        return max(arr, key=lambda x: float(x.get("areaRatio", 0)))

    out: dict[str, Any] = {
        "global": {
            "drawingSizeLevel": global_features.get("drawingSizeLevel", "unknown"),
            "horizontalBias": global_features.get("horizontalBias", "center"),
            "verticalBias": global_features.get("verticalBias", "center"),
        },
    }

    if image_type == "house":
        house = get_best("집전체") or get_best("house")
        door = get_best("문") or get_best("door")
        window = get_best("창문") or get_best("창문굴뚝")
        chimney = get_best("굴뚝") or get_best("chimney")
        out["house"] = {
            "housePresent": house is not None,
            "doorPresent": door is not None,
            "windowPresent": window is not None,
            "chimneyPresent": chimney is not None,
            "doorToHouseAreaRatio": None,
            "doorSizeLevel": "unknown",
            "houseBias": "center",
        }
        if house:
            out["house"]["houseBias"] = _ratio_to_bias(house.get("xCenterRatio", 0.5))
        if door:
            out["house"]["doorSizeLevel"] = _ratio_to_size_level(door.get("areaRatio", 0))
            if house and house.get("areaRatio", 0) > 0:
                out["house"]["doorToHouseAreaRatio"] = round(
                    door.get("areaRatio", 0) / house.get("areaRatio", 1), 4
                )

    elif image_type == "tree":
        tree = get_best("나무전체") or get_best("tree")
        roots = get_best("뿌리") or get_best("roots")
        crown = get_best("수관") or get_best("나뭇잎") or get_best("crown")
        fruit = get_best("열매") or get_best("fruit")
        out["tree"] = {
            "treePresent": tree is not None,
            "rootsPresent": roots is not None,
            "crownPresent": crown is not None,
            "fruitPresent": fruit is not None,
            "crownToTreeAreaRatio": None,
            "crownSizeLevel": "unknown",
            "treeBias": "center",
        }
        if tree:
            out["tree"]["treeBias"] = _ratio_to_bias(tree.get("xCenterRatio", 0.5))
        if crown:
            out["tree"]["crownSizeLevel"] = _ratio_to_size_level(crown.get("areaRatio", 0))
            if tree and tree.get("areaRatio", 0) > 0:
                out["tree"]["crownToTreeAreaRatio"] = round(
                    crown.get("areaRatio", 0) / tree.get("areaRatio", 1), 4
                )

    elif image_type == "person":
        person = get_best("사람전체") or get_best("person")
        head = get_best("머리") or get_best("얼굴") or get_best("head")
        hands = get_best("손") or get_best("hands")
        feet = get_best("발") or get_best("feet")
        shoes = get_best("신발") or get_best("shoes")
        out["person"] = {
            "personPresent": person is not None,
            "headPresent": head is not None,
            "handsPresent": hands is not None,
            "feetPresent": feet is not None,
            "shoesPresent": shoes is not None,
            "headToPersonAreaRatio": None,
            "headSizeLevel": "unknown",
            "personBias": "center",
        }
        if person:
            out["person"]["personBias"] = _ratio_to_bias(person.get("xCenterRatio", 0.5))
        if head:
            out["person"]["headSizeLevel"] = _ratio_to_size_level(head.get("areaRatio", 0))
            if person and person.get("areaRatio", 0) > 0:
                out["person"]["headToPersonAreaRatio"] = round(
                    head.get("areaRatio", 0) / person.get("areaRatio", 1), 4
                )
    else:
        out[image_type] = {"present": len(detections) > 0}

    return out


def extract_features(
    image_path: str,
    detections: list[dict[str, Any]],
    image_type: str = "unknown",
) -> dict[str, Any]:
    """
    전역 feature + object feature + interpretable feature를 한 번에 추출.
    실패 시 빈 구조 반환.
    """
    try:
        global_features = extract_global_features(image_path)
        img_w = int(global_features.get("imageWidth", 0))
        img_h = int(global_features.get("imageHeight", 0))

        # detections에 bbox가 없으면 build_object_features가 보정 불가. yolo가 bbox 포함하도록 수정됨 가정.
        object_features = build_object_features(detections, img_w, img_h)

        interpretable = _build_interpretable_features(
            global_features, object_features, image_type
        )

        return {
            "globalFeatures": global_features,
            "objectFeatures": object_features,
            "interpretableFeatures": interpretable,
        }
    except Exception as e:
        print(f"[CV] extract_features error: {e}")
        return {
            "globalFeatures": {},
            "objectFeatures": {"detections": []},
            "interpretableFeatures": {},
        }


def cv_features_to_json_safe(obj: dict[str, Any]) -> str:
    """JSON 직렬화 가능한 형태로 변환 후 문자열 반환."""
    def to_serializable(x: Any) -> Any:
        if isinstance(x, (np.integer, np.floating)):
            return float(x) if isinstance(x, np.floating) else int(x)
        if isinstance(x, np.ndarray):
            return x.tolist()
        if isinstance(x, dict):
            return {k: to_serializable(v) for k, v in x.items()}
        if isinstance(x, list):
            return [to_serializable(v) for v in x]
        return x
    return json.dumps(to_serializable(obj), ensure_ascii=False)
