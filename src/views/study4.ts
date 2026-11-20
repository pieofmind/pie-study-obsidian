/* Đợt 4 (spec 7.4) — port d4.js của prototype (bản D2): màn Lỗi sai, dòng câu sai ở trang bài học.
   Plugin chỉ ghi nhật ký luyện tập; giảng lại là việc của agent (ask, Free thì chép lệnh). */
import { tr } from "../i18n.ts";
import { i, esc, fmtD, tokName, crumb, domName, bobBtn, cmdCheck, cmdLearn, type Ctx } from "./shared.ts";
import { pendingNoCheck, relearnTokens } from "../data/tick.ts";
import { todayStr } from "../status.ts";
import { shortTitle, OUTSIDE, type Topic } from "../data/index.ts";
import type { MkRow } from "../practice/today.ts";
import type { PracticeLog } from "../practice/log.ts";
import { strengthOf, strengthLevel } from "../practice/strength.ts";
import { gradeEssay, type CheckItem } from "../data/checknote.ts";
import { corner } from "./practice.ts";

export interface MkFilter { st: "open" | "cleared" | "all"; dom: string; tok: string }
export type Row = MkRow<Topic>;

const day = (iso?: string) => fmtD(iso ? todayStr(new Date(iso)) : "");
const fileName = (p: string) => p.split("/").pop() || p;
/** Câu bài giảng không gửi kèm đề (khuôn message chỉ có token + đúng/sai) → hiện theo kiểu hiểu + tên bài giảng. */
export const mkQ = (r: Row) => r.m.q || tr("Câu {0} trong bài giảng {1}", tokName(r.m.token || ""), fileName(r.m.ref));
export const mkOpen = (C: Ctx) => C.mk.filter(r => r.m.status === "open");
/** Lệnh giảng lại gửi agent — tiếng Việt, không qua tr() (agent đọc lệnh, không phải người). */
export const cmdReteach = (r: Row) => `giảng lại [[${r.topic.slug}]] — token: ${r.m.token || ""}\nCâu tôi làm sai: ${mkQ(r)}`;

/** Đợt 9: token tạm chưa có câu kiểm → nhờ agent soạn; token vừa trượt kiểm → cần học lại. Không có learn_pending thì không hiện gì. */
export function tickLines(C: Ctx, t: Topic) {
  const A = C.agent, need = pendingNoCheck(t.pend || [], C.checks(t)), re = relearnTokens(C.log(t).attempts || [], t.und, t.pend || []);
  return (need.length ? `<div class="note-call info">${i("info")}<div>${tr("{0} kiểu hiểu đang chờ kiểm nhưng chưa có câu kiểm.", need.length)} ${bobBtn(C, tr("Nhờ {0} soạn câu kiểm", A), cmdCheck(t, need), "")}</div></div>` : "")
    + (re.length ? `<div class="note-call">${i("alert")}<div>${tr("Cần học lại: {0}.", re.map(tokName).join(", "))} ${bobBtn(C, tr("Học lại với {0}", A), cmdLearn(t), "")}</div></div>` : "");
}

export function mkTopicLine(C: Ctx, t: Topic) {
  const n = mkOpen(C).filter(r => r.topic.path === t.path).length;
  return n ? `<button class="mk-tline" data-go="mistakes">${i("undo", 18)}<span>${tr("{0} ở bài này", `<b>${tr("{0} câu sai đang mở", n)}</b>`)}</span><em>${tr("Xem sổ lỗi sai")} ${i("right", 14)}</em></button>` : "";
}

