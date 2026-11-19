/* Spec 7.10 bước 6: giờ học đo được (secs: { "YYYY-MM-DD": giây }). Thuần, bất biến. */
import { todayStr } from "../status.ts";
import type { PracticeLog } from "./log.ts";

export const SECS_DAYS = 400;

export function addSecs(log: PracticeLog, day: string, n: number): PracticeLog {
  if (!(n > 0)) return log;
  const secs = { ...(log.secs || {}), [day]: (log.secs?.[day] || 0) + n };
  const keys = Object.keys(secs).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - SECS_DAYS))) delete secs[k];
  return { ...log, secs };
}

/** Tổng giây của `days` ngày gần nhất (gồm hôm nay) trên nhiều bài. */
export function secsInLast(logs: PracticeLog[], today: string, days = 7): number {
  const [y, m, d] = today.split("-").map(Number), keep = new Set<string>();
  for (let k = 0; k < days; k++) keep.add(todayStr(new Date(y, m - 1, d - k)));
  return logs.reduce((s, l) => s + Object.entries(l.secs || {}).reduce((a, [day, v]) => a + (keep.has(day) ? v : 0), 0), 0);
}
