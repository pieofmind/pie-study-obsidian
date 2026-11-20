/* Bản đồ lĩnh vực + vỏ thanh trên — port từ prototype quest.js (kiểu D · Quest). */
import { testOutBtn } from "./study5.ts";
import { tr } from "../i18n.ts";
import { CORE, isDone, todayStr } from "../status.ts";
import { moreModes } from "../data/essaynote.ts";
import { bossFor } from "../data/quest.ts";
import { essayPrompt } from "../data/lecture.ts";
import { mapGroups, nextOf, domStats, shortTitle, overdueDaysT, type Domain, type Topic, type Group } from "../data/index.ts";
import { RUBRIC } from "../data/rubric.ts";
import { goalCard } from "./study10.ts";
import { IC, i, esc, fmtD, QPAL, STLABEL, tokName, qNum, qBtn, curDom, cmdLearn, cmdReview, domName, type Ctx } from "./shared.ts";

const QOFF = [0, 48, 76, 48, 0, -48, -76, -48], QROW = 104;
const DOODLE = [   // đồ trên bàn học, cùng nét mực với Pie Bot
  '<path class="f1" d="M6 30 22 6c7 2 12 7 13 14z"/><path d="M10 25c4-2 7 0 11-3M14 19c3-1 6 0 9-2"/><path class="f0" d="M6 30 35 20c-1 6-5 10-11 12z"/>',
  '<path class="f0" d="M7 8h22l4 4v20H7z"/><path d="M29 8v4h4M12 16h14M12 21h14M12 26h9"/>',
  '<path class="f1" d="M27 5l8 8L15 33l-10 2 2-10z"/><path class="f0" d="M7 25l8 8"/><path d="M23 9l8 8"/>',
  '<path class="f2" d="M6 9h28v17H18l-7 6v-6H6z"/><path d="M17 14a3 3 0 1 1 3.6 3c-.8.3-.6 1.4-.6 2"/><circle cx="20" cy="22.5" r=".6"/>',
  '<path class="f0" d="M9 31V9a3 3 0 0 1 3-3h20v25H12a3 3 0 0 0 0 6h20"/><path class="f3" d="M15 6v12l3-2 3 2V6"/>',
  '<path class="f1" d="M20 5v6M20 29v6M5 20h6M29 20h6M9.5 9.5l4 4M26.5 26.5l4 4M30.5 9.5l-4 4M13.5 26.5l-4 4"/><circle class="f1" cx="20" cy="20" r="5"/>',
];
const doodle = (n: number, x: number, y: number, sz: number, rot: number) => `<svg class="q-doo" viewBox="0 0 40 40" style="left:calc(50% + ${x}px);top:${y}px;width:${sz}px;height:${sz}px;transform:rotate(${rot}deg)">${DOODLE[n % DOODLE.length]}</svg>`;
const starRow = (n: number, tot = 3) => `<span class="q-stars">${Array.from({ length: tot }, (_, k) => `<svg viewBox="0 0 24 24" class="${k < n ? "on" : ""}">${IC.star}</svg>`).join("")}</span>`;
export const qDone = (t: Topic) => isDone(t.status);
export const qStars = (t: Topic) => (t.und.length >= 17 ? 3 : t.und.length >= 12 && qDone(t) ? 2 : qDone(t) ? 1 : 0);
export const qTitle = (t: Topic) => shortTitle(t.title);
const qSt = (t: Topic) => (t.due ? tr("Tới hạn ôn") : STLABEL(t.status));
export const groupName = (g: Group) => g.name || (g.khoa ? tr("Khóa {0}", g.khoa) : g.stage ? tr("Chặng {0}", g.stage) : g.outside ? tr("Ngoài sổ học") : "");
const kick = (n: string) => n.split(" — ")[0];

export const groupsOf = (C: Ctx, d: Domain) => mapGroups(d, C.sohoc.get(d.id)?.data);

