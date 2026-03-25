import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DailyContentSelector from "./components/DailyContentSelector";
import { dailyApi } from "../../api/daily";
import type { DailyListItemResponse } from "../../types/daily";
import { getApiErrorMessage } from "../../utils/apiError";

const EMOTION_COLOR_PALETTE = [
  { label: "기쁨", color: "#FFD54F" },
  { label: "평온", color: "#4FC3F7" },
  { label: "설렘", color: "#FF6FAE" },
  { label: "만족", color: "#66BB6A" },
  { label: "슬픔", color: "#5C6BC0" },
  { label: "불안", color: "#9575CD" },
  { label: "분노", color: "#EF5350" },
  { label: "지침", color: "#90A4AE" },
] as const;

const COLOR_TO_EMOTION: Record<string, string> = Object.fromEntries(
  EMOTION_COLOR_PALETTE.map((item) => [item.color, item.label]),
);

const normalizeHex = (color?: string | null) => (color || "").trim().toUpperCase();
const emotionFromColor = (color?: string | null) => COLOR_TO_EMOTION[normalizeHex(color)] || "기타";
const getTodayKstDate = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
};
const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

type DailyContentViewProps = {
  isModal?: boolean;
};

function DailyContentView({ isModal = false }: DailyContentViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emotionFilter = (searchParams.get("emotion") || "").trim();
  const [items, setItems] = useState<DailyListItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  useEffect(() => {
    if (!emotionFilter) return;
    let cancelled = false;
    const loadDailyList = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await dailyApi.getDailyList({ period: "MONTH", date: getTodayKstDate() });
        if (!cancelled) {
          setItems(res.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(error, "데일리 기록을 불러오지 못했습니다."));
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDailyList();
    return () => {
      cancelled = true;
    };
  }, [emotionFilter]);

  const filteredItems = useMemo(() => {
    if (!emotionFilter) return [];
    return [...items]
      .filter((item) => emotionFromColor(item.emotionColor) === emotionFilter)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [items, emotionFilter]);

  if (emotionFilter) {
    return (
      <div className="scrollbar-hidden relative h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Daily Filter</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{emotionFilter} 감정 기록</h1>
              <p className="mt-1 text-sm text-slate-300">백엔드 데일리 API 기반으로 필터링된 결과입니다.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/daily/content")}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 transition"
            >
              전체 보기
            </button>
          </div>

          {loading && <p className="text-sm text-slate-300">불러오는 중...</p>}
          {loadError && <p className="text-sm text-rose-300">{loadError}</p>}

          {!loading && !loadError && (
            <div className="space-y-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <div key={`${item.dailyId ?? idx}-${item.entryDate}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white truncate">{item.resultSummary || "내용 없음"}</p>
                      <span className="text-xs text-slate-300 whitespace-nowrap">{formatDate(item.entryDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.emotionColor || "#64748B" }} />
                      <span>{emotionFromColor(item.emotionColor)}</span>
                      <span>·</span>
                      <span>{item.dailyType}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-sm text-slate-300">
                  해당 감정의 데일리 기록이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <DailyContentSelector isModal={isModal} onClose={handleClose} />;
}

export default DailyContentView;
