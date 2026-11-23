/* Spec 7.9: file đề tự luận agent ra ("<thư mục quiz>/<basename>.essay.md", khuôn quest-map v1 như quiz note, 1 node, challenge.type text)
   và trạng thái hai mục Trắc nghiệm / Tự luận của menu "Thêm". Thuần, test bằng node. */
import { quoteOk, type QuoteWhy } from "./quiznote.ts";
import { QUIZ_GUIDE_PATH } from "./lecguide.ts";

type O = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v)).trim();

/** points: các ý bài làm tốt phải nêu (barem chấm), tuỳ chọn để file cũ vẫn hợp lệ. */
export interface EssayFilePrompt { q: string; token: string; quote: string; points?: string[] }
export type EssayWhy = QuoteWhy | "broken" | "type" | "shape";
export interface EssayVet { prompt: EssayFilePrompt | null; why: EssayWhy }

export const essayPath = (dir: string, basename: string) => `${dir.replace(/\/+$/, "")}/${basename}.essay.md`;
/** Lệnh gửi agent — tiếng Việt, không qua tr(). */
export const essayReqCmd = (basename: string, path: string) => `ra đề tự luận [[${basename}]] — 1 câu, theo hướng dẫn "${QUIZ_GUIDE_PATH}" (làm theo file này, không cần nạp skill), ghi vào "${path}"`;

/** Đề đầu tiên của file. Không đòi `keywords` (không dùng để chấm); trích dẫn kiểm bằng quoteOk như quiz note. */
export function vetEssay(text: string, note: string, yaml: (s: string) => unknown): EssayVet {
  const bad: EssayVet = { prompt: null, why: "broken" };
  const m = text.match(/```quest-map\s*\n([\s\S]*?)\n```/); if (!m) return bad;
  let d: O; try { d = yaml(m[1]) as O; } catch { return bad; }
  const node = Array.isArray(d?.nodes) ? (d.nodes as O[])[0] : null, c = (node?.challenge || {}) as O;
  let qs: unknown = c.questions_json; if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch { return bad; } }
  if (!Array.isArray(qs)) return bad;
  if (S(c.type) !== "text") return { prompt: null, why: "type" };
  const x = (qs[0] || {}) as O, q = S(x.q ?? x.question ?? x.prompt);
  if (!q) return { prompt: null, why: "shape" };
  const why = quoteOk(x.quote, note);
  if (why !== "ok") return { prompt: null, why };
  const points = Array.isArray(x.points) ? x.points.map(S).filter(Boolean) : [];
  return { prompt: { q, token: S(x.token) || S(c.token) || "teach-back", quote: S(x.quote), ...(points.length ? { points } : {}) }, why };
}

/** Mục Trắc nghiệm: có quest → quest · không quest mà có quiz nhanh hợp lệ → quiz nhanh · chưa có gì → nhờ agent soạn.
    Mục Tự luận: có đề (quest / thẻ teach-back / file đề) → viết bài · chưa có → nhờ agent ra đề. Không mục nào khoá. */
/** Mục Bài giảng (8b): có bài giảng → mở · chưa có → nhờ agent soạn (không khoá). */
export const moreModes = (o: { quest: boolean; quickN: number; essay: boolean; lecture: boolean }) =>
  ({ quiz: o.quest ? "quest" : o.quickN > 0 ? "quick" : "ask", essay: o.essay ? "have" : "ask", lecture: o.lecture ? "have" : "ask" } as const);