function qPop(C: Ctx, t: Topic, side: string) {   // bảng bật ra khi chạm một nút
  const st = t.status, A = C.agent;
  return `<div class="q-pop ${side}" data-k="${esc(t.slug)}"><small>${tr("Bài {0}", qNum(t))} · ${qSt(t)}</small><b>${esc(qTitle(t))}</b>
    <div class="q-17">${RUBRIC.flatMap(g => g[1]).map(k => `<i class="${t.und.includes(k[0]) ? "on" : t.pend?.includes(k[0]) ? "pend" : ""}${k[3] ? " c" : ""}" title="${esc(tokName(k[0]))}"></i>`).join("")}</div><p>${tr("{0}/17 kiểu hiểu đã chứng minh", t.und.length)}${t.cards ? " · " + tr("{0} thẻ ôn", t.cards) : ""}</p>
    ${qBtn(C, st === "new" ? tr("Bắt đầu với {0}", A) : t.due ? tr("Ôn với {0}", A) : tr("Học tiếp với {0}", A), t.due ? cmdReview(t) : cmdLearn(t))}
    ${testOutBtn(C, t, "pop")}
    <div class="q-pop-row">${st !== "new" && t.cards ? `<button class="qb o" data-review="${esc(t.slug)}">${tr("Ôn thẻ")}</button>` : ""}${st !== "new" && C.quests.some(q => q.topics.includes(t.slug)) ? `<button class="qb o" data-quest="${esc(t.slug)}">${tr("Quest")}</button>` : ""}<button class="qb o" data-go="topic" data-topic="${esc(t.slug)}">${tr("Chi tiết")}</button></div></div>`;
}