export function mistakesScreen(C: Ctx, f: MkFilter) {
  const all = C.mk, open = mkOpen(C), cleared = all.filter(r => r.m.status === "cleared"), ready = all.filter(r => r.ready);
  const doms = [...new Set(all.map(r => r.topic.dom))], toks = [...new Set(all.map(r => r.m.token || ""))].filter(Boolean);
  const list = all.filter(r => (f.st === "all" || r.m.status === f.st) && (!f.dom || r.topic.dom === f.dom) && (!f.tok || r.m.token === f.tok));
  const chip = (k: MkFilter["st"], l: string, n: number) => `<button class="mk-chip ${f.st === k ? "on" : ""}" data-mkf="${k}">${l}<i>${n}</i></button>`;
  const ask = (r: Row) => !C.agentReady ? `<button class="btn" data-copy="${esc(cmdReteach(r))}">${i("copy", 14)}${tr("Chép lệnh giảng lại")}</button>` : `<button class="btn" data-bob="${esc(cmdReteach(r))}">${i("chat", 14)}${tr("Nhờ {0} giảng lại", C.agent)}</button>`;
  const row = (r: Row) => {
    const m = r.m, wait = m.status === "open" && todayStr(new Date(m.last)) >= C.today;
    const st = r.gone ? `<span class="mk-st gone">${tr("Không còn trong vault")}</span>` : m.status === "cleared" ? `<span class="mk-st ok">${i("check", 12)}${tr("Đã gỡ {0}", day(m.clearedAt))}</span>`
      : m.src === "lecture" ? `<span class="mk-st wait">${tr("Làm lại trong bài giảng")}</span>` : wait ? `<span class="mk-st wait">${tr("Làm lại từ ngày mai")}</span>` : `<span class="mk-st ready">${tr("Làm lại được")}</span>`;
    const acts = m.status !== "open" ? "" : r.gone ? `<button class="btn" data-mkdrop="${esc(r.key)}" data-topic="${esc(r.topic.slug)}">${i("x", 14)}${tr("Bỏ khỏi sổ")}</button>`
      : (m.src === "lecture" ? `<button class="btn" data-go="lecture" data-topic="${esc(r.topic.slug)}">${i("slides", 14)}${tr("Mở lại bài giảng")}</button>` : "") + ask(r);
    return `<div class="mk-row ${m.status}${r.gone ? " gone" : ""}"><div class="mk-main"><p class="mk-q">${esc(mkQ(r))}</p>
      <div class="mk-meta">${m.token ? `<span class="pill tok">${esc(m.token)}</span>` : ""}${r.topic.outside ? `<a data-open="${esc(r.topic.path)}">${esc(r.topic.title)}</a><span>${tr("Ngoài lộ trình")}</span>` : `<a data-go="topic" data-topic="${esc(r.topic.slug)}">${esc(shortTitle(r.topic.title))}</a>`}<span>${m.src === "lecture" ? tr("Bài giảng") : tr("Quest")}</span><span>${tr("Sai {0} lần · gần nhất {1}", m.misses, day(m.last))}</span></div></div>
      <div class="mk-side">${st}${acts ? `<div class="mk-acts">${acts}</div>` : ""}</div></div>`;
  };
  return `<div class="page mk">${crumb(`<span>${tr("Lỗi sai")}</span>`)}
    <div class="mk-head"><div><h1 class="t">${tr("Lỗi sai")}</h1><p class="sub">${tr("Câu trả lời sai ở quest và bài giảng. Làm đúng lại từ ngày hôm sau thì câu được gỡ.")}</p></div>
      <div class="mk-cta"><span class="mk-count">${tr("{0} đang mở", `<b>${open.length}</b>`)}<i></i>${tr("{0} đã gỡ", `<b>${cleared.length}</b>`)}</span>
      ${ready.length ? `<button class="qb" data-tdstart="miss">${i("undo", 18)}${tr("Làm lại {0} câu sai", ready.length)}</button>` : `<span class="mk-count">${tr("Hôm nay không còn câu nào làm lại được.")}</span>`}</div></div>
    <div class="mk-filters">${chip("open", tr("Đang mở"), open.length)}${chip("cleared", tr("Đã gỡ"), cleared.length)}${chip("all", tr("Tất cả"), all.length)}<span style="flex:1"></span>
      <select data-mkdom><option value="">${tr("Mọi lĩnh vực")}</option>${doms.map(x => `<option value="${esc(x)}" ${f.dom === x ? "selected" : ""}>${esc(x === OUTSIDE ? tr("Ngoài lộ trình") : domName(C.idx.domains.find(d => d.id === x)))}</option>`).join("")}</select>
      <select data-mktok><option value="">${tr("Mọi kiểu hiểu")}</option>${toks.map(x => `<option value="${esc(x)}" ${f.tok === x ? "selected" : ""}>${esc(tokName(x))}</option>`).join("")}</select></div>
    <div class="mk-list">${list.length ? list.map(row).join("") : `<div class="mk-empty">${i("check", 22)}<b>${all.length ? tr("Không có câu nào ở mục này") : tr("Chưa có câu sai nào")}</b><small>${tr("Câu trả lời sai ở quest và bài giảng sẽ hiện ở đây.")}</small></div>`}</div></div>`;
}

