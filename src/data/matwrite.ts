/* Tự gắn / gỡ học liệu (17/11): plugin ghi ĐÚNG trường learn_materials khi người dùng bấm. Thuần: ghi thật làm ở StudyView qua processFrontMatter. */
import { fold } from "./vaultfiles.ts";
import { matKind, type MatKind } from "./materials.ts";
import { linkTarget } from "./goal.ts";

/** Link ghi vào note: đường dẫn đầy đủ, bỏ đuôi .md (Obsidian generateMarkdownLink): "[[Sơ đồ/a.canvas]]", "[[Excalidraw/b.excalidraw]]". */
export const matLink = (path: string) => `[[${path.replace(/\.md$/i, "")}]]`;

/** Giá trị cũ → danh sách: list giữ nguyên (chỉ phần tử chuỗi), chuỗi đơn thành list một phần tử, còn lại → rỗng. */
export function asList(old: unknown): string[] {
  if (Array.isArray(old)) return old.filter((x): x is string => typeof x === "string" && !!x.trim());
  return typeof old === "string" && old.trim() ? [old] : [];
}
/** Nối link của các file `paths` vào list cũ, bỏ file đã có (so theo đích resolve, không theo chuỗi) và trùng trong chính lần chọn. */
export function appendMaterials(old: unknown, paths: string[], resolve: (link: string) => string | null): string[] {
  const out = asList(old), have = new Set(out.map(l => resolve(l) ?? linkTarget(l) ?? l));
  for (const p of paths) { if (have.has(p)) continue; have.add(p); out.push(matLink(p)); }
  return out;
}
/** Bỏ đúng phần tử trỏ tới file `path` (theo đích resolve); thẻ hỏng (không resolve) bỏ theo link gốc `link`. */
export function removeMaterial(old: unknown, path: string | null, link: string, resolve: (link: string) => string | null): string[] {
  const want = linkTarget(link);
  return asList(old).filter(l => { const r = resolve(l); return !(path ? r === path : r == null && linkTarget(l) === want); });
}

export interface PickMat { path: string; ext: string; title: string; mtime: number }
const hidden = (p: string) => p.split("/").some(s => s[0] === "_" || s[0] === ".");
/** File thuộc 4 loại học liệu (loại khác không hiện), lọc theo ô tìm (bỏ dấu, NFC/NFD như nhau) và loại. Xếp: tên file khớp trọn → chứa truy vấn → chỉ khớp thư mục; thư mục ẩn cuối; mới sửa trước. */
export function pickMaterialFiles(files: PickMat[], q: string, kind: MatKind | "", skip: string[], limit = 80): { files: PickMat[]; total: number } {
  const k = fold(q.trim());
  const rows = files.filter(f => { const m = matKind(f.path); return !!m && (!kind || m === kind) && !skip.some(s => f.path.startsWith(s)) && (!k || fold(f.path).includes(k)); })
    .map(f => { const t = k ? fold(f.title) : ""; return { f, h: hidden(f.path), g: !k || t === k ? 0 : t.includes(k) ? 1 : 2 }; });
  rows.sort((a, b) => a.g - b.g || +a.h - +b.h || b.f.mtime - a.f.mtime || (a.f.path < b.f.path ? -1 : 1));
  return { files: rows.slice(0, limit).map(r => r.f), total: rows.length };
}
