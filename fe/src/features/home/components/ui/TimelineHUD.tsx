import type { DailyPlanet } from "../../utils/homeHelpers";
import { formatDate } from "../../utils/homeHelpers";

interface TimelineHUDProps {
  isMacro: boolean;
  isTimelineOpen: boolean;
  setIsTimelineOpen: (open: boolean) => void;
  timelineItems: any[];
  dailyPlanets: DailyPlanet[];
  mypageStar: { id: string; toneColor: string; label: string };
  selectedStarId: string | null;
  onItemClick: (id: string) => void;
}

export function TimelineHUD({
  isMacro,
  isTimelineOpen,
  setIsTimelineOpen,
  timelineItems,
  dailyPlanets,
  mypageStar,
  selectedStarId,
  onItemClick,
}: TimelineHUDProps) {
  return (
    <div
      className={`fixed left-6 top-24 z-30 flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 shadow-2xl backdrop-blur-md transition-all duration-700 overflow-hidden w-72 
        ${isMacro ? "-translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100 pointer-events-auto"} 
        ${isTimelineOpen ? "max-h-[calc(100vh-14rem)]" : "max-h-[64px]"}`}
    >
      {/* 패널 헤더: 클릭 시 접기/펴기 */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Timeline</p>
        <button
          className="text-slate-400 hover:text-white transition group p-1"
          aria-label={isTimelineOpen ? "최소화" : "펼치기"}
        >
          {isTimelineOpen ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          )}
        </button>
      </div>

      {/* 패널 본문: 목록 출력 */}
      <div
        className={`flex flex-col flex-1 overflow-hidden px-5 transition-opacity duration-300 ${
          isTimelineOpen ? "opacity-100 pb-5" : "opacity-0 pb-0"
        }`}
      >
        <div className="flex justify-between rounded-xl bg-white/5 p-3 text-xs font-bold text-slate-100">
          <div>전체 {timelineItems.length}</div>
          <div>데일리 {dailyPlanets.length}</div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {/* 중심별 바로가기 */}
          <button
            onClick={() => onItemClick(mypageStar.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${
              selectedStarId === mypageStar.id ? "bg-white/15 ring-1 ring-white/20" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mypageStar.toneColor }} />
              {mypageStar.label} (중심)
            </span>
          </button>

          {/* 타임라인 아이템 목록 */}
          {timelineItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${
                selectedStarId === item.id ? "bg-white/15 ring-1 ring-white/20" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-left w-32">{item.label}</span>
              </span>
              <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(item.createdAt)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
