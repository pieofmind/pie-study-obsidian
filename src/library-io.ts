/* Kho nguồn (spec 7.10 bước 5): đọc / ghi file `Pie Study/kho-nguon.json` và đọc mục lục của từng nguồn. File riêng của plugin, không phải note.
   File hỏng hoặc sai khuôn: báo lỗi, KHÔNG ghi gì cho tới khi người dùng chọn "Tạo lại kho" (bản cũ giữ ở .bak). */
import { App, TFile, normalizePath, loadPdfJs } from "obsidian";
import { restoreBak } from "./practice/store.ts";
import { parseLibrary, serializeLibrary, tocPathOf, tocFromMarkdown, addSource, slug, uniqueId, pdfOutlineToMd, LIB_PATH, SRC_DIR, type Library, type Heading, type Source, type SourceStatus, type OutlineNode } from "./data/library.ts";

export interface TocInfo { count: number; heads: string[]; outline: Heading[]; refExists: boolean }
export interface LibState { ok: boolean; error?: string; lib: Library; info: Record<string, TocInfo> }
export const EMPTY_LIB: LibState = { ok: true, lib: { version: 1, sources: [] }, info: {} };

export async function loadLibrary(app: App): Promise<LibState> {
  const ad = app.vault.adapter; await restoreBak(app, LIB_PATH);
  let text: string | null = null;
  try { if (await ad.exists(LIB_PATH)) text = await ad.read(LIB_PATH); } catch (e) { return { ok: false, error: String(e), lib: EMPTY_LIB.lib, info: {} }; }
  const r = parseLibrary(text);
  if (!r.ok) return { ok: false, error: r.error, lib: EMPTY_LIB.lib, info: {} };
  const info: Record<string, TocInfo> = {};
  for (const s of r.lib.sources) {
    let count = 0, heads: string[] = [], outline: Heading[] = []; const tp = tocPathOf(s), f = tp ? app.vault.getAbstractFileByPath(normalizePath(tp)) : null;
    if (f instanceof TFile) { try { const h = tocFromMarkdown(await app.vault.cachedRead(f)); count = h.length; heads = h.slice(0, 6).map(x => x.title); outline = h; } catch { /* không đọc được: coi như chưa có mục lục */ } }
    info[s.id] = { count, heads, outline, refExists: s.kind !== "vault" || app.vault.getAbstractFileByPath(normalizePath(s.ref)) instanceof TFile };
  }
  return { ok: true, lib: r.lib, info };
}

/** Chỉ gọi khi kho đang đọc được (state.ok). */
export async function saveLibrary(app: App, lib: Library) {
  const ad = app.vault.adapter, dir = LIB_PATH.split("/").slice(0, -1).join("/");
  if (dir && !(await ad.exists(dir))) await ad.mkdir(dir);
  await ad.write(LIB_PATH, serializeLibrary(lib));
}

/** "Tạo lại kho": giữ bản hỏng ở kho-nguon.json.bak rồi ghi kho rỗng. */
export async function recreateLibrary(app: App) {
  const ad = app.vault.adapter;
  if (await ad.exists(LIB_PATH)) { const old = await ad.read(LIB_PATH); await ad.write(LIB_PATH + ".bak", old); }
  await saveLibrary(app, EMPTY_LIB.lib);
}

/* ── Thêm nguồn (spec 7.10 bước 5) ── */

export interface FileInfo { heads?: number; outline?: number; pdfFail?: boolean; author?: string }
const extOf = (n: string) => n.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || "";

interface PdfRead { md: string; count: number; author?: string; cover: ArrayBuffer | null }
/** Phần pdf.js (loadPdfJs của Obsidian, không có kiểu) mà readPdf dùng tới. */
interface PdfViewport { width: number; height: number }
interface PdfPage { getViewport(o: { scale: number }): PdfViewport; render(o: { canvasContext: CanvasRenderingContext2D | null; viewport: PdfViewport }): { promise: Promise<void> } }
interface PdfDoc { getOutline(): Promise<OutlineNode[] | null>; getMetadata(): Promise<{ info?: { Author?: unknown } } | null>; getPage(n: number): Promise<PdfPage>; destroy?(): Promise<void> }
interface PdfJs { getDocument(o: { data: Uint8Array }): { promise: Promise<PdfDoc> } }
/** Đọc PDF bằng pdf.js có sẵn của Obsidian: mục lục nhúng (bookmark), tác giả, và trang 1 vẽ thành ảnh PNG làm bìa. Không thêm thư viện. */
export async function readPdf(data: ArrayBuffer, wantCover: boolean): Promise<PdfRead> {
  const pdfjs = (await loadPdfJs()) as PdfJs, doc = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
  try {
    const { md, count } = pdfOutlineToMd(await doc.getOutline());
    let author: string | undefined; try { const a = (await doc.getMetadata())?.info?.Author; if (typeof a === "string" && a.trim()) author = a.trim(); } catch { /* không có metadata */ }
    let cover: ArrayBuffer | null = null;
    if (wantCover) {
      try {
        const page = await doc.getPage(1), w0 = page.getViewport({ scale: 1 }).width, vp = page.getViewport({ scale: 360 / w0 }), canvas = document.createElement("canvas");
        canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png")); cover = blob ? await blob.arrayBuffer() : null;
      } catch { /* không vẽ được bìa: để plugin tự vẽ */ }
    }
    return { md, count, author, cover };
  } finally { try { await doc.destroy?.(); } catch { /* bỏ qua */ } }
}

