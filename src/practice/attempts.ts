/* Đợt 4 (spec 5 + 7.4) — ghi từng lượt trả lời và sổ lỗi sai. Thuần, bất biến: mỗi hàm trả log mới.
   Sổ lỗi sai là tín hiệu luyện tập, KHÔNG phải mastery; tokens vẫn tính ở log.ts như cũ. */
import { todayStr } from "../status.ts";
import { strengths } from "./strength.ts";
import { cardKey, type PracticeLog, type Attempt, type AttemptSrc, type Mistake } from "./log.ts";

export const ATTEMPT_CAP = 200;
export const questItemKey = (q: string) => "q:" + cardKey(q);
export const lectureKey = (path: string, token: string) => `lec:${path}#${token}`;

export interface AttemptIn { src: AttemptSrc; key: string; token?: string; ok: boolean; assisted?: boolean; q?: string; ref?: string }

/** Thêm một lượt vào attempts (cắt ở 200 dòng) và áp luật sổ lỗi sai:
    sai → open (đã có thì +misses, cập nhật last; đã gỡ thì mở lại) · đúng, không assisted, vào ngày địa phương SAU ngày last → cleared.
    Thẻ không vào sổ: FSRS đã xếp lại lịch. */
export function recordAttempt(log: PracticeLog, a: AttemptIn, now: Date): PracticeLog {
  const t = now.toISOString(), row: Attempt = { t, src: a.src, key: a.key, ok: a.ok };
  if (a.token) row.token = a.token;
  if (a.assisted) row.assisted = true;
  const attempts = [...(log.attempts || []), row].slice(-ATTEMPT_CAP), strength = strengths(attempts);
  if (a.src === "card") return { ...log, attempts, strength };
  const m = log.mistakes?.[a.key];
  let next: Mistake | undefined;
  if (!a.ok) {
    next = m ? { ...m, last: t, misses: m.misses + 1, status: "open" } : { src: a.src, q: (a.q || "").slice(0, 200), ref: a.ref || "", first: t, last: t, misses: 1, status: "open" };
    if (!m && a.token) next.token = a.token;
    delete next.clearedAt;
  } else if (m && m.status === "open" && !a.assisted && todayStr(now) > todayStr(new Date(m.last))) next = { ...m, status: "cleared", clearedAt: t };
  return next ? { ...log, attempts, strength, mistakes: { ...log.mistakes, [a.key]: next } } : { ...log, attempts, strength };
}

/** "Bỏ khỏi sổ" (câu không còn trong vault): plugin không tự xoá, chỉ xoá khi người học bấm. */
export function dropMistake(log: PracticeLog, key: string): PracticeLog {
  const { [key]: _gone, ...rest } = log.mistakes || {};
  return { ...log, mistakes: rest };
}
