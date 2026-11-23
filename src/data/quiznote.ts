/* Đợt 6 (spec 7.6 việc 1) — Quiz note: đường dẫn, lệnh gửi agent, kiểm trích dẫn bằng code. Thuần; YAML parser truyền vào như quest.ts. */
import { items, type QItem } from "./quest.ts";
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

/** Lý do loại một câu. Lỗi khuôn tách cụ thể (noq…keys) để báo người học và gửi lại cho agent; "shape" là lỗi khuôn khác. */
export type VetWhy = QuoteWhy | "type" | "shape" | "noq" | "opts" | "ans" | "blank" | "keys";
export interface Vetted { items: QItem[]; rows: { n: number; token?: string; why: VetWhy }[]; broken?: boolean }
type O = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v));

/** Mọi node của khối quest-map: challenge + mảng questions_json (node không có mảng → qs rỗng). null = thiếu khối / YAML hỏng / JSON hỏng. */
export function readNodes(text: string, yaml: (s: string) => unknown): { c: O; qs: O[] }[] | null {
  const m = text.match(/```quest-map\s*\n([\s\S]*?)\n```/); if (!m) return null;
  let d: O; try { d = yaml(m[1]) as O; } catch { return null; }
  if (!Array.isArray(d?.nodes)) return null;
  const out: { c: O; qs: O[] }[] = [];
  for (const node of d.nodes as O[]) {
    const c = (node?.challenge || {}) as O;
    let qs: unknown = c.questions_json; if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch { return null; } }
    out.push({ c, qs: Array.isArray(qs) ? (qs as O[]) : [] });
  }
  return out;
}
/** Node đầu của khối quest-map. null = thiếu khối / hỏng / không có questions_json. Dùng cho .check.md. */
export function readQuestions(text: string, yaml: (s: string) => unknown): { c: O; qs: O[] } | null {
  const first = readNodes(text, yaml)?.[0];
  return first && first.c.questions_json != null ? first : null;
}

/** Dạng quiz note nhận: các dạng nhiều câu qua questions_json, mỗi câu mang quote riêng. order/match/chain một node một câu nên chưa nhận. */
export const QUIZ_TYPES = ["quiz", "cloze", "truefalse", "input"];   // không nhận text: text là câu tự luận trung tính, không chấm, không vào nhật ký (isEssay)

/** Khuôn mà items() còn cho qua nhưng quiz nhanh không nhận: đúng/sai thiếu hoặc lạ answer, trắc nghiệm dưới 2 phương án. */
/** Lỗi khuôn của một câu theo dạng, null = đúng khuôn. Chặt hơn items(): đúng/sai phải có answer true/false, trắc nghiệm từ 2 phương án. */
function shapeWhy(type: string, x: O): VetWhy | null {
  const txt = (...v: unknown[]) => v.some(y => S(y).trim());
  if (type === "truefalse") return !txt(x.statement, x.q, x.question) ? "noq" : !["true", "false"].includes(S(x.answer ?? x.ans).trim().toLowerCase()) ? "ans" : null;
  if (type === "cloze") return !txt(x.sentence, x.q) ? "noq" : !/\{\{c\d+::[^}]+?\}\}/.test(S(x.sentence ?? x.q)) ? "blank" : null;
  if (type === "input") return !txt(x.prompt, x.question, x.q) ? "noq" : !(Array.isArray(x.keywords) && x.keywords.some(k => S(k).trim())) ? "keys" : null;
  const opts = Array.isArray(x.opts ?? x.options) ? (x.opts ?? x.options) as unknown[] : [], ans = Number(x.ans ?? x.answer);
  return !txt(x.q, x.question) ? "noq" : opts.length < 2 ? "opts" : !Number.isInteger(ans) || ans < 0 || ans >= opts.length ? "ans" : null;
}
const DROP: Partial<Record<VetWhy, string>> = { notfound: "trích dẫn không có nguyên văn trong note", noquote: "thiếu trích dẫn", short: "trích dẫn dưới 12 ký tự",
  type: "dạng câu quiz nhanh không nhận", shape: "sai khuôn", noq: "thiếu câu hỏi", opts: "dưới 2 phương án", ans: "đáp án không hợp lệ", blank: "cloze không có chỗ trống {{c1::...}}", keys: "thiếu từ khoá" };
/** Phần nối vào lệnh soạn lại: câu nào bị loại vì sao (tiếng Việt, không qua tr). Không câu nào bị loại → chuỗi rỗng. */
export const dropNote = (rows: { n: number; why: VetWhy }[]) => {
  const bad = rows.filter(r => r.why !== "ok");
  return bad.length ? ` Lần trước plugin bỏ: ${bad.map(r => `câu ${r.n} (${DROP[r.why] || r.why})`).join(", ")}. Lần này tránh đúng các lỗi đó.` : "";
};

/** Đọc file quiz do agent ghi (quest-map v1, 1 node, type thuộc QUIZ_TYPES, mỗi câu có quote). Khuôn từng câu đọc bằng items() của quest.ts.
    File hỏng / thiếu block → broken, không ném lỗi (màn chờ không được treo). */
export function vetQuiz(text: string, note: string, yaml: (s: string) => unknown): Vetted {
  const nodes = readNodes(text, yaml); if (!nodes) return { items: [], rows: [], broken: true };
  const out: Vetted = { items: [], rows: [] };
  for (const { c, qs } of nodes) {
    const okType = QUIZ_TYPES.includes(S(c.type)), tokOf = (x?: O) => (x?.token ? S(x.token) : c.token ? S(c.token) : undefined);
    if (!okType) { out.rows.push({ n: out.rows.length + 1, token: tokOf(), why: "type" }); continue; }   // node dạng chưa nhận: báo một dòng
    for (const x of qs) {
      const it = x ? items({ ...c, questions_json: [x] })[0] : undefined, why: VetWhy = shapeWhy(S(c.type), x || {}) ?? (!it ? "shape" : quoteOk(x.quote, note));
      out.rows.push({ n: out.rows.length + 1, token: tokOf(x), why });
      if (why === "ok" && it) out.items.push({ ...it, token: tokOf(x), quote: S(x.quote) });
    }
  }
  return out;
}
