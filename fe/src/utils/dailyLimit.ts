import { dailyApi } from "../api/daily";
import type { DeepHistoryItem } from "../types/deep";

export const DAILY_LIMIT_MESSAGE = "오늘 해당 데일리 콘텐츠는 이미 완료했어요. 다른 콘텐츠를 선택하거나 내일 다시 작성할 수 있어요.";
export const WEEKLY_LIMIT_MESSAGE = "이번 주 해당 위클리 콘텐츠는 이미 완료했어요. 다음 주에 다시 진행할 수 있어요.";

type StarLike = {
  kind?: string;
  createdAt?: string;
};

export const getTodayKstDate = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

export const toKstDate = (value?: string | Date) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};

export const hasTodayDailyEntry = async () => {
  const today = getTodayKstDate();
  const res = await dailyApi.getDailyList({ period: "DAY", date: today });
  const list = (res.data ?? []) as Array<{ entryDate?: string }>;

  return list.some((item) => item.entryDate === today);
};

export const hasTodayDailyEntryByType = async (dailyType: string) => {
  const today = getTodayKstDate();
  const res = await dailyApi.getDailyList({ period: "DAY", date: today });
  const list = (res.data ?? []) as Array<{ entryDate?: string; dailyType?: string }>;
  const targetType = dailyType.toUpperCase();

  return list.some((item) => item.entryDate === today && String(item.dailyType ?? "").toUpperCase() === targetType);
};

export const hasTodayWeeklyEntryFromStars = (stars: StarLike[]) => {
  const today = getTodayKstDate();
  return stars.some((star) => star.kind === "DEEP" && toKstDate(star.createdAt) === today);
};

const getKstWeekKey = (value?: string | Date) => {
  const date = value ? (value instanceof Date ? value : new Date(value)) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");

  const target = new Date(Date.UTC(year, month - 1, day));
  const weekday = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${weekNo}`;
};

export const hasWeeklyDeepEntryByType = (history: DeepHistoryItem[], type: string) => {
  const targetType = type.toUpperCase();
  const currentWeek = getKstWeekKey(new Date());

  return history.some((item) => {
    const itemType = String(item.deepType ?? "").toUpperCase();
    const itemStatus = String(item.status ?? "").toUpperCase();
    return itemType === targetType && itemStatus === "DONE" && getKstWeekKey(item.createdAt) === currentWeek;
  });
};