/* ── Phiên hôm nay ── */
export interface TodayInfo { n: number; miss: number; checks?: number; cards: number; later: number; done: number; streak: number }
/** Khối "Hôm nay học gì?": nút Phiên hôm nay là điểm nhấn duy nhất; xong phiên / không có gì tới hạn thì thành dòng phẳng. */
export function todayBtn(x: TodayInfo) {
  if (!x.n && !x.done) return `<div class="ov-td-flat">${i("check", 20)}<span><b>${tr("Hôm nay không có gì tới hạn")}</b><small>${tr("Không có thẻ hay câu sai nào cần làm lại.")}</small></span></div>`;
  if (!x.n) return `<div class="ov-td-flat ok">${i("check", 20)}<span><b>${tr("Xong phiên hôm nay")}</b><small>${tr("{0} mục · chuỗi {1} ngày", x.done, x.streak)}</small></span></div>`;
  return `<button class="ov-act td" data-tdstart="all"><span class="ov-act-ic">${i("zap", 22)}</span><span><b>${tr("Phiên hôm nay · {0} mục", x.n)}</b><small>${x.checks ? tr("{0} câu kiểm lại", x.checks) + " · " : ""}${tr("{0} câu sai · {1} thẻ tới hạn · khoảng {2} phút", x.miss, x.cards, Math.max(1, Math.round(x.n * .5)))}${x.later ? " · " + tr("còn {0} mục để hôm sau", x.later) : ""}</small></span>${i("arrow", 20)}</button>`;
}
export const tdTitle = (mode: "all" | "miss") => (mode === "miss" ? tr("Làm lại câu sai") : tr("Phiên hôm nay"));
/** Dòng pha phía trên câu: đang ở phần câu sai hay phần thẻ tới hạn. */
export const tdPhase = (miss: boolean, k: number, n: number) => miss
  ? `<div class="td-phase"><b>${tr("Câu sai làm lại")}</b><span>${k}/${n}</span></div>`
  : `<div class="td-phase"><b>${tr("Thẻ tới hạn")}</b><span>${k}/${n} · ${tr("dễ quên nhất trước")}</span></div>`;
/** Đợt 9: dòng pha của câu kiểm độc lập (không gợi ý, không có giải thích). */
export const tdCheckPhase = (k: number, n: number) => `<div class="td-phase"><b>${tr("Kiểm lại sau buổi học")}</b><span>${k}/${n} · ${tr("không gợi ý")}</span></div>`;
export interface CK { text: string; shown: boolean; ticks: boolean[] }
/** Câu kiểm tự luận: viết trước → hiện đáp án mẫu + ý chính → người học tick ý đã nói được, đủ mọi ý mới đạt. */
export function checkEssayScreen(top: string, phase: string, c: CheckItem, k: CK) {
  const pts = c.points || [], all = gradeEssay(k.ticks, pts);
  const body = !k.shown
    ? `<textarea data-ck-input placeholder="${esc(tr("Viết bằng lời của mình, không xem lại note."))}">${esc(k.text)}</textarea>
      <div class="bar"><span class="sp"></span><button class="btn pri" data-ck-show ${k.text.trim() ? "" : "disabled"}>${tr("Xem đáp án mẫu")}</button></div>`
    : `<div class="es-q"><small>${tr("Bạn đã viết")}</small><b>${esc(k.text)}</b><span class="es-src"><small>${tr("Đáp án mẫu")}</small>${esc(c.answer || c.quote)}</span></div>
      <p class="sub">${tr("Tick những ý bài viết của bạn đã nói được:")}</p>
      ${pts.map((p, j) => `<button class="opt ${k.ticks[j] ? "right" : ""}" data-ck-tick="${j}" aria-pressed="${k.ticks[j] ? "true" : "false"}"><span class="k">${k.ticks[j] ? i("check", 14) : j + 1}</span>${esc(p)}</button>`).join("")}
      <div class="bar"><span>${all ? tr("Đủ mọi ý: đạt.") : tr("Còn thiếu ý: chưa đạt.")}</span><span class="sp"></span><button class="btn pri" data-ck-done>${tr("Xác nhận")}</button></div>`;
  return `<div class="focus q-play qd">${top}<div class="focus-body">${phase}<div class="essay in"><div class="ck-pills"><span class="pill tok">${esc(c.token)}</span><span class="pill">${tr("Tự luận")}</span></div>
    <p class="qq">${esc(c.q)}</p>${body}</div></div>${corner(k.shown ? "idle" : "typing", "ck:" + c.q.length)}</div>`;
}
export const tdAtt = (r: Row) => `<span class="pill att">${tr("Đã sai {0} lần · gần nhất {1}", r.m.misses, day(r.m.last))}</span>`;
export const tdFate = (ok: boolean) => `<span class="td-fate">${ok ? tr("Câu này được gỡ khỏi sổ lỗi sai.") : tr("Câu này ở lại sổ lỗi sai. Làm lại từ ngày mai để gỡ.")}</span>`;

