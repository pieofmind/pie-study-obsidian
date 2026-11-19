/* Spec 7.10 bước 3–4: nhịp học theo "bài nắm cơ bản mỗi tuần". Thuần. Tuần tính từ thứ Hai, giờ địa phương. */
import { todayStr } from "../status.ts";

const DAY = 864e5;
const at0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export function mondayOf(d: Date): string { const x = at0(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return todayStr(x); }

/** Số bài nắm cơ bản (theo solidAt, kể cả est) rơi vào tuần này và tuần trước. */
export function weekCounts(solidTs: string[], now: Date) {
  const thisM = mondayOf(now), prev = at0(now); prev.setDate(prev.getDate() - 7); const lastM = mondayOf(prev);
  let thisWeek = 0, lastWeek = 0;
  for (const t of solidTs) { const m = mondayOf(new Date(t)); if (m === thisM) thisWeek++; else if (m === lastM) lastWeek++; }
  return { thisWeek, lastWeek };
}

/** Số bài nắm cơ bản mỗi tuần trong `n` tuần gần nhất, cũ → mới (phần tử cuối = tuần này). */
export function weekSeries(solidTs: string[], now: Date, n = 5): number[] {
  const keys: string[] = []; for (let k = n - 1; k >= 0; k--) { const d = at0(now); d.setDate(d.getDate() - 7 * k); keys.push(mondayOf(d)); }
  const by = new Map(keys.map(k => [k, 0])); for (const t of solidTs) { const m = mondayOf(new Date(t)); if (by.has(m)) by.set(m, by.get(m)! + 1); }
  return keys.map(k => by.get(k)!);
}

/** Số ngày từ hôm nay tới hạn (âm = quá hạn). */
export function daysLeft(deadline: string, now: Date): number {
  const [y, m, d] = deadline.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - at0(now).getTime()) / DAY);
}

export interface Pace { kind: "deadline" | "open" | "nodata" | "idle" | "late"; remaining: number; perWeek: number; before?: number; need?: number; weeksLeft?: number; eta?: number; lateDays?: number }
const r1 = (x: number) => Math.round(x * 10) / 10;

/** perWeek = số bài nắm cơ bản trong 28 ngày gần nhất ÷ 4. remaining = số bài chưa nắm cơ bản. */
export function paceOf(o: { solidTs: string[]; remaining: number; deadline?: string; now: Date }): Pace {
  const cut = at0(o.now).getTime() - 27 * DAY, ts = o.solidTs.map(t => new Date(t).getTime());
  const recent = ts.filter(t => t >= cut).length, older = ts.filter(t => t < cut);
  const perWeek = r1(recent / 4), p: Pace = { kind: "open", remaining: o.remaining, perWeek };
  if (o.deadline) {
    const dl = daysLeft(o.deadline, o.now);
    if (dl < 0) return { ...p, kind: "late", lateDays: -dl };
    p.weeksLeft = Math.max(1, Math.ceil(dl / 7)); p.need = Math.ceil(o.remaining / p.weeksLeft);
  }
  if (!ts.length) return { ...p, kind: "nodata" };
  if (!recent) {
    const first = Math.min(...older), weeks = Math.max(1, Math.ceil((cut - first) / (7 * DAY)));
    return { ...p, kind: "idle", before: r1(older.length / weeks) };
  }
  if (p.need != null) return { ...p, kind: "deadline" };
  return { ...p, eta: Math.ceil(o.remaining / (recent / 4)) };
}