let qFirst = "";
export function questMap(C: Ctx, d: Domain) {
  const phone = C.phone, k = phone ? 0.8 : 1, nx = nextOf(d), S = C.S;
  const selT = S.sel && !S.sel.startsWith("boss") ? d.topics.find(t => t.slug === S.sel) || null : null;
  const fresh = qFirst !== d.id + C.frame; qFirst = d.id + C.frame;
  const groups = groupsOf(C, d);
  let n = 0;
  const stages = groups.map((g, gi) => {
    const P = QPAL[gi % QPAL.length], done = g.list.filter(qDone).length, open = done >= Math.min(2, g.list.length), all = done === g.list.length, flip = gi % 2 ? -1 : 1;
    const name = groupName(g), ni = nx ? g.list.indexOf(nx) : -1, botSide = ni >= 0 ? (QOFF[ni % 8] * flip >= 0 ? "l" : "r") : "";   // Pie Bot đứng phía ĐỐI DIỆN hướng lệch của nút
    let y = 0; const pts: [number, number, boolean][] = [], deco: string[] = [];
    const rows = g.list.map((t, j) => {
      const o = QOFF[j % 8] * flip * k, st = t.status, isNext = t === nx, ok = qDone(t), stars = qStars(t);
      let side = o > 0 ? "r" : o < 0 ? "l" : flip > 0 ? "r" : "l";   // nhãn ở phía ngoài đường cong
      if (ni >= 0 && Math.abs(j - ni) <= 2 && side === botSide) side = botSide === "l" ? "r" : "l";   // nhường chỗ cho Pie Bot
      if (isNext && j > 0) y += 70;
      pts.push([o, y + 38, ok]);
      if (!phone && !(ni >= 0 && Math.abs(j - ni) <= 2) && j % 2 === 0) deco.push(doodle(n + gi, (side === "r" ? -1 : 1) * (150 + (n * 37) % 70) - 18, y + 8 + (n * 13) % 30, 46 + (n * 7) % 20, (n * 23) % 30 - 15));
      y += QROW; if (isNext) y += 24;
      n++;
      const icon = st === "master" ? i("star", 30) : ok ? i("check", 30) : isNext ? i("play", 26) : `<span class="num">${qNum(t)}</span>`;
      const later = C.agentReady && t.need === "later";
      return `<div class="q-row ${isNext ? "nx" : ""} ${fresh ? "in" : ""}${later ? " later" : ""}" style="--o:${o};--i:${Math.min(n, 14)}" data-row="${esc(t.slug)}">
        ${isNext ? `<div class="q-bot ${botSide}"><div class="mascot-slot" data-mascot data-mood="idle" data-greet="1" data-mkey="map:${esc(d.id)}"></div></div><span class="q-halo"></span>${selT === t ? "" : `<span class="q-tip">${st === "learning" ? tr("Học tiếp") : tr("Bắt đầu")}</span>`}` : ""}
        <button class="q-node ${ok ? "ok" : st}${st === "master" ? " gold" : ""}${isNext ? " next" : ""}" data-sel="${selT === t ? "" : esc(t.slug)}" title="${esc(t.title)}">${icon}${t.due ? `<span class="q-due">${i("clock", 12)}</span>` : ""}</button>
        ${st !== "new" ? `<span class="q-starpos">${starRow(stars)}</span>` : ""}
        ${selT === t ? qPop(C, t, o > 20 ? "pr" : o < -20 ? "pl" : "pc") : `<div class="q-lab ${side}"><b>${esc(qTitle(t))}</b><small class="${t.due ? "due" : ""}">${later ? `<span class="q-later">${tr("để sau")}</span>` : ""}${qSt(t)}${st !== "new" ? " · " + t.und.length + "/17" : ""}</small></div>`}</div>`;
    }).join("");
    const bo = QOFF[g.list.length % 8] * flip * k; pts.push([bo, y + 44, false]); y += QROW + 8;
    const seg = (a: [number, number, boolean], b: [number, number, boolean]) => `M${280 + a[0]} ${a[1]} C${280 + a[0]} ${a[1] + 46}, ${280 + b[0]} ${b[1] - 46}, ${280 + b[0]} ${b[1]}`;
    const road = pts.slice(0, -1).map((p, j) => `<path d="${seg(p, pts[j + 1])}" class="${p[2] && pts[j + 1][2] ? "d" : ""}"/>`).join("");
    const need = Math.min(2, g.list.length), bossSel = S.sel === "boss" + gi;
    return `<section class="q-stage ${ni === 0 ? "bot-first" : ""}" style="--c:${P[0]};--d:${P[1]};--t:${P[2]}" data-stage="${gi}">
      <header class="q-banner"><span class="q-no">${String(gi + 1).padStart(2, "0")}</span><div>${name.includes(" — ") ? `<em class="q-kick">${esc(kick(name))}</em><b>${esc(name.split(" — ").slice(1).join(" — "))}</b>` : `<b>${esc(name)}</b>`}<small>${all ? tr("Đã nắm cả chặng") : done ? tr("Đã nắm {0} trên {1} bài", done, g.list.length) : tr("{0} bài · chưa bắt đầu", g.list.length)}</small>
        <span class="q-seg">${g.list.map(t => `<i class="${qDone(t) ? "on" : t.status === "learning" ? "half" : ""}"></i>`).join("")}</span></div><button class="qb w sm" data-go="notebook">${i("book", 16)}${tr("Sổ học")}</button></header>
      <div class="q-path" style="height:${y}px"><svg class="q-road" width="560" height="${y}" viewBox="0 0 560 ${y}"><g class="edge">${road}</g><g class="base">${road}</g><g class="dash">${road}</g></svg>${deco.join("")}${rows}
      <div class="q-row" style="--o:${bo}"><button class="q-node boss ${all ? "gold" : open ? "ok" : "new"}" data-sel="${bossSel ? "" : "boss" + gi}" title="${esc(tr("Boss {0}", kick(name)))}">${i(open ? "trophy" : "lock", 32)}</button>
      ${bossSel ? `<div class="q-pop ${bo > 20 ? "pr" : bo < -20 ? "pl" : "pc"} ${open ? "" : "grey"}"><small>Boss</small><b>${esc(tr("Trận tổng hợp {0}", kick(name)))}</b><p>${open ? tr("Một tình huống phải phối hợp {0} bài đã nắm. Kết quả ghi theo từng kiểu hiểu; mastery do {1} xét.", done, C.agent) + (bossFor(C.quests, g.list.map(t => t.slug)) ? "" : " " + tr("Lĩnh vực này chưa có quest boss cho chặng.")) : tr("Mở khi nắm ít nhất {0} bài trong chặng.", need)}</p>${open && bossFor(C.quests, g.list.map(t => t.slug)) ? `<button class="qb w" data-quest="boss:${esc(g.list.map(t => t.slug).join(","))}">${tr("Vào trận")}${i("arrow", 18)}</button>` : ""}</div>`
        : `<div class="q-lab ${bo >= 0 ? "r" : "l"}"><b>${esc(tr("Boss {0}", kick(name)))}</b><small>${open ? tr("Sẵn sàng") : tr("Cần nắm {0} bài", need)}</small></div>`}</div></div></section>`;
  }).join("");
  const R = rail(C, d, groups, nx), goal = goalCard(C, d);   // đợt 8a: thẻ Mục tiêu ngay dưới Bài kế tiếp ở cột phải (khổ vừa: sau Bài kế tiếp trong hàng trên; điện thoại: đầu bản đồ)
  return `<div class="qwrap"><svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="q-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter></svg><div class="scroll qscroll" data-qkey="${esc(d.id)}">${C.frame === "mid" ? `<div class="q-rail top">${R.hero}${goal ? `<div class="g8-span">${goal}</div>` : ""}</div>` : ""}${C.frame === "phone" && goal ? `<div class="g8-phone">${goal}</div>` : ""}<div class="q-map">${stages}</div>${C.frame === "mid" ? `<div class="q-rail top bot">${R.side}</div>` : ""}</div>${C.frame === "desktop" ? `<aside class="q-rail">${R.hero}${goal}${R.side}</aside>` : ""}</div>`;   // khổ vừa: hero lên đầu, ôn + tiến độ xuống cuối
}

