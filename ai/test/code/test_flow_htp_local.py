from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_AI_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_AI_ROOT))

from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.services.htp_guide_service import htp_guide_service


def main() -> None:
    test_dir = _AI_ROOT / "test" / "image"

    house_img = test_dir / "집.jpg"
    tree_img = test_dir / "나무.jpg"
    person_img = test_dir / "사람.jpg"

    if not (house_img.exists() and tree_img.exists() and person_img.exists()):
        raise SystemExit("test/image 폴더에 집/나무/사람 jpg가 필요합니다.")

    yolo_models_dir = _AI_ROOT / "yolo_models"
    model_paths = {
        "house": str((yolo_models_dir / "house.pt").resolve()),
        "tree": str((yolo_models_dir / "tree.pt").resolve()),
        "person": str((yolo_models_dir / "person.pt").resolve()),
    }

    image_paths = {
        "house": str(house_img),
        "tree": str(tree_img),
        "person": str(person_img),
    }

    print("[1/3] YOLO 추론 시작")
    yolo_raw = {}
    yolo_summary = {}
    for key in ("house", "tree", "person"):
        det = YoloService.classify_image(image_paths[key], model_paths[key])
        yolo_raw[key] = det
        yolo_summary[key] = YoloService.summarize_detections(det)

    yolo_payload = {
        "summary": yolo_summary,
        "raw": yolo_raw,
        "classTaxonomy": {
            "house": ["집전체", "지붕", "문", "창문굴뚝", "연기", "길", "울타리", "잔디", "꽃", "태양", "산", "연못"],
            "person": ["사람전체", "얼굴", "머리", "머리카락", "눈", "코", "입", "귀", "목", "상체", "팔", "손", "다리", "발", "옷세부", "신발"],
            "tree": ["나무전체", "가지", "나뭇잎", "뿌리", "수관", "열매", "꽃", "구름", "달", "별", "새", "동물"],
        },
    }

    print(json.dumps({"yolo": yolo_payload["summary"]}, ensure_ascii=False, indent=2))

    if not os.getenv("GMS_KEY"):
        print("[2/3] GMS_KEY가 없어 LLM 호출은 건너뜁니다. (YOLO 결과만 확인 완료)")
        return

    print("[2/3] HTP 가이드(문서) 컨텍스트 구성")
    guide_text = htp_guide_service.build_prompt_context(
        requested_sections=("house", "tree", "person"),
        max_chars=4500,
    )

    print("[3/3] LLM(GPT-4o-mini via SSAFY GMS) 호출")
    skip_images = os.getenv("SKIP_IMAGES", "").strip() in ("1", "true", "TRUE", "yes", "YES")
    result = llm_service.analyze_htp(
        session_id=0,
        who5={"scoreTotal": 0, "raw": {}},
        yolo=yolo_payload,
        # local test images are embedded as data URLs (may be large).
        # set SKIP_IMAGES=1 to validate text-only LLM path.
        image_paths=None if skip_images else image_paths,
        prompt_guide_text=guide_text,
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

