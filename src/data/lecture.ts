/* Đợt 3 (spec 7.3) — thuần, test bằng node: đề tự luận, lệnh chấm bài, kiểm message từ bài giảng, chuẩn bị file bài giảng cho iframe cách ly. */
import { TOKENS } from "./rubric.ts";
import type { Quest } from "./quest.ts";

const TOKEN_SET = new Set<string>(TOKENS.map(t => t[0]));
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Message hợp lệ từ bài giảng: object thường, khoá riêng {type:"pie-study/answer", token: 1 trong 17 kiểu hiểu, ok: boolean} + tuỳ chọn block (đúng dạng id).
    Mọi thứ khác → null (bỏ qua). */
export function parseAnswerMsg(d: unknown): { token: string; ok: boolean; block?: string } | null {
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const o = d as Record<string, unknown>, keys = Object.keys(o), hasBlock = keys.length === 4 && own(o, "block");
  if ((keys.length !== 3 && !hasBlock) || !["type", "token", "ok"].every(k => own(o, k))) return null;
  if (o.type !== "pie-study/answer" || typeof o.ok !== "boolean" || typeof o.token !== "string" || !TOKEN_SET.has(o.token)) return null;
  if (hasBlock && !isBlockId(o.block)) return null;
  return hasBlock ? { token: o.token, ok: o.ok, block: o.block as string } : { token: o.token, ok: o.ok };
}

/* ── Đợt 7 (spec 7.7): bài giảng theo khối ── */
export const BLOCK_KINDS = ["intro", "predict", "timeline", "graph", "cards", "deeper", "takeaway"] as const;
export type BlockKind = typeof BLOCK_KINDS[number];
/** 7.8: khối `visual` chỉ có trong file "chỉ chứa khối" (không có trong mẫu 7.7). */
export type LecKind = BlockKind | "visual";
export interface LecBlock { id: string; kind: LecKind; title: string; predict?: boolean; quote?: string }
export const isBlockId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,32}$/.test(v);
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Mục lục khối: plugin TỰ đọc chữ của file .html (không hỏi iframe). Bỏ loại lạ, id sai dạng hoặc trùng. Bài giảng cũ không có khối → []. */
export function lectureBlocks(html: string): LecBlock[] {
  const out: LecBlock[] = [], seen = new Set<string>();
  for (const m of html.matchAll(/<section\b([^>]*)>/gi)) {
    const a: Record<string, string> = {};
    for (const x of m[1].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[x[1].toLowerCase()] = x[2] ?? x[3] ?? "";
    const kind = a["data-block"] as LecKind, id = a["data-id"];
    if (!(BLOCK_KINDS.includes(kind as BlockKind) || kind === "visual") || !isBlockId(id) || seen.has(id)) continue;
    seen.add(id); out.push(kind === "visual" ? { id, kind, title: unesc(a["data-title"] || "").trim(), predict: !!(a["data-predict"] || "").trim(), quote: unesc(a["data-quote"] || "") } : { id, kind, title: unesc(a["data-title"] || "").trim() });
  }
  return out;
}

export type LecMsg = { kind: "answer"; token: string; ok: boolean; block?: string } | { kind: "at" | "deeper"; block: string } | { kind: "broken"; block: string; why?: string };
/** Mọi message từ bài giảng: answer (khuôn trên), hoặc {type:"pie-study/at"|"pie-study/deeper"|"pie-study/broken", block} đúng 2 khoá. Còn lại → null. */
export function parseLecMsg(d: unknown): LecMsg | null {
  const a = parseAnswerMsg(d); if (a) return { kind: "answer", ...a };
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const o = d as Record<string, unknown>, keys = Object.keys(o);
  if (!own(o, "type") || !own(o, "block") || !isBlockId(o.block)) return null;
  const kind = o.type === "pie-study/at" ? "at" : o.type === "pie-study/deeper" ? "deeper" : o.type === "pie-study/broken" ? "broken" : null;
  if (!kind) return null;
  if (kind === "broken" && keys.length === 3) {   // thêm đúng một khoá `why` (câu lỗi ngắn, chỉ để ghi log), đã lọc ký tự điều khiển và cắt 160 ký tự
    if (!own(o, "why") || typeof o.why !== "string") return null;
    const why = [...o.why].map(c => c.charCodeAt(0) < 32 || c === "\u007f" ? " " : c).join("").trim().slice(0, 160);
    return { kind, block: o.block, ...(why ? { why } : {}) };
  }
  return keys.length === 2 ? { kind, block: o.block } : null;
}
/** Khung báo khối lỗi: chỉ nhận khối visual có trong file; đã có → trả lại chính mảng cũ (không vẽ lại). */
export function markBroken(bad: string[], block: string, blocks: LecBlock[]): string[] {
  return bad.includes(block) || !blocks.some(b => b.id === block && b.kind === "visual") ? bad : [...bad, block];
}

/** Dòng "Đào sâu" ở cột phải: chỉ khối có trong file, gộp theo khối, tối đa DEEPER_CAP dòng (bài giảng gửi dồn không làm cột phình). */
export const DEEPER_CAP = 10;
export const addDeeper = (list: string[], block: string, known: Set<string>) => (known.has(block) && !list.includes(block) && list.length < DEEPER_CAP ? [...list, block] : list);
/** Khoá câu bài giảng trong nhật ký: theo khối nếu bài giảng gửi block, không thì theo token (như đợt 4). */
export const lecAnswerKey = (path: string, a: { token: string; block?: string }) => `lec:${path}#${a.block || a.token}`;

/** CSP chèn vào mọi bài giảng: chỉ chạy script/CSS nội tuyến, ảnh/font nhúng data:; không gọi mạng, không tải gì từ ngoài. */
export const LECTURE_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:";

/** Chèn CSP lên đầu <head> (không có head thì đầu tài liệu) và gắn class theme vào <body>. */
export function prepareLectureDoc(html: string, theme: "light" | "dark"): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${LECTURE_CSP}">`;
  let out = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + meta) : meta + html;
  out = out.replace(/<body([^>]*)>/i, (_m, attrs: string) => {
    const tag = _m.slice(1, 5), cls = attrs.match(/\sclass="([^"]*)"/i);
    return cls ? `<${tag}${attrs.replace(cls[0], ` class="${theme} ${cls[1]}"`)}>` : `<${tag} class="${theme}"${attrs}>`;
  });
  return out;
}

