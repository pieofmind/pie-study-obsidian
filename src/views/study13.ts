/* Đợt 8b: Học liệu (prototype d16). Kệ thẻ có hình thu nhỏ mẫu theo loại; trang bài có tab "Học liệu"; màn "Học liệu của lộ trình". Plugin chỉ đọc + mở. */
import { tr } from "../i18n.ts";
import { i, esc, crumb, curDom, domName, type Ctx } from "./shared.ts";
import type { Topic, Domain } from "../data/index.ts";
import { MAT_KINDS, cmdAttachMaterials, cmdRefindMaterial, type Material, type MatKind } from "../data/materials.ts";
import { matThumb } from "../data/matthumb.ts";
import { pickMaterialFiles, type PickMat } from "../data/matwrite.ts";

const KIC: Record<MatKind, string> = { excalidraw: "excali", canvas: "canvas", pieflow: "flow", smm: "mind" };
const curName = (d: Domain) => d.curPath ? d.curPath.split("/").pop()!.replace(/\.md$/, "") : `curriculum-${d.id}`;

/** Nút gửi lệnh cho agent; không có agent thì chép lệnh. */
export const askBtn = (C: Ctx, label: string, cmd: string) => C.agentReady
  ? `<button class="btn ghost" data-bob="${esc(cmd)}">${i("zap", 14)}${esc(label)}</button>`
  : `<button class="btn ghost" data-copy="${esc(cmd)}">${i("copy", 14)}${tr("Chép lệnh")}</button>`;

/** own = nơi học liệu này được ghi (bài hoặc file lộ trình) → nút × gỡ đúng phần tử khỏi learn_materials của file đó. */
export interface MatOwner { scope: "topic" | "dom"; key: string }
function card(C: Ctx, m: Material, scope: string, own?: MatOwner) {
  const k = MAT_KINDS[m.kind], ok = m.state === "ok";
  const st = m.state === "missing" ? `<span class="mt-bad">${tr("Không tìm thấy file")}</span>` : m.state === "noplugin" ? `<span class="mt-warn">${tr("Cần plugin {0} để mở", esc(k.plugin || ""))}</span>` : `<span>${tr("Mở bằng {0}", esc(k.label))}</span>`;
  const act = m.state === "missing" ? askBtn(C, tr("Nhờ {0} tìm lại", C.agent), cmdRefindMaterial(m.link, scope)) : "";
  return `<article class="mk k-${m.kind} ${m.state === "missing" ? "bad" : ""} ${m.state === "noplugin" ? "off" : ""}" ${ok ? `data-open="${esc(m.path!)}" tabindex="0" role="link"` : ""}>
    <div class="mk-th">${m.state === "missing" ? `<div class="mk-miss">${i("alert", 22)}<span>${tr("File đã đổi tên hoặc bị xoá")}</span></div>` : matThumb(m.kind, m.path || m.link)}<span class="mk-k">${i(KIC[m.kind], 14)}${esc(k.label)}</span>${own ? `<button class="mk-rm" data-mtrm="${esc(m.link)}" data-mtpath="${esc(m.path || "")}" data-mtown="${own.scope}:${esc(own.key)}" title="${esc(own.scope === "dom" ? tr("Gỡ khỏi file lộ trình (học liệu chung)") : tr("Gỡ khỏi danh sách"))}" aria-label="${esc(tr("Gỡ {0} khỏi danh sách", m.title))}">${i("x", 14)}</button>` : ""}${ok ? `<span class="mk-go">${i("arrow", 16)}</span>` : ""}</div>
    <div class="mk-tx"><b>${esc(m.title)}</b><small>${st}</small><code>${esc(m.path || m.link)}</code>${act ? `<div class="mk-act">${act}</div>` : ""}</div></article>`;
}
export const matGrid = (C: Ctx, ms: Material[], scope: string, own?: MatOwner, add = "") => `<div class="mk-grid">${ms.map(m => card(C, m, scope, own)).join("")}${add}</div>`;
/** Thẻ "+ Thêm học liệu" cuối lưới: mở hộp gắn. */
const addTile = (scope: "topic" | "dom", label: string) => `<button class="mk mk-add" data-mtadd="${scope}"><span class="mk-add-ic">${i("plus", 22)}</span><b>${esc(label)}</b><small>Excalidraw · Canvas · Pie Flow · Mindmap</small></button>`;
const attachBtn = (scope: "topic" | "dom", label: string) => `<button class="btn" data-mtadd="${scope}">${i("plus", 14)}${esc(label)}</button>`;

/** Học liệu của một bài / chung của lộ trình, đã resolve. */
export const topicMats = (C: Ctx, t: Topic) => C.materials(t.materials, t.path);
export const domainMats = (C: Ctx, d: Domain) => C.materials(d.materials, d.curPath || "");

/** Tab "Học liệu" ở trang bài: của bài (hoặc ô trống + nhờ agent gắn), rồi nhóm "Học liệu chung của lộ trình". */
export function matsTab(C: Ctx, t: Topic) {
  const own = topicMats(C, t), d = C.idx.domains.find(x => x.id === t.dom), scope = `[[${t.slug}]]`, att = cmdAttachMaterials(scope);
  const common = d ? domainMats(C, d) : [];
  return `<div class="mt-sec">${own.length ? `<div class="mt-bar">${askBtn(C, tr("Nhờ {0} tìm thêm", C.agent), att)}</div>` + matGrid(C, own, scope, { scope: "topic", key: t.slug }, addTile("topic", tr("Thêm học liệu cho bài"))) : `<div class="mt-empty"><b>${tr("Bài này chưa gắn học liệu")}</b><p class="sub">${tr("Sơ đồ Excalidraw, canvas, Pie Flow hay mindmap liên quan đến bài sẽ hiện ở đây.")}</p><div class="mt-btns">${attachBtn("topic", tr("Gắn học liệu"))}${askBtn(C, tr("Nhờ {0} tìm và gắn", C.agent), att)}</div></div>`}
    <div class="eyebrow" style="margin-top:22px">${tr("Học liệu chung của lộ trình")}</div>${common.length ? matGrid(C, common, `[[${d ? curName(d) : ""}]]`, d?.curPath ? { scope: "dom", key: d.id } : undefined) : `<p class="sub">${tr("Lộ trình này chưa gắn học liệu chung.")}</p>`}</div>`;
}

/** Màn "Học liệu của lộ trình": chung + theo bài. */
export function matsScreen(C: Ctx) {
  const d = curDom(C); if (!d) return "";
  const scope = `[[${curName(d)}]]`, common = domainMats(C, d), per = d.topics.map((t, k) => ({ t, k, ms: topicMats(C, t) })).filter(r => r.ms.length);
  const n = per.reduce((a, r) => a + r.ms.length, 0);
  return `<div class="page mts">${crumb(`<a data-go="home">${esc(domName(d))}</a>`, `<span>${tr("Học liệu")}</span>`)}
    <h1 class="t" style="margin-top:10px">${tr("Học liệu của lộ trình")}</h1><p class="sub">${tr("Sơ đồ và bản đồ đi kèm lộ trình. Bấm vào thẻ để mở bằng plugin gốc trong Obsidian.")}</p>
    <div class="sec-h mt-h"><h2 class="t">${tr("Chung của lộ trình")}</h2><span class="c">${common.length}</span><span class="mt-hact">${askBtn(C, tr("Nhờ {0} tìm thêm", C.agent), cmdAttachMaterials(scope))}</span></div>${matGrid(C, common, scope, d.curPath ? { scope: "dom", key: d.id } : undefined, d.curPath ? addTile("dom", tr("Thêm học liệu cho lộ trình")) : "")}${!common.length && !d.curPath ? `<p class="sub">${tr("Lộ trình này chưa gắn học liệu chung.")}</p>` : ""}
    <div class="sec-h" style="margin-top:26px"><h2 class="t">${tr("Theo bài")}</h2><span class="c">${n}</span></div>
    ${per.map(({ t, k, ms }) => `<div class="mt-grp"><a class="mt-gh" data-go="topic" data-topic="${esc(t.slug)}"><span class="lc-n">${k + 1}</span><b>${esc(t.title)}</b>${i("right", 14)}</a>${matGrid(C, ms, `[[${t.slug}]]`, { scope: "topic", key: t.slug })}</div>`).join("") || `<p class="sub">${tr("Chưa bài nào gắn học liệu.")}</p>`}
    ${per.length && per.length < d.topics.length ? `<p class="sub" style="margin-top:12px">${tr("Các bài khác chưa gắn học liệu.")}</p>` : ""}</div>`;
}
