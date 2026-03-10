from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Set


class HtpGuideService:
    """
    Lightweight (non-embedding) retriever for the local HTP guide text.
    - Uses keyword-based paragraph extraction.
    - Keeps prompt size bounded.
    """

    def __init__(self) -> None:
        self._text: str | None = None

    def load_text(self) -> str:
        if self._text is not None:
            return self._text

        guide_path = Path(__file__).resolve().parents[1] / "resources" / "htp_guide.txt"
        self._text = guide_path.read_text(encoding="utf-8", errors="ignore")
        return self._text

    @staticmethod
    def _split_paragraphs(text: str) -> List[str]:
        # Normalize and split by blank lines
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

    @staticmethod
    def _banned_terms() -> Set[str]:
        # Terms likely to trigger policy refusal or are inappropriate for user-facing output.
        return {
            "HTP", "투사검사", "검사", "심리", "진단",
            "정신분열", "정신분열증", "정신지체", "조증", "싸이코패스",
            "동성애", "남근", "자위", "가학", "성기",
            "환청",
        }

    @staticmethod
    def _collect_keywords() -> Set[str]:
        # High-signal HTP tokens (Korean headings + common parts)
        return {
            "사람", "인물", "머리", "얼굴", "눈", "눈썹", "코", "입", "치아", "턱", "귀", "목",
            "손", "팔", "주먹", "몸통", "발", "발가락", "다리", "유방", "어깨", "허리", "엉덩이",
            "의복", "단추", "주머니", "넥타이", "허리띠", "악세사리",
            "집", "지붕", "벽", "문", "창문", "굴뚝", "연기",
            # House model class list (YOLO)
            "집전체", "창문굴뚝", "길", "울타리", "잔디", "꽃", "태양", "산", "연못",
            "나무", "상록수", "낙엽수", "버드나무", "줄기", "수피", "가지", "수관", "뿌리",
            # Tree model class list (YOLO)
            "나무전체", "나뭇잎", "열매", "구름", "달", "별", "새", "동물",
            # Person model class list (YOLO)
            "사람전체", "머리카락", "상체", "손", "다리", "발", "옷세부", "신발",
            "크기", "위치", "필압", "스트로크", "지우기", "생략", "왜곡", "음영", "X-레이", "투시",
        }

    def build_prompt_context(
        self,
        *,
        requested_sections: Iterable[str] = ("house", "tree", "person"),
        extra_keywords: Iterable[str] = (),
        max_chars: int = 4500,
    ) -> str:
        text = self.load_text()
        paras = self._split_paragraphs(text)

        keywords = set(self._collect_keywords())
        keywords.update({k.strip() for k in extra_keywords if k and k.strip()})

        # Map section -> section keywords
        section_kw = {
            "house": {"집", "지붕", "벽", "문", "창문", "굴뚝", "연기"},
            "tree": {"나무", "줄기", "수피", "가지", "수관", "뿌리", "상록수", "낙엽수", "버드나무"},
            "person": {"사람", "인물", "머리", "얼굴", "눈", "코", "입", "목", "손", "팔", "몸통", "발", "다리", "의복"},
            "global": {"크기", "위치", "필압", "스트로크", "지우기", "생략", "왜곡", "음영"},
        }

        wanted = set()
        for sec in requested_sections:
            wanted |= section_kw.get(sec, set())
        wanted |= section_kw["global"]
        wanted |= keywords

        picked: List[str] = []
        used = 0

        def try_add(p: str) -> None:
            nonlocal used
            if p in picked:
                return
            add_len = len(p) + 2
            if used + add_len > max_chars:
                return
            picked.append(p)
            used += add_len

        banned = self._banned_terms()

        # Prefer paragraphs that look like headings or contain multiple keywords
        scored: List[tuple[int, str]] = []
        for p in paras:
            # Drop paragraphs that contain banned terms to reduce refusal risk.
            if any(t in p for t in banned):
                continue
            score = 0
            for kw in wanted:
                if kw and kw in p:
                    score += 1
            # Boost headings
            if p.startswith("HTP") or p.startswith("1.") or p.startswith("2.") or p.startswith("③") or p.startswith("④") or "해석" in p[:20]:
                score += 2
            if score > 0:
                scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)

        for score, p in scored:
            if used >= max_chars:
                break
            try_add(p)

        # Always include a short safety reminder for the model (separate from guide text)
        context = "\n\n".join(picked).strip()
        return context


htp_guide_service = HtpGuideService()

