/* Màn Tổng quan · Bài học · Sổ học · Ôn (MVP) · Lộ trình mới · Cài đặt — port từ prototype app.js, vỏ kiểu D. */
import { tr, getLang } from "../i18n.ts";
import { GUIDE_PATH, cmdNewLecture } from "../data/lecguide.ts";
import { essayPrompt } from "../data/lecture.ts";
import { weekLine } from "./study10.ts";
import { RUBRIC } from "../data/rubric.ts";
import { nextOf, domStats, overdueDaysT, type Topic } from "../data/index.ts";
import { fmtDate, type Status } from "../status.ts";
import { cardKey, firstGoodIntervals, LEVELS } from "../practice/log.ts";
import { i, esc, md, sty, QPAL, STLABEL, tokName, fmtD, qNum, bobBtn, ring, crumb, curDom, findT, cmdLearn, cmdReview, cmdNewPath, domName, type Ctx } from "./shared.ts";
import { groupsOf, qDone, groupName } from "./map.ts";
import { rhythmBlock, testOutBtn } from "./study5.ts";
import { matsTab, topicMats } from "./study13.ts";
import { mapTab } from "./study14.ts";
import { mkTopicLine, todayBtn, tokMeter, tokTip, tokWarn, tokWarnText } from "./study4.ts";

const domTitle = (C: Ctx, id: string) => domName(C.idx.domains.find(d => d.id === id)) || id;
const domIdx = (C: Ctx, id: string) => Math.max(0, C.idx.domains.findIndex(d => d.id === id));

const domRows = (C: Ctx) => C.idx.domains.map((d, k) => ({ d, k, s: domStats(d), nx: nextOf(d) }));
const activeOf = (rows: ReturnType<typeof domRows>) => rows.filter(r => r.s.done + r.s.learning + r.s.due).sort((a, b) => b.s.due - a.s.due || b.s.done - a.s.done);
/** Bài kế tiếp để "Học tiếp với agent": lĩnh vực đang học nhiều bài tới hạn nhất có bài kế. Dùng chung Tổng quan và thẻ Xong hôm nay. */
export const nextUp = (C: Ctx) => activeOf(domRows(C)).find(r => r.nx);

