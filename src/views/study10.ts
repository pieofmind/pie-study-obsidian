/* Đợt 8a (spec 7.10): màn Nguồn của lộ trình, màn Kho nguồn, bìa tài liệu. Chỉ hiện khi có Pie Agent (Free ẩn hẳn). */
import { tr, getLang } from "../i18n.ts";
import { i, esc, crumb, curDom, domName, fmtD, STLABEL, type Ctx } from "./shared.ts";
import { secsInLast } from "../practice/secs.ts";
import { neededCount, coverageOf, badLessons, type Cov } from "../data/coverage.ts";
import { paceOf, weekCounts, weekSeries } from "../data/pace.ts";
import { kindGroup, sourcesOf, nextAction, resolveStatus, tocPathOf, type Source } from "../data/library.ts";

const PAL = ["#1F3A5F", "#2E7D6B", "#2896A4", "#5B4B9E", "#C8553D", "#6B7280", "#3F6B3F", "#7A5C3E", "#9B3D6B"];
/** Màu bìa tự vẽ cố định theo id nguồn, màu đặc (không gradient). */
const hue = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };
const ext = (ref: string) => ref.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || "";
/** Link web hợp lệ để mở khi người dùng bấm (không tự tải gì); không phải link thì null. */
export const webUrl = (ref: string) => /^https?:\/\//i.test(ref) ? ref : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(ref) ? "https://" + ref : null;

const GROUPS = () => ({ book: ["book", tr("Sách")], notebooklm: ["layers", "NotebookLM"], web: ["search", tr("Web")], vault: ["file", tr("Note trong vault")] }) as Record<string, [string, string]>;
const KIND_L = () => ({ vault: tr("Trong vault"), notebooklm: "NotebookLM", web: tr("Web") }) as Record<string, string>;

/** Trạng thái mục lục của một nguồn để hiện: [lớp màu, nhãn, dòng phụ]. Số mục lấy từ file mục lục thật. */
export function tocState(C: Ctx, s: Source): ["ok" | "no" | "wait", string, string] {
  const n = C.lib.info[s.id]?.count || 0, refOk = C.lib.info[s.id]?.refExists !== false, st = resolveStatus(s, { tocCount: n });
  if (st === "broken") return ["no", tr("Link không mở được"), tr("lần kiểm gần nhất do {0} ghi", C.agent)];
  if (n > 0) { const tp = tocPathOf(s); return ["ok", tr("{0} mục", n), tp && tp !== s.ref ? tr("mục lục {0}", tp.split("/").pop()!) : tr("đọc từ tiêu đề trong file")]; }
  if (s.kind === "vault" && !refOk) return ["no", tr("File không còn trong vault"), ""];
  if (s.kind === "vault" && ext(s.ref) === "epub") return ["wait", tr("Chưa có mục lục"), tr("Sách chưa chuyển thành markdown")];
  return ["wait", tr("Chờ {0} rút mục lục", C.agent), tr("kho tự cập nhật khi có file mục lục")];
}

/** Nút việc tiếp theo (gửi agent). */
function nextBtn(C: Ctx, s: Source, cls = "btn") {
  const a = nextAction(s, C.lib.info[s.id]?.count || 0), path = s.paths[0];
  const [label, cmd, ic] = a === "recheck" ? [tr("Nhờ {0} tìm link thay thế", C.agent), `kiểm lại nguồn "${s.ref}"${path ? ` của lộ trình [[curriculum-${path}]]` : ""}`, "refresh"]
    : a === "toc" ? [tr("Nhờ {0} rút mục lục", C.agent), `rút mục lục nguồn "${s.ref}" vào kho`, "refresh"]
    : a === "convert" ? [tr("Chuyển sách vào vault"), `chuyển sách "${s.ref}" vào vault`, "refresh"]
    : [tr("Tạo lộ trình mới từ nguồn này"), `lộ trình mới từ nguồn "${s.ref}"`, "arrow"];
  return `<button class="${cls}" data-bob="${esc(cmd)}">${i(ic, 14)}${esc(label)}</button>`;
}

/** Bìa: ảnh `cover` trong vault nếu có; không có thì vẽ màu đặc theo id — sách kèm tên + tác giả, loại khác là ô màu có icon. */
export function coverHtml(C: Ctx, s: Source, big = false) {
  const url = s.cover ? C.resource(s.cover) : null, g = kindGroup(s), cv = hue(s.id);
  if (url) return `<span class="lib-cv book img ${big ? "big" : ""}"><img src="${esc(url)}" alt=""></span>`;
  if (g === "book") return `<span class="lib-cv book ${big ? "big" : ""}" style="--cv:${cv}"><b>${esc(s.title)}</b>${s.by ? `<small>${esc(s.by)}</small>` : ""}<i>${i("book", 12)}</i></span>`;
  return `<span class="lib-cv tile k-${g} ${big ? "big" : ""}" style="--cv:${cv}">${i(GROUPS()[g][0], big ? 26 : 20)}<b>${esc(s.title)}</b></span>`;
}

