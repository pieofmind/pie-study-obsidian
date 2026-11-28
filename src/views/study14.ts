/* Sơ đồ khái niệm 3 cấp (prototype d17): bài · dimension · cả lộ trình. Dữ liệu = khối mermaid dưới `## Sơ đồ khái niệm` của note bài / MOC dimension / curriculum-*.
   Plugin tự đọc và vẽ (canvas), không ghi note. Vẽ đồ thị ở cmgraph.ts, gắn vào DOM sau mỗi lần render (StudyView.afterRender). */
import { tr } from "../i18n.ts";
import { i, esc, crumb, curDom, domName, type Ctx } from "./shared.ts";
import type { Topic, Domain } from "../data/index.ts";
import { groupDimensions, cmdDrawMap, type DimGroup } from "../data/conceptmap.ts";
import { askBtn } from "./study13.ts";

export interface Dim { key: string; title: string; moc: string | null; topics: Topic[] }
const curPath = (d: Domain) => d.curPath || `curriculum-${d.id}.md`;
const curName = (d: Domain) => curPath(d).split("/").pop()!.replace(/\.md$/, "");

/** Dimension của lộ trình: gom bài theo `learn_dimension`; tên = tiêu đề MOC (không có file thì lấy chữ của liên kết). */
export function dimsOf(C: Ctx, d: Domain): Dim[] {
  return groupDimensions(d.topics).map((g: DimGroup<Topic>) => { const from = g.topics[0].path; return { key: g.key, title: C.cm.title(g.link, from), moc: C.cm.resolve(g.link, from), topics: g.topics }; });
}
export const dimOfTopic = (C: Ctx, t: Topic): Dim | undefined => { const d = C.idx.domains.find(x => x.id === t.dom); return d && t.dimension ? dimsOf(C, d).find(x => x.topics.includes(t)) : undefined; };
/** Các đường dẫn cần đọc để vẽ trang bài / màn sơ đồ (StudyView đọc nền, cache theo mtime). */
export function mapPaths(C: Ctx, d: Domain | undefined, t?: Topic): string[] {
  if (t) return [t.path, dimOfTopic(C, t)?.moc].filter((p): p is string => !!p);
  if (!d) return [];
  return [d.curPath, ...dimsOf(C, d).map(x => x.moc), ...d.topics.map(x => x.path)].filter((p): p is string => !!p);
}

const empty = (C: Ctx, title: string, cmd: string) => `<div class="mt-empty"><b>${esc(title)}</b><p class="sub">${tr("Sơ đồ là khối mermaid trong mục \"Sơ đồ khái niệm\" của note. {0} vẽ, Pie Study chỉ hiện.", C.agent)}</p>${askBtn(C, tr("Nhờ {0} vẽ", C.agent), cmd)}</div>`;
/** Khung đồ thị. src = undefined → đang đọc; null → chưa có sơ đồ (ô trống + nhờ agent vẽ). */
function box(C: Ctx, path: string, src: string | null | undefined, emptyTitle: string, cmd: string, sm = false, open = true, sw = "") {
  if (src === undefined) return `<p class="sub cm-load">${tr("Đang đọc sơ đồ…")}</p>`;
  if (src === null) return empty(C, emptyTitle, cmd);
  return `<div class="cm-box"><div class="cm-scroll"><div class="gv${sm ? " sm" : ""}" data-cm="${esc(path)}"><div class="gv-ctl"><button data-gz="in" aria-label="${tr("Phóng to")}">+</button><button data-gz="out" aria-label="${tr("Thu nhỏ")}">−</button><button data-gz="fit" aria-label="${tr("Vừa khung")}">${i("target", 15)}</button></div><div class="gv-hint">${tr("Cuộn để phóng to · kéo nền để di chuyển · kéo chấm để xếp lại · bấm chấm để hỏi nhanh hoặc mở note")}</div></div></div>
    <div class="cm-foot"><span class="dg-lg"><i class="on"></i>${tr("Có note")}<i></i>${tr("Chưa có note")}</span><code>${esc(path)} · ${tr("Sơ đồ khái niệm")}</code><span class="cm-acts">${sw}${open ? `<button class="btn ghost" data-open="${esc(path)}">${i("file", 14)}${tr("Mở note")}</button>` : ""}${askBtn(C, tr("Nhờ {0} vẽ lại", C.agent), cmd)}</span></div></div>`;
}

/** Sơ đồ tổng ghép từ các bài (khung đồ thị; StudyView dựng từ chỉ mục). */
function mergedBox(C: Ctx, d: Domain, sw: string, extra: string, dim = "") {
  return `<div class="cm-box"><div class="cm-scroll"><div class="gv" data-cm="merge:${esc(d.id)}${dim ? ":" + esc(dim) : ""}"><div class="gv-ctl"><button data-gz="in" aria-label="${tr("Phóng to")}">+</button><button data-gz="out" aria-label="${tr("Thu nhỏ")}">−</button><button data-gz="fit" aria-label="${tr("Vừa khung")}">${i("target", 15)}</button></div><div class="gv-hint">${tr("Cuộn để phóng to · kéo nền để di chuyển · kéo chấm để xếp lại · bấm chấm để hỏi nhanh hoặc mở note")}</div></div></div>
    <div class="cm-foot"><span class="dg-lg"><i class="on"></i>${tr("Có note")}<i></i>${tr("Chưa có note")}</span><span class="cm-acts">${sw}${extra}</span></div></div>`;
}