/* Tổng quan = 2 view của dashboard-hoc-tap.base: tiến độ theo lĩnh vực + cần ôn (tới hạn). */
export function overviewScreen(C: Ctx) {
  const ALL = C.idx.all, DUE = C.idx.due, A = C.agent;
  const rows = domRows(C);
  const act = activeOf(rows), idle = rows.filter(r => !act.includes(r));
  const c: Record<Status, number> = { master: 0, basic: 0, learning: 0, new: 0 }; ALL.forEach(t => c[t.status]++);
  const top = act.find(r => r.nx), old = DUE[0];
  return `<div class="page ov">${crumb(`<span>${tr("Tổng quan")}</span>`)}
    <div class="ov-hero"><div class="ov-now"><h1 class="t">${tr("Hôm nay học gì?")}</h1><p class="sub">${tr("Tổng quan mọi lĩnh vực")}</p>
      <div class="ov-acts has-td">${todayBtn(C.todayInfo())}${DUE.length ? `<button class="ov-act due" data-go="review"><span class="ov-act-ic">${i("clock", 22)}</span><span><b>${tr("Ôn {0} bài tới hạn", DUE.length)}</b><small>${tr("lâu nhất quá {0} ngày", overdueDaysT(old, C.today))} · ${esc(domTitle(C, old.dom))}</small></span>${i("arrow", 20)}</button>` : ""}
      ${top && top.nx ? `<button class="ov-act go" style="${sty(top.k)}" ${!C.agentReady ? `data-copy="${esc(cmdLearn(top.nx))}"` : `data-bob="${esc(cmdLearn(top.nx))}"`}><span class="ov-act-ic">${i("play", 20)}</span><span><b>${!C.agentReady ? tr("Chép lệnh học tiếp") : tr("Học tiếp với {0}", A)}</b><small>${esc(domName(top.d))} · ${esc(top.nx.title)}</small></span>${i("arrow", 20)}</button>` : ""}</div></div>
      ${C.agentReady ? `<button class="ov-new" data-bob="lộ trình mới">${i("plus", 32)}<span><b>${tr("Lộ trình mới")}</b><small>${tr("{0} hỏi mục tiêu, nguồn rồi chia bài trong khung chat", esc(A))}</small></span>${i("arrow", 16)}</button>` : ""}
      <div class="ov-sum">${weekLine(C)}<div class="ov-big"><b>${c.master + c.basic}</b><i>/${ALL.length}</i><small>${tr("bài đã nắm")}</small></div>
        <div class="ov-mix">${(["master", "basic", "learning", "new"] as Status[]).map(k => c[k] ? `<i class="${k}" style="flex:${Math.max(c[k], ALL.length * .02)}"></i>` : "").join("")}</div>
        <ul>${([["master", tr("Master")], ["basic", tr("Nắm cơ bản")], ["learning", tr("Đang học dở")], ["new", tr("Chưa học")]] as [Status, string][]).map(([k, l]) => `<li><i class="${k}"></i>${l}<b>${c[k]}</b></li>`).join("")}<li class="sep">${tr("Lĩnh vực")}<b>${tr("{0} đang học · {1} chưa mở", act.length, idle.length)}</b></li></ul></div></div>
    ${rhythmBlock(C, C.rhythm())}
    <h2 class="ov-h">${tr("Đang học")}<small>${tr("{0} lĩnh vực · tới hạn trước", act.length)}</small></h2>
    <div class="ov-doms">${act.map(({ d, k, s, nx }, n) => `<div class="ov-dom in" style="--i:${n};${sty(k)}" data-go="home" data-dom="${esc(d.id)}"><span class="ov-tag"></span>
      <div class="ov-t"><b>${esc(domName(d))}</b><small>${tr("{0}/{1} nắm", s.done, s.n)}${s.learning ? " · " + tr("{0} đang học", s.learning) : ""}</small></div>
      <div class="ov-mid"><span class="ov-track">${groupsOf(C, d).map(g => `<span class="ov-grp" title="${esc(groupName(g))}">${g.list.map(t => `<i class="${t.status}${t.due ? " due" : ""}${t === nx ? " nx" : ""}"></i>`).join("")}</span>`).join("")}</span>
        ${nx ? `<small class="ov-next">${i("play", 11)}${tr("Bài kế: {0}", esc(nx.title))}</small>` : `<small class="ov-next">${tr("Đã học hết")}</small>`}</div>
      ${s.due ? `<span class="pill att">${i("clock", 11)}${tr("{0} tới hạn", s.due)}</span>` : `<span></span>`}</div>`).join("")}</div>
    ${idle.length ? `<h2 class="ov-h">${tr("Chưa bắt đầu")}<small>${tr("{0} lĩnh vực · {1} bài đang chờ", idle.length, idle.reduce((n, r) => n + r.s.n, 0))}</small></h2>
    <div class="ov-idle">${idle.map(({ d, k, s }) => `<button class="ov-chip" style="${sty(k)}" data-go="home" data-dom="${esc(d.id)}"><i></i><b>${esc(domName(d))}</b><small>${tr("{0} bài", s.n)}</small></button>`).join("")}</div>` : ""}
    ${dueTable(C)}</div>`;
}

function dueTable(C: Ctx) {
  const DUE = C.idx.due;
  return `<h2 class="ov-h">${tr("Cần ôn (tới hạn)")}<small>${tr("{0} bài · quá hạn lâu nhất trước", DUE.length)}</small></h2>
    <div class="ov-due"><div class="ov-tr th"><span>${tr("Bài")}</span><span>${tr("Lĩnh vực")}</span><span>${tr("Ôn kế")}</span><span>${tr("Quá")}</span><span></span></div>${DUE.map(t => `<div class="ov-tr"><a data-go="topic" data-topic="${esc(t.slug)}"><i class="ov-dot" style="background:${QPAL[domIdx(C, t.dom) % QPAL.length][0]}"></i>${esc(t.title)}</a><span>${esc(domTitle(C, t.dom))}</span><span class="num">${fmtD(t.next)}</span><span class="num od"><i style="--w:${Math.min(100, overdueDaysT(t, C.today) / 1.5)}%"></i>${tr("{0} ngày", overdueDaysT(t, C.today))}</span>${bobBtn(C, tr("Ôn"), cmdReview(t), "", true)}</div>`).join("")}</div>`;
}

/* MVP: ôn trong plugin (FSRS) là đợt 2 — màn này giao việc ôn cho agent. */
export function reviewScreen(C: Ctx) {
  return `<div class="page ov">${crumb(`<span>${tr("Ôn thẻ")}</span>`)}
    <div class="note-call info">${i("info")}<div>${tr("Lĩnh vực này không có thẻ nào tới hạn. Bài tới hạn ôn bên dưới: bấm Ôn để {0} hỏi lại.", C.agent)}</div></div>
    ${C.idx.due.length ? dueTable(C) : `<p class="sub">${tr("Không có bài nào tới hạn ôn.")}</p>`}</div>`;
}

