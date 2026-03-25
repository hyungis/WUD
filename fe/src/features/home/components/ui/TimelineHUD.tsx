import { useEffect, useMemo, useState, useRef } from "react";
import type { DailyPlanet } from "../../utils/homeHelpers";
import { formatDate } from "../../utils/homeHelpers";
import { useUiStore } from "../../../../store/uiStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TimelineHUDProps {
  isMacro: boolean;
  isTimelineOpen: boolean;
  setIsTimelineOpen: (open: boolean) => void;
  timelineItems: any[];
  dailyPlanets: DailyPlanet[];
  selectedStarId: string | null;
  selectedWeekKey?: string | null;
  onItemClick: (id: string) => void;
  onWeekRowClick?: (id: string) => void;
}

export function TimelineHUD({
  isTimelineOpen,
  setIsTimelineOpen,
  timelineItems,
  dailyPlanets,
  selectedStarId,
  selectedWeekKey,
  onItemClick,
  onWeekRowClick,
}: TimelineHUDProps) {
  const isOverlayOpen = useUiStore((state) => state.isOverlayOpen);
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [slideDirection, setSlideDirection] = useState<"up" | "down">("up");

  const lastScrollTime = useRef<number>(0);
  const touchStartY = useRef<number | null>(null);

  // 달력 행의 고유 키 생성 (행의 첫 날짜 기준)
  const getRowKey = (week: Date[]) => {
    const d = week[0];
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();

    const startDate = new Date(year, month, 1 - startDayOfWeek);
    const weeks: Date[][] = [];

    for (let i = 0; i < 6; i++) {
      const week: Date[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [currentMonth]);

  // 달력 행 기반 그룹화: 각 행의 날짜 범위에 속하는 아이템을 매칭
  const rowGroups = useMemo(() => {
    const groups = new Map<string, { rowKey: string; deep: any; dailies: any[]; maxDate: number }>();

    calendarGrid.forEach((week) => {
      const key = getRowKey(week);
      const rowStart = new Date(week[0].getFullYear(), week[0].getMonth(), week[0].getDate()).getTime();
      const rowEnd = new Date(week[6].getFullYear(), week[6].getMonth(), week[6].getDate(), 23, 59, 59, 999).getTime();

      const group = { rowKey: key, deep: null as any, dailies: [] as any[], maxDate: 0 };

      timelineItems.forEach((item) => {
        if (!item.createdAt) return;
        const itemTime = new Date(item.createdAt).getTime();
        if (itemTime >= rowStart && itemTime <= rowEnd) {
          if (itemTime > group.maxDate) group.maxDate = itemTime;
          if (item.kind === "deep") {
            group.deep = item;
          } else {
            group.dailies.push(item);
          }
        }
      });

      if (group.deep || group.dailies.length > 0) {
        groups.set(key, group);
      }
    });

    return groups;
  }, [calendarGrid, timelineItems]);

  useEffect(() => {
    if (selectedWeekKey) {
      // 외부에서 ISO weekKey가 올 경우, 해당 아이템의 날짜로 매칭되는 행 찾기
      const matchItem = timelineItems.find(it => it.weekKey === selectedWeekKey);
      if (matchItem) {
        const d = new Date(matchItem.createdAt);
        for (const week of calendarGrid) {
          const s = week[0], e = week[6];
          if (d >= s && d <= new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999)) {
            setActiveWeekKey(getRowKey(week));
            return;
          }
        }
      }
      // 못 찾으면 첫 번째 그룹 선택
      const keys = Array.from(rowGroups.keys());
      if (keys.length > 0 && !activeWeekKey) setActiveWeekKey(keys[0]);
    } else if (rowGroups.size > 0 && !activeWeekKey) {
      setActiveWeekKey(Array.from(rowGroups.keys())[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekKey, rowGroups]);

  const activeGroup = useMemo(() => {
    return rowGroups.get(activeWeekKey || "") || null;
  }, [rowGroups, activeWeekKey]);

  useEffect(() => {
    if (activeGroup && activeGroup.maxDate) {
      const activeDate = new Date(activeGroup.maxDate);
      if (activeDate.getFullYear() !== currentMonth.getFullYear() || activeDate.getMonth() !== currentMonth.getMonth()) {
        const newDate = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
        setSlideDirection(newDate > currentMonth ? "up" : "down");
        setCurrentMonth(newDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeekKey]);

  // 날짜별 데일리/심층 데이터 매핑 (dateKey "YYYY-MM-DD" → { dailyColors: string[], hasDeep: boolean })
  const dateMap = useMemo(() => {
    const map = new Map<string, { dailyColors: string[]; hasDeep: boolean }>();
    timelineItems.forEach((item) => {
      if (!item.createdAt) return;
      const d = new Date(item.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { dailyColors: [], hasDeep: false });
      const entry = map.get(key)!;
      if (item.kind === "deep") {
        entry.hasDeep = true;
      } else {
        entry.dailyColors.push(item.color || "#818cf8");
      }
    });
    return map;
  }, [timelineItems]);

  const weeklyCount = useMemo(
    () => timelineItems.filter((item) => item.kind === "deep").length,
    [timelineItems],
  );

  const goPrevMonth = () => {
    setSlideDirection("down");
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setSlideDirection("up");
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;

    if (e.deltaY > 0) goNextMonth();
    else if (e.deltaY < 0) goPrevMonth();

    lastScrollTime.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 40) {
      if (deltaY > 0) goNextMonth();
      else goPrevMonth();
    }
    touchStartY.current = null;
  };

  const now = new Date();
  const dateYyyyMmDd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weekdayLabel = `${now.toLocaleDateString("ko-KR", { weekday: "short" })}요일`;
  const toggleDateLabel = `${dateYyyyMmDd} ${weekdayLabel}`;
  const timelinePanelId = "timeline-hud-panel";

  return (
    <div
      id="timeline-hud-container"
      className={`fixed bottom-[4.5rem] sm:bottom-[4.75rem] lg:bottom-[5.25rem] 2xl:bottom-6 z-30 transition-all duration-300
        ${isTimelineOpen
          ? "right-2 sm:right-4 lg:right-6"
          : "left-1/2 -translate-x-1/2 bottom-[5.75rem] sm:bottom-[6.5rem] xl:left-auto xl:translate-x-0 xl:bottom-6 xl:right-6"
        }
        ${isOverlayOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}
    >
      <div
        className={`w-[min(22.5rem,calc(100vw-0.75rem))] sm:w-[min(22.5rem,calc(100vw-1.25rem))] flex flex-col ${isTimelineOpen ? "gap-2" : "gap-0"}`}
      >
        {/* 패널 컨텐츠: 열릴 때만 표시 */}
        <div
          id={timelinePanelId}
          aria-hidden={!isTimelineOpen}
          className={`flex flex-col-reverse overflow-hidden rounded-[12px] border border-white/22 bg-white/14 shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl backdrop-saturate-[185%] transition-all duration-500 ease-out
            ${isTimelineOpen ? "max-h-[calc(100vh-8rem)] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
        >

          <div
            className="px-5 pt-3 pb-4 shrink-0 select-none overflow-hidden cursor-ns-resize"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-3 px-1">
              {/* 🚨 [수정됨] Tailwind 기본 애니메이션 클래스로 교체 */}
              <div key={currentMonth.toISOString()} className={`animate-in fade-in duration-300 ${slideDirection === "up" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"}`}>
                <span className="text-[15px] font-bold text-slate-100 tracking-wide pointer-events-none">
                  {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </span>
              </div>

              <div className="flex items-center gap-0.5 z-10">
                <button onClick={(e) => { e.stopPropagation(); goPrevMonth(); }} className="p-1.5 hover:bg-white/15 active:scale-90 rounded-[12px] text-slate-400 hover:text-slate-100 transition-all duration-150">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {(currentMonth.getMonth() !== new Date().getMonth() || currentMonth.getFullYear() !== new Date().getFullYear()) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlideDirection(currentMonth < new Date() ? "up" : "down");
                      setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                    }}
                    className="px-2 py-1 hover:bg-white/15 active:scale-90 rounded-[12px] text-[11px] text-slate-300 hover:text-white transition-all duration-150 font-semibold tracking-wide"
                  >
                    오늘
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); goNextMonth(); }} className="p-1.5 hover:bg-white/15 active:scale-90 rounded-[12px] text-slate-400 hover:text-slate-100 transition-all duration-150">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>

            {/* 🚨 [수정됨] 요일 헤더에서 px-0.5 제거하여 아래 버튼열과 완벽히 정렬되게 맞춤 */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500 mb-1 pointer-events-none tracking-wider">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} className={i === 0 ? 'text-red-400/70' : i === 6 ? 'text-sky-400/70' : ''}>{d}</div>
              ))}
            </div>

            {/* 🚨 [수정됨] 달력 그리드 전체 애니메이션 복구 */}
            <div
              key={currentMonth.toISOString()}
              className={`flex flex-col gap-0.5 relative animate-in fade-in duration-300 fill-mode-forwards ${slideDirection === "up" ? "slide-in-from-bottom-8" : "slide-in-from-top-8"}`}
            >
              {calendarGrid.map((week, idx) => {
                const rowKey = getRowKey(week);
                const isActive = activeWeekKey === rowKey;
                const hasData = rowGroups.has(rowKey);
                const group = rowGroups.get(rowKey) || null;

                return (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveWeekKey(rowKey);

                      if (!group || !onWeekRowClick) return;

                      // 주 클릭 시 대표 항목으로 이동: WEEKLY 우선, 없으면 가장 최근 DAILY
                      const latestDaily = group.dailies.length
                        ? [...group.dailies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                        : null;
                      const target = group.deep || latestDaily;
                      if (target?.id) onWeekRowClick(target.id);
                    }}
                    /* 🚨 [핵심 수정] w-full 추가! 이걸 넣어야 버튼이 부모 넓이만큼 늘어나서 그리드 열이 요일과 일치합니다. */
                    className={`w-full grid grid-cols-7 text-center py-1.5 rounded-[12px] transition-all duration-150 relative group z-10
                    ${isActive
                        ? 'bg-white/18 ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                        : hasData
                          ? 'hover:bg-white/10'
                          : 'hover:bg-white/5 opacity-70'
                      }`}
                  >

                    {week.map((date, dIdx) => {
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isSunday = dIdx === 0;
                      const isSaturday = dIdx === 6;
                      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                      const dateData = dateMap.get(dateKey);

                      return (
                        <div key={dIdx} className="flex flex-col items-center justify-center pointer-events-none gap-[1px]">
                          <span className={`flex w-7 h-7 items-center justify-center rounded-full text-[12px] transition-colors font-medium
                          ${!isCurrentMonth ? 'text-slate-700' : isSunday ? 'text-red-300/80' : isSaturday ? 'text-sky-300/80' : 'text-slate-200'}
                          ${isActive && isCurrentMonth ? 'font-bold text-white' : ''}
                          ${isToday && !isActive ? 'bg-white/25 text-white font-bold shadow-[0_0_8px_rgba(255,255,255,0.45)]' : ''}
                        `}>
                            {date.getDate()}
                          </span>
                          {/* 날짜별 데일리/심층 색상 점 */}
                          {dateData && isCurrentMonth && (
                            <div className="flex items-center justify-center gap-[2px] h-[5px]">
                              {dateData.dailyColors.map((c, ci) => (
                                <div key={ci} className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: c }} />
                              ))}
                              {dateData.hasDeep && (
                                <div className="w-[4px] h-[4px] rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </button>
                )
              })}
            </div>

            {/* 스크롤 힌트 */}
            <div className="flex justify-center mt-2 gap-1 opacity-30 pointer-events-none">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="text-[9px] text-slate-600 tracking-wider">휠 또는 스와이프</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0 mb-2" />

          {/* 하단 리스트 영역 */}
          <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar">
            <div className="flex justify-between rounded-[12px] bg-white/5 p-3 text-[13px] font-bold text-slate-100 mb-4">
              <div>Total {timelineItems.length}</div>
              <div>Daily {dailyPlanets.length}</div>
              <div>Weekly {weeklyCount}</div>
            </div>

            <div key={activeWeekKey} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeGroup ? (
                <>
                  {activeGroup.deep && (
                    <div
                      onClick={() => onItemClick(activeGroup.deep.id)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-2 py-2 text-[13px] transition-colors hover:bg-white/10
                      ${selectedStarId === activeGroup.deep.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm rotate-45 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                        <span className="truncate text-left w-28 font-medium text-white">{activeGroup.deep.label}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(activeGroup.deep.createdAt)}</span>
                    </div>
                  )}

                  {activeGroup.dailies.length > 0 ? (
                    <div className="space-y-1 py-1">
                      {[...activeGroup.dailies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((daily) => (
                        <button
                          key={daily.id}
                          onClick={() => onItemClick(daily.id)}
                          className={`flex w-full items-center justify-between rounded-[12px] px-2 py-1.5 text-[12px] transition-colors hover:bg-white/10 ${selectedStarId === daily.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
                        >
                          <span className="flex items-center gap-2 text-slate-300">
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full opacity-70" style={{ backgroundColor: daily.color }} />
                            <span className="truncate text-left w-32">{daily.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(daily.createdAt)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-500 py-6">No daily entries this week.</div>
                  )}
                </>
              ) : (
                <div className="text-center text-xs text-slate-500 py-6">No records for this week.</div>
              )}
            </div>

          </div>
        </div>
        {/* 토글 버튼: 박스 안쪽 맨 아래 */}
        <div
          className="shrink-0 flex items-center justify-center"
        >
          <button
            type="button"
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            aria-label={isTimelineOpen ? "Hide calendar" : "Show calendar"}
            aria-expanded={isTimelineOpen}
            aria-controls={timelinePanelId}
            title={`${dateYyyyMmDd} ${weekdayLabel}`}
            className="group inline-flex h-[clamp(2rem,2.4vw,2.5rem)] w-[calc(100%-0.5rem)] items-center justify-between rounded-[12px] border border-white/22 bg-white/14 px-[clamp(0.65rem,1.2vw,1rem)] text-[clamp(11px,1.05vw,14px)] font-semibold text-white/90 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]"
          >
            <span className="inline-flex items-center gap-[clamp(0.35rem,0.9vw,0.625rem)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-white whitespace-nowrap truncate max-w-[8.5rem] sm:max-w-[10.5rem] lg:max-w-none">
                {toggleDateLabel}
              </span>
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-300 ${isTimelineOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}