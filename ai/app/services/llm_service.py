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

    def analyze_daily_inner_feedback(
        self,
        *,
        daily_id: int,
        daily_type: str,
        emotion: str | None,
        emotion_color: str | None,
        content: str | None,
        image_url: str | None = None,
        image_path: str | None = None,
    ) -> str:
        """
        Daily 이미지(멀티모달) + 감정/텍스트를 기반으로
        그림 단서를 근거로 사용자의 '내면 상태'를 추론한 한 문장 피드백을 생성합니다.
        """
        if not image_url and not image_path:
            raise HTTPException(status_code=400, detail="Either image_url or image_path is required")

        client = self._get_client()
        model_name = (settings.gms_model or "").strip() or "gpt-4o"

        allowed_endings = ("인 것 같아요.", "한 듯해요.", "해 보이네요.", "느껴져요.", "보여요.")

        developer_prompt = (
            "당신은 HTP 그림(집, 나무, 사람)과 보조 정보(WELL-BEING 설문, 객체 탐지 결과)를 함께 참고하여 "
            "근거 기반의 심층 해석 기록을 작성하는 분석가입니다. "
            "반드시 그림의 시각적 단서와 입력 정보에 근거하여 해석해야 하며, 보이는 사실 이상을 과도하게 확대 해석하지 않습니다. "

            "분석 원칙은 다음과 같습니다. "
            "첫째, 그림에서 관찰되는 특징(예: 크기, 위치, 여백, 선의 강약, 형태의 강조/생략, 대상 간 관계)을 먼저 언급하고, "
            "그 다음 그 특징이 시사할 수 있는 심리적 의미를 '가능성' 수준에서 조심스럽게 설명합니다. "
            "둘째, 단정적 표현은 피하고 '보입니다', '느껴집니다', '시사합니다', '추정해볼 수 있습니다' 같은 완곡한 표현을 사용합니다. "
            "셋째, 진단명, 병리적 라벨, 임상적 확정 표현은 절대 사용하지 않습니다. "
            "넷째, 부정적이거나 긴장된 단서가 보여도 자극적으로 표현하지 말고, 현재의 방어 방식, 부담, 조심성, 에너지 저하 가능성처럼 절제된 언어로 설명합니다. "
            "다섯째, 강점과 자원을 반드시 함께 제시하되, 근거 없는 위로나 과장된 감동 표현은 사용하지 않습니다. "

            "YOLO 객체 탐지 결과는 보조 단서일 뿐이며, 탐지되지 않았다는 사실이 곧 그림에 없다는 뜻은 아닙니다. "
            "반드시 실제 이미지의 시각적 특징과 함께 교차 검토하세요. "
            "WHO-5 점수 역시 보조 맥락으로만 활용하며, 점수만으로 전체 해석을 끌고 가지 마세요. "

            "출력은 반드시 JSON 객체 하나만 생성합니다. "
            "문체는 사용자에게 직접 말을 거는 편지체가 아니라, 전문적인 해석 기록문 스타일로 유지합니다."
        )

        daily_type_norm = (daily_type or "").strip().upper()
        emo = (emotion or "").strip()
        emo_color = (emotion_color or "").strip()
        diary = (content or "").strip()

        text_parts = [
            {"type": "text", "text": f"dailyId: {daily_id}"},
            {"type": "text", "text": f"dailyType: {daily_type_norm}"},
        ]
        if emo:
            text_parts.append({"type": "text", "text": f"emotion: {emo}"})
        if emo_color:
            text_parts.append({"type": "text", "text": f"emotionColor: {emo_color}"})
        if diary:
            text_parts.append({"type": "text", "text": f"diary: {diary}"})

        text_parts.append(
            {
                "type": "text",
                "text": (
                    "아래 이미지(그림)를 보고, 위 정보(있다면)까지 함께 고려해 "
                    "그림 단서를 근거로 사용자의 내면 상태를 '추론'한 분석을 한 문장으로 작성해 주세요. "
                    "예: 색이 밝고 여백이 넓어, 안정 속에서 자기표현을 해보고 싶은 마음이 한 듯해요. "
                    "이모지/따옴표/번호는 사용하지 말고, 끝맺음은 반드시 "
                    "'인 것 같아요.' / '한 듯해요.' / '해 보이네요.' / '느껴져요.' / '보여요.' 중 하나로 해주세요."
                ),
            }
        )

        content_parts: List[Dict[str, Any]] = list(text_parts)
        if image_url:
            content_parts.append({"type": "image_url", "image_url": {"url": image_url}})
        else:
            data_url = self._file_to_data_url(image_path or "")
            content_parts.append({"type": "image_url", "image_url": {"url": data_url}})

        try:
            print("Requesting SSAFY GMS(OpenAI SDK) for daily vision feedback...")
            resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "developer", "content": developer_prompt},
                    {"role": "user", "content": content_parts},
                ],
                temperature=0.6,
                max_tokens=120,
            )
            out = (resp.choices[0].message.content or "").strip()
            # Keep it single-line/single-sentence-ish for the backend.
            out = " ".join(out.split())
            if not out:
                raise ValueError("Empty LLM content")
            # Enforce preferred ending for daily one-liner storage.
            if out.endswith("읽혀요.") or out.endswith("읽힐 수 있어요.") or out.endswith("읽힙니다."):
                out = out.rstrip(".")
                out = out + "인 것 같아요."
            if not out.endswith(allowed_endings):
                if out.endswith(".") or out.endswith("!") or out.endswith("?"):
                    out = out[:-1]
                out = out + "인 것 같아요."
            return out
        except Exception as e:
            print(f"Error calling SSAFY GMS API (daily vision): {e}")
            raise HTTPException(status_code=500, detail=f"LLM daily vision failed: {str(e)}")

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
            "당신은 상대방의 내면 깊은 곳을 꿰뚫어보고 따뜻하게 위로해 주는 뛰어난 직관의 심리 분석가입니다. "
            "피검사자가 그린 그림의 구체적 요소(예: 길게 뻗은 나무, 커다란 지붕 등)를 바탕으로, 그 이면에 숨겨진 피검사자의 성격, 무의식, 정서 상태를 깊이 있게 연결하여 설명해 주세요. "
            "단순히 '지붕이 큽니다'라고 끝내지 말고, '지붕을 크게 그리신 것을 보니 상상력이 매우 풍부하시고 때로는 생각이 많아지시는 편인 것 같아요'처럼 반드시 **[그림에 대한 묘사 + 내면 심리 해석]**이 세트로 이어지도록 작성해야 합니다. "
            "진단명이나 병리적 단어(우울증, 편집증 등)는 절대 사용하지 말고, 다소 어두운 내적 갈등이나 결핍이 발견되더라도 깊이 공감하고 어루만지는 언어를 사용합니다. "
            "마무리는 항상 피검사자가 가진 특별한 강점과 잠재력에 대한 확신을 심어주어 큰 감동과 위로를 받도록 하세요. "
            "반드시 JSON 하나만 출력합니다."
        )

        # 서비스에서 바로 사용 가능한 심층 분석용 스키마
        output_schema = '''출력 JSON 스키마 (반드시 준수):
        {
        "intro": "현재 정서적 기조와 전반적 특성을 요약한 문단 (3~5문장)",
        "coreInsights": [
            "1. [관찰된 그림 특징]이 [가능한 심리적 의미]를 시사합니다.",
            "2. [관찰된 그림 특징]이 [현재의 대처 방식/관계 태도/에너지 상태]와 연결되어 보입니다.",
            "3. ...",
            "4. ..."
        ],
        "strengths": ["강점 1", "강점 2", "강점 3"],
        "questions": ["질문 1", "질문 2", "질문 3", "질문 4", "질문 5"],
        "raw": {
            "wellbeing": {
            "scoreTotal": N,
            "note": "WHO-5와 그림 단서를 함께 고려한 짧은 메모"
            }
        }
        }'''

        guide = prompt_guide_text or (
            "작성 원칙:\n"
            "- 집, 나무, 사람 그림의 시각적 특징을 먼저 관찰하고, 그 다음 가능한 심리적 의미를 연결할 것.\n"
            "- 관찰 없는 해석만 쓰지 말고, 반드시 '무엇이 보였는지'를 먼저 드러낼 것.\n"
            "- 해석은 가능성 수준에서 제시하며, 단정하거나 확정하지 말 것.\n"
            "- 진단명, 병리 라벨, 자극적인 표현은 금지.\n"
            "- 긍정적 단서와 긴장/부담 단서를 균형 있게 함께 다룰 것.\n"
            "- 강점은 반드시 그림 속 근거와 연결하여 제시할 것.\n"
            "- YOLO 탐지 결과는 보조 참고용이며, 탐지 실패를 곧 부재로 단정하지 말 것.\n"
            "- WHO-5 점수는 현재 상태를 이해하는 참고 정보이며, 그림 해석 전체를 대신하지 않음.\n"
            "- 출력은 반드시 JSON 객체 하나만 작성할 것.\n\n"
            + output_schema
        )

        if prompt_guide_text:
            guide = (
                "[참고자료]\n"
                f"{prompt_guide_text}\n\n"
                "[작성 지침]\n"
                "- 참고자료를 활용하되, 해석은 반드시 현재 그림에서 관찰되는 시각적 단서와 연결할 것.\n"
                "- 참고자료의 의미를 기계적으로 적용하지 말고, 실제 이미지와 YOLO 결과를 함께 검토해 판단할 것.\n"
                "- 관찰 가능한 특징을 먼저 서술하고, 그 다음 가능한 심리적 의미를 연결할 것.\n"
                "- 해석은 '가능성', '시사점', '경향' 수준에서 표현하고 단정하지 말 것.\n"
                "- 진단명, 병리적 라벨, 임상적 확정 표현은 금지.\n"
                "- 부정적 측면만 강조하지 말고, 현재의 강점·회복 자원·지지 기반도 함께 제시할 것.\n"
                "- 'intro'는 현재 정서적 기조와 전반적 대처 양식을 요약하는 문단으로 작성할 것.\n"
                "- 'coreInsights'는 그림의 두드러진 특징 3~5가지를 골라, 각 항목마다 '관찰 + 해석' 구조로 작성할 것.\n"
                "- 'questions'는 자기이해를 돕는 개방형 질문으로 구성할 것.\n"
                "- 반드시 JSON 객체 하나만 출력할 것.\n\n"
                "- coreInsights 각 항목은 1~2문장 이내로 작성하고, 첫 문장에는 관찰, 두 번째 문장에는 해석을 배치할 것.\n"
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
                        "text": (
                            "입력된 이미지, YOLO 결과, WELL-BEING 정보를 함께 참고하여 "
                            "HTP 해석 기록안을 작성하세요. "
                            "반드시 그림에서 관찰 가능한 특징을 먼저 언급하고, 그 특징이 시사할 수 있는 정서적 경향, "
                            "대처 방식, 관계 태도, 자기표현 특성을 조심스럽게 해석하세요. "
                            "YOLO 결과는 보조 참고 정보이며, 실제 이미지와 다를 수 있으므로 반드시 이미지와 교차 검토해야 합니다. "
                            "탐지되지 않은 요소를 곧바로 '없음'으로 단정하지 마세요. "
                            "WHO-5 점수는 현재의 웰빙 상태를 이해하는 보조 정보로만 활용하세요. "
                            "결과는 상담 문장이나 위로 편지가 아니라, 전문적인 분석 기록문 형태로 작성하세요. "
                            "intro는 현재 정서적 기조와 전반적인 특성을 3~5문장으로 요약하고, "
                            "coreInsights는 3~5개의 핵심 특징에 대해 각각 '관찰 + 해석' 구조로 작성하세요. "
                            "strengths는 그림에서 드러난 자원과 강점을 근거 기반으로 정리하고, "
                            "questions는 자기이해를 돕는 개방형 질문으로 구성하세요."
                        ),
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
                    max_tokens=3000,
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