/** Thẻ bài kế tiếp (hero) + thẻ tới hạn/tiến độ (side). Khổ vừa: hero lên đầu bản đồ, side xuống cuối, chia 2 cột. */
function rail(C: Ctx, d: Domain, groups: Group[], nx?: Topic): { hero: string; side: string } {
  const s = domStats(d), due3 = C.idx.due.slice(0, 3), dcol = Object.fromEntries(C.idx.domains.map((x, k) => [x.id, QPAL[k % QPAL.length][0]]));
  const domT = (id: string) => domName(C.idx.domains.find(x => x.id === id)) || id;
  let hero = "";
  if (nx) {
    const gi = Math.max(0, groups.findIndex(g => g.list.includes(nx))), P = QPAL[gi % QPAL.length], gn = kick(groupName(groups[gi] || { name: "", list: [] })), got = CORE.filter(c => nx.und.includes(c)).length;
    // thẻ bài học: màu của tầng chứa bài + 5 ô con dấu core — chỉ đếm cái cần để "nắm cơ bản"
    hero = `<div class="q-card q-hero" style="--c:${P[0]};--d:${P[1]}" data-hero="${esc(nx.slug)}"><div class="q-hero-top">${gn ? `<em class="q-kick">${esc(gn)}</em>` : ""}<small>${tr("Bài kế tiếp · bài {0}", qNum(nx))}</small></div><b>${esc(qTitle(nx))}</b>
      <div class="q-stamps">${CORE.map((c, k) => `<span class="q-stamp ${nx.und.includes(c) ? "on" : nx.pend?.includes(c) ? "pend" : ""}" style="--r:${[-8, 5, -3, 7, -6][k]}deg" data-tok="${c}"><i>${nx.und.includes(c) ? i("check", 18) : nx.pend?.includes(c) ? i("clock", 16) : k + 1}</i><small>${esc(tokName(c))}</small></span>`).join("")}</div>
      <p>${got ? tr("{0}/5 dấu cốt lõi", got) : tr("Lấy đủ 5 dấu")} ${tr("= nắm cơ bản · {0} kiểu hiểu mở rộng để sau", 17 - CORE.length)}</p><div class="q-perf"></div>
      ${qBtn(C, nx.status === "new" ? tr("Bắt đầu với {0}", C.agent) : tr("Học tiếp với {0}", C.agent), cmdLearn(nx), "y w100")}</div>`;
  }
  const side = `${due3.length ? `<div class="q-card"><small>${tr("Tới hạn ôn")}<em>${C.idx.due.length}</em></small>${due3.map(t => `<div class="q-li" data-go="topic" data-topic="${esc(t.slug)}"><span class="sq" style="background:${dcol[t.dom]}">${i("clock", 14)}</span><div><b>${esc(qTitle(t))}</b><i>${esc(domT(t.dom))} · ${tr("quá {0} ngày", overdueDaysT(t, C.today))}</i></div></div>`).join("")}<button class="qb line w100" data-go="review">${tr("Ôn bài tới hạn")}</button></div>` : ""}
    <div class="q-card"><small>${tr("Tiến độ lộ trình")}<em>${s.done}/${s.n}</em></small>${groups.map((g, gi) => `<div class="q-prog"><span title="${esc(groupName(g))}">${esc(kick(groupName(g)))}</span><span class="q-seg" style="--c:${QPAL[gi % QPAL.length][0]}">${g.list.map(t => `<i class="${qDone(t) ? "on" : t.status === "learning" ? "half" : ""}"></i>`).join("")}</span></div>`).join("")}</div>`;
  return { hero, side };
}