export function topicScreen(C: Ctx) {
  const t = findT(C, C.S.topic) || C.idx.all[0]; if (!t) return onboardScreen(C);
  const s = t.status, A = C.agent, ses = C.sessions(t), cards = C.cards(t);
  const tabs: [string, string, number?][] = [["notebook", tr("Sổ học")], ["map", tr("Sơ đồ")], ["sessions", tr("Buổi học"), ses.length], ["cards", tr("Thẻ"), cards.length], ["practice", tr("Luyện tập")], ["mats", tr("Học liệu"), topicMats(C, t).length]];
  const log = C.log(t), now = new Date(), dueCards = cards.filter(c => { const st = log.cards[cardKey(c.q)]; return !st || new Date(st.due) <= now; }).length;
  const warn = tokWarn(t, log);   // token đã đạt nhưng độ vững thấp — chỉ báo, không tự hạ
  const hasQuest = C.quests.some(q => q.topics.includes(t.slug) && q.nodes.some(n => !n.boss && n.items.length));
  return `<div class="page">${crumb(`<a data-go="home" data-dom="${esc(t.dom)}">${esc(domTitle(C, t.dom))}</a>`, `<span>${tr("Bài {0}", qNum(t))}</span>`)}
    <div class="t-head" style="${sty(groupIdx(C, t))}"><div class="tx"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill ${qDone(t) ? "done" : s === "learning" ? "acc" : ""}">${STLABEL(s)}</span>${t.due ? `<span class="pill att">${i("clock", 12)}${tr("Tới hạn ôn từ {0}", fmtD(t.next))}</span>` : ""}</div>
    <h1 class="t" style="margin-top:10px">${esc(t.title)}</h1><p class="sub">${t.rev ? tr("Học lần gần nhất {0}", fmtDate(t.rev, true)) : tr("Học lần gần nhất — chưa học")} · ${tr("{0}/17 token", t.und.length)} · ${tr("{0} thẻ", t.cards)}</p>
    <div class="acts">${bobBtn(C, s === "new" ? tr("Bắt đầu học với {0}", A) : t.due ? tr("Ôn với {0}", A) : tr("Học tiếp với {0}", A), t.due ? cmdReview(t) : cmdLearn(t))}${testOutBtn(C, t, "page")}
    ${cards.length ? `<button class="btn" data-review="${esc(t.slug)}">${i("cards")}${tr("Ôn thẻ")}${dueCards ? ` <span class="c">${dueCards}</span>` : ""}</button>` : ""}${hasQuest ? `<button class="btn" data-quest="${esc(t.slug)}">${i("quest")}${tr("Làm quest")}</button>` : ""}<button class="btn" data-qreq="${esc(t.path)}">${i("zap", 14)}${tr("Quiz nhanh")}</button>
    ${essayBtn(C, t)}${lecBtn(C, t)}<button class="btn ghost" data-open="${esc(t.path)}">${i("file")}${tr("Mở note")}</button></div></div>
    ${ring(t.und.length, 17, 112, 8, qDone(t))}</div>
    ${warn.length ? `<div class="note-call">${i("alert")}<div>${tokWarnText(C, log, warn)}</div></div>` : ""}${mkTopicLine(C, t)}
    <div class="sec"><div class="sec-h"><h2 class="t">${tr("17 kiểu hiểu")}</h2><span class="c">${tr("rê chuột để xem tiêu chí đạt")} · ${tr("vạch bên phải là độ vững khi luyện tập")}</span></div><div class="tokgrid">
    ${RUBRIC.map(([g, l]) => `<div class="tokg"><h6>${tr(g)}</h6>${l.map(k => `<div class="tok ${t.und.includes(k[0]) ? "on" : ""} ${k[3] ? "core" : ""} ${warn.includes(k[0]) ? "warn" : ""}"><span class="ck">${t.und.includes(k[0]) ? i("check", 11) : ""}</span><span class="nm">${esc(tokName(k[0]))}</span>${tokMeter(log, k[0])}<span class="tip"><b>${k[0]}</b> — ${tr("đạt khi tự {0}.", tr(k[2]))}${tokTip(log, k[0])}</span></div>`).join("")}</div>`).join("")}</div></div>
    <div class="tabs">${tabs.map(([k, l, n]) => `<button class="${C.S.ttab === k ? "on" : ""}" data-ttab="${k}">${l}${n != null ? `<span class="c">${n}</span>` : ""}</button>`).join("")}</div>${topicTab(C, t, ses, cards)}</div>`;
}
const groupIdx = (C: Ctx, t: Topic) => { const d = C.idx.domains.find(x => x.id === t.dom); return d ? Math.max(0, groupsOf(C, d).findIndex(g => g.list.includes(t))) : 0; };

