/* Đợt 9 (spec 7.13 mục 7-9) — chuyển token sau lượt kiểm. Thuần: ghi thật qua processFrontMatter ở StudyView.
   Plugin chỉ đụng đúng 2 trường learn_pending / learn_understood. */
import { understood } from "../status.ts";

export interface TickFields { learn_pending: string[]; learn_understood: string[] }

/** Đạt: pending → understood. Trượt: chỉ bỏ khỏi pending. Token không ở pending → null (không ghi gì, kể cả skill cũ không có learn_pending). */
export function applyCheck(fm: { learn_pending?: unknown; learn_understood?: unknown }, token: string, ok: boolean): TickFields | null {
  const pend = understood(fm.learn_pending), und = understood(fm.learn_understood);
  if (!pend.includes(token)) return null;
  return { learn_pending: pend.filter(x => x !== token), learn_understood: ok && !und.includes(token) ? [...und, token] : und };
}

/** Bài cần học lại: lượt kiểm gần nhất của token trượt và token không còn ở understood / pending. */
export function relearnTokens(attempts: { src: string; token?: string; ok: boolean }[], und: string[], pend: string[]): string[] {
  const last = new Map<string, boolean>();
  for (const a of attempts) if (a.src === "check" && a.token) last.set(a.token, a.ok);
  return [...last].filter(([k, ok]) => !ok && !und.includes(k) && !pend.includes(k)).map(([k]) => k);
}

/** Token tạm chưa có câu kiểm nào trong file `.check.md`. */
export const pendingNoCheck = (pend: string[], items: { token: string }[]) => pend.filter(k => !items.some(c => c.token === k));
