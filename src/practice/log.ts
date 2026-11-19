/* Nhật ký luyện tập (spec mục 5) — chỗ DUY NHẤT plugin được ghi. Thuần, bất biến: mỗi hàm trả log mới.
   FSRS dùng thư viện ts-fsrs (MIT). Mastery KHÔNG ở đây: tokens chỉ là tín hiệu để agent đọc. */
import { todayStr } from "../status.ts";
import { fsrs, generatorParameters, createEmptyCard, Rating, type Card, type Grade } from "ts-fsrs";
export { Rating };

/** Thư mục nhật ký mặc định: KHÔNG ẩn (bắt đầu bằng ".") để Obsidian Sync/iCloud đồng bộ được lên điện thoại. */
export const DEFAULT_STATE_DIR = "Pie Study/practice";

export interface CardState { token?: string; q: string; due: string; stability: number; difficulty: number; state: number; reps: number; lapses: number; steps: number; last: string }
export interface QuestState { scorePct: number; attempts: number; last: string }
export interface Tally { ok: number; miss: number }
export interface PracticeLog {
  version: 1; topic: { uid?: string; pathHint: string }; keyedBy?: "path";
  cards: Record<string, CardState>; quests: Record<string, QuestState>; tokens: Record<string, Tally>;
  /** Thêm cho huy hiệu (spec 7.2b), tuỳ chọn nên log cũ vẫn hợp lệ: số thẻ đã ôn theo ngày địa phương, số lần ôn đúng ngày tới hạn. */
  days?: Record<string, number>; ontime?: number;
  /** Đợt 4 (spec 7.4), tuỳ chọn: từng lượt trả lời (≤200 dòng, mới nhất cuối) và sổ lỗi sai theo khoá câu. Xem attempts.ts. */
  attempts?: Attempt[]; mistakes?: Record<string, Mistake>;
  /** Đợt 5 (spec 7.5): độ vững 0–1 theo kiểu hiểu, tính lại từ attempts mỗi lần ghi. Chưa có lượt thì không có khoá. */
  strength?: Record<string, number>;
  /** Đợt 8a (spec 7.10): ngày nắm cơ bản (đủ 5 cốt lõi) và giờ học đo được theo ngày địa phương (giữ 400 ngày). */
  solidAt?: SolidAt; secs?: Record<string, number>;
}
export interface SolidAt { t: string; est?: true; lost?: string }
export type AttemptSrc = "card" | "quest" | "lecture";
export interface Attempt { t: string; src: AttemptSrc; key: string; token?: string; ok: boolean; assisted?: boolean }
export interface Mistake { src: "quest" | "lecture"; token?: string; q: string; ref: string; first: string; last: string; misses: number; status: "open" | "cleared"; clearedAt?: string }
export interface CardRef { q: string; token?: string }

export function emptyLog(t: { uid?: string; path: string }): PracticeLog {
  const log: PracticeLog = { version: 1, topic: { uid: t.uid, pathHint: t.path }, cards: {}, quests: {}, tokens: {} };
  if (!t.uid) { delete log.topic.uid; log.keyedBy = "path"; }
  return log;
}
/** Tên file: <uid>.json; bài chưa có uid thì khoá theo path. */
export const logFileName = (t: { uid?: string; path: string }) => t.uid ? `${t.uid}.json` : `path__${t.path.replace(/\.md$/, "").replace(/[\\/]/g, "__").replace(/[^\p{L}\p{N}_.-]/gu, "-")}.json`;