const errText = (code: string) => { const [k, a = ""] = [code.split(":")[0], code.slice(code.indexOf(":") + 1)];
  return k === "json" ? tr("không phải JSON hợp lệ") : k === "shape" ? tr("sai khuôn: cần version 1 và mảng sources") : k === "entry" ? tr("nguồn thứ {0} sai khuôn", a) : k === "dup" ? tr("trùng id {0}", a) : code; };
const brokenCard = (C: Ctx) => `<div class="note-call warn" style="margin-top:16px">${i("alert")}<div><b>${tr("Kho nguồn không đọc được")}</b><br>${esc(errText(C.lib.error || ""))}. ${tr("Plugin không ghi đè file này. Bản cũ được giữ ở {0}.", "<code>kho-nguon.json.bak</code>")}
  <div class="acts" style="margin-top:8px"><button class="btn" data-libreset>${i("refresh", 14)}${tr("Tạo lại kho")}</button></div></div></div>`;

const COV_L = (s: Cov) => ({ none: tr("Chưa có bài"), new: tr("Có bài, chưa học"), learning: tr("Đang học"), basic: tr("Nắm cơ bản") }[s]);
const COV_ORDER: Cov[] = ["basic", "learning", "new", "none"];

/** Bản đồ phủ (spec 7.11): mục lục nguồn đã có bài tới đâu. Chỉ nguồn có mục lục. */
function coverageBlock(C: Ctx, d: { id: string; topics: unknown[] }): string {
  const topics = d.topics as import("../data/index.ts").Topic[], list = sourcesOf(C.lib.lib, d.id).filter(s => (C.lib.info[s.id]?.outline.length || 0) > 0);
  if (!list.length) return "";
  const src = list.find(s => s.id === C.S.covSrc) || list[0], heads = C.lib.info[src.id].outline, G = GROUPS();
  const cov = coverageOf(src.id, heads, topics), cmdCur = curName(C, d.id);
  const bad = badLessons(topics, new Map(list.map(s => [s.id, C.lib.info[s.id].outline] as const)));
  const tab = (s: Source) => `<button class="${s.id === src.id ? "on" : ""}" data-cvsrc="${esc(s.id)}">${i(G[kindGroup(s)][0], 13)}${esc(s.title)}</button>`;
  const tree = cov.rows.map((r, k) => {
    if (r.group) return `<li class="cv-h">${esc(r.h.title)}</li>`;
    const on = C.S.covSel === r.h.id, lows = r.topics, cmd = `soạn bài cho mục "${src.id}#${r.h.id}" của lộ trình [[${cmdCur}]]`;
    const lesson = (t: typeof lows[number]) => `<a class="cv-l" data-go="topic" data-topic="${esc(t.slug)}"><i class="cv-dot ${t.status === "master" ? "basic" : t.status}"></i>${esc(t.title)}<small>${esc(STLABEL(t.status as import("../status.ts").Status))}</small></a>`;
    const open = lows.length ? lows.map(lesson).join("") + (lows.length > 1 ? `<small class="cv-why">${tr("Mục lấy trạng thái thấp nhất của các bài trỏ vào.")}</small>` : "")
      : `<p class="sub">${tr("Chưa có bài nào trỏ vào mục này.")}</p><button class="qb" data-bob="${esc(cmd)}">${tr("Nhờ {0} soạn bài cho mục này", esc(C.agent))}</button>`;
    return `<li class="cv-i ${r.state} ${on ? "on" : ""}"><button class="cv-row" data-cvsel="${esc(r.h.id)}"><i class="cv-dot ${r.state}"></i><span class="cv-t">${esc(r.h.title)}</span><span class="cv-s">${esc(COV_L(r.state))}${lows.length > 1 ? ` · ${tr("{0} bài", lows.length)}` : ""}</span><span class="cv-chev">${i("right", 14)}</span></button>${on ? `<div class="cv-open">${open}</div>` : ""}</li>`;
  }).join("");
  return `<div class="cv"><div class="cv-hd"><div><div class="eyebrow">${tr("Bản đồ phủ")}</div><b>${tr("Mục lục nguồn đã có bài tới đâu")}</b></div><div class="cv-src">${list.map(tab).join("")}</div></div>
    <div class="cv-leg">${COV_ORDER.map(s => `<span><i class="cv-dot ${s}"></i>${esc(COV_L(s))}<b>${cov.counts[s]}</b></span>`).join("")}</div>
    <div class="cv-bar">${COV_ORDER.map(s => `<i class="${s}" style="flex:${cov.counts[s]}"></i>`).join("")}</div>
    ${bad.length ? `<p class="cv-warn">${i("info", 14)}<span>${tr("{0} bài trỏ sai mục (tiêu đề không có trong mục lục).", bad.length)} <a data-go="topic" data-topic="${esc(bad[0].slug)}">${tr("Xem bài")}</a></span></p>` : ""}
    <ol class="cv-tree">${tree}</ol></div>`;
}