function topicTab(C: Ctx, t: Topic, ses: { basename: string; path: string }[], cards: { token?: string; q: string }[]) {
  const log = C.log(t), now = new Date();
  if (C.S.ttab === "mats") return matsTab(C, t);
  if (C.S.ttab === "map") return mapTab(C, t);
  if (C.S.ttab === "practice") { const tk = Object.entries(log.tokens);
    return tk.length ? `<div class="tokbars">${tk.map(([k, v]) => `<div class="r"><span class="pill tok" style="justify-self:start">${esc(k)}</span><span class="bars"><b class="ok" style="width:${v.ok / (v.ok + v.miss || 1) * 100}%"></b><b class="miss" style="width:${v.miss / (v.ok + v.miss || 1) * 100}%"></b></span><span class="num muted">${tr("{0} đúng · {1} sai", v.ok, v.miss)}</span></div>`).join("")}
      <p class="sub muted" style="margin-top:6px;font-size:var(--pa-fs-sm)">${tr("Từ nhật ký luyện tập của plugin (thẻ + quest). {0} đọc bảng này ở bước chấm mastery.", C.agent)}</p></div>` : `<p class="sub muted" style="padding-top:12px">${tr("Chưa có lượt luyện tập nào cho bài này.")}</p>`; }
  if (C.S.ttab === "sessions") return ses.length ? `<div class="rows" style="padding-top:10px">${ses.map(f => `<div class="row" data-open="${esc(f.path)}">${i("file")}<div class="tt"><b>${tr("Buổi {0}", /^\d{4}-\d\d-\d\d/.test(f.basename) ? fmtD(f.basename.slice(0, 10)) + "/" + f.basename.slice(0, 4) : esc(f.basename))}</b><small>${esc(f.basename)}</small></div></div>`).join("")}</div>` : `<p class="sub muted" style="padding-top:12px">${tr("Chưa có buổi học nào ghi lại cho bài này.")}</p>`;
  if (C.S.ttab === "cards") return cards.length ? `<div class="rows" style="padding-top:10px">${cards.map((c, n) => `<div class="row in" style="--i:${n};grid-template-columns:110px 1fr auto"><span class="pill tok">${esc(c.token || "—")}</span><div class="tt"><b style="white-space:normal">${esc(c.q)}</b></div><div class="meta">${(() => { const st = log.cards[cardKey(c.q)]; return !st ? `<span class="pill">${tr("mới")}</span>` : new Date(st.due) <= now ? `<span class="pill att">${tr("tới hạn")}</span>` : tr("ôn {0}", fmtD(new Date(st.due).toISOString().slice(0, 10))); })()}</div></div>`).join("")}</div>` : `<p class="sub muted" style="padding-top:12px">${tr("Bài này chưa có thẻ ôn.")}</p>`;
  const sh = C.sohoc.get(t.dom), n = sh?.data.topics[t.slug];
  if (!sh || !n || !(n.known.length || n.ev.length || n.gap)) return `<div class="note-call info">${i("info")}<div>${sh ? tr("Sổ học chưa có đoạn nào cho bài này.") : tr("Lĩnh vực này chưa có sổ học.")}</div></div>`;
  return `<div class="kv">${n.known.length ? `<dt>${tr("Kiến thức đã đạt")}</dt><dd>${n.known.map(([k, v]) => `<div style="margin-bottom:6px"><span class="pill tok">${esc(k)}</span> ${md(v)}</div>`).join("")}</dd>` : ""}
    ${n.ev.length ? `<dt>${tr("Bằng chứng")}</dt><dd>${n.ev.map(([k, v]) => `<div class="quote">“${esc(v)}”<span class="pill tok">${esc(k)}</span></div>`).join("")}</dd>` : ""}${n.gap ? `<dt>${tr("Lỗ hổng buổi sau")}</dt><dd>${md(n.gap)}</dd>` : ""}
    <dt>${tr("Nguồn")}</dt><dd><a class="src" data-open="${esc(sh.path)}">${i("file", 12)}${esc(sh.path.split("/").pop())}</a></dd></div>`;
}

