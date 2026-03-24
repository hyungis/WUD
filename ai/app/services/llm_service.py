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
        max_side = 480
        jpeg_quality = 60

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
        image_path: str | None = None,
    ) -> str:
        """
        Daily 이미지(멀티모달) + 감정/텍스트를 기반으로
        그림 단서를 근거로 사용자의 '내면 상태'를 추론한 한 문장 피드백을 생성합니다.
        """
        if not image_path:
            raise HTTPException(status_code=400, detail="image_path is required")

        client = self._get_client()
        model_name = (settings.gms_model or "").strip() or "gpt-4o"

        # 데일리 피드백은 LLM이 생성한 문장을 최대한 그대로 사용합니다.
        # (접미사 자동 추가 로직을 제거해서 `인 것 같아요` 중복 문제를 근본적으로 방지)

        developer_prompt = (
            "당신은 사용자가 그린 데일리 그림(만다라, 컬러링, 자유그림 등)을 보고 "
            "그림 단서를 근거로 내면 상태를 추론하여 한 문장 피드백을 작성하는 분석가입니다. "
            "그림의 색감, 선의 특성, 여백, 패턴 등 시각적 단서를 관찰하고, "
            "그 단서가 시사할 수 있는 감정 상태나 심리적 경향을 조심스럽게 연결합니다. "
            "단정적 표현, 진단명, 병리적 라벨은 절대 사용하지 않습니다. "
            "출력은 반드시 한 문장의 자연스러운 한국어 텍스트로, JSON이 아닌 평문으로 작성합니다."
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

        type_focus_instruction = ""
        if daily_type_norm == "COLORING":
            type_focus_instruction = (
                "특히 이 그림은 명화 색칠하기(COLORING)이므로 형태 해석보다 색채 해석을 우선하세요. "
                "사용된 주요 색의 조합, 따뜻한/차가운 색의 비율, 밝기 대비, 채도, 반복되는 색 패턴을 근거로 "
                "감정 상태와 정서적 결을 연결해 설명하세요."
            )
        elif daily_type_norm == "MANDALA":
            type_focus_instruction = (
                "이 그림은 만다라(MANDALA)이므로 대칭성, 반복 리듬, 색의 균형과 분포를 근거로 "
                "정서적 안정감과 내면 정돈 상태를 조심스럽게 해석하세요."
            )
        elif daily_type_norm == "FREE":
            type_focus_instruction = (
                "이 그림은 자유그림(FREE)이므로 선과 면의 흐름, 색의 선택과 강조 지점을 함께 보며 "
                "감정의 방향성과 에너지 상태를 조심스럽게 해석하세요."
            )

        if type_focus_instruction:
            text_parts.append({"type": "text", "text": f"typeFocus: {type_focus_instruction}"})

        text_parts.append(
            {
                "type": "text",
                "text": (
                    "아래 이미지(그림)를 보고, 위 정보(있다면)까지 함께 고려해 "
                    "그림 단서를 근거로 사용자의 내면 상태를 '추론'한 분석을 한 문장으로 작성해 주세요. "
                    "예: 색이 밝고 여백이 넓어, 안정 속에서 자기표현을 해보고 싶은 마음이 느껴져요. "
                    "이모지/따옴표/번호는 사용하지 말고, 끝맺음은 반드시 "
                    "'인 것 같아요.' / '한 듯해요.' / '해 보이네요.' / '느껴져요.' / '보여요.' 중 하나로 해주세요."
                ),
            }
        )

        content_parts: List[Dict[str, Any]] = list(text_parts)
        data_url = self._file_to_data_url(image_path)
        content_parts.append({"type": "image_url", "image_url": {"url": data_url}})

        try:
            print("[LLM] Requesting SSAFY GMS(OpenAI SDK) for daily vision feedback...")
            resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "developer", "content": developer_prompt},
                    {"role": "user", "content": content_parts},
                ],
                temperature=0.6,
                max_tokens=120,
            )
            print(f"[LLM] Daily response received. usage={resp.usage}")
            out = (resp.choices[0].message.content or "").strip()
            # Keep it single-line/single-sentence-ish for the backend.
            out = " ".join(out.split())
            if not out:
                raise ValueError("Empty LLM content")
            # Only format cleanup: keep it single-line and trim.
            out = out.strip()
            return out
        except Exception as e:
            print(f"[LLM] Error calling SSAFY GMS API (daily vision): {e}")
            raise HTTPException(status_code=500, detail=f"LLM daily vision failed: {str(e)}")

    def analyze_htp(
        self,
        *,
        session_id: int,
        who5: Dict[str, Any] | None,
        spane: Dict[str, Any] | None = None,
        yolo: Dict[str, Any],
        image_paths: Dict[str, str] | None = None,
        prompt_guide_text: Optional[str] = None,
        cv_features: Dict[str, Any] | None = None,
        cross_image_features: Dict[str, Any] | None = None,
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
            "마무리는 피검사자가 가진 강점과 회복 자원을 근거 기반으로 짧게 정리하세요. "
            "WHO-5는 전반적인 심리적 웰빙 수준을, SPANE는 최근 긍정·부정 정서 경험의 균형을 나타냅니다. "
            "SPANE Balance(scoreBalance = scorePositive − scoreNegative)가 양수이면 긍정 정서 경험이 우세하고, 음수이면 부정 정서 경험이 우세합니다. "
            "두 설문은 그림 해석의 보조 맥락으로만 활용하고, 점수만으로 해석을 주도하지 마세요. "
            "반드시 JSON 하나만 출력합니다."
        )

        # 서비스에서 바로 사용 가능한 심층 분석용 스키마
        output_schema = '''출력 JSON 스키마 (반드시 준수):
        {
        "intro": "현재 정서적 기조와 전반적 특성을 요약한 문단 (3~5문장)",
        "coreInsights": [
            {
            "observation": "그림에서 관찰되는 구체 단서 1문장",
            "interpretation": "단정하지 않는 심리 해석 1문장"
            },
            {
            "observation": "...",
            "interpretation": "..."
            }
        ],
        "strengths": ["강점 1", "강점 2", "강점 3"],
        "questions": ["질문 1", "질문 2", "질문 3", "질문 4", "질문 5"],
        "raw": {
            "wellbeing": {
            "who5ScoreTotal": N,
            "spanePositive": N,
            "spaneNegative": N,
            "spaneBalance": N,
            "note": "WHO-5·SPANE과 그림 단서를 함께 고려한 짧은 메모"
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
            "- WHO-5 점수는 전반적 웰빙 수준을, SPANE은 최근 긍정·부정 정서 경험의 균형을 나타내는 참고 정보이며, 그림 해석 전체를 대신하지 않음.\n"
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
                "- WHO-5와 SPANE 점수는 보조 맥락으로만 활용하고, 점수만으로 해석을 끌고 가지 말 것.\n"
                "- 'intro'는 현재 정서적 기조와 전반적 대처 양식을 요약하는 문단으로 작성할 것.\n"
                "- 'coreInsights'는 3~5개 항목으로, 각 항목을 {observation, interpretation} 객체로 작성할 것.\n"
                "- intro의 핵심 판단(예: 긴장, 스트레스, 회복력, 위축 등)은 반드시 coreInsights 항목에서 근거가 확인되어야 함.\n"
                "- intro에 쓴 판단이 coreInsights에 없으면 해당 판단을 intro에서 제거하거나 coreInsights에 근거 항목을 추가할 것.\n"
                "- 'questions'는 자기이해를 돕는 개방형 질문으로 구성할 것.\n"
                "- 반드시 JSON 객체 하나만 출력할 것.\n\n"
                "- observation은 관찰 사실 중심, interpretation은 가능성 표현 중심으로 작성할 것.\n"
                + output_schema
            )

        # 멀티모달 user message content
        def build_user_content(
            *,
            include_guide: bool,
            include_wellbeing_raw: bool,
            cv_feats: Dict[str, Any] | None = None,
        ) -> List[Dict[str, Any]]:
            wellbeing = None
            if who5:
                wellbeing = {"scoreTotal": who5.get("scoreTotal")}
                if include_wellbeing_raw:
                    wellbeing["raw"] = who5.get("raw")

            spane_survey = None
            if spane:
                spane_survey = {
                    "scorePositive": spane.get("scorePositive"),
                    "scoreNegative": spane.get("scoreNegative"),
                    "scoreBalance": spane.get("scoreBalance"),
                }
                if include_wellbeing_raw:
                    spane_survey["raw"] = spane.get("raw")

            parts: List[Dict[str, Any]] = [
                {"type": "text", "text": f"sessionId: {session_id}"},
            ]
            if include_guide:
                parts.append({"type": "text", "text": guide})
            parts.extend(
                [
                    {"type": "text", "text": "입력 데이터(구조화):"},
                ]
            )
            if wellbeing is not None:
                parts.append({"type": "text", "text": f"WHO5_survey: {wellbeing}"})
            if spane_survey:
                parts.append({"type": "text", "text": f"SPANE_survey: {spane_survey}"})
            yolo_compact = {
                "summary": yolo.get("summary"),
                "classTaxonomy": yolo.get("classTaxonomy"),
            }
            parts.append({"type": "text", "text": f"YOLO: {yolo_compact}"})
            if cv_feats:
                cv_compact = {}
                for cv_key, cv_val in cv_feats.items():
                    if isinstance(cv_val, dict):
                        cv_compact[cv_key] = {
                            "interpretableFeatures": cv_val.get("interpretableFeatures", {}),
                            "strokeFeatures": cv_val.get("strokeFeatures", {}),
                            "colorFeatures": cv_val.get("colorFeatures", {}),
                        }
                parts.append({"type": "text", "text": f"CV_FEATURES: {cv_compact}"})
            if cross_image_features:
                parts.append({"type": "text", "text": f"CROSS_IMAGE_FEATURES: {cross_image_features}"})
            parts.append(
                {
                    "type": "text",
                    "text": (
                        "[미니 예시 1]\n"
                        "입력 단서: house.strokeFeatures.pressureConsistency=inconsistent, "
                        "house.strokeFeatures.overdrawRatio=0.18\n"
                        "좋은 insight 예시:\n"
                        "{\"observation\":\"집 선 두께의 변동이 크고 일부 구간에서 덧칠이 반복됩니다.\","
                        "\"interpretation\":\"최근 부담이 커지며 긴장을 조절하려는 노력이 함께 나타나는 흐름일 수 있습니다.\"}\n\n"
                        "[미니 예시 2]\n"
                        "입력 단서: person.colorFeatures.warmCoolBalance=warm, cross.styleConsistency.overall=low\n"
                        "좋은 insight 예시:\n"
                        "{\"observation\":\"인물 그림은 따뜻한 색 비중이 높고, 세 그림의 스타일 일관성은 낮게 나타납니다.\","
                        "\"interpretation\":\"정서 표현 욕구는 뚜렷하지만 상황별로 에너지 배분이 달라질 수 있음을 시사합니다.\"}"
                    ),
                }
            )
            parts.append(
                {
                    "type": "text",
                    "text": (
                        "중요: 실제로 입력된 설문만 언급하세요. "
                        "WHO-5가 없으면 WHO-5를 추정하거나 언급하지 말고, "
                        "SPANE이 없으면 SPANE 점수/해석을 절대 생성하지 마세요."
                    ),
                }
            )
            parts.append(
                {
                    "type": "text",
                    "text": (
                        "입력된 이미지, YOLO 결과, WHO-5·SPANE 설문 정보를 함께 참고하여 HTP 해석 기록안을 작성하세요. "
                        "반드시 그림에서 관찰 가능한 특징을 먼저 언급하고, 그 특징이 시사할 수 있는 정서적 경향, "
                        "대처 방식, 관계 태도, 자기표현 특성을 조심스럽게 해석하세요. "
                        "YOLO 결과는 보조 참고 정보이며, 실제 이미지와 다를 수 있으므로 반드시 이미지와 교차 검토해야 합니다. "
                        "탐지되지 않은 요소를 곧바로 '없음'으로 단정하지 마세요. "
                        "CV_FEATURES가 제공된 경우 다음 정보를 적극 활용하세요: "
                        "(1) globalFeatures — 그림의 전체 크기, 위치 편향, 잉크 비율 등 전역 특성, "
                        "(2) strokeFeatures — 필압 분석(평균 선 두께, 선 두께 일관성, 덧칠 비율). "
                        "strokeWidthLevel(thin/medium/thick)은 에너지·의지 수준을, "
                        "pressureConsistency(consistent/moderate/inconsistent)는 정서적 안정성을, "
                        "overdrawRatio는 완벽주의적 긴장이나 불안의 근거로 활용하세요. "
                        "(3) colorFeatures — 색상 사용 여부(isMonochrome), 주요 색상(dominantColors), 따뜻한/차가운 색 균형(warmCoolBalance). "
                        "색상이 있다면 정서적 표현 경향의 근거로 활용하세요. "
                        "CROSS_IMAGE_FEATURES가 제공된 경우 세 그림(집·나무·사람) 간 비교 정보를 활용하세요: "
                        "sizeComparison로 각 그림의 상대적 크기를, inkDensity로 표현 밀도 차이를, "
                        "styleConsistency로 전체 스타일 일관성을, energyProgression으로 "
                        "집→나무→사람 순서에 따른 에너지 변화 추이를 해석에 반영하세요. "
                        "WHO-5 점수는 전반적 웰빙 수준을, SPANE 점수는 최근 긍정·부정 정서 경험의 균형을 이해하는 보조 정보로 활용하세요. "
                        "두 설문 점수만으로 전체 해석을 주도하지 말고, 그림의 시각적 단서와 교차하여 맥락적으로 참고하세요. "
                        "결과는 상담 문장이나 위로 편지가 아니라, 전문적인 분석 기록문 형태로 작성하세요. "
                        "intro는 현재 정서적 기조와 전반적인 특성을 3~5문장으로 요약하고, "
                        "coreInsights는 3~5개의 핵심 특징에 대해 {observation, interpretation} 구조로 작성하세요. "
                        "intro의 핵심 판단은 반드시 coreInsights에서 근거가 확인되도록 맞추세요. "
                        "strengths는 그림에서 드러난 자원과 강점을 근거 기반으로 정리하고, "
                        "questions는 자기이해를 돕는 개방형 질문으로 구성하세요."
                    ),
                }
            )
            return parts

        content: List[Dict[str, Any]] = build_user_content(
            include_guide=True, include_wellbeing_raw=True, cv_feats=cv_features
        )

        def attach_images(parts: List[Dict[str, Any]]) -> None:
            for key in ("house", "tree", "person"):
                path = (image_paths or {}).get(key)
                if not path:
                    continue
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

            print("[LLM] Requesting SSAFY GMS(OpenAI SDK) for HTP analysis...")
            resp = request_once(content)
            print(f"[LLM] HTP response received. finish_reason={resp.choices[0].finish_reason}, "
                  f"usage={resp.usage}")

            choice0 = resp.choices[0]
            msg0 = choice0.message
            content_text = msg0.content or ""
            refusal = getattr(msg0, "refusal", None)
            if refusal:
                print("[LLM] Refusal received. Retrying with simplified prompt.")
                simplified = build_user_content(
                    include_guide=False, include_wellbeing_raw=False, cv_feats=cv_features
                )
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
                parsed = json.loads(content_text)
                print(f"[LLM] HTP JSON parsed OK. keys={list(parsed.keys())}")
                return parsed
            except Exception:
                print("[LLM] JSON parse failed. Raw content (truncated):")
                print((content_text or "")[:800])
                start = content_text.find("{")
                end = content_text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    return json.loads(content_text[start : end + 1])
                raise
        except Exception as e:
            print(f"[LLM] Error calling SSAFY GMS API: {e}")
            raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")

    # ------------------------------------------------------------------
    # PERSON_IN_RAIN / STAR_WAVE  (LLM-only, single image)
    # ------------------------------------------------------------------

    _SINGLE_IMAGE_OUTPUT_SCHEMA = '''출력 JSON 스키마 (반드시 준수):
{
  "intro": "현재 정서적 기조와 전반적 특성을 요약한 문단 (3~5문장)",
  "coreInsights": [
    {
      "observation": "그림에서 관찰되는 구체 단서 1문장",
      "interpretation": "단정하지 않는 심리 해석 1문장"
    },
    {
      "observation": "...",
      "interpretation": "..."
    }
  ],
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "questions": ["질문 1", "질문 2", "질문 3", "질문 4", "질문 5"],
  "raw": {
    "wellbeing": {
      "who5ScoreTotal": N,
      "spanePositive": N,
      "spaneNegative": N,
      "spaneBalance": N,
      "note": "WHO-5·SPANE과 그림 단서를 함께 고려한 짧은 메모"
    }
  }
}'''

    def _analyze_single_image(
        self,
        *,
        session_id: int,
        who5: Dict[str, Any] | None,
        spane: Dict[str, Any] | None,
        image_path: str | None,
        developer_prompt: str,
        user_instruction: str,
        guide_text: str,
        log_label: str,
    ) -> Dict[str, Any]:
        """PERSON_IN_RAIN / STAR_WAVE 공통 LLM 호출 로직."""
        import json

        client = self._get_client()
        model_name = (settings.gms_model or "").strip() or "gpt-4o"

        wellbeing: Dict[str, Any] | None = None
        if who5:
            wellbeing = {"scoreTotal": who5.get("scoreTotal"), "raw": who5.get("raw")}
        spane_survey: Dict[str, Any] | None = None
        if spane:
            spane_survey = {
                "scorePositive": spane.get("scorePositive"),
                "scoreNegative": spane.get("scoreNegative"),
                "scoreBalance": spane.get("scoreBalance"),
                "raw": spane.get("raw"),
            }

        parts: List[Dict[str, Any]] = [
            {"type": "text", "text": f"sessionId: {session_id}"},
        ]

        if guide_text:
            parts.append({
                "type": "text",
                "text": (
                    f"[참고자료]\n{guide_text}\n\n"
                    "[작성 지침]\n"
                    "- 참고자료를 활용하되, 해석은 반드시 현재 그림에서 관찰되는 시각적 단서와 연결할 것.\n"
                    "- 참고자료의 의미를 기계적으로 적용하지 말고, 실제 이미지를 관찰해 판단할 것.\n"
                    "- 관찰 가능한 특징을 먼저 서술하고, 그 다음 가능한 심리적 의미를 연결할 것.\n"
                    "- 해석은 '가능성', '시사점', '경향' 수준에서 표현하고 단정하지 말 것.\n"
                    "- 진단명, 병리적 라벨, 임상적 확정 표현은 금지.\n"
                    "- 부정적 측면만 강조하지 말고, 현재의 강점·회복 자원·지지 기반도 함께 제시할 것.\n"
                    "- WHO-5와 SPANE 점수는 보조 맥락으로만 활용하고, 점수만으로 해석을 끌고 가지 말 것.\n"
                    "- 'intro'는 현재 정서적 기조와 전반적 특성을 3~5문장으로 요약할 것.\n"
                    "- 'coreInsights'는 3~5개 항목으로, 각 항목을 {observation, interpretation} 객체로 작성할 것.\n"
                    "- intro의 핵심 판단(예: 긴장, 스트레스, 회복력, 위축 등)은 반드시 coreInsights 항목에서 근거가 확인되어야 함.\n"
                    "- intro에 쓴 판단이 coreInsights에 없으면 해당 판단을 intro에서 제거하거나 coreInsights에 근거 항목을 추가할 것.\n"
                    "- 'questions'는 자기이해를 돕는 개방형 질문으로 구성할 것.\n"
                    "- observation은 관찰 사실 중심, interpretation은 가능성 표현 중심으로 작성할 것.\n"
                    "- 반드시 JSON 객체 하나만 출력할 것.\n\n"
                    + self._SINGLE_IMAGE_OUTPUT_SCHEMA
                ),
            })

        parts.extend([
            {"type": "text", "text": "입력 데이터(구조화):"},
        ])
        if wellbeing is not None:
            parts.append({"type": "text", "text": f"WHO5_survey: {wellbeing}"})
        if spane_survey:
            parts.append({"type": "text", "text": f"SPANE_survey: {spane_survey}"})
        parts.append({
            "type": "text",
            "text": (
                "중요: 실제로 입력된 설문만 언급하세요. "
                "WHO-5가 없으면 WHO-5를 추정하거나 언급하지 말고, "
                "SPANE이 없으면 SPANE 점수/해석을 절대 생성하지 마세요."
            ),
        })

        parts.append({"type": "text", "text": user_instruction})

        if image_path:
            data_url = self._file_to_data_url(image_path)
            parts.append({"type": "text", "text": "drawing image:"})
            parts.append({"type": "image_url", "image_url": {"url": data_url}})

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

        try:
            print(f"[LLM] Requesting SSAFY GMS(OpenAI SDK) for {log_label} analysis...")
            resp = request_once(parts)
            print(f"[LLM] {log_label} response received. finish_reason={resp.choices[0].finish_reason}, "
                  f"usage={resp.usage}")

            choice0 = resp.choices[0]
            msg0 = choice0.message
            content_text = msg0.content or ""
            refusal = getattr(msg0, "refusal", None)

            if refusal:
                print(f"[LLM] Refusal received for {log_label}. Retrying without guide.")
                no_guide_parts = [p for p in parts if "[참고자료]" not in (p.get("text") or "")]
                resp = request_once(no_guide_parts)
                choice0 = resp.choices[0]
                msg0 = choice0.message
                content_text = msg0.content or ""

            if not content_text.strip():
                print(f"[LLM] Empty content returned for {log_label}.")
                raise ValueError("Empty LLM content")

            try:
                parsed = json.loads(content_text)
                print(f"[LLM] {log_label} JSON parsed OK. keys={list(parsed.keys())}")
                return parsed
            except Exception:
                print(f"[LLM] JSON parse failed for {log_label}. Raw (truncated):")
                print((content_text or "")[:800])
                start = content_text.find("{")
                end = content_text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    return json.loads(content_text[start : end + 1])
                raise
        except Exception as e:
            print(f"[LLM] Error calling SSAFY GMS API ({log_label}): {e}")
            raise HTTPException(status_code=500, detail=f"LLM {log_label} analysis failed: {str(e)}")

    def analyze_person_in_rain(
        self,
        *,
        session_id: int,
        who5: Dict[str, Any] | None,
        spane: Dict[str, Any] | None = None,
        image_path: str | None = None,
        prompt_guide_text: str = "",
    ) -> Dict[str, Any]:
        """빗속의 사람 그림검사 분석 (이미지 1장, LLM only)."""
        developer_prompt = (
            "당신은 투사적 그림검사 중 '빗속의 사람(Person-In-The-Rain)' 검사 전문 분석가입니다. "
            "피검사자가 그린 그림의 구체적 요소(예: 비의 양과 방향, 우산의 유무와 크기, 사람의 자세와 표정 등)를 바탕으로, "
            "그 이면에 숨겨진 피검사자의 스트레스 인식, 대처 방식, 정서 상태를 깊이 있게 연결하여 설명해 주세요. "
            "단순히 '비가 많습니다'라고 끝내지 말고, '비가 촘촘하게 그려진 것을 보니 현재 체감하는 스트레스가 상당할 수 있으며, "
            "그럼에도 사람이 정면을 향해 서 있는 모습에서 상황에 직면하려는 내면의 힘이 느껴집니다'처럼 "
            "반드시 **[그림에 대한 묘사 + 내면 심리 해석]**이 세트로 이어지도록 작성해야 합니다. "
            "비는 외부 스트레스를, 사람은 자아를, 보호 수단(우산 등)은 대처 자원을 상징합니다. "
            "진단명이나 병리적 단어(우울증, 편집증 등)는 절대 사용하지 말고, "
            "다소 어두운 내적 갈등이나 취약함이 발견되더라도 깊이 공감하고 어루만지는 언어를 사용합니다. "
            "마무리는 피검사자가 가진 강점과 회복 자원을 근거 기반으로 짧게 정리하세요. "
            "WHO-5는 전반적인 심리적 웰빙 수준을, SPANE는 최근 긍정·부정 정서 경험의 균형을 나타냅니다. "
            "두 설문은 그림 해석의 보조 맥락으로만 활용하고, 점수만으로 해석을 주도하지 마세요. "
            "반드시 JSON 하나만 출력합니다."
        )
        user_instruction = (
            "입력된 이미지와 WHO-5·SPANE 설문 정보를 함께 참고하여 '빗속의 사람' 해석 기록안을 작성하세요. "
            "반드시 그림에서 관찰 가능한 특징을 먼저 언급하고, 그 특징이 시사할 수 있는 "
            "스트레스 인식 수준, 대처 자원과 방식, 정서적 회복력, 자기상(self-image)을 조심스럽게 해석하세요. "
            "WHO-5 점수는 전반적 웰빙 수준을, SPANE 점수는 최근 긍정·부정 정서 경험의 균형을 이해하는 보조 정보로 활용하세요. "
            "결과는 전문적인 분석 기록문 형태로 작성하세요. "
            "intro는 현재 정서적 기조와 스트레스 대처 양식을 3~5문장으로 요약하고, "
            "coreInsights는 3~5개의 핵심 특징에 대해 {observation, interpretation} 구조로 작성하세요. "
            "intro의 핵심 판단은 반드시 coreInsights에서 근거가 확인되도록 맞추세요. "
            "strengths는 그림에서 드러난 자원과 강점을 근거 기반으로 정리하고, "
            "questions는 자기이해를 돕는 개방형 질문으로 구성하세요."
        )
        return self._analyze_single_image(
            session_id=session_id,
            who5=who5,
            spane=spane,
            image_path=image_path,
            developer_prompt=developer_prompt,
            user_instruction=user_instruction,
            guide_text=prompt_guide_text,
            log_label="PERSON_IN_RAIN",
        )

    def analyze_star_wave(
        self,
        *,
        session_id: int,
        who5: Dict[str, Any] | None,
        spane: Dict[str, Any] | None = None,
        image_path: str | None = None,
        prompt_guide_text: str = "",
    ) -> Dict[str, Any]:
        """별-파도 그림검사 분석 (이미지 1장, LLM only)."""
        developer_prompt = (
            "당신은 투사적 그림검사 중 '별-파도(Star-Wave Test)' 검사 전문 분석가입니다. "
            "피검사자가 그린 그림의 구체적 요소(예: 별의 크기·개수·배치, 파도의 높이·패턴·리듬, 별과 파도 사이 공간 등)를 바탕으로, "
            "그 이면에 숨겨진 피검사자의 내면 상태, 정서적 리듬, 의식과 무의식의 균형을 깊이 있게 연결하여 설명해 주세요. "
            "단순히 '파도가 높습니다'라고 끝내지 말고, '파도가 높고 역동적으로 그려진 것을 보니 현재 감정의 에너지가 활발하며, "
            "내면에서 다양한 감정이 솟구치고 있을 수 있습니다'처럼 "
            "반드시 **[그림에 대한 묘사 + 내면 심리 해석]**이 세트로 이어지도록 작성해야 합니다. "
            "별은 이상·희망·의식 세계를, 파도는 감정·무의식·내면의 움직임을 상징합니다. "
            "상부 공간(별)과 하부 공간(파도)의 에너지 분배와 균형이 해석의 핵심입니다. "
            "진단명이나 병리적 단어(우울증, 편집증 등)는 절대 사용하지 말고, "
            "다소 어두운 내적 갈등이나 불균형이 발견되더라도 깊이 공감하고 어루만지는 언어를 사용합니다. "
            "마무리는 피검사자가 가진 강점과 회복 자원을 근거 기반으로 짧게 정리하세요. "
            "WHO-5는 전반적인 심리적 웰빙 수준을, SPANE는 최근 긍정·부정 정서 경험의 균형을 나타냅니다. "
            "두 설문은 그림 해석의 보조 맥락으로만 활용하고, 점수만으로 해석을 주도하지 마세요. "
            "반드시 JSON 하나만 출력합니다."
        )
        user_instruction = (
            "입력된 이미지와 WHO-5·SPANE 설문 정보를 함께 참고하여 '별-파도 검사' 해석 기록안을 작성하세요. "
            "반드시 그림에서 관찰 가능한 특징을 먼저 언급하고, 그 특징이 시사할 수 있는 "
            "내면의 정서적 리듬, 이상과 감정의 균형, 에너지 상태, 의식과 무의식의 관계를 조심스럽게 해석하세요. "
            "WHO-5 점수는 전반적 웰빙 수준을, SPANE 점수는 최근 긍정·부정 정서 경험의 균형을 이해하는 보조 정보로 활용하세요. "
            "결과는 전문적인 분석 기록문 형태로 작성하세요. "
            "intro는 현재 정서적 기조와 내면 리듬의 특성을 3~5문장으로 요약하고, "
            "coreInsights는 3~5개의 핵심 특징에 대해 {observation, interpretation} 구조로 작성하세요. "
            "intro의 핵심 판단은 반드시 coreInsights에서 근거가 확인되도록 맞추세요. "
            "strengths는 그림에서 드러난 자원과 강점을 근거 기반으로 정리하고, "
            "questions는 자기이해를 돕는 개방형 질문으로 구성하세요."
        )
        return self._analyze_single_image(
            session_id=session_id,
            who5=who5,
            spane=spane,
            image_path=image_path,
            developer_prompt=developer_prompt,
            user_instruction=user_instruction,
            guide_text=prompt_guide_text,
            log_label="STAR_WAVE",
        )

llm_service = LLMService()