/** Màn Nguồn của một lộ trình: các nguồn có `paths` chứa lộ trình đó. */
export function sourcesScreen(C: Ctx) {
  const d = curDom(C); if (!d) return "";
  const list = sourcesOf(C.lib.lib, d.id), G = GROUPS();
  const row = (s: Source) => {
    const [st, label, note] = tocState(C, s), g = kindGroup(s), web = s.kind === "web" ? webUrl(s.ref) : null, open = s.kind === "vault" && C.lib.info[s.id]?.refExists !== false;
    const ref = open ? `<a data-open="${esc(s.ref)}">${esc(s.ref)}</a>` : web ? `<a data-ext="${esc(web)}">${esc(s.ref)}</a>` : `<span>${esc(s.ref)}</span>`;
    const act = st === "ok" || st === "no" && s.status !== "broken" ? "" : nextBtn(C, s);
    return `<div class="sr-row"><span class="sr-ic">${i(G[g][0], 16)}</span><div class="sr-tx"><b>${esc(s.title)}</b><small><span class="pill">${esc(KIND_L()[s.kind])}</span>${ref}</small></div>
      <div class="sr-st"><span class="sr-toc ${st}">${st === "ok" ? i("check", 12) : ""}${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ""}</div><div class="sr-act">${act}</div></div>`;
  };
  return `<div class="page sr">${crumb(`<a data-go="home">${esc(domName(d))}</a>`, `<span>${tr("Nguồn")}</span>`)}
    <div class="lib-x"><h1 class="t" style="margin-top:10px">${tr("Nguồn của lộ trình")}</h1><button class="g8-link" data-go="library">${i("layers", 14)}${tr("Xem cả kho")}</button></div>
    <p class="sub">${tr("{0} chia bài theo mục lục thật của các nguồn này. Plugin chỉ đọc mục lục, không tải hay đọc tài liệu.", esc(C.agent))}</p>
    ${C.lib.ok ? (list.length ? `<div class="sr-list">${list.map(row).join("")}</div>` : `<div class="sr-list"><p class="sub" style="padding:16px;margin:0">${tr("Lộ trình này chưa có nguồn nào trong kho.")}</p></div>`) : brokenCard(C)}
    <div class="note-call info" style="margin-top:16px">${i("info")}<div>${tr("Mục lục luôn là các tiêu đề của một file markdown trong vault. File markdown thì đọc thẳng tiêu đề; NotebookLM và web thì {0} ghi một file mục lục khi tạo lộ trình.", esc(C.agent))}</div></div>
    ${C.lib.ok ? coverageBlock(C, d) : ""}
    ${C.lib.ok ? `<div class="acts"><button class="btn" data-addsrc="${esc(d.id)}">${i("plus", 14)}${tr("Thêm nguồn cho lộ trình")}</button></div>` : ""}</div>`;
}

