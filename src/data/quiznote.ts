/* Đợt 6 (spec 7.6 việc 1) — Quiz note: đường dẫn, lệnh gửi agent, kiểm trích dẫn bằng code. Thuần; YAML parser truyền vào như quest.ts. */
import type { QItem } from "./quest.ts";
import { QUIZ_GUIDE_PATH } from "./lecguide.ts";

export const DEFAULT_QUIZ_DIR = "Pie Study/quiz";
export const quizPath = (dir: string, basename: string) => `${dir.replace(/\/+$/, "")}/${basename}.quiz.md`;
/** Lệnh gửi agent — tiếng Việt, không qua tr(). "dễ hơn" dùng cho "Luyện thêm bộ dễ hơn" ở màn kết quả. */
export const quizCmd = (basename: string, path: string, easierTokens?: string[]) =>
  `quiz note [[${basename}]] — 5 câu${easierTokens?.length ? ` dễ hơn, tập trung token: ${easierTokens.join(", ")}` : ""}, theo hướng dẫn "${QUIZ_GUIDE_PATH}" (làm theo file này, không cần nạp skill), ghi vào "${path}"`;   // từ khoá kích hoạt skill ở đầu lệnh; khuôn file nằm ở file hướng dẫn plugin ghi

/** Chuẩn hoá để so trích dẫn: NFC, bỏ * _ ` và ngoặc wikilink, gộp khoảng trắng, chữ thường. */
export const normQuote = (s: string) => s.normalize("NFC").replace(/\[\[|\]\]/g, "").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const bodyOf = (note: string) => note.replace(/^---\n[\s\S]*?\n---\n?/, "");

export type QuoteWhy = "ok" | "noquote" | "short" | "notfound";
/** Giữ câu khi quote (đã chuẩn hoá) dài từ 12 ký tự và là chuỗi con của THÂN note (không tính frontmatter). */
export function quoteOk(quote: unknown, note: string): QuoteWhy {
  const q = typeof quote === "string" ? normQuote(quote) : "";
  if (!q) return "noquote";
  if (q.length < 12) return "short";
  return normQuote(bodyOf(note)).includes(q) ? "ok" : "notfound";
}

export type VetWhy = QuoteWhy | "type" | "shape";
export interface Vetted { items: QItem[]; rows: { n: number; token?: string; why: VetWhy }[]; broken?: boolean }
type O = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v));

/** Khối quest-map một node: challenge + mảng questions_json. null = thiếu khối / hỏng. Dùng chung cho .quiz.md và .check.md. */
export function readQuestions(text: string, yaml: (s: string) => unknown): { c: O; qs: O[] } | null {
  const m = text.match(/```quest-map\s*\n([\s\S]*?)\n```/); if (!m) return null;
  let d: O; try { d = yaml(m[1]) as O; } catch { return null; }
  const node = Array.isArray(d?.nodes) ? (d.nodes as O[])[0] : null, c = (node?.challenge || {}) as O;
  let qs: unknown = c.questions_json; if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch { return null; } }
  return Array.isArray(qs) ? { c, qs: qs as O[] } : null;
}

/** Đọc file quiz do agent ghi (quest-map v1, 1 node, type quiz, mỗi câu có quote). Đợt này chỉ nhận trắc nghiệm một đáp án.
    File hỏng / thiếu block → broken, không ném lỗi (màn chờ không được treo). */
export function vetQuiz(text: string, note: string, yaml: (s: string) => unknown): Vetted {
  const r = readQuestions(text, yaml); if (!r) return { items: [], rows: [], broken: true };
  const { c, qs } = r;
  const out: Vetted = { items: [], rows: [] };
  qs.forEach((x, k) => {
    const token = x?.token ? S(x.token) : c.token ? S(c.token) : undefined, opts = Array.isArray(x?.options ?? x?.opts) ? ((x.options ?? x.opts) as unknown[]).map(S) : [], ans = Number(x?.answer ?? x?.ans);
    let why: VetWhy = S(c.type) !== "quiz" ? "type" : !S(x?.q ?? x?.question) || opts.length < 2 || !Number.isInteger(ans) || ans < 0 || ans >= opts.length ? "shape" : quoteOk(x.quote, note);
    out.rows.push({ n: k + 1, token, why });
    if (why === "ok") out.items.push({ type: "quiz", kind: "choice", token, q: S(x.q ?? x.question), opts, ans, ex: S(x.explanation), quote: S(x.quote) });
  });
  return out;
}