export const normQ = (q: string) => q.trim().replace(/\s+/g, " ");
/** Hash cyrb53 của Q đã chuẩn hoá — đồng bộ, không cần crypto, đủ tránh trùng cho vài nghìn thẻ. */
export function cardKey(q: string): string {
  const s = normQ(q); let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let k = 0; k < s.length; k++) { const c = s.charCodeAt(k); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

let retention = 0.9;
export const setRetention = (r: number) => { retention = r; };
/** Mỗi mức ôn một bộ máy FSRS, giữ sẵn theo giá trị (đợt 6: mức ôn theo lĩnh vực). */
const engines = new Map<number, ReturnType<typeof fsrs>>();
const F = (r = retention) => { let e = engines.get(r); if (!e) engines.set(r, e = fsrs(generatorParameters({ request_retention: r, enable_fuzz: false }))); return e; };
export const LEVELS = [0.85, 0.9, 0.95];
/** Mức ôn của một lĩnh vực: mức riêng nếu là 1 trong 3 mức đặt tên, không thì mức chung. */
export const retentionFor = (byDom: Record<string, number> | undefined, dom: string, fallback: number) => { const r = byDom?.[dom]; return r != null && LEVELS.includes(r) ? r : fallback; };
/** 3 khoảng ôn đầu (ngày) của một thẻ mới luôn chấm "Được" — gợi ý trong Cài đặt, tính lúc chạy chứ không viết cứng. */
export function firstGoodIntervals(r: number): number[] {
  let now = new Date(2026, 0, 5, 9), card = createEmptyCard(now); const gaps: number[] = [];
  for (let n = 0; gaps.length < 3 && n < 20; n++) { const next = F(r).next(card, now, Rating.Good).card, g = (next.due.getTime() - now.getTime()) / 864e5; if (g >= 1) gaps.push(Math.round(g)); card = next; now = next.due; }
  return gaps;
}

const toCard = (s: CardState | undefined, now: Date): Card => s ? {
  due: new Date(s.due), stability: s.stability, difficulty: s.difficulty, elapsed_days: 0, scheduled_days: 0, learning_steps: s.steps || 0,
  reps: s.reps, lapses: s.lapses, state: s.state, last_review: new Date(s.last),
} as Card : createEmptyCard(now);

const tally = (tokens: Record<string, Tally>, token: string | undefined, ok: boolean) => {
  if (!token) return tokens;
  const t = tokens[token] || { ok: 0, miss: 0 };
  return { ...tokens, [token]: ok ? { ok: t.ok + 1, miss: t.miss } : { ok: t.ok, miss: t.miss + 1 } };
};

export function recordCard(log: PracticeLog, c: CardRef, rating: Grade, now: Date, ret?: number): PracticeLog {
  const key = cardKey(c.q), next = F(ret).next(toCard(log.cards[key], now), now, rating).card;
  const st: CardState = { token: c.token, q: normQ(c.q), due: next.due.toISOString(), stability: +next.stability.toFixed(4), difficulty: +next.difficulty.toFixed(4),
    state: next.state, reps: next.reps, lapses: next.lapses, steps: next.learning_steps, last: now.toISOString() };
  if (!c.token) delete st.token;
  const day = todayStr(now), prev = log.cards[key], onDay = !!prev && todayStr(new Date(prev.due)) === day;
  return { ...log, cards: { ...log.cards, [key]: st }, tokens: tally(log.tokens, c.token, rating !== Rating.Again),
    days: { ...log.days, [day]: (log.days?.[day] || 0) + 1 }, ontime: (log.ontime || 0) + (onDay ? 1 : 0) };
}

/** Hẹn ngày ôn kế cho 4 nút Quên/Khó/Được/Dễ. */
export function previewIntervals(log: PracticeLog, c: CardRef, now: Date, ret?: number): { rating: Grade; due: string; ms: number }[] {
  const r = F(ret).repeat(toCard(log.cards[cardKey(c.q)], now), now);
  return ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map(g => ({ rating: g, due: r[g].card.due.toISOString(), ms: r[g].card.due.getTime() - now.getTime() }));
}

/** Khả năng còn nhớ thẻ lúc now (0–1, ts-fsrs tính từ stability và thời gian đã trôi). Thẻ chưa có lịch = 0. */
export const cardRecall = (log: PracticeLog, key: string, now: Date) => { const s = log.cards[key]; return s ? F().retrievability(toCard(s, now), now) : 0; };

export const isCardDue = (log: PracticeLog, c: CardRef, now: Date) => { const s = log.cards[cardKey(c.q)]; return !s || new Date(s.due) <= now; };

/** Hàng ôn: thẻ đã có lịch và tới hạn (hạn sớm trước), rồi tối đa newLimit thẻ mới. */
export function dueQueue<C extends CardRef>(log: PracticeLog, cards: C[], now: Date, newLimit: number): C[] {
  const seen = cards.filter(c => log.cards[cardKey(c.q)]), fresh = cards.filter(c => !log.cards[cardKey(c.q)]);
  const due = seen.filter(c => new Date(log.cards[cardKey(c.q)].due) <= now).sort((a, b) => log.cards[cardKey(a.q)].due.localeCompare(log.cards[cardKey(b.q)].due));
  return [...due, ...fresh.slice(0, Math.max(0, newLimit))];
}

export function recordQuest(log: PracticeLog, key: string, results: { token?: string; ok: boolean }[], now: Date): PracticeLog {
  const prev = log.quests[key], ok = results.filter(r => r.ok).length;
  const tokens = results.reduce((t, r) => tally(t, r.token, r.ok), log.tokens);
  return { ...log, tokens, quests: { ...log.quests, [key]: { scorePct: results.length ? Math.round(ok / results.length * 100) : 0, attempts: (prev?.attempts || 0) + 1, last: now.toISOString() } } };
}

/** Câu trả lời trong bài giảng HTML (spec 7.3): chỉ cộng vào tokens ok/miss, không đụng thẻ và quest. */
export const recordAnswer = (log: PracticeLog, token: string, ok: boolean): PracticeLog => ({ ...log, tokens: tally(log.tokens, token, ok) });

/** Độ giống hai câu (Dice trên cặp ký tự, sau chuẩn hoá chữ thường). */
export function similarity(a: string, b: string): number {
  const bg = (s: string) => { const t = normQ(s).toLowerCase(), m = new Map<string, number>(); for (let k = 0; k < t.length - 1; k++) { const g = t.slice(k, k + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let inter = 0, n = 0;
  A.forEach((v, g) => { inter += Math.min(v, B.get(g) || 0); n += v; }); B.forEach(v => { n += v; });
  return n ? 2 * inter / n : 0;
}

/** R2: câu hỏi bị sửa → hash vỡ. Thẻ hiện tại chưa có lịch thử khớp mờ với lịch mồ côi CÙNG token (≥ 0.7) rồi chuyển khoá. */
export function adoptOrphans(log: PracticeLog, cards: CardRef[], min = 0.7): { log: PracticeLog; adopted: number; orphans: number } {
  const live = new Set(cards.map(c => cardKey(c.q)));
  const orphan = Object.entries(log.cards).filter(([k]) => !live.has(k));
  const out = { ...log.cards }; let adopted = 0;
  for (const c of cards) {
    const key = cardKey(c.q); if (out[key]) continue;
    let best: [string, number] | null = null;
    for (const [k, s] of orphan) { if (!out[k] || (s.token || "") !== (c.token || "")) continue; const sim = similarity(s.q, c.q); if (sim >= min && (!best || sim > best[1])) best = [k, sim]; }
    if (best) { out[key] = { ...out[best[0]], q: normQ(c.q) }; delete out[best[0]]; adopted++; }
  }
  return { log: { ...log, cards: out }, adopted, orphans: Object.keys(out).filter(k => !live.has(k)).length };
}

/** Gộp log cũ (khoá theo path, trước khi note có uid) vào log theo uid. Mỗi khoá: bên có `last` mới hơn thắng; tokens lấy bên có tổng lượt nhiều hơn (không cộng, để gộp lại nhiều lần không phình số). Idempotent. */
export function mergeLogs(base: PracticeLog, old: PracticeLog): PracticeLog {
  const later = <T extends { last: string }>(a: T | undefined, b: T | undefined) => !a ? b : !b ? a : (b.last > a.last ? b : a);
  const rec = <T>(a: Record<string, T> | undefined, b: Record<string, T> | undefined, pick: (x: T | undefined, y: T | undefined) => T | undefined) => {
    const out: Record<string, T> = {}; for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { const v = pick(a?.[k], b?.[k]); if (v !== undefined) out[k] = v; } return out;
  };
  const tot = (t: Tally | undefined) => (t ? t.ok + t.miss : -1);
  const seen = new Set<string>(), attempts = [...(base.attempts || []), ...(old.attempts || [])].filter(a => { const k = `${a.t}|${a.src}|${a.key}|${a.ok}`; return seen.has(k) ? false : (seen.add(k), true); }).sort((a, b) => a.t.localeCompare(b.t)).slice(-200);
  const out: PracticeLog = {
    ...old, ...base, topic: base.topic, cards: rec(base.cards, old.cards, later), quests: rec(base.quests, old.quests, later),
    tokens: rec(base.tokens, old.tokens, (x, y) => (tot(y) > tot(x) ? y : x)),
  };
  delete out.keyedBy;
  if (base.days || old.days) out.days = rec(base.days, old.days, (x, y) => Math.max(x ?? 0, y ?? 0));
  if (base.secs || old.secs) out.secs = rec(base.secs, old.secs, (x, y) => Math.max(x ?? 0, y ?? 0));
  if (base.mistakes || old.mistakes) out.mistakes = rec(base.mistakes, old.mistakes, (x, y) => (!x ? y : !y ? x : y.last > x.last ? y : x));
  if (attempts.length) out.attempts = attempts;
  if (base.ontime != null || old.ontime != null) out.ontime = Math.max(base.ontime || 0, old.ontime || 0);
  const sa = base.solidAt || old.solidAt; if (sa) out.solidAt = sa;
  return out;
}
