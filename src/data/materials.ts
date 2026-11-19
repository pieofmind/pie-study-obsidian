/* Đợt 8b: Học liệu (sơ đồ Excalidraw, canvas, Pie Flow, mindmap) gắn vào bài hoặc cả lộ trình bằng `learn_materials: ["[[...]]"]`. Thuần.
   Plugin chỉ đọc + mở bằng plugin gốc; không ghi note. Gắn thêm = nhờ agent. */
import { linkTarget } from "./goal.ts";

export type MatKind = "excalidraw" | "canvas" | "pieflow" | "smm";
/** Nhãn hiện ra và plugin cần để mở (canvas là tính năng lõi của Obsidian: không cần plugin). */
export const MAT_KINDS: Record<MatKind, { label: string; plugin: string | null }> = {
  excalidraw: { label: "Excalidraw", plugin: "Excalidraw" },
  canvas: { label: "Canvas", plugin: null },
  pieflow: { label: "Pie Flow", plugin: "Pie Flow" },
  smm: { label: "Mindmap", plugin: "Simple Mind Map" },
};
/** Id thư mục plugin trong .obsidian/plugins (để kiểm đã bật chưa). */
export const MAT_PLUGIN_IDS: Partial<Record<MatKind, string>> = { excalidraw: "obsidian-excalidraw-plugin", pieflow: "pie-flow", smm: "simple-mind-map" };

/** Loại theo đuôi: .excalidraw.md / .excalidraw → Excalidraw · .canvas → Canvas · .pieflow.md → Pie Flow · .smm → Mindmap. Loại khác → null (bỏ qua). */
export function matKind(path: string): MatKind | null {
  const p = path.toLowerCase();
  return /\.excalidraw(\.md)?$/.test(p) ? "excalidraw" : p.endsWith(".canvas") ? "canvas" : p.endsWith(".pieflow.md") ? "pieflow" : p.endsWith(".smm") ? "smm" : null;
}

/** learn_materials: chuỗi hoặc danh sách; mỗi phần tử là link "[[x]]" / "[[x|nhãn]]" hoặc đường dẫn trần. Phần tử không phải chuỗi bị bỏ. */
export function parseMaterials(v: unknown): string[] {
  const list = Array.isArray(v) ? v : v == null ? [] : [v];
  return list.map(linkTarget).filter((x): x is string => !!x);
}

export type MatState = "ok" | "noplugin" | "missing";
export interface Material { link: string; path: string | null; kind: MatKind; state: MatState; title: string }
const baseTitle = (p: string) => (p.split("/").pop() || p).replace(/\.(excalidraw\.md|pieflow\.md|excalidraw|canvas|smm|md)$/i, "");

/** Ba trạng thái: mở được · thiếu plugin mở (xám) · link không resolve (không tìm thấy file).
    Loại lấy từ file đã resolve, không resolve được thì từ đuôi trong link; không nhận ra loại thì bỏ qua (null). */
export function resolveMaterial(link: string, resolve: (link: string) => string | null, hasPlugin: (kind: MatKind) => boolean): Material | null {
  const path = resolve(link), kind = matKind(path || link); if (!kind) return null;
  if (!path) return { link, path: null, kind, state: "missing", title: baseTitle(link) };
  return { link, path, kind, state: MAT_KINDS[kind].plugin === null || hasPlugin(kind) ? "ok" : "noplugin", title: baseTitle(path) };
}
export const resolveMaterials = (links: string[], resolve: (link: string) => string | null, hasPlugin: (kind: MatKind) => boolean) =>
  links.map(l => resolveMaterial(l, resolve, hasPlugin)).filter((m): m is Material => !!m);

/** Lệnh gửi agent — tiếng Việt, không qua tr(). scope = "[[slug]]" hoặc "[[curriculum-<id>]]". */
export const cmdAttachMaterials = (scope: string) => `gắn học liệu cho ${scope} — tìm sơ đồ Excalidraw, canvas, Pie Flow, mindmap liên quan trong vault, đưa danh sách để duyệt rồi ghi learn_materials`;
export const cmdRefindMaterial = (path: string, scope: string) => `tìm lại học liệu "${path}" của ${scope} rồi sửa learn_materials`;