/* Sổ học: đọc đúng so-hoc-<domain>.md. Trạng thái lấy từ frontmatter bài (nguồn chân lý), không từ chữ trong sổ. */
export function notebookScreen(C: Ctx) {
  const d = curDom(C); if (!d) return onboardScreen(C);
  const shp = C.sohoc.get(d.id), sh = shp?.data || { groups: [], topics: {}, big: [], links: [], last: "" };
  const groups = groupsOf(C, d);
  const card = (t: Topic, k: number) => { const n = sh.topics[t.slug] || { known: [], ev: [], gap: "", sessions: [] }, ok = t.und.length || n.known.length;
    if (!ok) return `<div class="nb-mini" data-go="topic" data-topic="${esc(t.slug)}"><span class="num">${qNum(t)}</span><span>${esc(t.title)}</span><i>${tr("chưa đào")}</i></div>`;
    return `<div class="nb-sec in" style="--i:${k}"><div class="hd" data-go="topic" data-topic="${esc(t.slug)}">${mini(t)}<b>${esc(t.title)}</b><span class="pill ${t.status === "learning" ? "" : "done"}">${STLABEL(t.status)}</span><span class="num muted" style="font-size:11px">${t.und.length}/17</span></div>
      <div class="bd">${n.known.length ? `<div class="nb-known">${n.known.map(([kk, v]) => `<div><span class="pill tok">${esc(kk)}</span> ${md(v)}</div>`).join("")}</div>` : `<p class="sub muted">${tr("Frontmatter ghi {0} token nhưng sổ chưa chép nội dung.", t.und.length)}</p>`}
      ${n.ev.length ? `<div class="nb-ev"><h6>${tr("Bằng chứng (tự nói)")}</h6>${n.ev.slice(0, 3).map(([kk, v]) => `<div class="quote">“${esc(v)}”<span class="pill tok">${esc(kk)}</span></div>`).join("")}${n.ev.length > 3 ? `<small class="muted">${tr("+{0} câu nữa", n.ev.length - 3)}</small>` : ""}</div>` : ""}
      ${n.gap ? `<p class="nb-gap"><b>${tr("Lỗ hổng buổi sau:")}</b> ${md(n.gap)}</p>` : ""}
      ${n.sessions.length ? `<div class="nb-ses">${n.sessions.map(f => `<a data-open="${esc(f)}">${i("file", 12)}${tr("Buổi {0}", fmtD(f.slice(0, 10)))}</a>`).join("")}</div>` : ""}</div></div>`; };
  let k = 0;
  const big = sh.big.filter(x => !x.startsWith("_("));
  return `<div class="page nb">${crumb(`<span>${tr("Sổ học")}</span>`)}<div class="t-head" style="margin-top:10px"><div class="tx"><h1 class="t">${tr("Sổ học · {0}", esc(domName(d)))}</h1><p class="sub">${tr("Cái đã hiểu thật, kèm bằng chứng — đọc lại để nhớ, không phải để học lại.")}</p>
      <div class="nb-meta">${sh.last ? `<a data-open="${esc(sh.last)}">${i("clock", 13)}${tr("Buổi gần nhất {0}", fmtD(sh.last.slice(0, 10)))}</a>` : `<span>${i("clock", 13)}${tr("Chưa có buổi học")}</span>`}${sh.links.slice(0, 3).map(l => `<a data-open="${esc(l)}">${i("map", 13)}${esc(l)}</a>`).join("")}${shp ? `<a data-open="${esc(shp.path)}">${i("file", 13)}${tr("Mở file sổ")}</a>` : `<span>${i("file", 13)}${tr("Lĩnh vực này chưa có sổ học.")}</span>`}</div></div>
    <select data-nbdom style="height:30px;border-radius:8px;border:0;background:var(--pa-tint-2);color:var(--pa-ink);padding:0 10px;font:inherit" aria-label="${tr("Lĩnh vực")}">${C.idx.domains.map(x => `<option value="${esc(x.id)}" ${x.id === d.id ? "selected" : ""}>${esc(domName(x))}</option>`).join("")}</select></div>
    ${groups.map(g => { const done = g.list.filter(qDone).length, name = groupName(g);
      return `<section class="nb-grp">${name ? `<header><b>${esc(name)}</b><small>${tr("{0}/{1} bài đã nắm", done, g.list.length)}</small></header>` : ""}${g.list.map(t => card(t, k++)).join("")}</section>`; }).join("")}
    ${big.length && shp ? `<section class="nb-big"><span class="nb-big-ic"><svg viewBox="0 0 40 40"><path d="M10 28 20 12l10 14M10 28h20"/><circle cx="20" cy="11" r="5"/><circle cx="9" cy="29" r="5"/><circle cx="31" cy="29" r="5"/></svg></span>
      <div class="nb-big-bd"><header><em>${tr("Xuyên bài")}</em><b>${tr("Bức tranh lớn")}</b><small>${tr("{0} nhận định nối các bài lại với nhau", big.length)}</small></header><ol>${big.slice(0, 6).map(x => `<li>${md(x)}</li>`).join("")}</ol>
      <p class="nb-big-src">${i("file", 12)}${tr("{0} cập nhật khi đủ dữ liệu", C.agent)} · <a data-open="${esc(shp.path)}">${esc(shp.path.split("/").pop())}</a>${big.length > 6 ? " · " + tr("+{0} ý trong file", big.length - 6) : ""}</p></div></section>` : ""}</div>`;
}
/* huy hiệu = nút bài mini, cùng hình với bản đồ */
const mini = (t: Topic) => `<span class="q-mini ${t.status === "master" ? "gold" : qDone(t) ? "ok" : t.status}" title="${STLABEL(t.status)}">${t.status === "master" ? i("star", 15) : qDone(t) ? i("check", 16) : `<b>${qNum(t)}</b>`}${t.due ? `<i>${i("clock", 9)}</i>` : ""}</span>`;

