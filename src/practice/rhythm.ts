/* Đợt 5 (spec 7.5 việc 2) — Nhịp học: dự báo 14 ngày tới, lưới 12 tuần qua, chuỗi ngày. Thuần, theo ngày ĐỊA PHƯƠNG. */
import { todayStr } from "../status.ts";

const at = (day: string) => new Date(day + "T12:00:00");   // giữa trưa: cộng/trừ ngày không lệch vì giờ mùa hè
const addD = (day: string, n: number) => { const d = at(day); d.setDate(d.getDate() + n); return todayStr(d); };

/** 14 cột từ hôm nay: số thẻ tới hạn (due của nhật ký) + số bài tới hạn ôn với agent (learn_next). Quá hạn gộp vào hôm nay. */
export function forecast(cardDue: string[], topics: { next?: string; due: boolean }[], today: string) {
  const days = Array.from({ length: 14 }, (_, k) => ({ d: addD(today, k), k, cards: 0, topics: 0 })), last = days[13].d;
  for (const iso of cardDue) { const d = todayStr(new Date(iso)); if (d <= last) days[d <= today ? 0 : days.findIndex(x => x.d === d)].cards++; }
  for (const t of topics) { if (t.due) days[0].topics++; else if (t.next && t.next > today && t.next <= last) days[days.findIndex(x => x.d === t.next)].topics++; }
  return days;
}

/** 84 ô = 12 tuần, bắt đầu từ thứ Hai, hết ở Chủ nhật của tuần hiện tại. n = số thẻ đã ôn ngày đó; ngày chưa tới = -1. */
export function history(days: Record<string, number>, today: string) {
  const mon = addD(today, -((at(today).getDay() + 6) % 7)), start = addD(mon, -77);
  return Array.from({ length: 84 }, (_, k) => { const d = addD(start, k); return { d, n: d > today ? -1 : days[d] || 0 }; });
}

/** Chuỗi ngày học liền — dùng CHUNG cho Nhịp học, thẻ Xong hôm nay và chỉ số huy hiệu streak.
    now: chuỗi tới hôm nay (hôm nay chưa học thì tới hôm qua, chưa tính là đứt); best: chuỗi dài nhất. */
export function streaks(dayKeys: Iterable<string>, today: string): { now: number; best: number } {
  const set = new Set([...dayKeys].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))), sorted = [...set].sort();
  let best = 0, run = 0, prev = "";
  for (const d of sorted) { run = prev && addD(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  let d = set.has(today) ? today : addD(today, -1), now = 0;
  while (set.has(d)) { now++; d = addD(d, -1); }
  return { now, best };
}