/** Kho chưa có nguồn nào: bỏ tab đếm 0 và bảng chi tiết, đặt khối chào + 3 lối thêm nguồn (mở hộp với đúng loại đã chọn). */
function libEmptyScreen(C: Ctx) {
  const ways: [NS["kind"], string, string, string][] = [["file", "file", tr("File trong vault"), tr("Note .md, sách .pdf hoặc .epub. Có thể kéo thả từ máy.")],
    ["web", "search", tr("Link web"), tr("Bài viết, tài liệu chính chủ, trang hướng dẫn.")], ["notebooklm", "layers", "NotebookLM", tr("Một notebook đã nạp sẵn tài liệu.")]];
  return `<div class="page lib">${crumb(`<span>${tr("Kho nguồn")}</span>`)}
    <div class="lib-top"><h1 class="t" style="margin-top:10px">${tr("Kho nguồn")}</h1><button class="btn pri" data-addsrc="">${i("plus", 15)}${tr("Thêm nguồn")}</button></div>
    <div class="lib-empty"><span class="lib-e-ic">${i("layers", 26)}</span><h2>${tr("Chưa có nguồn nào")}</h2>
      <p>${tr("Thêm sách, tài liệu hay notebook bạn tin. {0} chia bài theo mục lục thật của nguồn, và bản đồ phủ cho thấy đã học tới đâu.", esc(C.agent))}</p>
      <div class="lib-e-ways">${ways.map(([k, ic, t, d]) => `<button class="lib-e-way" data-addsrc="" data-addkind="${k}"><span class="lib-e-wic">${i(ic, 18)}</span><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join("")}</div>
      <small class="lib-e-note">${i("info", 13)}${tr("Plugin chỉ đọc mục lục, không tải hay đọc nội dung tài liệu.")}</small></div></div>`;
}

/** Màn Kho nguồn: mọi nguồn của mọi lộ trình; lọc theo loại; bấm thẻ → bảng chi tiết. Không embedding, không đọc nội dung tài liệu. */
export function libraryScreen(C: Ctx) {
  const all = [...C.lib.lib.sources].sort((a, b) => b.added.localeCompare(a.added)), tab = C.S.libTab || "all", G = GROUPS();
  const tabs: [string, string][] = [["all", tr("Tất cả")], ...Object.entries(G).map(([k, v]) => [k, v[1]] as [string, string])];
  const list = all.filter(s => tab === "all" || kindGroup(s) === tab), sel = all.find(s => s.id === C.S.libSel);
  const n = (k: string) => all.filter(s => k === "all" || kindGroup(s) === k).length, ready = all.filter(s => (C.lib.info[s.id]?.count || 0) > 0 && s.status !== "broken").length;
  const card = (s: Source) => { const [st, sl] = tocState(C, s), g = kindGroup(s);
    return `<button class="lib-card ${C.S.libSel === s.id ? "on" : ""}" data-lib="${esc(s.id)}">${coverHtml(C, s)}<span class="lib-tx"><b><i class="lib-dot ${st}"></i><span class="lib-nm" title="${esc(s.title)}">${esc(s.title)}</span></b><small title="${esc(s.by || "")}">${esc(s.by || KIND_L()[s.kind])}</small>
      <span class="lib-meta"><span class="pill">${esc(G[g][1])}</span><span>${esc(sl)}</span><span>${tr("{0} lộ trình", s.paths.length)}</span></span></span></button>`; };
  const detail = (s: Source | undefined) => {
    if (!s || !list.includes(s)) return `<div class="lib-side empty"><p class="sub">${tr("Chọn một nguồn để xem mục lục và lộ trình đang dùng nó.")}</p></div>`;
    const [st, sl, note] = tocState(C, s), g = kindGroup(s), info = C.lib.info[s.id], web = s.kind === "web" ? webUrl(s.ref) : null;
    const ref = s.kind === "vault" && info?.refExists !== false ? `<a class="lib-ref" data-open="${esc(s.ref)}">${i("file", 13)}${esc(s.ref)}</a>` : web ? `<a class="lib-ref" data-ext="${esc(web)}">${i("search", 13)}${esc(s.ref)}</a>` : `<span class="lib-ref">${i(G[g][0], 13)}${esc(s.ref)}</span>`;
    const heads = info?.heads || [], more = (info?.count || 0) - heads.length;
    return `<div class="lib-side"><div class="lib-sh">${coverHtml(C, s, true)}<div><b title="${esc(s.title)}">${esc(s.title)}</b><small>${esc(s.by ? s.by + " · " : "")}${esc(G[g][1])}</small><small class="lib-cvsrc">${s.cover && C.resource(s.cover) ? tr("Bìa: ảnh trong vault") : tr("Bìa tự vẽ")}</small></div></div>
      ${ref}<div class="lib-st ${st}"><i class="lib-dot ${st}"></i><b>${esc(sl)}</b>${note ? `<small>${esc(note)}</small>` : ""}</div>
      ${heads.length ? `<div class="eyebrow" style="margin-top:14px">${tr("Mục lục")}</div><ol class="lib-toc">${heads.map(h => `<li>${esc(h)}</li>`).join("")}</ol>${more > 0 ? `<small class="lib-more">${tr("+{0} mục nữa", more)}</small>` : ""}` : ""}
      ${s.paths.length ? `<div class="eyebrow" style="margin-top:14px">${tr("Dùng ở {0} lộ trình", s.paths.length)}</div><div class="lib-paths">${s.paths.map(p => { const dm = C.idx.domains.find(x => x.id === p); return dm ? `<button data-go="sources" data-dom="${esc(p)}" title="${esc(tr("Mở nguồn của lộ trình này"))}">${i("map", 13)}${esc(domName(dm))}${i("right", 12)}</button>` : `<span class="lib-path-x">${esc(p)}</span>`; }).join("")}</div>` : ""}
      <div class="acts" style="flex-direction:column;align-items:stretch;margin-top:16px">${nextBtn(C, s, nextAction(s, info?.count || 0) === "newpath" ? "btn" : "btn pri")}</div></div>`;
  };
  if (C.lib.ok && !all.length) return libEmptyScreen(C);
  return `<div class="page lib"><div class="lib-top"><div>${crumb(`<span>${tr("Kho nguồn")}</span>`)}
    <h1 class="t" style="margin-top:10px">${tr("Kho nguồn")}</h1><p class="sub">${tr("{0} nguồn của mọi lộ trình · {1} nguồn có mục lục. Plugin chỉ đọc mục lục, không tải hay đọc tài liệu.", all.length, ready)}</p></div>
    ${C.lib.ok ? `<button class="btn pri" data-addsrc="">${i("plus", 15)}${tr("Thêm nguồn")}</button>` : ""}</div>
    ${C.lib.ok ? `<div class="lib-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${tab === k ? "on" : ""}" data-libtab="${k}">${esc(l)}<span>${n(k)}</span></button>`).join("")}</div>
    <div class="lib-body"><div class="lib-grid">${list.map(card).join("") || `<p class="sub">${all.length ? tr("Chưa có nguồn loại này.") : tr("Kho nguồn đang trống. Thêm nguồn để {0} chia bài theo mục lục thật.", esc(C.agent))}</p>`}</div>${detail(sel)}</div>` : brokenCard(C)}</div>`;
}