export function onboardScreen(C: Ctx) {
  const empty = !C.idx.domains.length, A = C.agent;
  const sug = [tr("Dựng video vlog"), tr("Excel cho kế toán"), tr("Tiếng Anh giao tiếp"), tr("Quản lý dự án")];
  return `<div class="empty in"><div class="mascot-slot big" data-mascot data-mood="idle" data-greet="1" data-mkey="empty"></div><h1 class="t">${empty ? tr("Chưa có lộ trình học nào") : tr("Lộ trình mới")}</h1>
    <p class="sub">${tr("{0} sẽ hỏi mục tiêu, tìm tài liệu chuẩn, rồi dựng lộ trình từng bài ngay trong vault. Lộ trình xong sẽ hiện ở đây.", A)}</p>
    <div class="ask"><input data-newpath placeholder="${tr("Muốn học gì? Ví dụ: dựng video vlog, SQL cho marketing…")}" value="">${!C.agentReady ? `<button class="btn" data-newpath-go="copy">${i("copy")}${tr("Chép lệnh")}</button>` : `<button class="btn pri" data-newpath-go="ask">${i("chat")}${tr("Nhờ {0} thiết kế", A)}</button>`}</div>
    <div class="chips" style="justify-content:center">${sug.map(x => `<button class="chip" data-sug="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <div class="how">${[[tr("Thiết kế"), tr("Nêu mục tiêu. {0} tìm tài liệu chuẩn, chia lộ trình thành từng bài.", A)], [tr("Học với {0}", A), tr("Mỗi bài học theo kiểu hỏi đáp. Chỉ ghi là hiểu khi tự giải thích được.")], [tr("Ôn và luyện"), tr("Thẻ, quest, tự luận, bài giảng ở đây. Kết quả quay lại cho {0} xem.", A)]].map(([b, p], k) => `<div class="card"><span class="n">0${k + 1}</span><b>${b}</b><p>${p}</p></div>`).join("")}</div></div>`;
}
export { cmdNewPath };

/** Mức ôn theo lĩnh vực (đợt 6, port d6.js): mỗi lĩnh vực đang học một dòng; gợi ý = 3 khoảng ôn đầu của thẻ mới luôn chấm "Được", tính từ ts-fsrs. */
function retentionBlock(C: Ctx) {
  const act = activeOf(domRows(C)), by = C.settings.retentionByDomain || {};
  const gaps = (r: number) => firstGoodIntervals(r).join(", ");
  const hint = (v: number | undefined) => v == null ? tr("Dùng mức chung {0}%: thẻ nhớ tốt quay lại sau {1} ngày.", Math.round(C.settings.retention * 100), gaps(C.settings.retention))
    : tr("Thẻ nhớ tốt quay lại sau {0} ngày.", gaps(v)) + (v >= 0.95 ? " " + tr("Số lượt ôn tăng mạnh.") : "");
  const LV: [string, string][] = [["", tr("Theo mức chung")], ["0.85", tr("Nhẹ · 85%")], ["0.9", tr("Thường · 90%")], ["0.95", tr("Ôn thi · 95%")]];
  return `<div class="set-h">${tr("Mức ôn theo lĩnh vực")}</div><p class="set-p">${tr("Lĩnh vực sắp thi thì đặt Ôn thi để ôn dày hơn. Đổi mức chỉ áp dụng cho các lần xếp lịch về sau.")}</p>
    <div class="rt-list">${act.map(({ d }) => { const v = LEVELS.includes(by[d.id]) ? by[d.id] : undefined, key = v == null ? "" : String(v);
      return `<div class="rt-row"><div class="tx"><b>${esc(domName(d))}</b><small>${hint(v)}</small></div><div class="rt-seg">${LV.map(([k, l]) => `<button class="${key === k ? "on" : ""}" data-ret="${esc(d.id)}" data-v="${k}">${l}</button>`).join("")}</div></div>`; }).join("")}</div>`;
}