/** Tab "Sơ đồ" ở trang bài: sơ đồ của bài + thẻ "Thuộc dimension". */
export function mapTab(C: Ctx, t: Topic) {
  const dm = dimOfTopic(C, t), cmd = cmdDrawMap(`[[${t.slug}]]`, t.path);
  return `<div class="cm-sec">${box(C, t.path, C.cm.src(t.path), tr("Bài này chưa có sơ đồ khái niệm"), cmd, true)}
    ${dm ? `<a class="cm-up" data-go="maps" data-dim="${esc(dm.key)}">${i("tree", 16)}<span><small>${tr("Thuộc dimension")}</small><b>${esc(dm.title)}</b></span>${i("right", 14)}</a>` : ""}</div>`;
}

/** Màn "Sơ đồ khái niệm" của lộ trình: Tổng + từng dimension, danh sách bài của dimension. */
export function mapsScreen(C: Ctx) {
  const d = curDom(C); if (!d) return "";
  const dims = dimsOf(C, d), cur = dims.find(x => x.key === C.S.dim), has = (p: string | null) => !!p && typeof C.cm.src(p) === "string";
  const lessonsWith = d.topics.filter(t => has(t.path)).length, dimsWith = dims.filter(x => has(x.moc)).length;
  const tabs = `<div class="lib-tabs" role="tablist"><button class="${!cur ? "on" : ""}" data-dim="">${tr("Tổng")}</button>${dims.map(x => `<button class="${cur === x ? "on" : ""}" data-dim="${esc(x.key)}">${esc(x.title)}<span>${x.topics.length}</span></button>`).join("")}</div>`;
  let body: string;
  const outline = has(d.curPath || null), mode = outline && C.S.cmMode === "outline" ? "outline" : "merge", cmd = cmdDrawMap(`lộ trình [[${curName(d)}]]`, curPath(d));
  const sw = outline ? `<div class="dg-sw" role="tablist">${([["merge", tr("Ghép từ các bài")], ["outline", tr("Dàn ý lộ trình")]] as const).map(([k, l]) => `<button class="${mode === k ? "on" : ""}" data-cmmode="${k}">${l}</button>`).join("")}</div>` : "";
  if (!cur) body = (mode === "outline" ? box(C, curPath(d), C.cm.src(d.curPath!), "", cmd, false, true, sw) : mergedBox(C, d, sw, outline ? "" : askBtn(C, tr("Nhờ {0} vẽ dàn ý lộ trình", C.agent), cmd))) +
    `<p class="sub cm-hint">${mode === "merge" ? tr("Sơ đồ tổng tự ghép từ sơ đồ các bài: lộ trình, dimension, bài, rồi khái niệm. Bấm chấm bài để mở bài trong Pie Study.") : dims.length ? tr("Sơ đồ tổng chỉ tới cấp dimension và vài khái niệm chính. Chọn một dimension ở trên để xem chi tiết.") : tr("Dàn ý lộ trình do {0} vẽ. Bài chưa gắn dimension (`learn_dimension`) nên chưa có sơ đồ theo từng dimension.", C.agent)}</p>`;
  else {
    const dcmd = cur.moc ? cmdDrawMap(`dimension [[${cur.moc.split("/").pop()!.replace(/\.md$/, "")}]]`, cur.moc) : cmdDrawMap(`dimension "${cur.title}" của [[${curName(d)}]]`, tr("MOC của dimension"));
    const mocSrc = cur.moc ? C.cm.src(cur.moc) : null;
    // MOC chưa có sơ đồ riêng mà đã có bài có sơ đồ → ghép từ sơ đồ các bài trong dimension (như "Tổng")
    body = (mocSrc !== null ? box(C, cur.moc!, mocSrc, tr("Dimension \"{0}\" chưa có sơ đồ", cur.title), dcmd)
      : cur.topics.some(t => has(t.path)) ? mergedBox(C, d, "", askBtn(C, tr("Nhờ {0} vẽ sơ đồ dimension", C.agent), dcmd), cur.key) + `<p class="sub cm-hint">${tr("Dimension chưa có sơ đồ riêng; đây là sơ đồ ghép từ các bài trong dimension.")}</p>`
      : empty(C, tr("Dimension \"{0}\" chưa có sơ đồ", cur.title), dcmd)) +
    `<div class="sec-h" style="margin-top:22px"><h2 class="t">${tr("Bài trong dimension")}</h2><span class="c">${cur.topics.length}</span></div>
    <div class="lc-list">${cur.topics.map(t => { const ok = has(t.path), k = d.topics.indexOf(t) + 1;
      return `<div class="lc-row ${ok ? "" : "none"}"><span class="lc-n">${k}</span><div class="lc-tx"><b>${esc(t.title)}</b><small>${ok ? `<span class="lc-ok">${i("tree", 13)}${tr("Có sơ đồ")}</span>` : `<span class="lc-no">${tr("Chưa có sơ đồ")}</span>`}</small></div><div class="lc-act"><button class="btn ${ok ? "" : "ghost"}" data-go="topic" data-topic="${esc(t.slug)}" data-ttab-go="map">${ok ? tr("Xem") : tr("Mở bài")}</button></div></div>`; }).join("")}</div>`;
  }
  return `<div class="page cms">${crumb(`<a data-go="home">${esc(domName(d))}</a>`, `<span>${tr("Sơ đồ khái niệm")}</span>`)}
    <h1 class="t" style="margin-top:10px">${tr("Sơ đồ khái niệm")}</h1>
    <p class="sub">${tr("{0}/{1} bài có sơ đồ", lessonsWith, d.topics.length)}${dims.length ? ` · ${tr("{0}/{1} dimension có sơ đồ", dimsWith, dims.length)}` : ""}${outline ? ` · ${tr("có dàn ý lộ trình")}` : ""}</p>${tabs}${body}</div>`;
}
