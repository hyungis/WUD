from __future__ import annotations

from pathlib import Path
from typing import List, Set


_RESOURCES_DIR = Path(__file__).resolve().parents[1] / "resources"

_BANNED_TERMS: Set[str] = {
    "정신분열", "정신분열증", "정신지체", "조증", "싸이코패스",
    "동성애", "남근", "자위", "가학", "성기", "환청",
}

_KEYWORDS: dict[str, Set[str]] = {
    "PERSON_IN_RAIN": {
        "사람", "비", "우산", "보호", "스트레스", "대처",
        "크기", "위치", "자세", "표정", "동작", "접지",
        "밀도", "방향", "구름", "번개", "바람", "웅덩이",
        "필압", "음영", "지우기", "선", "여백",
        "찢어진", "뒤집힌", "비옷", "모자",
        "태양", "무지개", "빗줄기", "빗방울",
    },
    "STAR_WAVE": {
        "별", "파도", "균형", "조화", "리듬",
        "크기", "개수", "형태", "위치", "간격",
        "높이", "빈도", "패턴", "방향",
        "뾰족", "부드러운", "곡선", "규칙", "불규칙",
        "상부", "하부", "중간", "공간",
        "필압", "선", "에너지", "채움", "광선",
        "달", "배", "물고기", "새",
    },
}


class DrawingGuideService:
    """
    검사 타입별 해석 가이드 텍스트를 로드하고,
    키워드 기반으로 프롬프트에 포함할 문단을 선별하는 범용 서비스.
    """

    _FILE_MAP: dict[str, str] = {
        "PERSON_IN_RAIN": "person_in_rain_guide.txt",
        "STAR_WAVE": "star_wave_guide.txt",
    }

    def __init__(self) -> None:
        self._cache: dict[str, str] = {}

    def load_text(self, deep_type: str) -> str:
        key = deep_type.upper()
        if key in self._cache:
            return self._cache[key]

        filename = self._FILE_MAP.get(key)
        if not filename:
            return ""

        path = _RESOURCES_DIR / filename
        if not path.exists():
            print(f"[DrawingGuide] guide file not found: {path}")
            return ""

        text = path.read_text(encoding="utf-8", errors="ignore")
        self._cache[key] = text
        return text

    @staticmethod
    def _split_paragraphs(text: str) -> List[str]:
        lines = [ln.rstrip() for ln in text.splitlines()]
        paras: List[str] = []
        buf: List[str] = []
        for ln in lines:
            if ln.strip() == "":
                if buf:
                    paras.append("\n".join(buf).strip())
                    buf = []
                continue
            buf.append(ln)
        if buf:
            paras.append("\n".join(buf).strip())
        return [p for p in paras if p]

    def build_prompt_context(
        self,
        deep_type: str,
        *,
        max_chars: int = 4500,
    ) -> str:
        text = self.load_text(deep_type)
        if not text:
            return ""

        paras = self._split_paragraphs(text)
        keywords = _KEYWORDS.get(deep_type.upper(), set())

        scored: List[tuple[int, str]] = []
        for p in paras:
            if any(t in p for t in _BANNED_TERMS):
                continue
            score = sum(1 for kw in keywords if kw and kw in p)
            if p[0].isdigit() or "해석" in p[:20] or "원칙" in p[:20]:
                score += 2
            if score > 0:
                scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)

        picked: List[str] = []
        used = 0
        for _, p in scored:
            add_len = len(p) + 2
            if used + add_len > max_chars:
                break
            picked.append(p)
            used += add_len

        return "\n\n".join(picked).strip()


drawing_guide_service = DrawingGuideService()