export function settingsScreen(C: Ctx) {
  const r = (b: string, s: string, ctl: string) => `<div class="set-row"><div class="tx"><b>${b}</b><small>${s}</small></div>${ctl}</div>`;
  return `<div class="page" style="max-width:760px">${crumb(`<span>${tr("Cài đặt")}</span>`)}<h1 class="t" style="margin-top:10px">${tr("Cài đặt")}</h1>
    <div class="set-h">${tr("Kết nối")}</div>${r("Pie Agent", !C.agentReady ? tr("Chưa cài, bản Free, hoặc bản cũ chưa có cửa tích hợp. Các nút học sẽ chép lệnh để dán vào chat.") : tr("Nút học gửi thẳng câu lệnh sang khung chat. Tên agent lấy từ cài đặt Pie Agent: {0}.", C.agent), !C.agentReady ? `<span class="dotst warn">${tr("Không tìm thấy")}</span>` : `<span class="dotst ok">${tr("Đã kết nối · API v{0}", C.agentVersion)}</span>`)}
    <div class="set-h">${tr("Dữ liệu")}</div>${r(tr("Thư mục học"), tr("Nơi có curriculum, sổ học, buổi học. Để trống = tự dò theo file tiến độ; đổi nếu dò sai."), `<input type="text" data-set-folder value="${esc(C.folder)}" placeholder="${tr("tự dò")}">`)}
    ${r(tr("Topic được nhận"), tr("Mọi note có trường learn_curriculum. Không cần cấu hình."), `<span class="num muted">${tr("{0} bài · {1} lộ trình", C.idx.all.length, C.idx.domains.length)}</span>`)}
    ${C.dupes.length ? r(tr("Bài trùng thứ tự"), tr("Các bài cùng learn_order trong một lĩnh vực (xếp theo tên file):") + " " + esc(C.dupes.slice(0, 8).join(", ")) + (C.dupes.length > 8 ? "…" : ""), `<span class="dotst warn">${C.dupes.length}</span>`) : ""}
    ${r(tr("Nhật ký luyện tập"), tr("Plugin chỉ ghi vào đây: lịch ôn thẻ và đúng/sai theo token. Không đụng note."), `<input type="text" data-set-statedir value="${esc(C.settings.stateDir)}">`)}
    ${r(tr("Thư mục quiz note"), tr("Agent ghi bộ quiz của từng note vào đây. Không ẩn để đồng bộ được."), `<input type="text" data-set-quizdir value="${esc(C.settings.quizDir)}">`)}
    ${r(tr("Thư mục bài giảng"), tr("Agent ghi bài giảng tương tác vào đây, theo file hướng dẫn {0}.", esc(GUIDE_PATH)), `<input type="text" data-set-lecturedir value="${esc(C.settings.lectureDir)}">`)}
    <div class="set-h">${tr("Ôn tập")}</div>${r(tr("Mục tiêu nhớ"), tr("FSRS lên lịch để xác suất còn nhớ khi tới hạn đạt mức này."), `<select data-set-retention>${[0.85, 0.9, 0.95].map(v => `<option value="${v}" ${C.settings.retention === v ? "selected" : ""}>${Math.round(v * 100)}%</option>`).join("")}</select>`)}
    ${r(tr("Thẻ mới mỗi ngày"), tr("Giới hạn thẻ chưa từng ôn được đưa vào mỗi ngày."), `<select data-set-newday>${[10, 20, 50].map(v => `<option value="${v}" ${C.settings.newPerDay === v ? "selected" : ""}>${v}</option>`).join("")}</select>`)}
    ${r(tr("Trần phiên hôm nay"), tr("Số mục tối đa mỗi ngày (5–100). Mục đã làm trong ngày trừ vào trần."), `<input type="number" data-set-sessioncap min="5" max="100" step="1" value="${C.settings.sessionCap}">`)}
    ${r(tr("Phím tắt khi ôn"), tr("Space lật thẻ · 1–4 tự chấm · Esc thoát."), "")}
    ${retentionBlock(C)}
    ${C.agentReady ? `<div class="set-h">${tr("Nhịp học")}</div>${r(tr("Đo giờ học"), tr("Đếm khi đang ở màn Pie Study hoặc đang đọc note bài học, dừng sau 2 phút không thao tác. Chỉ lưu trên máy này. Học với {0} và học ngoài máy chưa đếm.", esc(C.agent)), `<button class="toggle ${C.settings.timeTrack ? "on" : ""}" data-set-timetrack aria-pressed="${C.settings.timeTrack}" aria-label="${tr("Đo giờ học")}"></button>`)}` : ""}
    <div class="set-h">${tr("Chuyển từ EngramQuest")}</div>${r(tr("Lịch ôn và kết quả quest cũ"), tr("Đọc một lần từ engram-review/sr và engram-quest/state. Không xoá dữ liệu cũ, không ghi đè lịch mới hơn."), `<span style="display:flex;gap:8px"><button class="btn" data-migrate="scan">${i("refresh")}${tr("Quét")}</button>${C.migration ? `<button class="btn pri" data-migrate="write">${tr("Chuyển")}</button>` : ""}</span>`)}
    ${C.migration ? (() => { const m = C.migration; return `<div class="card" style="margin-top:12px;font-size:var(--pa-fs-sm)"><div style="display:flex;gap:18px;flex-wrap:wrap"><span><b class="num">${m.srFiles}</b> ${tr("file thẻ")}</span><span><b class="num" style="color:var(--pa-st-done)">${m.matched + m.fuzzy}</b> ${tr("thẻ khớp")}${m.fuzzy ? ` (${tr("{0} khớp mờ", m.fuzzy)})` : ""}</span><span><b class="num" style="color:var(--pa-st-attention)">${m.unmatched.length}</b> ${tr("thẻ đã đổi câu hỏi — cần ghép tay")}</span><span><b class="num">${m.kept}</b> ${tr("thẻ giữ lịch Pie Study")}</span><span><b class="num">${m.notTopic.length}</b> ${tr("file không phải bài học")}</span><span><b class="num">${m.questFiles}</b> ${tr("quest")} · ${m.questNodes} node</span></div></div>`; })() : ""}
    <div class="set-h">${tr("Giao diện")}</div>${r(tr("Sáng / tối"), tr("Theo Obsidian."), `<span class="num muted">${activeDocument.body.classList.contains("theme-dark") ? tr("Tối") : tr("Sáng")}</span>`)}
    ${r(tr("Chuyển động thưởng"), tr("Hiệu ứng khi bài vừa lên mức. Luôn tắt nếu máy bật giảm chuyển động."), `<button class="toggle ${C.motion ? "on" : ""}" data-set-motion aria-pressed="${C.motion}" aria-label="${tr("Chuyển động thưởng")}"></button>`)}
    ${r(tr("Ngôn ngữ"), tr("Theo Obsidian."), `<span class="num muted">${getLang() === "vi" ? "Tiếng Việt" : "English"}</span>`)}</div>`;
}