/** learn_lecture (spec 4.6): một đường dẫn hoặc danh sách; nhận cả dạng [[...]] / [[...|nhãn]]; chỉ giữ file .html. */
export function lecturePaths(v: unknown): string[] {
  const list = Array.isArray(v) ? v : v == null ? [] : [v];
  return list.filter((x): x is string => typeof x === "string")
    .map(s => s.trim().replace(/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/, "$1").trim())
    .filter(s => /\.html?$/i.test(s));
}

export interface EssayPrompt { q: string; token: string }
/** Đề tự luận của một bài: challenge type text trong quest của bài, không có thì câu teach-back trong thẻ ôn. */
/** Đề tự luận của bài: câu text trong quest → thẻ teach-back → file đề tự luận đã qua kiểm trích dẫn (spec 7.9). */
export function essayPrompt(slug: string, quests: Quest[], cards: { token?: string; q: string }[], file?: EssayPrompt | null): EssayPrompt | null {
  for (const qs of quests) {
    if (!qs.topics.includes(slug)) continue;
    for (const n of qs.nodes) { const it = n.items.find(x => x.type === "text" && x.q); if (it) return { q: it.q, token: it.token || "teach-back" }; }
  }
  const tb = cards.find(c => c.token === "teach-back" && c.q.trim());
  return tb ? { q: tb.q.trim(), token: "teach-back" } : file || null;
}

export const essayCmd = (slug: string, p: EssayPrompt, text: string) => `chấm bài tự luận [[${slug}]] — token: ${p.token}\nĐề: ${p.q}\nBài làm: ${text.trim()}`;
