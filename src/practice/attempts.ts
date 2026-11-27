/* Đợt 4 (spec 5 + 7.4) — ghi từng lượt trả lời và sổ lỗi sai. Thuần, bất biến: mỗi hàm trả log mới.
   Sổ lỗi sai là tín hiệu luyện tập, KHÔNG phải mastery; tokens vẫn tính ở log.ts như cũ. */
import { todayStr } from "../status.ts";
import { strengths } from "./strength.ts";
import { cardKey, type PracticeLog, type Attempt, type AttemptSrc, type Mistake } from "./log.ts";

export const ATTEMPT_CAP = 200;
export const questItemKey = (q: string) => "q:" + cardKey(q);
export const lectureKey = (path: string, token: string) => `lec:${path}#${token}`;

export interface AttemptIn { src: AttemptSrc; key: string; token?: string; ok: boolean; assisted?: boolean; conf?: number; rating?: number; q?: string; ref?: string }

/** Thêm một lượt vào attempts (cắt ở 200 dòng) và áp luật sổ lỗi sai:
    sai → open (đã có thì +misses, cập nhật last; đã gỡ thì mở lại) · đúng, không assisted, vào ngày địa phương SAU ngày last → cleared.
    Thẻ không vào sổ: FSRS đã xếp lại lịch. */
export function recordAttempt(log: PracticeLog, a: AttemptIn, now: Date): PracticeLog {
  const t = now.toISOString(), row: Attempt = { t, src: a.src, key: a.key, ok: a.ok };
  if (a.token) row.token = a.token;
  if (a.assisted) row.assisted = true;
  if (a.conf != null) row.conf = a.conf;
  if (a.rating != null) row.rating = a.rating;
  const attempts = [...(log.attempts || []), row].slice(-ATTEMPT_CAP), strength = strengths(attempts);
  if (a.src === "card" || a.src === "check") return { ...log, attempts, strength };   // lượt kiểm: chỉ là lượt, không vào sổ lỗi sai
  const m = log.mistakes?.[a.key];
  let next: Mistake | undefined;
  if (!a.ok) {
    next = m ? { ...m, last: t, misses: m.misses + 1, status: "open" } : { src: a.src, q: (a.q || "").slice(0, 200), ref: a.ref || "", first: t, last: t, misses: 1, status: "open" };
    if (!m && a.token) next.token = a.token;
    delete next.clearedAt;
  } else if (m && m.status === "open" && !a.assisted && todayStr(now) > todayStr(new Date(m.last))) next = { ...m, status: "cleared", clearedAt: t };
  return next ? { ...log, attempts, strength, mistakes: { ...log.mistakes, [a.key]: next } } : { ...log, attempts, strength };
}

/** Huỷ một lượt chấm (cur = log hiện tại, prev = log ngay trước lượt, at = thời điểm lượt): chỉ trả các trường lượt chấm ghi
    (lịch thẻ/kiểm, quest, tokens, sổ lỗi, đếm ngày) và gỡ dòng attempt có đúng thời điểm đó. Giữ giờ học và mọi trường khác ghi sau. */
export function undoGrade(cur: PracticeLog, prev: PracticeLog, at: Date): PracticeLog {
  const t = at.toISOString(), attempts = (cur.attempts || []).filter(a => a.t !== t);
  const { checks: _c, firstChecks: _f, mistakes: _m, days: _d, ontime: _o, ...rest } = cur;
  const out: PracticeLog = { ...rest, cards: prev.cards, quests: prev.quests, tokens: prev.tokens, attempts, strength: strengths(attempts) };
  if (prev.checks) out.checks = prev.checks;
  if (prev.firstChecks) out.firstChecks = prev.firstChecks;
  if (prev.mistakes) out.mistakes = prev.mistakes;
  if (prev.days) out.days = prev.days;
  if (prev.ontime != null) out.ontime = prev.ontime;
  return out;
}

/** "Bỏ khỏi sổ" (câu không còn trong vault): plugin không tự xoá, chỉ xoá khi người học bấm. */
export function dropMistake(log: PracticeLog, key: string): PracticeLog {
  const { [key]: _gone, ...rest } = log.mistakes || {};
  return { ...log, mistakes: rest };
}

/** Đợt 9: mức "Chắc chắn" trong 3 mức Đoán · Khá chắc · Chắc chắn. */
export const CONF_SURE = 2;
export interface SureWrong { key: string; src: AttemptSrc; q: string; t: string }
/** Danh sách "chắc chắn mà sai" (lộ ảo tưởng hiểu): mỗi câu một dòng, lần gần nhất, mới nhất trước. Câu không còn chữ (thẻ mất lịch) thì bỏ. */
export function sureWrong(logs: PracticeLog[]): SureWrong[] {
  const by = new Map<string, SureWrong>();
  for (const l of logs) for (const a of l.attempts || []) {
    if (a.ok || a.conf !== CONF_SURE) continue;
    const q = a.src === "card" ? l.cards[a.key]?.q : l.mistakes?.[a.key]?.q, prev = by.get(a.key);
    if (q && (!prev || a.t > prev.t)) by.set(a.key, { key: a.key, src: a.src, q, t: a.t });
  }
  return [...by.values()].sort((x, y) => y.t.localeCompare(x.t));
}