/* nút "Thêm": lối vào các màn của MỘT bài. Trắc nghiệm / Tự luận không khoá (spec 7.9): chưa có dữ liệu thì nhờ agent soạn; chỉ Bài giảng khoá khi chưa có learn_lecture. */
function qMore(C: Ctx, d: Domain) {
  const S = C.S, open = S.screen === "topic", t = (open && C.idx.all.find(x => x.slug === S.topic)) || nextOf(d) || d.topics[0];
  if (!t) return "";
  const quick = C.quick(t), mode = moreModes({ quest: C.quests.some(q => q.topics.includes(t.slug) && q.nodes.some(n => !n.boss && n.items.length)), quickN: quick?.n || 0,
    essay: !!essayPrompt(t.slug, C.quests, C.cards(t), C.essayFile(t)), lecture: t.lectures.length > 0 });
  const it = (scr: string, ic: string, l: string, sub: string) => `<button class="${S.screen === scr ? "on" : ""}" data-go="${scr}" data-topic="${esc(t.slug)}">${i(ic, 18)}<span><b>${l}</b><small>${sub}</small></span></button>`;
  const req = (attr: string, ic: string, l: string, sub: string) => `<button class="mx-req" ${attr}>${i(ic, 18)}<span><b>${l}</b><small>${sub}</small></span><span class="mx-ask">${i(C.agentReady ? "arrow" : "copy", 14)}</span></button>`;
  const quiz = mode.quiz === "quest" ? it("quiz", "quest", tr("Trắc nghiệm"), tr("Quest theo kiểu hiểu"))
    : mode.quiz === "quick" ? `<button data-qnopen="${esc(t.path)}">${i("zap", 18)}<span><b>${tr("Trắc nghiệm")}</b><small>${tr("Quiz nhanh · {0} câu", quick!.n)}${quick!.last ? " · " + tr("làm lần cuối {0}", fmtD(todayStr(new Date(quick!.last)))) : ""}</small></span></button>`
    : req(`data-qreq="${esc(t.path)}"`, "zap", tr("Trắc nghiệm"), C.agentReady ? esc(tr("Nhờ {0} soạn 5 câu từ bài này", C.agent)) : tr("Chép lệnh soạn quiz nhanh từ bài này"));
  const essay = mode.essay === "have" ? it("essay", "pen", tr("Tự luận"), tr("Tự giải thích bằng lời"))
    : req(`data-ereq="${esc(t.path)}"`, "pen", tr("Tự luận"), C.agentReady ? esc(tr("Nhờ {0} ra một đề từ bài này", C.agent)) : tr("Chép lệnh ra đề tự luận từ bài này"));
  return `<span class="q-more"><button class="q-more-btn ${S.more || open || S.screen === "badges" || S.screen === "mistakes" ? "on" : ""}" data-more title="${tr("Thêm")}" aria-label="${tr("Thêm")}">${i("dots", 20)}</button>${S.more ? `<div class="q-more-pop"><small>${open ? tr("Bài đang mở") : tr("Bài kế tiếp")}</small><b class="q-more-t">${esc(qTitle(t))}</b>
    ${it("topic", "book", tr("Trang bài học"), tr("17 kiểu hiểu · ghi chép"))}${quiz}${essay}<hr class="q-more-hr"><small class="q-more-g">${tr("Lộ trình này")}</small><button class="${S.screen === "lectures" ? "on" : ""}" data-go="lectures">${i("slides", 18)}<span><b>${tr("Bài giảng")}</b><small>${tr("Mọi bài giảng của lộ trình")}</small></span></button><button class="${S.screen === "mats" ? "on" : ""}" data-go="mats">${i("layers", 18)}<span><b>${tr("Học liệu")}</b><small>${tr("Sơ đồ, canvas, mindmap của lộ trình")}</small></span></button><button class="${S.screen === "maps" ? "on" : ""}" data-go="maps">${i("tree", 18)}<span><b>${tr("Sơ đồ khái niệm")}</b><small>${tr("Tổng, từng dimension, từng bài")}</small></span></button><button class="${S.screen === "mistakes" ? "on" : ""}" data-go="mistakes">${i("undo", 18)}<span><b>${tr("Lỗi sai")}</b><small>${tr("{0} câu đang mở · làm lại để gỡ", C.mk.filter(r => r.m.status === "open").length)}</small></span></button><button class="${S.screen === "badges" ? "on" : ""}" data-go="badges">${i("trophy", 18)}<span><b>${tr("Huy hiệu")}</b><small>${tr("Bộ sưu tập")}</small></span></button>${C.agentReady ? `<button class="${S.screen === "library" ? "on" : ""}" data-go="library">${i("layers", 18)}<span><b>${tr("Nguồn của mọi lộ trình")}</b><small>${tr("Kho nguồn")}</small></span></button>` : ""}</div>` : ""}</span>`;
}

