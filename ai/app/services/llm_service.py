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
            "당신은 그림(시각적 단서)을 바탕으로 심리적 내면 상태를 추론하는 분석가입니다. "
            "톤은 밝고 에너지 있게, 하지만 과장하거나 감정적으로 위로하지는 마세요. "
            "반드시 그림의 구체 단서(색감/구도/여백/선의 강약/대상 배치 등) 1가지를 근거로, "
            "사용자의 내면 상태를 '가능성/해석' 형태로 조심스럽게 제시하세요. "
            "진단명·병리 라벨(우울증, 불안장애 등)과 단정적 표현(반드시/확실히)은 금지합니다. "
            "출력은 한국어 한 문장으로만 작성하세요. "
            "문장 끝은 반드시 다음 중 하나로 끝내세요: "
            "'인 것 같아요.' / '한 듯해요.' / '해 보이네요.' / '느껴져요.' / '보여요.'. "
            "'읽혀요'는 사용하지 마세요."
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
        "intro": "현재 정서적 상태와 무의식적 기조를 요약한 핵심 문단 (3~5문장)",
        "coreInsights": [
            "1. [집/나무/사람 특징 묘사]는 [세부 심리적 묘사와 상징]을 나타냄.",
            "2. [다른 특징 묘사]는 [세부 심리 및 현재 상태]를 시사함.",
            "3. ...",
            "4. ..."
        ],
        "strengths": ["강점 1", "강점 2", "강점 3"],
        "questions": ["질문 1", "질문 2", "질문 3", "질문 4", "질문 5"],
        "raw": {
            "wellbeing": {"scoreTotal": N, "note": "점수와 그림을 연결한 짧은 메모"}
        }
        }'''

        guide = prompt_guide_text or (
            "규칙:\n"
            "- 그림에 나타난 특징(형태, 크기 등)을 언급하고, 그것이 의미하는 심리적 상태를 이어서 설명할 것 (예: '튼튼한 나무 뿌리를 그려주신 것을 보니 내면의 기반이 탄탄하시군요').\n"
            "- 내담자가 '내 그림에 이런 깊은 뜻이 있었구나'라고 스스로를 이해할 수 있도록 도와주는 전문적인 해설자가 될 것.\n"
            "- 다소 부정적이거나 상처받은 단서(결핍, 방어, 소진 등)가 그림에 나타나면, 이를 조심스럽게 언급하며 공감하고 다독이는 어투를 사용할 것.\n"
            "- 진단명이나 병리적 라벨링 절대 금지. 완곡하고 문학적인 표현 사용.\n"
            "- 집=가정/안정감, 나무=자아/에너지, 사람=관계/현실자아의 상징을 활용하여 친절하게 풀어줄 것.\n"
            "- JSON만 출력하세요.\n"
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
                "- 'intro'는 현재 내담자의 정서적 기조를 통찰력 있게 짚어내는 문단으로 작성한다.\n"
                "- 'coreInsights'는 그림의 두드러진 특징 3~5가지를 뽑아 그 심리적/무의식적 의미를 1~2문장으로 압축하여 배열한다.\n"
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
                        "text": (
                            "입력된 이미지 분석 결과와 HTP 가이드를 바탕으로, 그림 단서와 피검사자의 심리를 깊이 있게 연결하는 통찰력 있는 리포트를 작성하세요. "
                            "결과물은 질문자에게 직접 건네는 편지나 조언 단위가 아닌, **전문적인 심리 분석 기록안** 형태로 작성하세요. "
                            "intro 부분에는 '현재 정서적으로 ... 반영되어 있습니다.' 같이 내담자의 현재 무의식, 갈등 상황, 스트레스, 그리고 강점을 통찰력 있게 서술하세요. "
                            "coreInsights 배열에는 그림에서 나타나는 구체적인 형태(예: 선명한 선, 창문 부재, 잎이 없는 나무 등)를 먼저 언급하고, 그것이 상징하는 심리적 기제나 현실 대처 방식을 명확하게 설명하세요. 총 3~5개의 핵심 인사이트를 도출해야 합니다. "
                            "마지막으로 WHO-5 웰빙 점수와 종합하여 전체 흐름을 일관성 있게 맞추세요."
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
