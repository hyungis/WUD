import { dailyApi } from "../api/daily";

export const DAILY_LIMIT_MESSAGE = "오늘 데일리 기록은 이미 완료했어요. 내일 다시 작성할 수 있어요.";
export const WEEKLY_DAILY_LIMIT_MESSAGE = "오늘 위클리 기록은 이미 완료했어요. 내일 다시 작성할 수 있어요.";

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
  const res = await dailyApi.getDailyList();
  const list = (res.data ?? []) as Array<{ entryDate?: string }>;
  const today = getTodayKstDate();

  return list.some((item) => item.entryDate === today);
};

export const hasTodayWeeklyEntryFromStars = (stars: StarLike[]) => {
  const today = getTodayKstDate();
  return stars.some((star) => star.kind === "DEEP" && toKstDate(star.createdAt) === today);
};
