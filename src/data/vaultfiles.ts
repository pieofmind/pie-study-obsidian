/* Danh sách file để chọn trong hộp Thêm nguồn (spec 7.10). Thuần. Không viết cứng tên thư mục của vault. */
export interface PickFile { path: string; ext: string; title: string; mtime: number }
const OK = new Set(["md", "pdf", "epub"]);
const hidden = (p: string) => p.split("/").some(s => s[0] === "_" || s[0] === ".");

const foldCache = new Map<string, string>();
/** Bỏ dấu tiếng Việt, NFC/NFD như nhau, đ → d, chữ thường. Cache theo chuỗi (đường dẫn ít đổi, gõ tìm gọi lại mỗi phím). */
export function fold(s: string): string {
  let r = foldCache.get(s); if (r !== undefined) return r;
  r = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  if (foldCache.size > 60000) foldCache.clear();
  foldCache.set(s, r); return r;
}
const book = (ext: string) => ext === "pdf" || ext === "epub";

/** md/pdf/epub khớp ô tìm (bỏ dấu), bỏ các thư mục `skip`. Thứ tự: thư mục ẩn (_ hoặc .) cuối; pdf/epub (thường là sách) trước md; rồi file mới sửa trước. Có gõ tìm thì xếp theo mức khớp tên file trước (xem dưới).
    total = số file khớp trước khi cắt còn `limit`, để hộp báo "đang hiện N/total". */
export function pickFiles(files: PickFile[], q: string, skip: string[], limit = 60): { files: PickFile[]; total: number } {
  const k = fold(q.trim());
  const rows = files.filter(f => OK.has(f.ext) && !skip.some(s => f.path.startsWith(s)) && (!k || fold(f.path).includes(k)))
    .map(f => { const t = k ? fold(f.title) : ""; return { f, h: hidden(f.path), b: book(f.ext), g: !k || t === k ? 0 : t.includes(k) ? 1 : 2 }; });
  // có gõ: tên file khớp trọn truy vấn → tên file chứa truy vấn → chỉ khớp ở thư mục; trong nhóm: thư mục ẩn cuối, sách (pdf/epub) trước md, rồi mới sửa trước
  rows.sort((a, b) => a.g - b.g || +a.h - +b.h || +b.b - +a.b || b.f.mtime - a.f.mtime || (a.f.path < b.f.path ? -1 : 1));
  return { files: rows.slice(0, limit).map(r => r.f), total: rows.length };
}
