import { useEffect, useMemo, useState } from "react";
import type { DailyPlanet } from "../../utils/homeHelpers";
import { formatDate } from "../../utils/homeHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TimelineHUDProps {
  isMacro: boolean;
  isTimelineOpen: boolean;
  setIsTimelineOpen: (open: boolean) => void;
  timelineItems: any[];
  dailyPlanets: DailyPlanet[];
  mypageStar: { id: string; toneColor: string; label: string };
  selectedStarId: string | null;
  selectedWeekKey?: string | null;
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
  selectedWeekKey,
  onItemClick,
}: TimelineHUDProps) {
  // 🚨 [수정됨] 기본적으로 '열린(expanded)' 그룹을 추적합니다. 초기값 {} 이므로 모두 닫힘.
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  // 클릭된 별의 weekKey가 변경되면 해당 그룹을 자동으로 펼침
  useEffect(() => {
    if (selectedWeekKey) {
      setExpandedWeeks(prev => ({ ...prev, [selectedWeekKey]: true }));
    }
  }, [selectedWeekKey]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, { weekKey: string; deep: any; dailies: any[]; maxDate: number }>();

    timelineItems.forEach((item) => {
      const key = item.weekKey || `unknown-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, { weekKey: key, deep: null, dailies: [], maxDate: 0 });
      }

      const currentGroup = groups.get(key)!;
      const itemDate = new Date(item.createdAt).getTime();
      if (itemDate > currentGroup.maxDate) currentGroup.maxDate = itemDate;

      if (item.kind === "deep") {
        currentGroup.deep = item;
      } else {
        currentGroup.dailies.push(item);
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.maxDate - a.maxDate);
  }, [timelineItems]);

  // 화살표 토글
  const toggleWeek = (weekKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWeeks((prev) => ({ ...prev, [weekKey]: !prev[weekKey] }));
  };

  return (
    <div
      className={`fixed right-6 top-24 z-30 flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 shadow-2xl backdrop-blur-md transition-all duration-700 overflow-hidden w-72 
        ${isMacro ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100 pointer-events-auto"} 
        ${isTimelineOpen ? "max-h-[calc(100vh-14rem)]" : "max-h-[64px]"}`}
    >
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Timeline</p>
        <button className="text-slate-400 hover:text-white transition group p-1">
          {isTimelineOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          )}
        </button>
      </div>

      <div className={`flex flex-col flex-1 overflow-hidden px-5 transition-opacity duration-300 ${isTimelineOpen ? "opacity-100 pb-5" : "opacity-0 pb-0"}`}>
        <div className="flex justify-between rounded-xl bg-white/5 p-3 text-xs font-bold text-slate-100">
          <div>전체 {timelineItems.length}</div>
          <div>데일리 {dailyPlanets.length}</div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          <button
            onClick={() => onItemClick(mypageStar.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${selectedStarId === mypageStar.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ backgroundColor: mypageStar.toneColor }} />
              <span className="font-bold">{mypageStar.label} (나의 우주)</span>
            </span>
          </button>

          {groupedTimeline.map((group) => {
            // 🚨 [수정됨] 명시적으로 true일 때만 열림 (초기값은 false)
            const isExpanded = expandedWeeks[group.weekKey] === true;

            return (
              <div key={group.weekKey} className="flex flex-col space-y-1">
                {group.deep && (
                  <div
                    onClick={() => {
                      // 🚨 [수정됨] 닫혀있으면 연다. 열려있으면 카메라 이동.
                      if (!isExpanded) {
                        setExpandedWeeks(prev => ({ ...prev, [group.weekKey]: true }));
                      } else {
                        onItemClick(group.deep.id);
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10
                      ${selectedStarId === group.deep.id ? "bg-white/15 ring-1 ring-white/20" : ""}
                      ${selectedWeekKey === group.weekKey && selectedStarId !== group.deep.id ? "ring-1 ring-indigo-400/40 bg-indigo-950/30" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-sm rotate-45" style={{ backgroundColor: group.deep.color }} />
                      <span className="truncate text-left w-24 font-semibold text-white">{group.deep.label}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(group.deep.createdAt)}</span>
                      {group.dailies.length > 0 && (
                        <button
                          onClick={(e) => toggleWeek(group.weekKey, e)}
                          className="p-1 hover:bg-white/20 rounded-md transition"
                        >
                          {/* 🚨 [수정됨] 열려있으면(isExpanded) 위를 보고, 닫혀있으면 아래를 봅니다 */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 🚨 [수정됨] isExpanded가 true일 때만 렌더링 */}
                {isExpanded && group.dailies.length > 0 && (
                  <div className={`${group.deep ? "ml-3 pl-3 border-l border-white/10" : ""} space-y-1 py-1`}>
                    {[...group.dailies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((daily) => (
                      <button
                        key={daily.id}
                        onClick={() => onItemClick(daily.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] transition-colors hover:bg-white/10 ${selectedStarId === daily.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full opacity-70" style={{ backgroundColor: daily.color }} />
                          <span className="truncate text-left w-28">{daily.label}</span>
                        </span>
                        <span className="text-[9px] text-slate-500 flex-shrink-0">{formatDate(daily.createdAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}