/** Nút bài giảng ở trang bài học: có → "Bài giảng · N khối" mở bài giảng; chưa có → nhờ agent soạn (Free: chép lệnh). */
function lecBtn(C: Ctx, t: Topic) {
  if (t.lectures.length) { const n = C.lecInfo(t)?.blocks; return `<button class="btn" data-go="lecture" data-topic="${esc(t.slug)}">${i("slides", 14)}${n ? tr("Bài giảng · {0} khối", n) : tr("Bài giảng")}</button>`; }
  return C.agentReady ? `<button class="btn ghost" data-lreq="${esc(t.slug)}">${i("slides", 14)}${tr("Nhờ {0} soạn bài giảng", esc(C.agent))}</button>`
    : `<button class="btn ghost" data-copy="${esc(cmdNewLecture(t.slug, GUIDE_PATH, C.lectureDir))}">${i("slides", 14)}${tr("Chép lệnh soạn bài giảng")}</button>`;
}

/** Nút tự luận ở trang bài học: có đề (quest / thẻ teach-back / file đề hợp lệ) → "Tự luận" mở màn tự luận; chưa có → nhờ agent ra đề (Free: chép lệnh), cùng đường với mục Tự luận ở menu "…". */
function essayBtn(C: Ctx, t: Topic) {
  if (essayPrompt(t.slug, C.quests, C.cards(t), C.essayFile(t))) return `<button class="btn" data-go="essay" data-topic="${esc(t.slug)}">${i("pen", 14)}${tr("Tự luận")}</button>`;
  return `<button class="btn ghost" data-ereq="${esc(t.path)}">${i("pen", 14)}${C.agentReady ? tr("Nhờ {0} ra đề tự luận", esc(C.agent)) : tr("Chép lệnh ra đề tự luận")}</button>`;
}