export interface TdDone { n: number; cards: number; cleared: number; still: number; streak: number; mode: "all" | "miss"; old?: Topic; next?: Topic; oldDays: number; nextDom: string }
export function tdDone(C: Ctx, top: string, x: TdDone, cmdOld: string, cmdNext: string) {
  const row = (ic: string, b: string, sm: string, cmd: string) => `<button class="td-row" ${!C.agentReady ? `data-copy="${esc(cmd)}"` : `data-bob="${esc(cmd)}"`}><span class="ic">${i(ic, 18)}</span><span><b>${b}</b><small>${esc(sm)}</small></span>${i(!C.agentReady ? "copy" : "arrow", 16)}</button>`;
  return `<div class="focus q-play qd">${top}<div class="focus-body"><div class="sumry in td-done"><div class="eyebrow">${tr("Xong hôm nay")}</div><div class="big">${x.n}/${x.n}</div>
    <div class="td-stats">${x.cards ? `<span>${tr("{0} thẻ đã ôn", `<b>${x.cards}</b>`)}</span>` : ""}<span>${tr("{0} lỗi đã gỡ", `<b>${x.cleared}</b>`)}</span><span>${tr("{0} ngày liên tiếp", `<b>${x.streak}</b>`)}</span></div>
    ${x.still ? `<p class="sub">${tr("Còn {0} câu sai đang mở. Câu sai hôm nay làm lại được từ ngày mai.", x.still)}</p>` : `<p class="sub">${tr("Sổ lỗi sai đã sạch.")}</p>`}
    <div class="acts" style="justify-content:center"><button class="btn" data-exit>${tr("Về Tổng quan")}</button><button class="btn ghost" data-go="mistakes">${tr("Xem sổ lỗi sai")}</button></div>
    ${x.mode === "all" && (x.old || x.next) ? `<div class="td-more"><small>${tr("Còn sức thì học tiếp với {0}", C.agent)}</small>
      ${x.old ? row("clock", !C.agentReady ? tr("Chép lệnh ôn bài tới hạn lâu nhất") : tr("Ôn bài tới hạn lâu nhất"), tr("{0} · quá {1} ngày", shortTitle(x.old.title), x.oldDays), cmdOld) : ""}
      ${x.next ? row("play", !C.agentReady ? tr("Chép lệnh học bài kế tiếp") : tr("Học bài kế tiếp"), x.nextDom + " · " + shortTitle(x.next.title), cmdNext) : ""}</div>` : ""}</div></div>
    <div class="mascot-slot corner" data-mascot data-mood="celebrate" data-mkey="td-done"></div></div>`;
}

/* ── Đợt 5: độ vững ở lưới 17 kiểu hiểu (port d5.js tokMeter / tokTip / tokWarn) ── */
const LV = () => ["", tr("Yếu"), tr("Đang lên"), tr("Vững")];
const recent = (log: PracticeLog, k: string) => (log.attempts || []).filter(a => a.token === k && !a.assisted).slice(-5);
export function tokMeter(log: PracticeLog, k: string) {
  const l = strengthLevel(strengthOf(log.attempts || [], k));
  return l ? `<span class="tk-m l${l}" aria-label="${esc(tr("Độ vững: {0}", LV()[l]))}"><i></i><i></i><i></i></span>` : "";
}
export function tokTip(log: PracticeLog, k: string) {
  const s = strengthOf(log.attempts || [], k); if (s == null) return "";
  const r = recent(log, k);
  return `<span class="tk-tip"><b>${LV()[strengthLevel(s)]} · ${Math.round(s * 100)}%</b> ${tr("{0}/{1} lượt gần nhất đúng", r.filter(a => a.ok).length, r.length)}${r.length < 3 ? " · " + tr("cần thêm lượt để chắc") : ""}</span>`;
}
/** Cảnh báo (thay luật miss > 0): kiểu hiểu đã tick, có từ 2 lượt, độ vững < 0.5. Lỗi cũ đã sửa thì hết báo. */
export const tokWarn = (t: Topic, log: PracticeLog) => t.und.filter(k => recent(log, k).length >= 2 && (strengthOf(log.attempts || [], k) ?? 1) < 0.5);
export const tokWarnText = (C: Ctx, log: PracticeLog, warn: string[]) =>
  `${tr("{0} đang được tick đạt, nhưng độ vững khi luyện tập chỉ {1}. Lần học tới, {2} sẽ đề xuất kiểm lại.", `<b>${warn.map(w => esc(tokName(w))).join(", ")}</b>`, warn.map(w => Math.round((strengthOf(log.attempts || [], w) || 0) * 100) + "%").join(", "), C.agent)} <span class="muted">${tr("Plugin chỉ báo, không tự hạ.")}</span>`;
