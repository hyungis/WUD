from app.models.schemas import AiAnalyzeReq, AiAnalyzeResp, AiAnalysisData
from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.services.htp_guide_service import htp_guide_service
import os
from pathlib import Path


def analyze_deep_session_request(request: AiAnalyzeReq) -> AiAnalyzeResp:
    """
    Deep(HTP/WHO5) analysis entrypoint.
    HTP: downloads 3 images from S3, runs YOLO per image, then calls GPT-4o-mini via SSAFY GMS.
    """
    print(f"[FastAPI] Received Deep Analysis Request for Session: {request.sessionId}")
    print(f"[FastAPI] DeepType: {request.deepType}")

    if (request.deepType or "").upper() != "HTP":
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=f"Unsupported deepType: {request.deepType}",
            data=None,
        )

    image_paths: dict[str, str] = {}
    downloaded: list[str] = []
    try:
        # 1) Download images from S3
        image_paths["house"] = s3_service.download_image(request.images.houseImageKey)
        image_paths["tree"] = s3_service.download_image(request.images.treeImageKey)
        image_paths["person"] = s3_service.download_image(request.images.personImageKey)
        downloaded = [p for p in image_paths.values() if p]

        # Prefer presigned URLs for LLM (avoid huge base64 payloads)
        image_urls = {
            "house": s3_service.generate_presigned_url(request.images.houseImageKey),
            "tree": s3_service.generate_presigned_url(request.images.treeImageKey),
            "person": s3_service.generate_presigned_url(request.images.personImageKey),
        }

        # 2) YOLO inference (per-image model)
        # Model files are placed under ai/yolo_models/*.pt
        base_dir = Path(__file__).resolve().parents[2]  # .../ai/app
        yolo_models_dir = (base_dir / "yolo_models").resolve()
        model_paths = {
            "house": str(yolo_models_dir / "house.pt"),
            "tree": str(yolo_models_dir / "tree.pt"),
            "person": str(yolo_models_dir / "person.pt"),
        }

        yolo_raw: dict[str, object] = {}
        yolo_summary: dict[str, object] = {}
        for key in ("house", "tree", "person"):
            det = YoloService.classify_image(image_paths[key], model_paths[key])
            yolo_raw[key] = det
            yolo_summary[key] = YoloService.summarize_detections(det)

        # 3) LLM multimodal call (image + text)
        who5_payload = {
            "scoreTotal": request.who5.scoreTotal,
            "raw": request.who5.raw,
        }
        yolo_payload = {
            "summary": yolo_summary,
            "raw": yolo_raw,
            "classTaxonomy": {
                "house": ["집전체", "지붕", "문", "창문굴뚝", "연기", "길", "울타리", "잔디", "꽃", "태양", "산", "연못"],
                "person": ["사람전체", "얼굴", "머리", "머리카락", "눈", "코", "입", "귀", "목", "상체", "팔", "손", "다리", "발", "옷세부", "신발"],
                "tree": ["나무전체", "가지", "나뭇잎", "뿌리", "수관", "열매", "꽃", "구름", "달", "별", "새", "동물"],
            },
        }

        guide_text = htp_guide_service.build_prompt_context(
            requested_sections=("house", "tree", "person"),
            max_chars=4500,
        )

        llm_json = llm_service.analyze_htp(
            session_id=int(request.sessionId),
            who5=who5_payload,
            yolo=yolo_payload,
            image_paths=image_paths,
            image_urls=image_urls,
            prompt_guide_text=guide_text,
        )

        # Normalize LLM output to backend-expected shape.
        result_summary = ""
        questions: list[str] = []
        raw: dict = {}

        if isinstance(llm_json, dict):
            intro = str(llm_json.get("intro", "") or "").strip()
            core_insights = llm_json.get("coreInsights", [])
            
            # Formulate the response in the exact user-requested structure
            summary_parts = []
            if intro:
                summary_parts.append(intro)
                
            if core_insights and isinstance(core_insights, list):
                summary_parts.append("\n\nCore Insights")
                for i, insight in enumerate(core_insights, 1):
                    summary_parts.append(f"{i}\n{insight}")
                    
            result_summary = "\n".join(summary_parts).strip()
            
            questions = [str(q) for q in (llm_json.get("questions") or []) if q]
            raw_obj = llm_json.get("raw")
            raw = raw_obj.copy() if isinstance(raw_obj, dict) else {}
            if not isinstance(raw_obj, dict):
                raw = {"llm": llm_json}
            # strengths를 raw에 포함해 프론트에서 활용 가능하게
            strengths = llm_json.get("strengths")
            if isinstance(strengths, list) and strengths:
                raw["strengths"] = [str(s) for s in strengths if s]
                
            # intro와 coreInsights를 프론트에서 별도로 사용할 수도 있으므로 raw에도 담아둡니다
            if intro:
                raw["intro"] = intro
            if core_insights:
                raw["coreInsights"] = core_insights

        # Fallback mapping when model returned a different JSON schema
        if not result_summary:
            obs = llm_json.get("observations") or (raw.get("observations") if isinstance(raw, dict) else None)
            who5_llm = llm_json.get("WHO-5") if isinstance(llm_json, dict) else None
            parts: list[str] = []
            if isinstance(obs, dict):
                for k in ("house", "tree", "person"):
                    v = obs.get(k)
                    if isinstance(v, dict):
                        # Case A) { "interpretation": "..." }
                        interp = v.get("interpretation")
                        if interp:
                            parts.append(str(interp))
                        # Case B) { "지붕": "...", "연기": "...", ... }
                        for vv in v.values():
                            if isinstance(vv, str) and vv.strip():
                                parts.append(vv.strip())
                            if isinstance(vv, list):
                                for item in vv:
                                    if isinstance(item, str) and item.strip():
                                        parts.append(item.strip())
                            if isinstance(vv, dict):
                                for item in vv.values():
                                    if isinstance(item, str) and item.strip():
                                        parts.append(item.strip())
            if isinstance(who5_llm, dict) and who5_llm.get("interpretation"):
                parts.append(str(who5_llm.get("interpretation")))
            # raw.wellbeing.note
            wb = raw.get("wellbeing") if isinstance(raw, dict) else None
            if isinstance(wb, dict) and wb.get("note"):
                parts.append(str(wb.get("note")))
            result_summary = " ".join(parts)[:600].strip()

        if not questions:
            questions = [
                "그림을 그릴 때 가장 신경 쓴 부분은 무엇이었나요?",
                "그림 속 장면(집/나무/사람)이 어떤 분위기처럼 느껴지나요?",
                "최근 일상에서 마음이 편해지는 순간은 언제였나요?",
            ]

        data = AiAnalysisData(
            resultSummary=result_summary,
            questions=questions[:5],
            raw=raw,
        )

        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="SUCCESS",
            message="분석이 정상적으로 완료되었습니다.",
            data=data,
        )
    except Exception as e:
        print(f"[Deep Analyze] failed: {e}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=str(e),
            data=None,
        )
    finally:
        for p in downloaded:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass
