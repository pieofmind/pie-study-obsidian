/* Đợt 5 (spec 7.5) — port d5.js (bản D2): khối Nhịp học ở Tổng quan, nút "Tôi biết rồi, kiểm tra tôi". Vẽ bằng div, màu đặc, không thư viện biểu đồ. */
import { tr } from "../i18n.ts";
import { i, esc, fmtD, type Ctx } from "./shared.ts";
import type { Topic } from "../data/index.ts";

export interface Rhythm { f: { d: string; k: number; cards: number; topics: number }[]; h: { d: string; n: number }[]; now: number; best: number }
const DOW = () => [tr("CN"), tr("T2"), tr("T3"), tr("T4"), tr("T5"), tr("T6"), tr("T7")];
const dow = (d: string) => new Date(d + "T12:00:00").getDay();
const lvl = (n: number) => (n < 0 ? "x" : n === 0 ? "l0" : n < 8 ? "l1" : n < 18 ? "l2" : "l3");

export function rhythmBlock(C: Ctx, r: Rhythm) {
  const { f, h } = r, max = Math.max(...f.map(x => x.cards), 1), tc = f.reduce((s, x) => s + x.cards, 0), tt = f.reduce((s, x) => s + x.topics, 0), active = h.filter(x => x.n > 0).length, D = DOW();
  const col = (x: Rhythm["f"][0]) => `<div class="rh-col${x.k === 0 ? " now" : ""}${dow(x.d) === 1 && x.k ? " wk" : ""}" title="${esc(`${D[dow(x.d)]} ${fmtD(x.d)} · ${tr("{0} thẻ", x.cards)}${x.topics ? " · " + tr("{0} bài ôn với {1}", x.topics, C.agent) : ""}${x.k === 0 ? " " + tr("(gồm cả quá hạn)") : ""}`)}">
    <span class="rh-n">${x.cards || ""}</span><span class="rh-bar"><i style="height:${x.cards ? Math.max(6, x.cards / max * 100) : 0}%"></i></span>${x.topics ? `<em>${x.topics}</em>` : `<em class="z"></em>`}<small>${x.k === 0 ? tr("Nay") : +x.d.slice(8)}</small></div>`;
  return `<h2 class="ov-h">${tr("Nhịp học")}<small>${tr("thẻ và bài sắp tới hạn · những ngày đã học")}</small></h2>
    <div class="rh"><div class="rh-card"><div class="rh-top"><b>${tr("14 ngày tới")}</b><small>${tr("{0} thẻ · {1} bài tới hạn", tc, tt)}</small></div>
      <div class="rh-bars">${f.map(col).join("")}</div>
      <div class="rh-leg"><span><i class="c"></i>${tr("thẻ tới hạn")}</span><span><i class="g"></i>${tr("bài ôn với {0}", esc(C.agent))}</span><span class="r">${tr("Hôm nay gồm cả mục quá hạn")}</span></div></div>
    <div class="rh-card"><div class="rh-top"><b>${tr("12 tuần qua")}</b><small>${tr("chuỗi {0} ngày · dài nhất {1}", r.now, r.best)}</small></div>
      <div class="rh-grid">${h.map(x => `<i class="${lvl(x.n)}"${x.n >= 0 ? ` title="${esc(`${D[dow(x.d)]} ${fmtD(x.d)} · ${x.n ? tr("{0} thẻ đã ôn", x.n) : tr("không học")}`)}"` : ""}></i>`).join("")}</div>
      <div class="rh-leg"><span>${tr("Ít")}</span><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>${tr("Nhiều")}</span><span class="r">${tr("{0} ngày có học", active)}</span></div></div></div>`;
}

/** Lệnh gửi agent — tiếng Việt, không qua tr(). */
export const cmdTestOut = (t: Topic) => `kiểm tra nhanh [[${t.slug}]] — tôi đã biết bài này`;
/** Nút phụ chỉ ở bài chưa học: trong bảng bật trên bản đồ ("pop") và trang bài học ("page"). Free: chép lệnh. */
export function testOutBtn(C: Ctx, t: Topic, where: "pop" | "page") {
  if (t.status !== "new") return "";
  const cls = where === "pop" ? "qb o w100 tk-out" : "btn tk-out", s = where === "pop" ? 16 : 14;
  return !C.agentReady ? `<button class="${cls}" data-copy="${esc(cmdTestOut(t))}">${i("copy", s)}${tr("Chép lệnh kiểm tra nhanh")}</button>`
    : `<button class="${cls}" data-bob="${esc(cmdTestOut(t))}">${i("target", s)}${tr("Tôi biết rồi, kiểm tra tôi")}</button>`;
}
