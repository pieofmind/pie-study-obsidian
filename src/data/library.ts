/* Spec 7.10 bước 5 & 7: kho nguồn `Pie Study/kho-nguon.json` — file riêng của plugin (không phải note người dùng). Thuần, bất biến. */
export type SourceKind = "vault" | "notebooklm" | "web";
export type SourceStatus = "ready" | "pending" | "broken";
export interface Source { id: string; title: string; by?: string; kind: SourceKind; ref: string; toc?: string; cover?: string; paths: string[]; status: SourceStatus; added: string; checked?: string }
export interface Library { version: 1; sources: Source[] }
/** error là mã: "json" · "shape" · "entry:<số thứ tự>" · "dup:<id>" (giao diện dịch bằng tr()). */
export type LibRead = { ok: true; lib: Library } | { ok: false; error: string };

export const LIB_PATH = "Pie Study/kho-nguon.json", SRC_DIR = "Pie Study/nguon";
const KINDS = ["vault", "notebooklm", "web"], STATUSES = ["ready", "pending", "broken"];
const s = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : "";

/** text = null khi file chưa có → kho rỗng hợp lệ. JSON hỏng hoặc sai khuôn → ok:false (người gọi KHÔNG ghi đè file). */
export function parseLibrary(text: string | null): LibRead {
  if (text == null || !text.trim()) return { ok: true, lib: { version: 1, sources: [] } };
  let d: unknown; try { d = JSON.parse(text); } catch { return { ok: false, error: "json" }; }
  const o = d as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || Array.isArray(o) || o.version !== 1 || !Array.isArray(o.sources)) return { ok: false, error: "shape" };
  const seen = new Set<string>(), out: Source[] = [];
  for (const [k, x] of (o.sources as unknown[]).entries()) {
    const r = x as Record<string, unknown>, id = s(r?.id), title = s(r?.title), ref = s(r?.ref);
    if (!r || typeof r !== "object" || !id || !title || !ref || !KINDS.includes(r.kind as string) || !Array.isArray(r.paths) || r.paths.some(p => typeof p !== "string")
      || !STATUSES.includes(r.status as string) || !s(r.added)) return { ok: false, error: `entry:${k + 1}` };
    if (seen.has(id)) return { ok: false, error: `dup:${id}` };
    seen.add(id);
    const src: Source = { id, title, kind: r.kind as SourceKind, ref, paths: r.paths as string[], status: r.status as SourceStatus, added: s(r.added) };
    for (const f of ["by", "toc", "cover", "checked"] as const) if (s(r[f])) src[f] = s(r[f]);
    out.push(src);
  }
  return { ok: true, lib: { version: 1, sources: out } };
}
export const serializeLibrary = (lib: Library) => JSON.stringify(lib, null, 2) + "\n";

export function slug(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "nguon";
}
/** id chưa dùng trong kho (thêm -2, -3… khi trùng). */
export function uniqueId(lib: Library, base: string): string { const ids = new Set(lib.sources.map(v => v.id)); let id = base, n = 2; while (ids.has(id)) id = `${base}-${n++}`; return id; }
export function addSource(lib: Library, x: Omit<Source, "id" | "added"> & { id?: string }, now: Date): Library {
  const id = uniqueId(lib, x.id || slug(x.title));
  return { version: 1, sources: [...lib.sources, { ...x, id, added: now.toISOString() }] };
}
export const sourcesOf = (lib: Library, domain: string) => lib.sources.filter(v => v.paths.includes(domain));

const ext = (ref: string) => ref.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || "";
/** Tab lọc: Sách (file sách đã chuyển hoặc .pdf/.epub) · NotebookLM · Web · Note trong vault. */
export function kindGroup(v: Source): "book" | "notebooklm" | "web" | "vault" {
  if (v.kind !== "vault") return v.kind;
  return ["pdf", "epub"].includes(ext(v.ref)) || /(^|\/)books?\//i.test(v.ref) ? "book" : "vault";
}

/** Mã mục dạng wikilink Obsidian: bỏ [ ] # | ^ :, gộp khoảng trắng. Mã đầy đủ ở bước 8b là `<id nguồn>#<headingKey>`. */
export const headingKey = (t: string) => t.replace(/[[\]#|^:]/g, " ").replace(/\s+/g, " ").trim();
export interface Heading { level: number; title: string; id: string }
export function tocFromMarkdown(md: string, maxLevel = 3): Heading[] {
  const out: Heading[] = []; let fence = false, lines = md.replace(/\r/g, "").split("\n");
  if (lines[0] === "---") { const end = lines.indexOf("---", 1); if (end > 0) lines = lines.slice(end + 1); }
  for (const l of lines) {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    if (fence) continue;
    const m = l.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/); if (!m || m[1].length > maxLevel) continue;
    out.push({ level: m[1].length, title: m[2].trim(), id: headingKey(m[2]) });
  }
  return out;
}

export interface OutlineNode { title: string; items?: OutlineNode[] }
/** Mục lục nhúng của PDF (pdf.js getOutline) → file markdown chỉ gồm dòng tiêu đề (độ sâu ≥ 3 gộp về ###). */
export function pdfOutlineToMd(outline: OutlineNode[] | null | undefined): { md: string; count: number } {
  const lines: string[] = [];
  const walk = (ns: OutlineNode[], depth: number) => { for (const n of ns) { const t = (n.title || "").replace(/\s+/g, " ").trim(); if (t) lines.push(`${"#".repeat(Math.min(depth, 3))} ${t}`); if (n.items?.length) walk(n.items, depth + 1); } };
  walk(outline || [], 1);
  return { md: lines.length ? lines.join("\n") + "\n" : "", count: lines.length };
}

/** Đường dẫn file markdown chứa mục lục của nguồn: vault .md → chính file; còn lại → trường toc (có thể không có). */
export const tocPathOf = (v: Source): string | null => (v.kind === "vault" && ext(v.ref) === "md" ? v.ref : v.toc || null);
/** Trạng thái theo file mục lục: có tiêu đề → ready; không → pending. broken do agent ghi nên giữ nguyên. */
export const resolveStatus = (v: Source, info: { tocCount: number | null }): SourceStatus => v.status === "broken" ? "broken" : (info.tocCount || 0) > 0 ? "ready" : "pending";
/** Việc tiếp theo của một nguồn: kiểm lại link / rút mục lục / chuyển sách vào vault / tạo lộ trình mới. */
export function nextAction(v: Source, tocCount: number): "recheck" | "toc" | "convert" | "newpath" {
  if (v.status === "broken") return "recheck";
  if (tocCount > 0) return "newpath";
  return v.kind === "vault" && ext(v.ref) === "epub" ? "convert" : "toc";
}
