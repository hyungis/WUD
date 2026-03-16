import { useEffect, useMemo, useState, useRef } from "react";
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

  return (
    <div
      className={`fixed right-6 bottom-24 z-30 flex flex-col justify-end rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-xl transition-all duration-700 overflow-hidden w-72 
        ${isMacro ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100 pointer-events-auto"} 
        ${isTimelineOpen ? "max-h-[calc(100vh-8rem)]" : "max-h-[64px]"}`}
    >
      <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${isTimelineOpen ? "opacity-100" : "opacity-0"}`}>

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
              <span className="text-sm font-bold text-slate-100 tracking-wide pointer-events-none">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </span>
            </div>

            <div className="flex items-center gap-0.5 z-10">
              <button onClick={(e) => { e.stopPropagation(); goPrevMonth(); }} className="p-1.5 hover:bg-white/15 active:scale-90 rounded-lg text-slate-400 hover:text-slate-100 transition-all duration-150">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              {(currentMonth.getMonth() !== new Date().getMonth() || currentMonth.getFullYear() !== new Date().getFullYear()) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideDirection(currentMonth < new Date() ? "up" : "down");
                    setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  }}
                  className="px-2 py-1 hover:bg-indigo-500/25 active:scale-90 rounded-lg text-[10px] text-indigo-400 hover:text-indigo-300 transition-all duration-150 font-semibold tracking-wide"
                >
                  오늘
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); goNextMonth(); }} className="p-1.5 hover:bg-white/15 active:scale-90 rounded-lg text-slate-400 hover:text-slate-100 transition-all duration-150">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          {/* 🚨 [수정됨] 요일 헤더에서 px-0.5 제거하여 아래 버튼열과 완벽히 정렬되게 맞춤 */}
          <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-slate-500 mb-1 pointer-events-none tracking-wider">
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

              return (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setActiveWeekKey(rowKey); }}
                  /* 🚨 [핵심 수정] w-full 추가! 이걸 넣어야 버튼이 부모 넓이만큼 늘어나서 그리드 열이 요일과 일치합니다. */
                  className={`w-full grid grid-cols-7 text-center py-1.5 rounded-lg transition-all duration-150 relative group z-10
                    ${isActive
                      ? 'bg-indigo-500/20 ring-1 ring-indigo-400/40 shadow-[inset_0_1px_0_rgba(165,180,252,0.15)]'
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
                        <span className={`flex w-6 h-6 items-center justify-center rounded-full text-[11px] transition-colors font-medium
                          ${!isCurrentMonth ? 'text-slate-700' : isSunday ? 'text-red-300/80' : isSaturday ? 'text-sky-300/80' : 'text-slate-200'}
                          ${isActive && isCurrentMonth ? 'font-bold text-white' : ''}
                          ${isToday && !isActive ? 'bg-indigo-500 text-white font-bold shadow-[0_0_8px_rgba(99,102,241,0.6)]' : ''}
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
          <div className="flex justify-between rounded-xl bg-white/5 p-3 text-xs font-bold text-slate-100 mb-4">
            <div>전체 {timelineItems.length}</div>
            <div>데일리 {dailyPlanets.length}</div>
          </div>

          <button
            onClick={() => onItemClick(mypageStar.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-2 mb-4 text-xs transition-colors hover:bg-white/10 ${selectedStarId === mypageStar.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ backgroundColor: mypageStar.toneColor }} />
              <span className="font-bold">{mypageStar.label} (나의 우주)</span>
            </span>
          </button>

          <div key={activeWeekKey} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeGroup ? (
              <>
                {activeGroup.deep && (
                  <div
                    onClick={() => onItemClick(activeGroup.deep.id)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10
                      ${selectedStarId === activeGroup.deep.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-sm rotate-45" style={{ backgroundColor: activeGroup.deep.color }} />
                      <span className="truncate text-left w-24 font-semibold text-white">{activeGroup.deep.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(activeGroup.deep.createdAt)}</span>
                  </div>
                )}

                {activeGroup.dailies.length > 0 ? (
                  <div className={`${activeGroup.deep ? "ml-3 pl-3 border-l border-white/10" : ""} space-y-1 py-1`}>
                    {[...activeGroup.dailies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((daily) => (
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
                ) : (
                  <div className="text-center text-xs text-slate-500 py-6">이 주차에는 데일리 기록이 없습니다.</div>
                )}
              </>
            ) : (
              <div className="text-center text-xs text-slate-500 py-6">기록이 없는 주차입니다.</div>
            )}
          </div>

        </div>
      </div>

      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors shrink-0"
        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
      >
        <div className="flex items-center gap-2.5">
          {/* 수직 바 인디케이터 */}
          <div className="w-[3px] h-3.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {/* 년.월.일 */}
              <p className="text-[12px] font-bold tracking-widest text-slate-100">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, '')}
              </p>
              {/* 우측 요일 - 수직 바와 같은 색상 적용 */}
              <span className="text-[12px] font-bold text-indigo-400 opacity-90">
                {new Date().toLocaleDateString('ko-KR', { weekday: 'short' })}요일
              </span>
            </div>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition group p-1">
          {isTimelineOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          )}
        </button>
      </div>
    </div>
  );
}