/* ── thẻ Mục tiêu (đầu cột phải bản đồ) và dòng tuần ở Tổng quan ── */
const fmtN = (n: number) => (getLang() === "vi" ? String(n).replace(".", ",") : String(n));
const num = (b: string, l: string, sub = "", cls = "") => `<div class="g8-n ${cls}"><b>${b}</b><span>${esc(l)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
const curName = (C: Ctx, id: string) => { const d = C.idx.domains.find(x => x.id === id); return d?.curPath ? d.curPath.split("/").pop()!.replace(/\.md$/, "") : `curriculum-${id}`; };

const PACE_L = (v: string) => ({ ahead: tr("vượt kế hoạch"), "on-track": tr("đúng kế hoạch"), behind: tr("chậm kế hoạch") }[v] || "");
/** Ô tiến độ của goal note (progress %, pace). Ghi nhãn "theo mục tiêu" để không lẫn với nhịp bài/tuần của Pie Study. */
const goalNum = (p: import("../data/profile.ts").Profile) => p.progress == null && !p.pace ? "" : num(p.progress == null ? "—" : `${fmtN(Math.round(p.progress))}%`, tr("theo mục tiêu"), p.pace ? PACE_L(p.pace) : "", p.pace === "behind" ? "warn" : "");

/** Chỉ cho người dùng có Pie Agent. Chưa có hồ sơ → nút "Đặt mục tiêu"; có hồ sơ → mục tiêu, hạn chót, ba số, câu nhịp học. */
export function goalCard(C: Ctx, d: { id: string; topics: { und: string[] }[]; profile?: import("../data/profile.ts").Profile }): string {
  if (!C.agentReady) return "";
  const cmd = `thêm mục tiêu cho lộ trình [[${curName(C, d.id)}]]`, p = d.profile;   // skill muc-tieu ghi goal note; plugin chỉ đọc
  const nsrc = sourcesOf(C.lib.lib, d.id).length, srcLink = `<button class="g8-link" data-go="sources">${i("book", 14)}${tr("Nguồn của lộ trình")} <span>${nsrc}</span></button>`;   // luôn có, kể cả chưa có mục tiêu hay 0 nguồn
  if (!p) return `<div class="q-card g8 empty"><small>${tr("Mục tiêu")}</small><b class="g8-goal">${tr("Lộ trình này chưa có mục tiêu")}</b>
    <p class="g8-p">${tr("Đặt mục tiêu, hạn chót và số giờ mỗi tuần để biết mình đang nhanh hay chậm.")}</p><button class="qb w100" data-bob="${esc(cmd)}">${tr("Đặt mục tiêu cho lộ trình này")}${i("arrow", 18)}</button>
    <div class="g8-foot">${srcLink}</div></div>`;
  const topics = d.topics as import("../data/index.ts").Topic[], now = new Date(), remaining = neededCount(topics), later = topics.filter(t => t.need === "later").length;
  const solidTs = topics.map(t => C.log(t).solidAt?.t).filter((x): x is string => !!x);
  const pc = paceOf({ solidTs, remaining, deadline: p.deadline, now }), late = pc.kind === "late";
  const head = p.deadline ? (late ? `<span class="pill att">${i("clock", 11)}${tr("Quá hạn {0} ngày", pc.lateDays ?? 0)} · ${tr("hạn {0}", fmtD(p.deadline))}</span>` : `<span class="pill">${i("target", 11)}${tr("Hạn {0} · còn {1} tuần", fmtD(p.deadline), pc.weeksLeft ?? 0)}</span>`) : "";
  const pace = pc.kind === "nodata" ? num("—", tr("4 tuần qua"), tr("chưa có bài nắm"), "mute") : pc.kind === "idle" ? num("0", tr("bài/tuần, 4 tuần qua"), "", "warn") : num(fmtN(pc.perWeek), tr("bài/tuần, 4 tuần qua"));
  const hours = Math.round(secsInLast(topics.map(t => C.log(t)), C.today, 7) / 360) / 10;
  const time = C.settings.timeTrack ? num(fmtN(hours), tr("giờ đo được, 7 ngày"), p.hoursWeek ? tr("kế hoạch {0} giờ", fmtN(p.hoursWeek)) : "") : "";
  const need = pc.need != null && !late ? `<p class="g8-need">${i("zap", 14)}<span>${tr("Cần {0} bài/tuần để kịp: còn {1} bài chưa nắm, {2} tuần nữa.", `<b>${fmtN(pc.need)}</b>`, remaining, pc.weeksLeft ?? 0)}</span></p>` : "";
  const note = remaining === 0 ? `<p class="g8-need soft"><span>${tr("Đã nắm cơ bản cả {0} bài.", topics.length - later)}</span></p>`
    : late ? `<p class="g8-need warn"><span>${tr("Đã qua hạn chót. Còn {0} bài chưa nắm; đặt lại hạn chót nếu mục tiêu vẫn còn.", remaining)}</span></p>`
    : pc.kind === "nodata" ? `${need}<p class="g8-need soft"><span>${tr("Chưa đủ dữ liệu để ước tính. Bài đầu tiên nắm cơ bản sẽ bắt đầu nhịp học.")}</span></p>`
    : pc.kind === "idle" ? `${need}<p class="g8-need warn"><span>${tr("4 tuần qua chưa nắm thêm bài nào. Trước đó trung bình {0} bài/tuần.", fmtN(pc.before || 0))}</span></p>`
    : pc.kind === "open" ? `<p class="g8-need soft"><span>${tr("Theo nhịp này còn khoảng {0} tuần cho {1} bài chưa nắm.", `<b>${pc.eta ?? 0}</b>`, remaining)}</span></p>` : need;
  return `<div class="q-card g8"><small>${tr("Mục tiêu")}</small><b class="g8-goal">${p.goalPath ? `<a data-open="${esc(p.goalPath)}" title="${esc(tr("Mở note mục tiêu"))}">${esc(p.goal)}</a>` : esc(p.goal)}</b>${p.done ? `<p class="g8-p g8-done" ${p.goalPath ? `data-open="${esc(p.goalPath)}" title="${esc(tr("Mở note mục tiêu"))}"` : ""}>${esc(p.done)}</p>` : ""}${head ? `<div class="g8-head">${head}</div>` : ""}
    <div class="g8-nums">${p.planWeek ? num(fmtN(p.planWeek), tr("bài/tuần kế hoạch")) : ""}${pace}${time}${goalNum(p)}</div>${note}${later ? `<p class="g8-need soft"><span>${tr("{0} bài để sau không tính vào số bài cần nắm.", later)}</span></p>` : ""}
    <div class="g8-foot">${srcLink}${late ? `<button class="g8-link" data-bob="${esc(p.goalPath ? `check-in mục tiêu [[${p.goalPath.split("/").pop()!.replace(/\.md$/, "")}]]` : cmd)}">${i("refresh", 14)}${tr("Đặt lại mục tiêu")}</button>` : ""}</div></div>`;
}

/** Dòng "Tuần này M bài nắm cơ bản · tuần trước M′" ở Tổng quan, gộp mọi lộ trình (kể cả chưa có hồ sơ). Chưa từng có bài nắm cơ bản thì không hiện. */
export function weekLine(C: Ctx): string {
  if (!C.agentReady) return "";
  const ts = C.idx.all.map(t => C.log(t).solidAt?.t).filter((x): x is string => !!x); if (!ts.length) return "";
  const now = new Date(), { thisWeek, lastWeek } = weekCounts(ts, now), bars = weekSeries(ts, now, 5);
  return `<div class="g8-week"><span class="g8-wk-ic">${i("check", 16)}</span><div><b>${tr("Tuần này: {0} bài nắm cơ bản", thisWeek)}</b><small>${tr("tuần trước: {0} · đủ 5 kiểu hiểu cốt lõi", lastWeek)}</small></div>
    <span class="g8-wk-bars">${bars.map((v, k) => `<i style="height:${6 + Math.min(v, 6) * 8}px" class="${k === bars.length - 1 ? "now" : ""}" title="${tr("{0} bài", v)}"></i>`).join("")}</span></div>`;
}

/* ── Hộp "Thêm nguồn" (spec 7.10 bước 5; prototype d12) ── */
export interface NSFile { path: string | null; name: string; ext: string; title: string; bytes?: ArrayBuffer; info?: import("../library-io.ts").FileInfo | "loading" }
export interface NS { kind: "file" | "web" | "notebooklm"; q: string; file: NSFile | null; link: string; nb: string; name: string; paths: string[]; busy?: boolean; err?: string; drag?: boolean }
export interface VFile { path: string; ext: string; title: string }
export const blankNS = (dom: string): NS => ({ kind: "file", q: "", file: null, link: "", nb: "", name: "", paths: dom ? [dom] : [], });
/** Hộp Thêm nguồn chỉ chọn sẵn lộ trình khi nút mở nó mang id lộ trình (data-addsrc="<id>", ở màn Nguồn của lộ trình). Mở từ Kho nguồn hoặc khối chào (data-addsrc="") thì không chọn lộ trình nào. */
export const nsFromTrigger = (addsrc: string | undefined): NS => blankNS(addsrc || "");

/** Tên hiển thị: người dùng gõ, không thì lấy tên file / link / notebook. */
export function nsName(ns: NS) { return ns.name.trim() || (ns.kind === "file" ? ns.file?.title || "" : ns.kind === "web" ? ns.link.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "") : ns.nb.trim()); }
/** "Thêm vào kho" chỉ bật khi đủ dữ liệu. */
export const nsReady = (ns: NS) => !ns.busy && !!nsName(ns) && (ns.kind === "file" ? !!ns.file && ns.file.info !== "loading" : ns.kind === "web" ? !!webUrl(ns.link.trim()) : !!ns.nb.trim());

/** Điều plugin sẽ làm với nguồn đang chọn — hiện ngay trong hộp để người dùng biết trước phần nào chờ agent. */
function nsPlan(C: Ctx, ns: NS): ["ok" | "wait", string, string] | null {
  const wait = tr("Chờ {0} rút mục lục. Nguồn vào kho ngay; {0} rút xong thì kho tự cập nhật.", C.agent);
  if (ns.kind === "file") {
    const f = ns.file; if (!f) return null; const inf = f.info;
    if (inf === "loading" || !inf) return ["wait", tr("Đang đọc file…"), ""];
    if (f.ext === "md") return inf.heads ? ["ok", tr("Đọc {0} mục từ tiêu đề trong file.", inf.heads), tr("Bìa tự vẽ.")] : ["wait", tr("File chưa có tiêu đề # – ###. ") + wait, tr("Bìa tự vẽ.")];
    if (f.ext === "pdf") return inf.pdfFail ? ["wait", tr("Plugin không đọc được PDF này. ") + wait, tr("Bìa tự vẽ.")]
      : inf.outline ? ["ok", tr("PDF có mục lục nhúng: {0} mục.", inf.outline), tr("Lấy trang 1 làm bìa.")] : ["wait", tr("PDF không có mục lục nhúng. ") + wait, tr("Lấy trang 1 làm bìa.")];
    return ["wait", tr("Plugin không tự đọc được EPUB. ") + wait, tr("Bìa lấy khi chuyển sách vào vault.")];
  }
  if (ns.kind === "web") return webUrl(ns.link.trim()) ? ["wait", tr("Plugin không tự tải trang web. ") + wait, tr("Bìa tự vẽ; {0} có thể lưu ảnh đại diện của trang.", C.agent)] : null;
  return ns.nb.trim() ? ["wait", wait, tr("Bìa tự vẽ.")] : null;
}

/** Danh sách file trong hộp Thêm nguồn; tách ra để gõ tìm chỉ vẽ lại phần này. */
export const nsFilesHtml = (ns: NS, files: VFile[], total: number) => (files.map(f => `<button class="ns-f ${ns.file?.path === f.path ? "on" : ""}" data-nsf="${esc(f.path)}"><span class="ns-ext">${esc(f.ext)}</span><span><b>${esc(f.title)}</b><small>${esc(f.path)}</small></span>${ns.file?.path === f.path ? i("check", 16) : ""}</button>`).join("") || `<p class="sub" style="padding:10px 12px;margin:0">${tr("Không có file khớp.")}</p>`) + (total > files.length ? `<p class="sub ns-more">${ns.q.trim() ? tr("{0} kết quả, đang hiện {1}. Gõ thêm để thu hẹp.", total, files.length) : tr("Đang hiện {0}/{1} file. Gõ tên hoặc đường dẫn để tìm thêm.", files.length, total)}</p>` : "");

export function nsModal(C: Ctx, ns: NS, list: { files: VFile[]; total: number }) {
  const files = list.files;
  const types: [NS["kind"], string, string][] = [["file", "file", tr("File trong vault")], ["web", "search", tr("Link web")], ["notebooklm", "layers", "NotebookLM"]];
  const body = ns.kind === "file" ? `
      <label class="ns-l">${tr("Chọn file trong vault")} <small>.md · .pdf · .epub</small></label>
      <input class="ns-in" data-nsq placeholder="${esc(tr("Tìm theo tên hoặc đường dẫn"))}" value="${esc(ns.q)}">
      <div class="ns-files">${nsFilesHtml(ns, files, list.total)}</div>
      <div class="ns-drop ${ns.drag ? "on" : ""}" data-nsdrop>${i("plus", 16)}<span><b>${tr("Hoặc kéo thả file từ máy vào đây")}</b><small>${tr("Plugin chép vào {0} rồi thêm vào kho.", "<code>Pie Study/nguon/</code>")}</small></span></div>
      <input type="file" data-nsfile accept=".md,.pdf,.epub" hidden>`
    : ns.kind === "web" ? `<label class="ns-l">${tr("Link")}</label><input class="ns-in" data-nslink placeholder="${esc(tr("Dán link bài viết vào đây"))}" value="${esc(ns.link)}">`
    : `<label class="ns-l">${tr("Tên notebook trên NotebookLM")}</label><input class="ns-in" data-nsnb placeholder="${esc(tr("Ví dụ: AI ops — tài liệu chuẩn"))}" value="${esc(ns.nb)}">`;
  const pl = nsPlan(C, ns);
  return `<div class="ns-scrim" data-nsclose></div><div class="ns-modal" role="dialog" aria-label="${tr("Thêm nguồn")}">
    <div class="ns-hd"><b>${i("plus", 16)}${tr("Thêm nguồn vào kho")}</b><button class="ibtn" data-nsclose title="${tr("Đóng")}" aria-label="${tr("Đóng")}">${i("x")}</button></div>
    <div class="ns-bd"><div class="ns-types">${types.map(([k, ic, l]) => `<button class="${ns.kind === k ? "on" : ""}" data-nskind="${k}">${i(ic, 16)}${esc(l)}</button>`).join("")}</div>
      ${body}
      <label class="ns-l">${tr("Tên hiển thị")}</label><input class="ns-in" data-nsname placeholder="${esc(tr("Tên trong kho"))}" value="${esc(ns.name || (ns.kind === "file" ? ns.file?.title || "" : ""))}">
      <label class="ns-l">${tr("Dùng cho lộ trình")} <small>${tr("tuỳ chọn, chọn nhiều được")}</small></label>
      <div class="ns-paths">${C.idx.domains.map(d => `<button class="${ns.paths.includes(d.id) ? "on" : ""}" data-nspath="${esc(d.id)}">${ns.paths.includes(d.id) ? i("check", 12) : ""}${esc(domName(d))}</button>`).join("")}</div>
      ${pl ? `<div class="ns-plan ${pl[0]}"><b>${pl[0] === "ok" ? tr("Plugin tự làm được") : tr("Cần {0}", C.agent)}</b><span>${esc(pl[1])}</span>${pl[2] ? `<small>${esc(pl[2])}</small>` : ""}</div>` : ""}
      ${ns.err ? `<div class="ns-plan wait"><b>${tr("Chưa thêm được")}</b><span>${esc(ns.err)}</span></div>` : ""}
    </div>
    <div class="ns-ft"><small>${tr("Ghi vào {0}. Không sửa note nào.", "<code>Pie Study/kho-nguon.json</code>")}</small><button class="btn ghost" data-nsclose>${tr("Huỷ")}</button><button class="btn pri" data-nsadd ${nsReady(ns) ? "" : "disabled"}>${i("plus", 14)}${tr("Thêm vào kho")}</button></div></div>`;
}
