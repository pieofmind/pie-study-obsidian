/* Sơ đồ khái niệm 3 cấp (prototype d17). Thuần: đọc khối mermaid, dựng đồ thị, xếp chỗ bằng lực. Không import obsidian.
   Hiểu cạnh `A["nhãn"]:::lớp --> B["nhãn"]` (mọi kiểu mũi tên, nhãn cạnh bỏ đi) và dòng khai nút lẻ `A["nhãn"]:::lớp`; mọi dòng khác bỏ qua. */
import { fold } from "./vaultfiles.ts";
import { shortTitle } from "./index.ts";

export const MAP_HEADING = "Sơ đồ khái niệm";
export const PAL = ["#3E8E6E", "#C27C2C", "#7A5EC2", "#2F7FB8", "#C2477A", "#5E8F2E"];

/** Khối mermaid đầu tiên dưới `## Sơ đồ khái niệm` (hết mục khi gặp heading cùng cấp hoặc cao hơn). Không có → null. */
export function extractMap(md: string): string | null {
  const lines = md.replace(/\r/g, "").split("\n"); let i = 0;
  for (; i < lines.length; i++) if (/^##\s+/.test(lines[i]) && fold(lines[i].replace(/^##\s+/, "").trim()) === fold(MAP_HEADING)) break;
  if (i >= lines.length) return null;
  for (i++; i < lines.length && !/^#{1,2}\s/.test(lines[i]); i++) {
    if (!/^\s*```\s*mermaid\b/i.test(lines[i])) continue;
    const out: string[] = [];
    for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) out.push(lines[i]);
    return out.join("\n");
  }
  return null;
}

export interface CmNode { id: string; lab: string; cls: string; slug?: string; lod?: boolean }   // slug: chấm bài (bấm → trang bài); lod: khái niệm trong sơ đồ bài (ẩn khi thu nhỏ ở đồ thị lớn)
export interface CmParse { nodes: Map<string, CmNode>; kids: Map<string, string[]>; root: string | null; edges: number }

/** Mọi kiểu mũi tên mermaid (có nhãn `-->|x|`, `-- x -->`, đứt nét `-.->`, đậm `==>`, không đầu `---`) → `-->`; nhãn cạnh bỏ đi. */
const arrows = (l: string) => l
  .replace(/\s*(?:--|==|-\.)\s+[^|>\n]*?\s+(?:-->|==>|\.->)\s*/g, " --> ")
  .replace(/\s*(?:-->|==>|-\.->|---|===|-\.-)\s*(?:\|[^|]*\|)?\s*/g, " --> ");
const TOK = /([A-Za-z0-9_]+)(?:\["([^"]*)"\]|\("([^"]*)"\)|\[([^\]"]+)\])?(?::::([A-Za-z0-9_]+))?/;
/** Cạnh `A --> B` (mỗi dòng đúng một cạnh) và dòng khai nút lẻ. Gốc = nút đầu tiên không có cha. */
export function parseMermaid(src: string): CmParse {
  const nodes = new Map<string, CmNode>(), kids = new Map<string, string[]>(), hasParent = new Set<string>(); let edges = 0;
  const node = (id: string, lab?: string, cls?: string) => { const o = nodes.get(id) || { id, lab: id, cls: "" }; if (lab) o.lab = lab; if (cls) o.cls = cls; nodes.set(id, o); return id; };
  for (const raw of src.split("\n")) {
    const m = arrows(raw.trim()).split("-->");
    if (m.length === 1) { const z = m[0].trim().match(TOK); const zl = z && (z[2] || z[3] || z[4]); if (z && zl && !/^(classDef|class|style|linkStyle|subgraph|flowchart|graph)$/.test(z[1])) node(z[1], zl, z[5]); continue; }
    if (m.length !== 2) continue;
    const a = m[0].trim().match(TOK), b = m[1].trim().match(TOK); if (!a || !b) continue;
    const x = node(a[1], a[2] || a[3] || a[4], a[5]), y = node(b[1], b[2] || b[3] || b[4], b[5]);
    if (x === y) continue;
    const ks = kids.get(x) || []; if (!ks.includes(y)) { ks.push(y); kids.set(x, ks); hasParent.add(y); edges++; }
  }
  return { nodes, kids, root: [...nodes.keys()].find(k => !hasParent.has(k)) ?? null, edges };
}

/** Nhãn dạng `[[liên kết|Tên]]` hoặc `[[liên kết]]` → tên hiện + liên kết; nhãn thường → không liên kết. */
export function splitLabel(lab: string): { text: string; link: string | null } {
  const m = lab.trim().match(/^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/);
  return m ? { text: (m[2] || m[1]).trim(), link: m[1].trim() } : { text: lab.trim(), link: null };
}

export interface NoteRec { path: string; names: string[] }
export type NoteIndex = Map<string, Set<string>>;
/** Tên (basename, tiêu đề, alias) → các đường dẫn note, so khớp không dấu và không phân biệt hoa thường. */
export function buildNoteIndex(notes: NoteRec[]): NoteIndex {
  const ix: NoteIndex = new Map();
  for (const n of notes) for (const name of n.names) { const k = fold(name.trim()); if (!k) continue; const s = ix.get(k) || new Set(); s.add(n.path); ix.set(k, s); }
  return ix;
}
/** Chấm đặc khi có đúng một note khớp; nhiều note khớp = coi như không có. */
export function lookupNote(ix: NoteIndex, label: string): string | null {
  const s = ix.get(fold(label.trim())); return s && s.size === 1 ? [...s][0] : null;
}

export interface CmBlock {
  id: string; lab: string; d: number; b: number; par: string | null; px: number; lines: string[]; w: number; path: string | null; slug?: string; lod: boolean;
  r: number; x: number; y: number; vx: number; vy: number; kids: string[]; a: number; size: number; lh: number; hw: number; top: number; bot: number; fixed?: boolean;
}
export interface CmGraph { N: CmBlock[]; E: [string, string][]; byId: Map<string, CmBlock>; root: CmBlock; scale: number }   // scale: đồ thị lớn dãn ra theo √N để đủ chỗ cho các khối
export type Measure = (text: string, px: number) => number;

/** Nhãn mermaid → chữ thuần: <br/> = xuống dòng, thẻ HTML khác bỏ, vài thực thể thường gặp được giải mã. */
export function cleanLabel(raw: string): string {
  return raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;|#quot;/g, '"').replace(/&amp;/g, "&")
    .split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}

/** Xuống dòng theo bề rộng, tối đa 3 dòng, dòng cuối cắt thêm "…". */
export function wrapLabel(text: string, px: number, maxW: number, measure: Measure): { lines: string[]; w: number } {
  const out: string[] = [];
  for (const seg of text.split("\n")) {   // ngắt dòng có sẵn (<br/>) giữ nguyên, mỗi đoạn vẫn wrap theo bề rộng
    let line = "";
    for (const word of seg.split(/\s+/).filter(Boolean)) {
      const t = line ? line + " " + word : word;
      if (measure(t, px) <= maxW || !line) line = t; else { out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  if (!out.length) out.push("");
  if (out.length > 3) { out.length = 3; out[2] = out[2].replace(/\s*\S*$/, "") + "…"; }
  return { lines: out, w: Math.max(...out.map(l => measure(l, px))) };
}

const jit = (id: string, k: number) => { let h = k; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return ((h >>> 0) % 1000) / 1000 - .5; };

/** Dựng khối (chấm + tên) cho cây. Cây có chu trình hoặc không có gốc → null. `pathOf(nhãn, liên kết)` cho đường dẫn note thật. */
export function buildGraph(p: CmParse, measure: Measure, pathOf: (text: string, link: string | null) => string | null): CmGraph | null {
  if (!p.root || !p.edges) return null;
  const N: CmBlock[] = [], byId = new Map<string, CmBlock>(), E: [string, string][] = [], seen = new Set<string>();
  const walk = (id: string, d: number, b: number, par: string | null, a0: number, a1: number) => {
    seen.add(id);
    const n = p.nodes.get(id)!, ks = (p.kids.get(id) || []).filter(k => !seen.has(k)), { text: rawText, link } = splitLabel(n.lab), text = cleanLabel(rawText);
    const px = d === 0 ? 15 : d === 1 ? 13.5 : 12, wr = wrapLabel(text, px, d === 0 ? 170 : 130, measure);
    const o: CmBlock = { id, lab: text, d, b, par, px, ...wr, path: n.slug ? null : pathOf(text, link), slug: n.slug, lod: !!n.lod, r: d === 0 ? 14 : Math.max(5, 11 - d * 2), x: 0, y: 0, vx: 0, vy: 0, kids: ks, a: (a0 + a1) / 2, size: 1, lh: px * 1.25, hw: 0, top: 0, bot: 0 };
    N.push(o); byId.set(id, o);
    let s = a0; ks.forEach((k, j) => { if (seen.has(k)) return; E.push([id, k]); const s1 = s + (a1 - a0) / ks.length; walk(k, d + 1, d === 0 ? j : b, id, s, s1); s = s1; });
  };
  walk(p.root, 0, -1, null, -Math.PI, Math.PI);
  const scale = Math.max(1, Math.sqrt(N.length / 60));
  for (const o of N) { const R = o.d * 150 * scale; o.x = Math.cos(o.a) * R + jit(o.id, 1) * 8; o.y = Math.sin(o.a) * R + jit(o.id, 2) * 8; }
  for (const o of [...N].reverse()) if (o.par) byId.get(o.par)!.size += o.size;
  for (const o of N) { if (o.d > 0) o.r += Math.min(5, o.size - 1); o.hw = Math.max(o.r, o.w / 2) + 6; o.top = o.r + 6; o.bot = o.r + 6 + o.lines.length * o.lh; }
  return { N, E, byId, root: byId.get(p.root)!, scale };
}

export const BIG = 150;   // quá số chấm này: tìm cặp gần nhau bằng lưới thay vì mọi cặp, khái niệm chỉ hiện khi phóng to
/** Gọi fn cho các cặp có thể tương tác trong tầm `reach` (nhỏ: mọi cặp; lớn: lưới ô vuông, O(N)). */
function pairs(N: CmBlock[], reach: number, fn: (p: CmBlock, q: CmBlock) => void) {
  if (N.length <= BIG) { for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++) fn(N[a], N[b]); return; }
  const cells = new Map<number, number[]>(), key = (cx: number, cy: number) => cx * 73856093 ^ cy * 19349663;
  N.forEach((o, k) => { const kk = key(Math.floor(o.x / reach), Math.floor(o.y / reach)), l = cells.get(kk); if (l) l.push(k); else cells.set(kk, [k]); });
  N.forEach((o, a) => { const cx = Math.floor(o.x / reach), cy = Math.floor(o.y / reach);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const l = cells.get(key(cx + dx, cy + dy)); if (l) for (const b of l) if (b > a) fn(o, N[b]); } });
}
/** Một bước vật lý: đẩy nhau, lò xo theo cạnh, kéo gốc về giữa, rồi va chạm theo KHỐI (chấm + tên) để chữ không đè chấm hay chữ khác. */
export function tick(G: CmGraph, alpha: number) {
  const { N, E, byId } = G;
  const S = G.scale;
  pairs(N, 420 * S, (p, q) => {   // đẩy nhau (ngoài 420px lực < 1.5% nên bỏ qua ở đồ thị lớn)
    let dx = q.x - p.x, dy = q.y - p.y; const d2 = dx * dx + dy * dy || .01, f = 2600 * S * S * alpha / d2, d = Math.sqrt(d2);
    dx /= d; dy /= d; p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f;
  });
  for (const [s, t] of E) {
    const p = byId.get(s)!, q = byId.get(t)!, L = (q.d === 1 ? 170 : 105) * S, dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || .01, f = (d - L) / d * .08 * alpha;
    q.vx -= dx * f; q.vy -= dy * f; p.vx += dx * f * .5; p.vy += dy * f * .5;
  }
  for (const o of N) {
    if (o === G.root) { o.vx += -o.x * .05; o.vy += -o.y * .05; }
    if (o.fixed) { o.vx = o.vy = 0; continue; }
    o.vx *= .6; o.vy *= .6; o.x += o.vx; o.y += o.vy;
  }
  separate(G, 3);
}
const EPS = .01;   // chạm sát nhau không tính là chồng (sai số số thực)
/** Đẩy các khối đang chồng nhau ra; trả số cặp còn chồng sau lượt cuối. */
export function separate(G: CmGraph, iters: number): number {
  const N = G.N; let left = 0; const reach = Math.max(2 * Math.max(...N.map(o => o.hw)), Math.max(...N.map(o => o.bot + o.top))) + 2;
  for (let it = 0; it < iters; it++) {
    left = 0;
    pairs(N, reach, (p, q) => {
      const ox = p.hw + q.hw - Math.abs(p.x - q.x), oy = (q.y > p.y ? p.bot + q.top : q.bot + p.top) - Math.abs(p.y - q.y);
      if (ox <= EPS || oy <= EPS) return;
      left++;
      const wp = p.fixed ? 0 : q.fixed ? 1 : .5, wq = 1 - wp;
      if (ox < oy) { const s = (q.x > p.x ? 1 : -1) * (ox + .5); p.x -= s * wp; q.x += s * wq; } else { const s = (q.y > p.y ? 1 : -1) * (oy + .5); p.y -= s * wp; q.y += s * wq; }
    });
    if (!left) break;
  }
  return left;
}
/** Chạy sẵn `n` bước rồi tách nốt cho tới khi không còn khối chồng (tối đa 600 lượt). Trả alpha còn lại. */
export function settle(G: CmGraph, n = 160): number {
  const big = G.N.length > BIG; if (big) n = Math.max(40, Math.round(n * BIG / G.N.length));   // lớn: ít vòng sẵn, phần còn lại chạy dần theo từng khung hình
  let alpha = 1; for (let k = 0; k < n; k++) { tick(G, alpha); alpha *= .985; }
  separate(G, 600); return alpha;
}
export function overlaps(G: CmGraph): number {
  let c = 0; const N = G.N;
  for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++) {
    const p = N[a], q = N[b];
    if (p.hw + q.hw - Math.abs(p.x - q.x) > EPS && (q.y > p.y ? p.bot + q.top : q.bot + p.top) - Math.abs(p.y - q.y) > EPS) c++;
  }
  return c;
}

/* ── dimension ── */
export interface DimTopic { slug: string; dimension?: string }
export interface DimGroup<T> { key: string; link: string; topics: T[] }
/** Bài cùng `learn_dimension` (so theo tên file của liên kết, không phân biệt hoa thường) thành một dimension; giữ thứ tự xuất hiện. Bài không có dimension không vào nhóm nào. */
export function groupDimensions<T extends DimTopic>(topics: T[]): DimGroup<T>[] {
  const g = new Map<string, DimGroup<T>>();
  for (const t of topics) {
    if (!t.dimension) continue;
    const key = t.dimension.split("/").pop()!.replace(/\.md$/i, "").trim().toLowerCase(); if (!key) continue;
    const e = g.get(key) || { key, link: t.dimension, topics: [] }; e.topics.push(t); g.set(key, e);
  }
  return [...g.values()];
}

/** Lệnh nhờ agent vẽ (đúng chuỗi d17). */
export const cmdDrawMap = (where: string, path: string) => `vẽ sơ đồ khái niệm cho ${where} — cây một chiều LR, nền pastel chữ tối, ghi vào mục "## ${MAP_HEADING}" của "${path}"`;

/* ── sơ đồ tổng ghép từ sơ đồ các bài (như Graph view): lộ trình → dimension → bài → khái niệm ── */
export interface MergeTopic { slug: string; title: string; dim?: string; map: CmParse | null }
/** Gốc = lộ trình; mỗi dimension một nhánh (bài không có dimension nằm thẳng dưới gốc); dưới mỗi bài là các khái niệm trong sơ đồ của bài, gốc sơ đồ bài chính là chấm bài (không lặp).
    Bài chưa có sơ đồ = một chấm bài. Chấm bài có `slug`; khái niệm có `lod`. */
export function mergeCurriculum(title: string, dims: { key: string; title: string }[], topics: MergeTopic[]): CmParse {
  const nodes = new Map<string, CmNode>(), kids = new Map<string, string[]>(); let edges = 0;
  const add = (id: string, n: Omit<CmNode, "id">, par?: string) => { nodes.set(id, { id, ...n }); if (par) { (kids.get(par) || kids.set(par, []).get(par)!).push(id); edges++; } };
  add("R", { lab: title, cls: "" });
  const dimId = new Map(dims.map(d => [d.key, `D_${d.key}`]));
  for (const t of topics) { const dk = t.dim && dimId.has(t.dim) ? t.dim : undefined; if (dk && !nodes.has(dimId.get(dk)!)) add(dimId.get(dk)!, { lab: dims.find(x => x.key === dk)!.title, cls: "" }, "R"); }
  for (const t of topics) {
    const par = t.dim && dimId.has(t.dim) ? dimId.get(t.dim)! : "R", tid = `T_${t.slug}`;
    add(tid, { lab: shortTitle(t.title), cls: "", slug: t.slug }, par);
    const m = t.map; if (!m?.root) continue;
    const seen = new Set<string>([m.root]);
    const walk = (id: string, pid: string) => { for (const k of m.kids.get(id) || []) { if (seen.has(k)) continue; seen.add(k); const cid = `C_${t.slug}_${k}`; add(cid, { lab: m.nodes.get(k)!.lab, cls: "", lod: true }, pid); walk(k, cid); } };
    walk(m.root, tid);
  }
  return { nodes, kids, root: "R", edges };
}