/** Xem trước điều plugin tự làm được với một file: .md → số mục từ tiêu đề; .pdf → số mục lục nhúng; .epub → không tự đọc. */
export async function inspectFile(app: App, f: { path: string | null; name: string; bytes?: ArrayBuffer }): Promise<FileInfo> {
  const ext = extOf(f.name), tf = f.path ? app.vault.getAbstractFileByPath(normalizePath(f.path)) : null;
  try {
    if (ext === "md") { const text = f.bytes ? new TextDecoder().decode(f.bytes) : tf instanceof TFile ? await app.vault.cachedRead(tf) : ""; return { heads: tocFromMarkdown(text).length }; }
    if (ext === "pdf") { const data = f.bytes || (tf instanceof TFile ? await app.vault.readBinary(tf) : null); if (!data) return { pdfFail: true }; const r = await readPdf(data, false); return { outline: r.count, author: r.author }; }
  } catch (e) { console.error("[pie-study] không đọc được file nguồn", f.name, e); return { pdfFail: true }; }
  return {};
}

async function ensureDir(app: App, dir: string) { if (dir && !(await app.vault.adapter.exists(dir))) await app.vault.adapter.mkdir(dir); }
async function freePath(app: App, path: string) {
  const ad = app.vault.adapter, m = path.match(/^(.*?)(\.[^./]+)?$/)!; let p = path, n = 2;
  while (await ad.exists(p)) p = `${m[1]} ${n++}${m[2] || ""}`;
  return p;
}
/** Kéo thả từ máy: chép vào Pie Study/nguon/ (không sửa file có sẵn: trùng tên thì thêm số). Trả đường dẫn trong vault. */
export async function writeDropped(app: App, name: string, bytes: ArrayBuffer): Promise<string> {
  await ensureDir(app, SRC_DIR);
  const path = await freePath(app, normalizePath(`${SRC_DIR}/${name.replace(/[\\/:*?"<>|]/g, "-")}`));
  await app.vault.createBinary(path, bytes); return path;
}

/** Thêm nguồn là file trong vault. .md → mục lục từ tiêu đề; .pdf → mục lục nhúng ghi thành file markdown + bìa trang 1; .epub → chờ agent. */
export async function addVaultSource(app: App, lib: Library, o: { path: string; title: string; paths: string[] }, now: Date) {
  const ext = extOf(o.path), id = uniqueId(lib, slug(o.title)), tf = app.vault.getAbstractFileByPath(normalizePath(o.path));
  let status: SourceStatus = "pending", toc: string | undefined, cover: string | undefined, by: string | undefined;
  if (ext === "md") { if (tf instanceof TFile && tocFromMarkdown(await app.vault.cachedRead(tf)).length) status = "ready"; }
  else if (ext === "pdf" && tf instanceof TFile) {
    try {
      const r = await readPdf(await app.vault.readBinary(tf), true); by = r.author;
      await ensureDir(app, SRC_DIR);
      if (r.count > 0) { toc = await freePath(app, `${SRC_DIR}/${id}.toc.md`); await app.vault.create(toc, r.md); status = "ready"; }
      if (r.cover) { cover = await freePath(app, `${SRC_DIR}/${id}.cover.png`); await app.vault.createBinary(cover, r.cover); }
    } catch (e) { console.error("[pie-study] không đọc được PDF", o.path, e); }
  }
  const src: Omit<Source, "id" | "added"> & { id: string } = { id, title: o.title, kind: "vault", ref: normalizePath(o.path), paths: o.paths, status };
  if (by) src.by = by; if (toc) src.toc = toc; if (cover) src.cover = cover;
  return { lib: addSource(lib, src, now), id, status };
}
/** Link web / tên notebook: plugin không tự tải gì → luôn chờ agent rút mục lục. */
export function addRemoteSource(lib: Library, o: { kind: "web" | "notebooklm"; ref: string; title: string; paths: string[] }, now: Date) {
  const id = uniqueId(lib, slug(o.title));
  return { lib: addSource(lib, { id, title: o.title, kind: o.kind, ref: o.ref.trim(), paths: o.paths, status: "pending" }, now), id, status: "pending" as SourceStatus };
}
