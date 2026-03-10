try:
    from fastapi import HTTPException  # type: ignore
except Exception:  # pragma: no cover
    class HTTPException(Exception):
        def __init__(self, status_code: int = 500, detail: str | None = None):
            super().__init__(detail or "HTTPException")
            self.status_code = status_code
            self.detail = detail or ""
from app.core.config import settings
import base64
from typing import Any, Dict, List, Optional
from PIL import Image
import io
from openai import OpenAI

class LLMService:
    def __init__(self):
        # SSAFY GMS(OpenAI compatible) endpoint via OpenAI SDK
        self.api_key = settings.gms_key
        self.base_url = settings.gms_base_url.rstrip("/")
        self._client: OpenAI | None = None

    def _get_client(self) -> OpenAI:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="GMS_KEY is not configured")
        if self._client is None:
            self._client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    @staticmethod
    def _file_to_data_url(path: str) -> str:
        """
        로컬 이미지를 data URL로 변환합니다.
        - 그대로 base64를 올리면 요청 바디가 커져 게이트웨이에서 실패할 수 있어
          기본적으로 리사이즈/압축(JPEG)합니다.
        """
        # Conservative defaults to keep request size manageable.
        max_side = 768
        jpeg_quality = 70

        img = Image.open(path)
        img = img.convert("RGB")
        w, h = img.size
        scale = min(max_side / max(w, 1), max_side / max(h, 1), 1.0)
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
        data = buf.getvalue()

        b64 = base64.b64encode(data).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"

    def analyze_daily_results(self, classifications: list) -> str:
        """
        (기존 daily 엔드포인트용) YOLO 결과만 기반으로 텍스트 분석을 요청합니다.
        """
        client = self._get_client()

        if not classifications:
            return "분석할 수 없는 이미지이거나 객체가 감지되지 않았습니다."

        # 프롬프트 구성
        objects_str = ", ".join([f"{item['class']} (신뢰도: {item['confidence']:.2f})" for item in classifications[:5]])
        
        developer_prompt = "You are a helpful assistant."
        user_prompt = (
            "다음은 이미지에서 감지된 객체 목록입니다.\n"
            f"- {objects_str}\n\n"
            "이 정보를 바탕으로 사진 속 상황을 한국어로 3문장 이내로 자연스럽게 요약해 주세요."
        )

        try:
            print("Requesting SSAFY GMS(OpenAI SDK) for analysis...")
            resp = client.chat.completions.create(
                model=(settings.gms_model or "gpt-4o"),
                messages=[
                    {"role": "developer", "content": developer_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=512,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:
            print(f"Error calling SSAFY GMS API: {e}")
            raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")

    def analyze_htp(
        self,
        *,
        session_id: int,
        who5: Dict[str, Any],
        yolo: Dict[str, Any],
        image_paths: Dict[str, str] | None = None,
        image_urls: Dict[str, str] | None = None,
        prompt_guide_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        HTP + WHO5 + YOLO 결과 + 원본 이미지(멀티모달)로 GPT-4o 분석을 요청하고
        JSON 형태의 결과를 반환합니다.
        """
        client = self._get_client()

        developer_prompt = (
            "당신은 그림을 통해 내면을 알아보는 자기탐색을 돕는 전문가입니다. "
            "의학적 진단은 하지 않으며, 따뜻하고 지지적인 어조로 답합니다. "
            "좋은 점을 먼저 언급하고, HTP 관점에서 집·나무·사람 그림이 각각 상징하는 영역을 깊이 있게 풀어주세요. "
            "반드시 JSON 하나만 출력합니다."
        )

        # 서비스에서 바로 사용 가능한 심층 분석용 스키마
        output_schema = '''출력 JSON 스키마 (반드시 준수):
{
  "resultSummary": "5~8문장. ①긍정적인 점과 강점 먼저 칭찬 ②집(가정·안정)·나무(성장·에너지)·사람(자아상) 각각의 내면적 의미를 심층 해석 ③wellbeing 점수와 그림을 연결한 종합 인사이트",
  "strengths": ["그림에서 드러나는 강점 1", "강점 2", "강점 3"],
  "questions": ["내면을 더 알아가는 데 도움이 되는 질문 1", "질문 2", "질문 3"],
  "raw": {
    "observations": {
      "house": {"elements": [...], "interpretation": "집 그림이 말해주는 내면(가정·안정·경계 등) 해석"},
      "tree": {"elements": [...], "interpretation": "나무 그림이 말해주는 내면(성장·에너지·뿌리감 등) 해석"},
      "person": {"elements": [...], "interpretation": "사람 그림이 말해주는 내면(자아상·표현·관계 등) 해석"}
    },
    "wellbeing": {"scoreTotal": N, "note": "점수와 그림을 연결한 짧은 메모"}
  }
}'''

        guide = prompt_guide_text or (
            "규칙:\n"
            "- 의학적 진단·병리 라벨링 금지. '가능성·처럼 보인다' 표현 사용.\n"
            "- 긍정과 강점을 반드시 먼저 담아 따뜻하게 시작한다.\n"
            "- 집=가정·안정·경계, 나무=성장·에너지·뿌리, 사람=자아상·표현·관계라는 관점으로 심층 해석.\n"
            "- JSON만 출력.\n"
            "\n"
            + output_schema
        )

        if prompt_guide_text:
            guide = (
                "[참고자료]\n"
                f"{prompt_guide_text}\n\n"
                "[작성 지침]\n"
                "- 참고자료를 활용하되, 진단·병리 라벨은 사용하지 않고 완곡하게 표현한다.\n"
                "- 긍정과 강점을 먼저 언급하고, 그 다음에 심층 해석을 이어간다.\n"
                "- resultSummary는 5~8문장으로 풍부하게, 서비스 결과 화면에 그대로 노출될 수 있도록 작성한다.\n"
                "- questions는 '나의 내면을 더 알아가는' 질문으로 구성한다.\n"
                "- 반드시 JSON만 출력한다.\n\n"
                + output_schema
            )

        # 멀티모달 user message content
        def build_user_content(*, include_guide: bool, include_wellbeing_raw: bool) -> List[Dict[str, Any]]:
            wellbeing = {"scoreTotal": who5.get("scoreTotal")}
            if include_wellbeing_raw:
                wellbeing["raw"] = who5.get("raw")

            parts: List[Dict[str, Any]] = [
                {"type": "text", "text": f"sessionId: {session_id}"},
            ]
            if include_guide:
                parts.append({"type": "text", "text": guide})
            parts.extend(
                [
                    {"type": "text", "text": "입력 데이터(구조화):"},
                    {"type": "text", "text": f"wellbeing_survey: {wellbeing}"},
                    {"type": "text", "text": f"YOLO: {yolo}"},
                    {
                        "type": "text",
                        "text": "이미지 3장과 YOLO 관찰 결과를 바탕으로, resultSummary는 긍정(강점)을 먼저 담고, 집·나무·사람 각각의 내면적 의미를 HTP 관점에서 심층 해석해 주세요. 서비스 결과 화면에 그대로 노출될 수 있도록 5~8문장으로 풍부하게 작성해 주세요.",
                    },
                ]
            )
            return parts

        content: List[Dict[str, Any]] = build_user_content(include_guide=True, include_wellbeing_raw=True)

        def attach_images(parts: List[Dict[str, Any]]) -> None:
            for key in ("house", "tree", "person"):
                url = (image_urls or {}).get(key)
                if url:
                    parts.append({"type": "text", "text": f"{key} image (url):"})
                    parts.append({"type": "image_url", "image_url": {"url": url}})
                    continue

                path = (image_paths or {}).get(key)
                if not path:
                    continue

                # Fallback: embed as data URL (may be large; prefer presigned URLs in production)
                data_url = self._file_to_data_url(path)
                parts.append({"type": "text", "text": f"{key} image:"})
                parts.append({"type": "image_url", "image_url": {"url": data_url}})

        attach_images(content)

        model_name = (settings.gms_model or "").strip() or "gpt-4o"

        try:
            def request_once(user_content: List[Dict[str, Any]]):
                return client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "developer", "content": developer_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.3,
                    max_tokens=1400,
                    response_format={"type": "json_object"},
                )

            print("Requesting SSAFY GMS(OpenAI SDK) for HTP analysis...")
            resp = request_once(content)

            choice0 = resp.choices[0]
            msg0 = choice0.message
            content_text = msg0.content or ""
            refusal = getattr(msg0, "refusal", None)
            if refusal:
                print("[LLM] Refusal received. Retrying with simplified prompt.")
                simplified = build_user_content(include_guide=False, include_wellbeing_raw=False)
                attach_images(simplified)
                resp = request_once(simplified)
                choice0 = resp.choices[0]
                msg0 = choice0.message
                content_text = msg0.content or ""
                refusal = getattr(msg0, "refusal", None)

            if not content_text.strip():
                print("[LLM] Empty content returned.")
                print("finish_reason:", choice0.finish_reason)
                print("refusal:", refusal)
                try:
                    # Avoid logging huge payloads
                    import json as _json
                    dumped = resp.model_dump()
                    print("resp (truncated):", _json.dumps(dumped, ensure_ascii=False)[:1200])
                except Exception as _e:
                    print("resp dump failed:", _e)
                raise ValueError("Empty LLM content")
            import json
            try:
                return json.loads(content_text)
            except Exception:
                print("[LLM] JSON parse failed. Raw content (truncated):")
                print((content_text or "")[:800])
                # Fallback: attempt to extract a JSON object from text
                start = content_text.find("{")
                end = content_text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    return json.loads(content_text[start : end + 1])
                raise
        except Exception as e:
            print(f"Error calling SSAFY GMS API: {e}")
            raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM response parsing failed: {str(e)}")

llm_service = LLMService()
