/* Đợt 9 (spec 7.13) — lượt kiểm độc lập: file <thư mục quiz>/<note>.check.md do agent soạn sau buổi học (khuôn ở huong-dan-kiem.md).
   Đọc, chọn câu tới hạn, chấm bằng code: không gọi model, không gợi ý. Thuần, test bằng node. */
import type { QItem } from "./quest.ts";
import { fold } from "./vaultfiles.ts";
import { quoteOk, readQuestions } from "./quiznote.ts";
import { cardKey } from "../practice/log.ts";

export type CheckKind = "choice" | "short" | "essay";
export interface CheckItem { q: string; token: string; kind: CheckKind; quote: string; due: string; opts?: string[]; ans?: number; accept?: string[]; points?: string[]; answer?: string }
type O = Record<string, unknown>;
const S = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(S).filter(Boolean) : []);

export const checkPath = (dir: string, basename: string) => `${dir.replace(/\/+$/, "")}/${basename}.check.md`;
/** Tên note trong `check_for: "[[...]]"` ở frontmatter. */
export const checkFor = (text: string) => text.match(/^---\n[\s\S]*?check_for:\s*["']?\[\[([^\]|]+)/)?.[1].trim() ?? null;
/** Khoá lượt kiểm trong nhật ký: theo chữ câu hỏi (token có câu mới → khoá mới → hiện lại). */
export const checkKey = (c: { q: string }) => "chk:" + cardKey(c.q);

function one(x: O, note: string): CheckItem | null {
  const kind = S(x?.kind), base = { q: S(x?.q), token: S(x?.token), quote: S(x?.quote), due: S(x?.due) };
  if (!base.q || !base.token || !/^\d{4}-\d{2}-\d{2}$/.test(base.due) || quoteOk(base.quote, note) !== "ok") return null;
  if (kind === "choice") { const opts = strs(x.opts ?? x.options), ans = Number(x.ans ?? x.answer); return opts.length >= 2 && Number.isInteger(ans) && ans >= 0 && ans < opts.length ? { ...base, kind, opts, ans } : null; }
  if (kind === "short") { const accept = strs(x.accept); return accept.length ? { ...base, kind, accept } : null; }
  if (kind === "essay") { const points = strs(x.points), answer = S(x.answer); return points.length ? { ...base, kind, points, ...(answer ? { answer } : {}) } : null; }
  return null;
}
/** Câu hợp lệ của file kiểm; câu sai khuôn / quote không có trong thân note thì bỏ. File hỏng → []. */
export function parseCheck(text: string, note: string, yaml: (s: string) => unknown): CheckItem[] {
  return (readQuestions(text, yaml)?.qs || []).map(x => one(x, note)).filter((x): x is CheckItem => !!x);
}

/** choice / short chạy trên màn quiz sẵn có (không có giải thích = không gợi ý). */
export const toQItem = (c: CheckItem): QItem => c.kind === "choice"
  ? { type: "quiz", kind: "choice", token: c.token, q: c.q, opts: c.opts, ans: c.ans }
  : { type: "input", kind: "input", token: c.token, q: c.q, accept: c.accept };

const norm = (s: string) => fold(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** short: cả câu trả lời khớp đúng một đáp án chấp nhận, bỏ dấu, bỏ hoa, bỏ dấu câu / khoảng trắng thừa. */
export const gradeShort = (input: string, accept: string[]) => { const a = norm(input); return !!a && accept.some(x => norm(x) === a); };
/** essay: người học tự tick ý đã nói được; đủ mọi ý mới đạt. */
export const gradeEssay = (ticked: boolean[], points: string[]) => points.length > 0 && points.every((_, k) => ticked[k] === true);

/** Câu tới hạn (due ≤ hôm nay) chưa có lượt kiểm nào trong nhật ký.
    shortcut: dựa vào attempts (giữ 200 lượt gần nhất), lượt quá cũ bị cắt thì câu hiện lại. */
export function dueChecks<T>(files: { topic: T; items: CheckItem[] }[], attempts: (t: T) => { key: string }[], today: string): { topic: T; item: CheckItem }[] {
  return files.flatMap(({ topic, items }) => {
    const seen = new Set(attempts(topic).map(a => a.key));
    return items.filter(c => c.due <= today && !seen.has(checkKey(c))).map(item => ({ topic, item }));
  });
}
