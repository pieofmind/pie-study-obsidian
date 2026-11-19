/* Màn luyện tập toàn khung (spec 7.2) — port reviewScreen/quizScreen + PSAfterRender (thanh đáy phản hồi, Pie Bot góc) của prototype D. */
import { tr } from "../i18n.ts";
import { i, esc, bobBtn, cmdLearn, cmdReview, type Ctx } from "./shared.ts";
import { judge, optionOrder, type QItem, type QState } from "../data/quest.ts";
import { questResult } from "./study6.ts";
import type { Topic } from "../data/index.ts";

export interface RvCard { q: string; a: string; token?: string; topic: Topic }
export interface RV { queue: RvCard[]; i: number; flip: boolean; done: number[]; title: string; previews?: string[] }
export interface QZ {
  key: string; title: string; topic?: Topic; topics: Topic[]; items: QItem[]; i: number; res: boolean[];
  st: QState; input: string; start: number; phase: "flash" | "bet" | "ask"; bet: number; coins: number; selLeft: number | null; shuf: number[]; wrongAt: number | null;
  html: Record<string, string>; img: (path: string) => string;
  redo?: boolean;   // đã bấm Làm lại sau khi xem đáp án: lượt này assisted, không gỡ được câu sai
  picks?: (QState & { input?: string })[]; sel?: number | null;   // đợt 6: phương án đã chọn từng câu + câu đang xem lại ở màn kết quả
}
const shuffle = (n: number) => { const a = [...Array(n).keys()]; for (let k = n - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
/** Trạng thái mới cho câu thứ z.i (gọi khi bắt đầu node hoặc sang câu kế). */
export function freshItem(z: QZ) {
  const q = z.items[z.i]; z.st = {}; z.input = ""; z.selLeft = null; z.wrongAt = null; z.start = Date.now(); z.bet = 0;
  z.phase = q?.flash ? "flash" : q?.type === "auction" ? "bet" : "ask";
  z.shuf = !q ? [] : q.kind === "choice" ? optionOrder(q) : shuffle(q.kind === "match" ? (q.pairs || []).length : q.kind === "chain" ? (q.items || []).length : 0);   // choice: thứ tự hiện phương án (chỉ số gốc giữ nguyên để chấm)
}
/** Giây còn lại của đồng hồ đang chạy (null = câu không có giờ). */
export function secsLeft(z: QZ): number | null {
  const q = z.items[z.i]; if (!q) return null;
  const lim = z.phase === "flash" ? q.flash?.time : z.phase === "ask" ? q.timer : undefined;
  return lim == null ? null : Math.max(0, Math.ceil(lim - (Date.now() - z.start) / 1000));
}

export const focusTop = (title: string, n: number, tot: number) => `<div class="focus-top"><button class="ibtn" data-exit title="${tr("Thoát (Esc)")}" aria-label="${tr("Thoát (Esc)")}">${i("x")}</button><span style="font-size:var(--pa-fs-sm);font-weight:560">${esc(title)}</span><div class="prog"><b style="width:${tot ? n / tot * 100 : 0}%"></b></div><span class="cnt">${Math.min(n + 1, tot)} / ${tot}</span></div>`;
export const corner = (mood: string, key: string) => `<div class="mascot-slot corner" data-mascot data-mood="${mood}" data-mkey="${esc(key)}"></div>`;
const shell = (top: string, body: string, foot = "") => `<div class="focus q-play qd">${top}<div class="focus-body">${body}</div>${foot}</div>`;
export const RATE = () => [["again", tr("Quên")], ["", tr("Khó")], ["good", tr("Được")], ["", tr("Dễ")]];

export function fmtGap(ms: number) {
  const m = Math.round(ms / 6e4);
  return m < 60 ? tr("{0} phút", Math.max(1, m)) : m < 60 * 24 ? tr("{0} giờ", Math.round(m / 60)) : tr("{0} ngày", Math.round(m / 1440));
}

/** w (đợt 4, phiên hôm nay): thanh trên + dòng pha thay cho thanh của phiên ôn thường. */
export interface Wrap { top: string; phase: string; fate?: (ok: boolean) => string; pill?: string }
export function reviewScreen(C: Ctx, r: RV, w?: Wrap) {
  const n = r.queue.length;
  if (r.i >= n) {
    const g = r.done.filter(x => x >= 1).length, miss = r.queue.filter((_, k) => r.done[k] === 0), t = miss[0]?.topic;
    return shell(focusTop(tr("Ôn thẻ"), n, n), `<div class="sumry in"><div class="eyebrow">${tr("Xong phiên ôn")}</div><div class="big">${g}/${n}</div><p class="sub">${tr("nhớ được. Thẻ quên sẽ quay lại sau ít phút.")}</p>
      <div class="tokbars" style="text-align:left">${r.queue.map((c, k) => `<div class="r"><span class="pill tok" style="justify-self:start">${esc(c.token || "—")}</span><span class="bars"><b class="${r.done[k] >= 1 ? "ok" : "miss"}" style="width:100%"></b></span><span class="muted" style="font-size:11px">${RATE()[r.done[k]]?.[1] || ""}</span></div>`).join("")}</div>
      <div class="acts" style="justify-content:center">${t ? bobBtn(C, tr("Hỏi {0} chỗ quên", C.agent), `${cmdReview(t)} — vừa quên thẻ ${miss.map(c => c.token).filter(Boolean).join(", ")}`) : ""}<button class="btn ghost" data-exit>${tr("Xong")}</button></div></div>${corner("celebrate", "rv-end")}`);
  }
  const c = r.queue[r.i];
  const body = `${w?.phase || ""}<div class="flash ${r.flip ? "flipped" : ""}" data-flip><div class="inner"><div class="face"><span class="pill tok" style="align-self:flex-start">${esc(c.token || "—")}</span><p class="q">${esc(c.q)}</p><div class="bot"><span>${esc(c.topic.title)}</span><span>${tr("Bấm hoặc")} <kbd class="k">Space</kbd> ${tr("để lật")}</span></div></div>
    <div class="face back"><span class="pill tok" style="align-self:flex-start">${esc(c.token || "—")}</span><p class="qmini">${esc(c.q)}</p><p class="a">${esc(c.a)}</p><div class="bot"><span>${tr("Tự chấm: nhớ được tới đâu?")}</span></div></div></div></div>
    ${r.flip ? `<div class="rate in">${RATE().map(([cl, l], k) => `<button class="${cl}" data-rate="${k}"><b>${l}</b><small>${r.previews?.[k] || ""} · <kbd class="k">${k + 1}</kbd></small></button>`).join("")}</div>`
      : `<div class="flip-hint"><button class="btn lg" data-flip>${tr("Hiện đáp án")} <kbd>Space</kbd></button></div>`}${corner(r.flip ? "idle" : "think", "rv:" + r.i)}`;
  return shell(w?.top || focusTop(r.title, r.i, n), body);
}

/** Đúng/sai của câu đang làm (null = chưa trả lời xong). */
export function verdict(z: QZ): boolean | null { const q = z.items[z.i]; return q ? judge(q, z.st) : null; }

export function quizScreen(C: Ctx, z: QZ, w?: Wrap) {
  const n = z.items.length;
  if (z.i >= n) return questResult(C, z, focusTop(tr("Quest"), n, n));
  const q = z.items[z.i], v = verdict(z), left = secsLeft(z), ord = z.st.order || [];
  const timer = left != null && v == null ? `<span class="pill q-timer">${i("clock", 12)}<b>${left}</b>s</span>` : "";
  const img = q.image ? `<div class="q-img"><img src="${esc(z.img(q.image))}" alt="">${q.region ? `<i class="q-occl" data-region="${q.region.x},${q.region.y},${q.region.w},${q.region.h},${q.region.pct ? 1 : 0}"></i>` : ""}</div>` : "";
  let body: string;
  if (z.phase === "flash") {   // snapshot / memory-palace: nhìn rồi nhớ
    body = `<div class="q-flash">${q.flash!.items.map((x, k) => `<div class="order-it"><span class="k">${k + 1}</span><b>${esc(x)}</b>${q.flash!.descs?.[k] ? `<small>${esc(q.flash!.descs[k])}</small>` : ""}</div>`).join("")}</div><div class="acts"><button class="btn pri" data-qz-phase>${tr("Đã nhớ, hỏi đi")}</button></div>`;
  } else if (z.phase === "bet") {   // auction: cược trước khi thấy câu trả lời
    const max = Math.max(5, Math.min(z.coins, 80));
    body = `<p class="sub">${tr("Số dư: {0} xu. Chắc tới đâu thì cược tới đó.", z.coins)}</p><div class="q-bets">${[5, 20, 50, max].filter((x, k, a) => x <= max && a.indexOf(x) === k).map(x => `<button class="opt" data-bet="${x}"><span class="k">${x}</span>${tr("Cược {0} xu", x)}</button>`).join("")}</div>`;
  } else if (q.kind === "order" || q.kind === "chain") {
    const items = q.items || [], idx = q.kind === "chain" ? z.shuf : items.map((_, k) => k);
    body = `${q.kind === "chain" ? `<p class="sub">${tr("Còn {0} lượt sai", Math.max(0, 3 - (z.st.mistakes || 0)))}</p>` : ""}<div class="order-slot">${ord.map((x, k) => `<div class="order-it"><span class="k">${k + 1}</span>${esc(items[x])}</div>`).join("")}</div>
      ${v != null ? "" : idx.map(k => ord.includes(k) ? "" : `<button class="opt ${z.wrongAt === k ? "wrong" : ""}" data-ord="${k}"><span class="k">+</span>${esc(items[k])}</button>`).join("")}`;
  } else if (q.kind === "timeline") {
    const sl = q.slots || [], ev = q.events || [];
    body = `<div class="order-slot">${sl.map((x, k) => `<div class="order-it"><span class="k">${k + 1}</span><b>${esc(x)}</b>${ord[k] != null ? ` · ${esc(ev[ord[k]])}` : ""}</div>`).join("")}</div>
      ${v != null ? "" : ev.map((x, k) => ord.includes(k) ? "" : `<button class="opt" data-ord="${k}"><span class="k">+</span>${esc(x)}</button>`).join("")}`;
  } else if (q.kind === "match") {
    const pr = q.pairs || [], done = z.st.matched || [];
    body = `<div class="q-match"><div>${pr.map((p, k) => `<button class="opt ${done.includes(k) ? "right" : z.selLeft === k ? "sel" : ""}" ${done.includes(k) || v != null ? "disabled" : `data-ml="${k}"`}>${esc(p[0])}</button>`).join("")}</div>
      <div>${z.shuf.map(k => `<button class="opt ${done.includes(k) ? "right" : z.wrongAt === k ? "wrong" : ""}" ${done.includes(k) || v != null ? "disabled" : `data-mr="${k}"`}>${esc(pr[k][1])}</button>`).join("")}</div></div>`;
  } else if (q.kind === "iframe") {
    body = z.html[q.html!] != null ? `<iframe class="q-frame" sandbox="allow-scripts" style="height:${q.height}px" srcdoc="${esc(z.html[q.html!])}"></iframe>${v == null ? `<p class="sub muted">${tr("Làm trong khung trên; trang tự chấm rồi báo kết quả về đây.")}</p>` : ""}` : `<div class="note-call">${i("alert")}<div>${tr("Không đọc được file {0}.", esc(q.html))}</div></div>`;
  } else if (q.kind === "input") {
    body = `${img}<div class="ask"><input data-qz-input value="${esc(z.input)}" placeholder="${tr("Gõ câu trả lời…")}" ${v != null ? "disabled" : ""}>${v == null ? `<button class="btn pri" data-qz-check>${tr("Kiểm tra")}</button>` : ""}</div>`;
  } else {
    const opts = q.tf ? [tr("Đúng"), tr("Sai")] : q.opts || [], pick = z.st.pick, ord = z.shuf.length === opts.length ? z.shuf : opts.map((_, k) => k);
    body = img + (q.type === "auction" ? `<p class="sub">${tr("Đang cược {0} xu · số dư {1}", z.bet, z.coins)}</p>` : "") + ord.map((k, pos) => `<button class="opt ${v != null ? (k === q.ans ? "right" : k === pick ? "wrong" : "dim") : ""}" ${v != null ? "" : `data-pick="${k}"`}><span class="k">${"ABCDEFGH"[pos]}</span>${esc(opts[k])}</button>`).join("");
  }
  const TYPE: Record<string, string> = { order: tr("Sắp thứ tự"), chain: tr("Chuỗi có áp lực"), timeline: tr("Xếp vào mốc"), match: tr("Nối cặp"), iframe: tr("Mô phỏng"), cloze: tr("Điền chỗ trống"), "image-occlusion": tr("Che vùng ảnh"),
    truefalse: tr("Đúng / sai"), countdown: tr("Có giờ"), auction: tr("Cược điểm"), snapshot: tr("Nhìn nhanh rồi nhớ"), "memory-palace": tr("Cung điện trí nhớ"), "image-quiz": tr("Đọc sơ đồ"), image: tr("Đọc sơ đồ"), text: tr("Tự gõ"), input: tr("Tự gõ") };
  const type = TYPE[q.type] || tr("Trắc nghiệm");
  const ans = v !== false ? (q.type === "auction" ? `${tr("Thắng {0} xu.", z.bet)} ` : "") : z.st.timedOut ? `${tr("Hết giờ.")} ` : q.kind === "input" ? `${tr("Đáp án:")} ${esc((q.accept || []).join(" / "))}. `
    : q.kind === "order" || q.kind === "chain" ? `${tr("Thứ tự đúng:")} ${esc((q.order || []).map(k => (q.items || [])[k]).join(" → "))}. ` : q.kind === "timeline" ? `${tr("Đúng là:")} ${esc((q.slots || []).map((sl, k) => sl + " = " + (q.events || [])[q.order![k]]).join(" · "))}. `
    : q.kind === "match" ? `${tr("Sai {0} lần khi nối.", z.st.mistakes || 0)} ` : q.type === "auction" ? `${tr("Mất {0} xu.", z.bet)} ` : "";
  const foot = v == null ? "" : `<div class="q-foot ${v ? "ok" : "no"}"><div class="q-foot-in"><span class="q-foot-ic">${i(v ? "check" : "x", 26)}</span><div class="q-foot-tx"><b>${v ? tr("Chính xác.") : tr("Chưa đúng.")}</b> ${ans}${esc(q.ex || "")}${w?.fate ? w.fate(v) : ""}</div><button class="qb ${v ? "g" : "r"}" data-qnext>${tr("Tiếp tục")}</button></div></div>`;
  return shell(w?.top || focusTop(z.title, z.i, n), `${w?.phase || ""}<div class="qz in" data-k="${z.i}"><div style="display:flex;gap:6px">${q.token ? `<span class="pill tok">${esc(q.token)}</span>` : ""}${w?.pill || ""}<span class="pill">${type}</span>${timer}</div>${z.phase === "flash" ? `<p class="qq">${tr("Nhớ kỹ danh sách này")}</p>` : q.q ? `<p class="qq">${esc(q.q)}</p>` : q.kind === "match" ? `<p class="qq">${tr("Nối mỗi mục bên trái với ý đúng bên phải")}</p>` : ""}${body}</div>${corner(v == null ? "think" : v ? "celebrate" : "sad", "qz:" + z.i + ":" + v)}`, foot);
}