/** Vỏ kiểu D: thanh trên (chọn lĩnh vực, số đã nắm, số tới hạn, 6 nút) + nội dung. */
export function shellD(C: Ctx, html: string) {
  const d = curDom(C), empty = !C.idx.domains.length, map = html.startsWith('<div class="qwrap'), S = C.S;
  const nav = (scr: string, ic: string, t: string) => `<button class="${S.screen === scr ? "on" : ""}" data-go="${scr}" title="${t}" aria-label="${t}">${i(ic, 20)}</button>`;
  const s = d ? domStats(d) : null;
  return `<div class="focus qd"><div class="qbar">${empty || !d || !s ? `<b class="q-brand">Pie Study</b>` : `<select class="q-dom" data-qdom aria-label="${tr("Lĩnh vực")}">${C.idx.domains.map(x => `<option value="${esc(x.id)}" ${x.id === d.id ? "selected" : ""}>${esc(domName(x))}</option>`).join("")}</select>
    <span class="q-stat ok" title="${tr("Bài đã nắm trong lộ trình này")}">${i("check", 16)}<b>${s.done}</b>/${s.n}</span>${C.idx.due.length ? `<span class="q-stat due" data-go="review" title="${tr("Bài tới hạn ôn, mọi lộ trình")}">${i("clock", 16)}<b>${C.idx.due.length}</b> ${tr("tới hạn")}</span>` : ""}`}
    <span style="flex:1"></span><span class="q-nav">${nav("overview", "grid", tr("Tổng quan"))}${nav("home", "map", tr("Bản đồ"))}${nav("review", "cards", tr("Ôn thẻ"))}${nav("notebook", "book", tr("Sổ học"))}${C.agentReady ? `<button class="${S.screen === "library" || S.screen === "sources" ? "on" : ""}" data-go="${d ? "sources" : "library"}"${d ? ` data-dom="${esc(d.id)}"` : ""} title="${tr("Nguồn của lộ trình")}" aria-label="${tr("Nguồn của lộ trình")}">${i("layers", 20)}</button>` : ""}${nav("onboard", "plus", tr("Lộ trình mới"))}${nav("settings", "gear", tr("Cài đặt"))}</span>${d ? qMore(C, d) : ""}</div>
    ${map ? html : `<div class="scroll">${html}</div>`}</div>`;
}
