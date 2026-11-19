/* Đợt 4 (spec 7.4) — sổ lỗi sai đọc ra để hiện và làm lại. Thuần: không đụng vault, test bằng node. */
import { todayStr } from "../status.ts";
import { itemText, type Quest, type QItem } from "../data/quest.ts";
import { questItemKey } from "./attempts.ts";
import type { PracticeLog, Mistake } from "./log.ts";
import { streaks } from "./rhythm.ts";

const localDay = (iso: string) => todayStr(new Date(iso));

/** Câu quest ứng với một mục sổ: ref = "<uid hoặc path quest>/<id node>" (path có thể chứa "/", nên tách ở dấu cuối). */
export function findQuestItem(quests: Quest[], ref: string, key: string): QItem | null {
  const k = ref.lastIndexOf("/"); if (k < 0) return null;
  const qid = ref.slice(0, k), nid = ref.slice(k + 1);
  const node = quests.find(q => (q.uid || q.path) === qid)?.nodes.find(n => n.id === nid);
  return node?.items.find(it => questItemKey(itemText(it)) === key) || null;
}

export interface MkRow<T> { key: string; topic: T; m: Mistake; gone: boolean; ready: boolean; item?: QItem }
/** Mọi mục sổ của các bài, mới sai gần nhất trước. gone = câu/bài giảng không còn trong vault (hiện mờ, chờ người học bỏ).
    ready = làm lại được trong phiên hôm nay: câu quest đang mở, còn trong vault, sai TRƯỚC hôm nay. */
export function mistakeRows<T>(entries: { topic: T; log: PracticeLog }[], quests: Quest[], fileExists: (path: string) => boolean, now: Date): MkRow<T>[] {
  const day = todayStr(now), out: MkRow<T>[] = [];
  for (const { topic, log } of entries) for (const [key, m] of Object.entries(log.mistakes || {})) {
    const item = m.src === "quest" ? findQuestItem(quests, m.ref, key) : null;
    const gone = m.src === "quest" ? !item : !fileExists(m.ref);
    out.push({ key, topic, m, gone, ready: m.status === "open" && m.src === "quest" && !gone && todayStr(new Date(m.last)) < day, ...(item ? { item } : {}) });
  }
  return out.sort((a, b) => b.m.last.localeCompare(a.m.last));
}

export type TdItem<T, C> = { kind: "miss"; row: MkRow<T> } | { kind: "card"; topic: T; card: C };
/** Hàng đợi phiên hôm nay (spec 7.4 việc 3): câu sai làm lại được TRƯỚC (ít, là lỗ hổng đã biết, không để thẻ tới hạn chèn mất lượt),
    rồi thẻ tới hạn khả năng nhớ thấp trước. Trần = cap trừ mục đã làm trong ngày; phần dư (later) để hôm sau. */
export function todayQueue<T, C>(rows: MkRow<T>[], cards: { topic: T; card: C; recall: number }[], cap: number, done: number) {
  const all: TdItem<T, C>[] = [...rows.filter(r => r.ready).map(row => ({ kind: "miss" as const, row })),
    ...[...cards].sort((a, b) => a.recall - b.recall).map(c => ({ kind: "card" as const, topic: c.topic, card: c.card }))];
  const items = all.slice(0, Math.max(0, cap - done));
  return { items, later: all.length - items.length };
}

/** Số mục KHÁC NHAU đã làm hôm nay (thẻ + câu quest), đếm từ attempts — trừ vào trần phiên hôm nay. */
export function doneToday(logs: PracticeLog[], now: Date): number {
  const day = todayStr(now), seen = new Set<string>();
  for (const l of logs) for (const a of l.attempts || []) if (a.src !== "lecture" && localDay(a.t) === day) seen.add(a.src + "|" + a.key);
  return seen.size;
}

/** Chuỗi ngày học liền tới hôm nay — cùng hàm và cùng dữ liệu (days) với Nhịp học và huy hiệu streak. */
export const streakNow = (logs: PracticeLog[], now: Date) => streaks(logs.flatMap(l => Object.keys(l.days || {})), todayStr(now)).now;
