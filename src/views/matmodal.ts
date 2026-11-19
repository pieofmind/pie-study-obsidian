/* Hộp "Gắn học liệu" (prototype d16): chọn nhiều file 4 loại, ghi learn_materials của bài hoặc file lộ trình khi bấm "Gắn N". */
import { tr } from "../i18n.ts";
import { i, esc, type Ctx } from "./shared.ts";
import { MAT_KINDS, matKind, type MatKind } from "../data/materials.ts";
import type { PickMat } from "../data/matwrite.ts";

export interface MA { scope: "topic" | "dom"; slug: string; dom: string; q: string; kind: MatKind | ""; sel: string[] }
const KIC: Record<MatKind, string> = { excalidraw: "excali", canvas: "canvas", pieflow: "flow", smm: "mind" };
const base = (p: string) => (p.split("/").pop() || p).replace(/\.(excalidraw\.md|pieflow\.md|excalidraw|canvas|smm|md)$/i, "");

export function matFilesHtml(ma: MA, files: PickMat[], total: number, have: Set<string>) {
  if (!files.length) return `<p class="sub" style="padding:12px">${tr("Không có file Excalidraw, canvas, Pie Flow hay mindmap nào khớp.")}</p>`;
  const rows = files.map(f => { const on = ma.sel.includes(f.path), had = have.has(f.path), kd = matKind(f.path)!;
    return `<button class="ns-f mta-f k-${kd} ${on ? "on" : ""}" data-mtf="${esc(f.path)}" ${had ? "disabled" : ""}><span class="mta-ic">${i(KIC[kd], 16)}</span><span><b>${esc(base(f.path))}</b><small>${esc(f.path)}</small></span>${had ? `<em>${tr("Đã gắn")}</em>` : on ? i("check", 16) : ""}</button>`; }).join("");
  return rows + (total > files.length ? `<p class="sub" style="padding:8px 12px">${tr("Đang hiện {0}/{1} file; gõ thêm để lọc.", files.length, total)}</p>` : "");
}
/** target = file đích (tên hiển thị); domOk = lộ trình có file curriculum-* để ghi. */
export function matModal(C: Ctx, ma: MA, list: { files: PickMat[]; total: number }, have: Set<string>, target: string, domOk: boolean, topicOk: boolean) {
  const kinds: [MatKind | "", string][] = [["", tr("Tất cả")], ...(Object.entries(MAT_KINDS) as [MatKind, { label: string }][]).map(([k, v]) => [k, v.label] as [MatKind, string])];
  return `<div class="ns-scrim" data-mtclose></div><div class="ns-modal mta" role="dialog" aria-label="${esc(tr("Gắn học liệu"))}">
    <div class="ns-hd"><b>${i("plus", 16)}${tr("Gắn học liệu")}</b><button class="ibtn" data-mtclose title="${esc(tr("Đóng"))}" aria-label="${esc(tr("Đóng"))}">${i("x")}</button></div>
    <div class="ns-bd"><label class="ns-l">${tr("Gắn cho")}</label>
      <div class="ns-types">${[["topic", tr("Bài này"), "book", topicOk], ["dom", tr("Cả lộ trình"), "map", domOk]].map(([k, l, ic, on]) => `<button class="${ma.scope === k ? "on" : ""}" data-mtscope="${k}" ${on ? "" : "disabled"}>${i(ic as string, 16)}${l}</button>`).join("")}</div>
      ${topicOk ? "" : `<p class="sub" style="margin-top:6px">${tr("Mở trang một bài để gắn riêng cho bài đó.")}</p>`}
      ${domOk ? "" : `<p class="sub" style="margin-top:6px">${tr("Lộ trình này chưa có file curriculum-* nên chưa gắn được học liệu chung.")}</p>`}
      <label class="ns-l">${tr("Chọn file")} <small>${tr("chọn nhiều được")}</small></label>
      <input class="ns-in" data-mtq placeholder="${esc(tr("Tìm theo tên hoặc đường dẫn"))}" value="${esc(ma.q)}">
      <div class="mta-kinds">${kinds.map(([k, l]) => `<button class="${ma.kind === k ? "on" : ""}" data-mtkind="${k}">${k ? i(KIC[k], 13) : ""}${esc(l)}</button>`).join("")}</div>
      <div class="ns-files">${matFilesHtml(ma, list.files, list.total, have)}</div></div>
    <div class="ns-ft"><small>${tr("Ghi vào trường {0} của {1}. Không sửa gì khác trong note.", "<code>learn_materials</code>", `<code>${esc(target)}</code>`)}</small><button class="btn ghost" data-mtclose>${tr("Huỷ")}</button><button class="btn pri" data-mtok ${ma.sel.length ? "" : "disabled"}>${tr("Gắn {0}", ma.sel.length || "")}</button></div></div>`;
}
