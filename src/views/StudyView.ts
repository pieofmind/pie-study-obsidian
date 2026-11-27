/* View chính của Pie Study: giữ trạng thái màn (như S của prototype), vẽ bằng chuỗi HTML đã escape, sự kiện uỷ quyền. */
import { ItemView, WorkspaceLeaf, Platform, TFile, Notice, normalizePath, type TAbstractFile } from "obsidian";
import type PieStudyPlugin from "../main.ts";
import { tr } from "../i18n.ts";
import { ask, copyCommand, agentReady, agentName, agentVersion } from "../agent.ts";
import { type Ctx, type View, curDom, i, domName, cmdLearn, cmdReview } from "./shared.ts";
import { domStats } from "../data/index.ts";
import { questMap, shellD } from "./map.ts";
import { overviewScreen, topicScreen, notebookScreen, onboardScreen, settingsScreen, reviewScreen, cmdNewPath } from "./screens.ts";
import { syncMascot } from "./mascot.ts";
import { setHtml, appendHtml, htmlFrag } from "./html.ts";
import { play, type Fx } from "./motion.ts";
import { badgesScreen, unlockToast } from "./badges.ts";
import { reviewScreen as practiceReview, quizScreen, verdict, fmtGap, freshItem, secsLeft, focusTop, needConf, CONF_KEYS, type RV, type QZ, type RvCard } from "./practice.ts";
import { firstCheckTally, recordCard, recordCheck, recordQuest, recordAnswer, previewIntervals, dueQueue, cardKey, cardRecall, DEFAULT_STATE_DIR } from "../practice/log.ts";
import { recordAttempt, questItemKey, dropMistake, sureWrong, undoGrade } from "../practice/attempts.ts";
import { essayScreen, lectureScreen, essayReady, type ES, type LC } from "./study3.ts";
import { quizNoteScreen, type QN } from "./study6.ts";
import { essayReqScreen, type ER } from "./study9.ts";
import { lectureReqScreen, type LR } from "./study11.ts";
import { lecturesScreen } from "./study12.ts";
import { matsScreen } from "./study13.ts";
import { mapsScreen, mapPaths, dimsOf } from "./study14.ts";
import { matModal, matFilesHtml, type MA } from "./matmodal.ts";
import { appendMaterials, removeMaterial, pickMaterialFiles } from "../data/matwrite.ts";
import { linkTarget } from "../data/goal.ts";
import { mountGraph } from "./cmgraph.ts";
import { extractMap, buildNoteIndex, lookupNote, parseMermaid, mergeCurriculum, type CmParse } from "../data/conceptmap.ts";
import { resolveMaterials, MAT_PLUGIN_IDS } from "../data/materials.ts";
import { lectureStat, type LecStat } from "../data/lecstat.ts";
import { pickFiles } from "../data/vaultfiles.ts";
import { pool } from "../data/pool.ts";
import { sourcesScreen, libraryScreen, webUrl, nsModal, nsFilesHtml, nsFromTrigger, nsReady, nsName, type NS, type NSFile, type VFile } from "./study10.ts";
import { recreateLibrary, loadLibrary, saveLibrary, inspectFile, writeDropped, addVaultSource, addRemoteSource } from "../library-io.ts";
import { essayPath, essayReqCmd } from "../data/essaynote.ts";
import { quizPath, quizCmd, dropNote, DEFAULT_QUIZ_DIR } from "../data/quiznote.ts";
import { mistakesScreen, tdTitle, tdPhase, tdFate, tdAtt, tdDone, tdCheckPhase, checkEssayScreen, type TodayInfo, type CK } from "./study4.ts";
import { applyCheck } from "../data/tick.ts";
import { dueChecks, toQItem, gradeShort, gradeEssay, checkKey } from "../data/checknote.ts";
import { mistakeRows, todayQueue, doneToday, streakNow, type TdItem } from "../practice/today.ts";
import { nextUp } from "./screens.ts";
import { overdueDaysT } from "../data/index.ts";
import { forecast, history, streaks } from "../practice/rhythm.ts";
import { todayStr } from "../status.ts";
import { essayPrompt, essayCmd, parseLecMsg, lectureBlocks, addDeeper, lecAnswerKey, markBroken, type EssayPrompt } from "../data/lecture.ts";
import { lectureDoc, shellCssFrom, groundedMap, type ShellOpts } from "../data/lecshell.ts";
import { cmdNewLecture, GUIDE_PATH, DEFAULT_LECTURE_DIR } from "../data/lecguide.ts";
import TEMPLATE_SRC from "../lecture-template.html";
import D3 from "lib:d3";
import { nodeForTopic, bossFor, questKey, gradeInput, itemText, type Quest, type QNode } from "../data/quest.ts";
import { isEssay } from "../data/result.ts";
import type { Topic } from "../data/index.ts";
import type { PracticeLog } from "../practice/log.ts";
import type { Grade } from "ts-fsrs";

export const VIEW_TYPE = "pie-study-view";

/** Lượt chấm vừa rồi huỷ được (xem StudyView.doUndo). */
/** at: thời điểm lượt chấm (dòng attempt mang đúng thời điểm này); logs: nhật ký ngay trước lượt, chỉ để lấy lại các trường lượt đã ghi (undoGrade). */
type UndoSnap = { wrote: Promise<unknown>; at: Date; logs: { t: Topic; log: PracticeLog }[]; fm?: { t: Topic; pend: unknown; und: unknown }; back: () => void };

export class StudyView extends ItemView {
  S: View = { screen: "home", dom: "", topic: "", ttab: "notebook", sel: null };
  private rootEl!: HTMLElement;
  private qScroll: Record<string, number> = {};
  private qSeen = "";
  private frame: "phone" | "mid" | "desktop" = "desktop";
  private rv: RV | null = null;
  private qz: QZ | null = null;
  private es: ES | null = null;
  private lc: LC | null = null;
  private lr: LR | null = null;
  private lecStats = new Map<string, { key: string; stat: LecStat }>();   // slug → số khối (khoá = mtime file bài giảng + mtime note)
  private cmaps = new Map<string, { key: string; src: string | null }>();   // đường dẫn → khối mermaid dưới "## Sơ đồ khái niệm" (khoá = mtime); null = chưa có
  private cmLoading = false;
  private cmNext: string[] | null = null;   // đường dẫn xin đọc trong lúc đang đọc lượt trước
  private lecLoading = false;   // đang chờ agent soạn bài giảng (8b)
  private qn: QN | null = null;   // quiz note đang chờ / sẵn sàng (đợt 6)
  private er: ER | null = null;   // nhờ agent ra đề tự luận (7.9)
  private ma: MA | null = null;   // hộp Gắn học liệu
  private ns: NS | null = null;   // hộp Thêm nguồn (đợt 8a)
  private ck: CK | null = null;   // đợt 9: câu kiểm tự luận đang làm trong phiên hôm nay
  private td: { items: TdItem<Topic, RvCard>[]; i: number; res: boolean[]; mode: "all" | "miss" } | null = null;   // phiên hôm nay (đợt 4)
  /** Lượt chấm vừa rồi huỷ được: nhật ký các bài trước khi ghi, 2 trường frontmatter (lượt kiểm), và cách lùi màn về câu đó. Chỉ một lượt, chỉ trong phiên. */
  private undoSnap: UndoSnap | null = null;
  private undoing = false;   // đang ghi trả: chặn chấm câu mới để không chen ghi
  private lcShown: LC | null = null;   // lần mở bài giảng mà iframe hiện tại đang chạy
  private lcGoto: string | null = null;   // đợt 7: khối cần quay về sau khi nạp lại bài giảng (agent soạn lại khối)
  private lcSeen = new Set<string>();   // token đã ghi nhật ký trong lần mở bài giảng này (chặn bài giảng gửi dồn để thổi phồng số đúng)
  private back = "home";
  private get phone() { return this.frame === "phone"; }
  private ro?: ResizeObserver;
  constructor(leaf: WorkspaceLeaf, private plugin: PieStudyPlugin) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Pie Study"; }
  getIcon() { return "graduation-cap"; }

  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("pie-study-host");
    this.rootEl = this.contentEl.createDiv({ cls: "pie-study-root" });
    this.registerDomEvent(this.rootEl, "click", e => this.onClick(e));
    this.registerDomEvent(this.rootEl, "change", e => this.onChange(e));
    for (const ev of ["dragover", "dragleave", "drop"] as const) this.registerDomEvent(this.rootEl, ev, e => this.nsDrag(e));
    this.registerDomEvent(this.rootEl, "keydown", e => { const t = e.target as HTMLElement; if (e.key === "Enter" && t.matches("[data-newpath]")) this.newPath(!agentReady(this.app)); });
    this.registerDomEvent(this.rootEl, "scroll", e => { const el = e.target as HTMLElement; if (el.dataset?.qkey) this.qScroll[el.dataset.qkey + this.frame] = el.scrollTop; }, true);
    this.registerEvent(this.app.workspace.on("css-change", () => this.render()));
    this.registerDomEvent(this.containerEl.doc, "keydown", e => this.onKey(e));
    this.registerDomEvent(this.rootEl, "input", e => {
      const t = e.target as HTMLInputElement;
      if (t.matches("[data-qz-input]") && this.qz) { const k = t.dataset.qzInput; if (k) { const ps = this.qz.input.split("\n"); ps[Number(k)] = t.value.replace(/\n/g, " "); this.qz.input = ps.join("\n"); } else this.qz.input = t.value; }
      if (t.matches("[data-ck-input]") && this.ck) { this.ck.text = t.value; this.rootEl.querySelector("[data-ck-show]")?.toggleAttribute("disabled", !t.value.trim()); }
      if (t.matches("[data-essay]") && this.es) this.essayInput(t.value);
      if (this.ns && t.matches("[data-nsq],[data-nslink],[data-nsnb],[data-nsname]")) this.nsInput(t);
      if (this.ma && t.matches("[data-mtq]")) { this.ma.q = t.value; const box = this.rootEl.querySelector(".mta .ns-files"); if (box) { const r = this.maFiles(); setHtml(box, matFilesHtml(this.ma, r.files, r.total, this.maHave())); } }
    });
    this.registerDomEvent(window, "message", e => this.onLectureMsg(e));
    const onQuizFile = (f: TAbstractFile) => { const q = this.qn; if (q && q.stage === "wait" && f.path === q.path && f instanceof TFile && f.stat.mtime >= q.sentAt - 1000) void this.qnVet();
      const r = this.er; if (r && r.stage === "wait" && f.path === r.path && f instanceof TFile && f.stat.mtime >= r.sentAt - 1000) void this.erVet(); };
    this.registerEvent(this.app.vault.on("create", onQuizFile)); this.registerEvent(this.app.vault.on("modify", onQuizFile));
    this.registerEvent(this.app.vault.on("modify", f => { if (this.lc && f.path === this.lc.path) void this.reloadLecture(); }));
    this.registerDomEvent(window, "message", e => {   // iframe tự chấm: {type:"engram-quest-solved", score} (định dạng quest cũ) hoặc {type:"pie-study/answer", ok}
      const z = this.qz, q = z?.items[z.i], d = e.data as { type?: string; score?: number; ok?: boolean } | null;
      const frame = this.rootEl.querySelector<HTMLIFrameElement>(".q-frame");
      if (!z || q?.kind !== "iframe" || !d || !frame || e.source !== frame.contentWindow || z.st.score != null) return;
      if (d.type === "engram-quest-solved" && Number.isFinite(Number(d.score))) z.st.score = Number(d.score);
      else if (d.type === "pie-study/answer") z.st.score = d.ok ? 100 : 0;
      else return;
      this.render();
    });
    this.registerInterval(window.setInterval(() => this.tick(), 250));
    this.ro = new ResizeObserver(() => { const f = this.frameOf(); if (f !== this.frame) { this.frame = f; this.render(); } });
    this.ro.observe(this.contentEl);
    this.frame = this.frameOf();
    this.render();
  }
  /** 3 khổ theo bề rộng tab: <600 điện thoại · 600–1100 vừa (cạnh khung chat) · >1100 máy tính. */
  private frameOf() { const w = this.contentEl.clientWidth; return Platform.isPhone || w < 600 ? "phone" : w <= 1100 ? "mid" : "desktop"; }
  async onClose() { this.ro?.disconnect(); }

  private ctx(): Ctx {
    const p = this.plugin, idx = p.index;
    if (!this.S.dom || !idx.domains.find(d => d.id === this.S.dom)) {   // mặc định: lĩnh vực đang học có nhiều bài tới hạn nhất, không có thì lĩnh vực đầu
      const act = idx.domains.map(d => ({ d, s: domStats(d) })).filter(x => x.s.done + x.s.learning + x.s.due).sort((a, b) => b.s.due - a.s.due || b.s.done - a.s.done);
      this.S.dom = (act[0]?.d || idx.domains[0])?.id || "";
    }
    const mk = mistakeRows([...idx.all, ...p.outside].filter(t => p.practice.has(t)).map(t => ({ topic: t, log: p.practice.get(t) })), [...p.quests, ...p.quizQuests()], path => this.app.vault.getAbstractFileByPath(normalizePath(path)) instanceof TFile, new Date());
    return {
      idx, sohoc: p.sohoc, sessions: t => p.sessionsOf(t), cards: t => p.cards.get(t.path) || [], today: p.today, phone: this.phone, frame: this.frame,
      agent: agentName(this.app), agentReady: agentReady(this.app), agentVersion: agentVersion(this.app), S: this.S,
      folder: p.settings.folder, motion: p.settings.motion, dupes: p.dupes,
      log: t => p.practice.get(t), quests: p.quests, settings: p.settings, migration: p.migration, badges: p.badgeData(), canUndo: !!this.undoSnap,
      mk, todayInfo: () => this.todayInfo(mk), rhythm: () => this.rhythm(),
      lateRate: dom => [...idx.all, ...(dom == null ? p.outside : [])].filter(t => (dom == null || t.dom === dom) && p.practice.has(t)).map(t => firstCheckTally(p.practice.get(t))).reduce((a, b) => ({ ok: a.ok + b.ok, n: a.n + b.n }), { ok: 0, n: 0 }),
      materials: (links, from) => resolveMaterials(links, l => this.app.metadataCache.getFirstLinkpathDest(l, from)?.path ?? null,
        k => { const id = MAT_PLUGIN_IDS[k], pl = (this.app as unknown as { plugins?: { enabledPlugins?: Set<string> } }).plugins; return !id || !!pl?.enabledPlugins?.has(id); }),
      cm: { src: path => this.cmaps.get(path)?.src, resolve: (l, from) => this.app.metadataCache.getFirstLinkpathDest(l, from)?.path ?? null, title: (l, from) => this.dimTitle(l, from) },
      lecInfo: t => this.lecStats.get(t.slug)?.stat, lectureDir: p.lectureDir(),
      lib: p.lib, resource: path => { const f = this.app.vault.getAbstractFileByPath(normalizePath(path)); return f instanceof TFile ? this.app.vault.getResourcePath(f) : null; },
      essayFile: t => p.essayFor(t), checks: t => p.checks.find(x => x.topic.path === t.path)?.items || [], quick: t => { const q = p.quickFor(t); return q && { ...q, last: p.practice.has(t) ? p.practice.get(t).quests?.[`${q.path}/quiz`]?.last : undefined }; },
    };
  }

  render(fx: Fx[] = []) {
    if (!this.rootEl) return;
    if (this.lr && this.S.screen === "lecreq") {   // chỉ mục vừa đổi: file bài giảng đã có thì mở luôn
      const t = this.plugin.index.all.find(x => x.slug === this.lr!.topic.slug);
      if (t && this.lecFile(t)) { const slug = t.slug, back = this.lr.back; this.lr = null; this.back = back; void this.startLecture(slug); return; }
    }
    const C = this.ctx(), S = this.S, empty = !C.idx.domains.length, d = curDom(C);
    const focus = (S.screen === "quiznote" && this.qn) || (S.screen === "essreq" && this.er) || (S.screen === "lecreq" && this.lr) || (S.screen === "today" && this.td) || (S.screen === "review" && this.rv) || (S.screen === "quiz" && this.qz) || (S.screen === "essay" && this.es) || (S.screen === "lecture" && this.lc);
    if (this.plugin.ready && focus) {   // màn luyện tập toàn khung: không có vỏ thanh trên
      const dark = activeDocument.body.classList.contains("theme-dark"), calm = !C.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const html = S.screen === "quiznote" ? quizNoteScreen(C, this.qn!) : S.screen === "essreq" ? essayReqScreen(C, this.er!) : S.screen === "lecreq" ? lectureReqScreen(C, this.lr!) : S.screen === "today" ? this.todayHtml(C) : S.screen === "review" ? practiceReview(C, this.rv!) : S.screen === "quiz" ? quizScreen(C, this.qz!)
        : S.screen === "essay" ? essayScreen(C, this.es!, essayCmd(this.es!.topic.slug, this.es!.p, this.es!.text)) : lectureScreen(C, this.lc!, this.newLectureCmd(this.lc!.topic), GUIDE_PATH);
      const live = S.screen === "lecture" && this.lcShown === this.lc && this.rootEl.querySelector("iframe[data-lecture]");   // chỉ giữ iframe nếu nó là CHÍNH lần mở này
      if (live) {   // bài giảng đang chạy: chỉ vẽ lại cột phải + theme vỏ, không nạp lại iframe (mất trang đang xem); iframe cách ly giữ theme lúc mở
        this.rootEl.querySelector(".ob")?.setAttribute("data-theme", dark ? "dark" : "light");
        (live as HTMLIFrameElement).contentWindow?.postMessage({ type: "pie-study/theme", theme: dark ? "dark" : "light" }, "*");   // đợt 7: bài giảng đổi theme tại chỗ
        const rail = htmlFrag(html).querySelector(".rail"), cur = this.rootEl.querySelector(".rail");
        if (rail && cur) cur.replaceWith(rail);
        return;
      }
      setHtml(this.rootEl, `<div class="ob d2${calm ? " ps-calm" : ""}" data-theme="${dark ? "dark" : "light"}" data-edge="ledge"><div class="${this.frame === "desktop" ? "desk" : this.frame}"><div class="view">${html}</div></div></div>`);
      this.lcShown = S.screen === "lecture" ? this.lc : null;
      const fr = S.screen === "lecture" ? this.rootEl.querySelector<HTMLIFrameElement>("iframe[data-lecture]") : null;
      if (fr && this.lcGoto) { const id = this.lcGoto; this.lcGoto = null; fr.addEventListener("load", () => fr.contentWindow?.postMessage({ type: "pie-study/goto", id }, "*"), { once: true }); }
      return this.afterRender([]);
    }
    let body: string;
    if (!this.plugin.ready) body = `<div class="empty in"><p class="sub">${tr("Đang đọc dữ liệu học…")}</p></div>`;
    else if (empty && ["home", "notebook", "overview", "review", "topic"].includes(S.screen)) body = onboardScreen(C);
    else body = ({ home: () => (d ? questMap(C, d) : onboardScreen(C)), overview: () => overviewScreen(C), topic: () => topicScreen(C), notebook: () => notebookScreen(C), review: () => reviewScreen(C), onboard: () => onboardScreen(C), settings: () => settingsScreen(C), badges: () => badgesScreen(C, C.badges), mistakes: () => mistakesScreen(C, S.mkf || { st: "open", dom: "", tok: "" }), sources: () => (C.agentReady ? sourcesScreen(C) : questMap(C, d!)), library: () => (C.agentReady ? libraryScreen(C) : questMap(C, d!)), lectures: () => (d ? lecturesScreen(C) : questMap(C, d!)), mats: () => (d ? matsScreen(C) : questMap(C, d!)), maps: () => (d ? mapsScreen(C) : questMap(C, d!)) }[S.screen] || (() => questMap(C, d!)))();
    const dark = activeDocument.body.classList.contains("theme-dark");
    const calm = !C.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setHtml(this.rootEl, `<div class="ob d2${calm ? " ps-calm" : ""}" data-theme="${dark ? "dark" : "light"}" data-edge="ledge"><div class="${this.frame === "desktop" ? "desk" : this.frame}"><div class="view">${shellD(C, body)}${this.phone ? this.tabbar() : ""}${this.ns && C.agentReady ? this.nsHost(C) : ""}${this.ma ? this.maHost(C) : ""}</div></div></div>`);
    this.afterRender(calm ? [] : fx);
    if (S.screen === "lectures" && d) void this.loadLecStats(d.topics);
    if (S.screen === "topic") { const t = this.plugin.index.all.find(x => x.slug === S.topic); if (t) void this.loadLecStats([t]); }
    if (S.screen === "maps" && d) void this.loadMaps(mapPaths(C, d));
    if (S.screen === "topic" && S.ttab === "map") { const t = this.plugin.index.all.find(x => x.slug === S.topic); if (t) void this.loadMaps(mapPaths(C, undefined, t)); }
  }

  /** Tên dimension = tiêu đề MOC (frontmatter title, không có thì tên file); liên kết không trỏ tới file nào thì lấy chữ của liên kết. */
  private dimTitle(link: string, from: string) {
    const f = this.app.metadataCache.getFirstLinkpathDest(link, from);
    if (!f) return link.split("/").pop()!.replace(/\.md$/, "");
    const t = this.app.metadataCache.getFileCache(f)?.frontmatter?.title;
    return typeof t === "string" && t.trim() ? t.trim() : f.basename;
  }
  /** Đọc nền khối mermaid của các note (cache theo mtime; chỉ khi mở màn Sơ đồ / tab Sơ đồ). Có thay đổi thì vẽ lại một lần. */
  private async loadMaps(paths: string[]) {
    if (this.cmLoading) { this.cmNext = paths; return; } this.cmLoading = true; let changed = false;
    try {
      await pool(paths.filter(p => { const f = this.app.vault.getAbstractFileByPath(p); return f instanceof TFile && this.cmaps.get(p)?.key !== String(f.stat.mtime); }), 8, async p => {
        const f = this.app.vault.getAbstractFileByPath(p); if (!(f instanceof TFile)) return;
        try { this.cmaps.set(p, { key: String(f.stat.mtime), src: extractMap(await this.app.vault.cachedRead(f)) }); changed = true; } catch (e) { console.error("[pie-study] không đọc được sơ đồ", p, e); }
      });
    } finally { this.cmLoading = false; }
    if (changed) this.render();
    const next = this.cmNext; this.cmNext = null; if (next) void this.loadMaps(next);
  }
  /** Gắn đồ thị canvas vào các khung `.gv[data-cm]`. Chấm đặc = nhãn khớp đúng một note (ưu tiên `[[liên kết|Tên]]`, rồi tên file / tiêu đề / alias). */
  private mountMaps() {
    const boxes = this.rootEl.querySelectorAll<HTMLElement>(".gv[data-cm]"); if (!boxes.length) return;
    const mc = this.app.metadataCache, ix = buildNoteIndex(this.app.vault.getMarkdownFiles().map(f => {
      const fm = mc.getFileCache(f)?.frontmatter, al = fm?.aliases ?? fm?.alias, names = [f.basename, ...(typeof fm?.title === "string" ? [fm.title] : []), ...(Array.isArray(al) ? al : typeof al === "string" ? [al] : [])];
      return { path: f.path, names: names.filter((x): x is string => typeof x === "string") };
    }));
    const C = this.ctx();
    boxes.forEach(box => {
      const key = box.dataset.cm || "", merged = key.startsWith("merge:"), [domId, dimKey] = key.slice(6).split(":"), d = merged ? C.idx.domains.find(x => x.id === domId) : undefined;
      let parse: CmParse | null = null, from = key;
      if (merged) {   // sơ đồ tổng ghép từ sơ đồ các bài
        if (!d) return; from = d.curPath || "";
        const dims = dimsOf(C, d), mapOf = (t: Topic) => { const src = this.cmaps.get(t.path)?.src; return src ? parseMermaid(src) : null; };
        if (dimKey) {   // tab dimension: gốc = dimension, dưới là các bài của nó
          const dm = dims.find(x => x.key === dimKey); if (!dm) return;
          parse = mergeCurriculum(dm.title, [], dm.topics.map(t => ({ slug: t.slug, title: t.title, map: mapOf(t) })));
        } else parse = mergeCurriculum(domName(d), dims.map(x => ({ key: x.key, title: x.title })), d.topics.map(t => { const src = this.cmaps.get(t.path)?.src; return { slug: t.slug, title: t.title, dim: dims.find(x => x.topics.includes(t))?.key, map: src ? parseMermaid(src) : null }; }));
      } else { const src = this.cmaps.get(key)?.src; if (!src) return; parse = parseMermaid(src); }
      const ok = mountGraph(box, { parse, pathOf: (text, link) => (link ? mc.getFirstLinkpathDest(link, from)?.path : null) ?? lookupNote(ix, text),
        open: p => void this.app.workspace.openLinkText(p, "", true), go: slug => { const t = this.plugin.index.all.find(x => x.slug === slug); if (t) this.go({ screen: "topic", topic: t.slug, dom: t.dom, ttab: "notebook", sel: null }); } });
      if (!ok) setHtml(box.closest(".cm-scroll")!, `<div class="cm-err">${i("info", 14)}${tr("Không đọc được sơ đồ. Mở note để sửa hoặc nhờ {0} vẽ lại.", agentName(this.app))}</div>`);
    });
  }

  /* điện thoại: thanh tab dưới đáy thay cho nút trên thanh trên (port tabbar() của prototype) */
  private tabbar() {
    const b = (scr: string, ic: string, l: string) => `<button class="${this.S.screen === scr || (scr === "home" && this.S.screen === "topic") ? "on" : ""}" data-go="${scr}"><i class="q-tic">${i(ic)}</i>${l}</button>`;
    return `<nav class="tabbar q-tabbar">${b("overview", "grid", tr("Tổng quan"))}${b("home", "map", tr("Bản đồ"))}${b("review", "cards", tr("Ôn thẻ"))}${b("notebook", "book", tr("Sổ học"))}${b("settings", "gear", tr("Cài đặt"))}</nav>`;
  }

  private afterRender(fx: Fx[]) {
    const root = this.rootEl;
    window.requestAnimationFrame(() => root.querySelectorAll<SVGCircleElement>(".ring .fg").forEach(c => { c.style.strokeDashoffset = c.dataset.off || "0"; }));
    const sc = root.querySelector<HTMLElement>(".qscroll");
    if (sc) {   // giữ vị trí cuộn bản đồ; lần đầu thì cuộn tới bài kế tiếp
      const key = sc.dataset.qkey + this.frame;
      if (this.qSeen === key && this.qScroll[key] != null) sc.scrollTop = this.qScroll[key];
      else { const nx = sc.querySelector<HTMLElement>(".q-node.next"), row = nx?.closest<HTMLElement>(".q-row"), st = nx?.closest<HTMLElement>(".q-stage"); if (row && st) sc.scrollTop = Math.max(0, row.offsetTop + st.offsetTop - sc.clientHeight * 0.42); this.qScroll[key] = sc.scrollTop; }
      this.qSeen = key;
    } else this.qSeen = "";
    root.querySelectorAll<HTMLElement>(".q-occl").forEach(box => {   // ô che vùng ảnh: toạ độ pixel theo kích thước gốc của ảnh, hoặc phần trăm
      const [x, y, w, h, pct] = (box.dataset.region || "").split(",").map(Number), img = box.previousElementSibling as HTMLImageElement | null;
      const place = () => { const W = pct ? 100 : img?.naturalWidth || 0, H = pct ? 100 : img?.naturalHeight || 0; if (!W || !H) return;
        Object.assign(box.style, { left: x / W * 100 + "%", top: y / H * 100 + "%", width: w / W * 100 + "%", height: h / H * 100 + "%" }); };
      if (img && !img.complete) img.addEventListener("load", place, { once: true }); else place();
    });
    syncMascot(root);
    this.mountMaps();
    fx.forEach((f, k) => window.setTimeout(() => play(root, f), 120 + k * 900));
    this.mountToast();
  }

  /** Huy hiệu vừa mở trong phiên: thẻ bật lên + pháo giấy + Pie Bot mừng (tắt khi giảm chuyển động hoặc tắt trong Cài đặt).
      Thẻ sống ~3s và được gắn lại nếu màn vẽ lại giữa chừng (vd chấm thẻ kế tiếp). */
  private toast: { ids: string[]; until: number } | null = null;
  celebrate(ids: string[]) {
    if (!ids.length || !this.plugin.settings.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.toast = { ids, until: Date.now() + 3200 };
    const el = this.mountToast(); if (el) play(this.rootEl, { kind: "badge", el });
    window.setTimeout(() => { if (this.toast && Date.now() >= this.toast.until) { this.toast = null; this.rootEl?.querySelector(".bd-toast")?.remove(); } }, 3300);
  }
  private mountToast() {
    if (!this.toast || Date.now() >= this.toast.until) return null;
    const host = this.rootEl?.querySelector<HTMLElement>(".view"); if (!host) return null;
    host.querySelector(".bd-toast")?.remove();
    appendHtml(host, unlockToast(this.toast.ids));
    return host.lastElementChild;
  }
  /** Sổ huy hiệu đổi: chỉ vẽ lại khi đang ở màn Huy hiệu (để khỏi cắt chuyển động ở màn khác). */
  onBadges() { if (this.S.screen === "badges") this.render(); }

  private go(patch: Partial<View>) { if (patch.screen && patch.screen !== this.S.screen) this.undoSnap = null; Object.assign(this.S, patch); this.render(); }   // rời màn luyện: hết huỷ

  /* ── luyện tập ── */
  private exit() { this.undoSnap = null; if (this.lr && this.S.screen === "lecreq") { const b = this.lr.back; this.lr = null; return this.go({ screen: b }); } if (this.qn && this.S.screen === "quiznote") { this.qn = null; return this.go({ screen: this.back }); } if (this.er && this.S.screen === "essreq") { const b = this.er.back; this.er = null; return this.go({ screen: b }); } if (this.td) { this.td = this.rv = this.qz = this.ck = null; return this.go({ screen: "overview" }); } this.rv = this.qz = this.es = this.lc = null; this.go({ screen: ["review", "quiz", "essay", "lecture"].includes(this.back) ? "home" : this.back }); }

  /** Bài đang được học trên màn Pie Study (đường dẫn note) cho đồng hồ giờ học; null = không có bài nào đang làm. Giờ cộng cho bài của mục đang làm. */
  studyKey(): string | null {
    const sc = this.S.screen;
    if (sc === "review" || sc === "today") { const c = this.rv?.queue[this.rv.i]; if (c) return c.topic.path; }
    if (sc === "quiz" || sc === "today") { const z = this.qz; if (z) return (z.topic || z.topics[0])?.path ?? null; }
    if (sc === "essay" && this.es) return this.es.topic.path;
    if (sc === "lecture" && this.lc) return this.lc.topic.path;
    return null;
  }

  /* ── đợt 3: tự luận + bài giảng ── */
  private draftKey = (slug: string) => `pie-study-essay:${slug}`;
  startEssay(slug: string, given?: EssayPrompt) {
    const p = this.plugin, t = p.index.all.find(x => x.slug === slug); if (!t) return;
    const pr = given || essayPrompt(slug, p.quests, p.cards.get(t.path) || [], p.essayFor(t));
    if (!pr) { new Notice(tr("Bài này chưa có đề tự luận")); return; }
    const draft = this.app.loadLocalStorage(this.draftKey(slug));
    this.back = this.S.screen; this.es = { topic: t, p: pr, text: typeof draft === "string" ? draft : "", stage: "write" };
    this.go({ screen: "essay", topic: slug, more: false, sel: null });
  }
  /** Gõ bài: lưu nháp trên máy này, cập nhật số từ + nút nộp tại chỗ (không vẽ lại để giữ con trỏ). */
  private essayInput(v: string) {
    const e = this.es!; e.text = v; this.app.saveLocalStorage(this.draftKey(e.topic.slug), v || null);
    const w = this.rootEl.querySelector("[data-essay-words]"); if (w) w.textContent = tr("{0} từ", v.trim() ? v.trim().split(/\s+/).length : 0);
    const b = this.rootEl.querySelector<HTMLElement>("[data-essay-submit]");
    if (b) { const ok = essayReady(v); b.toggleAttribute("disabled", !ok); b.style.opacity = ok ? "" : ".45"; b.style.pointerEvents = ok ? "" : "none"; }
  }
  /** Nộp: gửi lệnh rồi báo "đã gửi" ngay — không chờ agent chạy xong (ask chỉ trả khi lượt của agent kết thúc), không khoá nút. */
  private essaySubmit() {
    const e = this.es; if (!e || !essayReady(e.text)) return;
    void ask(this.app, essayCmd(e.topic.slug, e.p, e.text));
    new Notice(tr("Đã gửi bài cho {0}", agentName(this.app)));
    this.app.saveLocalStorage(this.draftKey(e.topic.slug), null);
    e.stage = "sent"; e.revAtSend = e.topic.rev ?? ""; this.render();
  }
  /** Khung cho file bài giảng "chỉ chứa khối" (đợt 7b): CSS + font lấy từ mẫu đã build kèm plugin; đọc không được thì dùng CSS gói sẵn (không font). */
  private shellCss: string | null = null;
  private async noteText(path: string) { const f = this.app.vault.getAbstractFileByPath(path); return f instanceof TFile ? this.app.vault.cachedRead(f) : ""; }
  private async shellOpts(note: string): Promise<ShellOpts> {
    if (this.shellCss == null) this.shellCss = shellCssFrom(TEMPLATE_SRC);   // font đã nhúng lúc build (esbuild tpl-fonts)
    return { css: this.shellCss, note, libs: { d3: D3 }, L: {
      next: tr("Tiếp →"), done: tr("Xong"), ok: tr("Đúng."), wrong: tr("Chưa đúng."), tryAgain: tr("Thử lại."), deeperSent: tr("Đã đưa sang cột bên phải"),
      predictLabel: tr("Đoán trước"), predictDone: tr("Tôi đoán xong"), predictAfter: tr("Giờ thử trên mô hình rồi so với điều bạn vừa đoán."),
      brokenTitle: tr("Khối này bị lỗi nên không chạy được."), brokenBody: tr("Phần còn lại của bài vẫn dùng bình thường. Nhờ soạn lại khối này ở cột bên phải."),
      notGrounded: tr("Chưa bám note"), notGroundedBody: tr("Câu trích không có nguyên văn trong note. Đối chiếu với note trước khi tin mô hình.") } };
  }
  newLectureCmd = (t: Topic) => cmdNewLecture(t.slug, GUIDE_PATH, this.plugin.lectureDir());

  /** Đọc nền số khối của các bài (chỉ khi mở màn Bài giảng / trang bài), có cache theo mtime; không chạy lúc khởi động. Có thay đổi thì vẽ lại một lần. */
  private async loadLecStats(topics: Topic[]) {
    if (this.lecLoading) return; this.lecLoading = true; let changed = false;
    try {
      for (const t of topics) {
        const f = t.lectures.length ? this.lecFile(t) : undefined, nf = this.app.vault.getAbstractFileByPath(t.path); if (!f) continue;
        const key = `${f.path}:${f.stat.mtime}:${nf instanceof TFile ? nf.stat.mtime : 0}`;
        if (this.lecStats.get(t.slug)?.key === key) continue;
        try { this.lecStats.set(t.slug, { key, stat: lectureStat(await this.app.vault.cachedRead(f), await this.noteText(t.path)) }); changed = true; } catch (e) { console.error("[pie-study] không đọc được bài giảng", f.path, e); }
      }
    } finally { this.lecLoading = false; }
    if (changed) this.render();
  }
  private lecFile(t: Topic) {
    return t.lectures.map(l => this.app.metadataCache.getFirstLinkpathDest(l, t.path) || this.app.vault.getAbstractFileByPath(normalizePath(l)))
      .find((f): f is TFile => f instanceof TFile && /^html?$/i.test(f.extension));
  }
  /** Bài chưa có bài giảng: gửi lệnh (Free: chép lệnh) rồi chờ; file xuất hiện (render sau khi chỉ mục đổi) thì tự mở bài giảng. */
  private startLectureReq(slug: string) {
    const t = this.plugin.index.all.find(x => x.slug === slug); if (!t) return;
    const cmd = this.newLectureCmd(t), back = this.S.screen === "lecreq" ? "topic" : this.S.screen;
    void (agentReady(this.app) ? ask(this.app, cmd) : copyCommand(cmd));
    this.lr = { topic: t, sentAt: Date.now(), cmd, back };
    this.go({ screen: "lecreq", topic: slug, more: false, sel: null });
  }

  async startLecture(slug: string) {
    const p = this.plugin, t = p.index.all.find(x => x.slug === slug); if (!t) return;
    const file = this.lecFile(t);
    if (!file) { new Notice(tr("Không tìm thấy file bài giảng trong learn_lecture của bài này")); return; }
    const html = await this.app.vault.read(file), dark = activeDocument.body.classList.contains("theme-dark");
    this.back = this.S.screen; this.lcSeen = new Set();
    const blocks = lectureBlocks(html), note = await this.noteText(t.path);
    this.lc = { topic: t, path: file.path, doc: lectureDoc(html, dark ? "dark" : "light", await this.shellOpts(note)), log: [], blocks, at: blocks[0]?.id || null, deeper: [], grounded: groundedMap(blocks, note), bad: [] };
    this.go({ screen: "lecture", topic: slug, more: false, sel: null });
  }
  /** Chỉ nhận message từ CHÍNH iframe bài giảng đang mở và đúng khuôn (parseLecMsg); còn lại bỏ qua. Bài giảng là nội dung không tin cậy:
      at / deeper chỉ đổi cột phải (tiêu đề lấy từ file plugin tự đọc), KHÔNG message nào làm plugin gọi agent. Mỗi câu ghi nhật ký 1 lần / lần mở. */
  private onLectureMsg(e: MessageEvent) {
    const l = this.lc, fr = this.rootEl.querySelector<HTMLIFrameElement>("iframe[data-lecture]");
    if (!l || this.S.screen !== "lecture" || !fr || e.source !== fr.contentWindow) return;
    const m = parseLecMsg(e.data); if (!m) return;
    if (m.kind === "at" || m.kind === "answer") this.plugin.clock.activity(Date.now());   // thao tác trong bài giảng (iframe không phát phím / chuột ra ngoài)
    if (m.kind === "at") { if (l.at !== m.block && l.blocks.some(b => b.id === m.block)) { l.at = m.block; this.render(); } return; }
    if (m.kind === "deeper") { const nx = addDeeper(l.deeper, m.block, new Set(l.blocks.map(b => b.id))); if (nx !== l.deeper) { l.deeper = nx; this.render(); } return; }
    if (m.kind === "broken") { if (m.why) console.warn(`[pie-study] khối ${m.block} báo lỗi: ${m.why}`); const nx = markBroken(l.bad, m.block, l.blocks); if (nx !== l.bad) { l.bad = nx; this.render(); } return; }
    if (m.kind !== "answer" || (m.block && l.bad.includes(m.block))) return;   // khối đã báo lỗi: không ghi nhật ký
    l.log.push({ token: m.token, ok: m.ok }); if (l.log.length > 200) l.log.shift();
    const seen = m.block || m.token, blk = m.block ? l.blocks.find(b => b.id === m.block) : undefined;
    if (!this.lcSeen.has(seen)) {
      this.lcSeen.add(seen);
      const st = this.plugin.practice, log = recordAnswer(st.get(l.topic), m.token, m.ok);
      void st.write(l.topic, recordAttempt(log, { src: "lecture", key: lecAnswerKey(l.path, m), token: m.token, ok: m.ok, q: blk?.title || "", ref: l.path }, new Date())).then(() => void this.plugin.syncBadges(), () => {});
    }
    this.render();
  }
  /** Agent ghi lại file bài giảng (soạn lại khối): nạp lại và quay về đúng khối đang xem. */
  private async reloadLecture() {
    const l = this.lc; if (!l) return;
    const f = this.app.vault.getAbstractFileByPath(l.path); if (!(f instanceof TFile)) return;
    const html = await this.app.vault.read(f), dark = activeDocument.body.classList.contains("theme-dark"), blocks = lectureBlocks(html);
    if (this.lc !== l) return;
    const at = l.at && blocks.some(b => b.id === l.at) ? l.at : blocks[0]?.id || null;
    const note = await this.noteText(l.topic.path), doc = lectureDoc(html, dark ? "dark" : "light", await this.shellOpts(note)); if (this.lc !== l) return;
    Object.assign(l, { doc, blocks, at, grounded: groundedMap(blocks, note), bad: [], deeper: l.deeper.filter(id => blocks.some(b => b.id === id)) });
    this.lcShown = null; this.lcGoto = at; this.lcSeen = new Set();
    if (this.S.screen === "lecture") this.render();
  }

  /** Ôn thẻ: một bài (topic) hoặc cả lĩnh vực. Thẻ tới hạn trước, rồi thẻ mới trong hạn mức mỗi ngày. */
  startReview(scope: { topic?: string; dom?: string }) {
    const p = this.plugin, now = new Date(), day = now.toDateString();
    const topics = p.index.all.filter(t => scope.topic ? t.slug === scope.topic : t.dom === (scope.dom || this.S.dom));
    const usedNew = p.index.all.reduce((n, t) => n + Object.values(p.practice.get(t).cards).filter(c => c.reps === 1 && new Date(c.last).toDateString() === day).length, 0);
    let left = Math.max(0, p.settings.newPerDay - usedNew);
    const queue: RV["queue"] = [];
    for (const t of topics) { const q = dueQueue(p.practice.get(t), p.cards.get(t.path) || [], now, left); left -= q.filter(c => !p.practice.get(t).cards[cardKey(c.q)]).length; queue.push(...q.map(c => ({ ...c, topic: t }))); }
    this.back = this.S.screen; this.qz = null;
    if (!queue.length) { this.rv = null; return this.go({ screen: "review", more: false, sel: null }); }   // không có thẻ → màn danh sách bài tới hạn (giao agent)
    const t1 = scope.topic ? topics[0] : null;
    this.rv = { queue, i: 0, flip: false, done: [], title: t1 ? tr("Ôn thẻ · {0}", t1.title) : tr("Ôn thẻ · {0}", domName(p.index.domains.find(d => d.id === (scope.dom || this.S.dom)))) };
    this.go({ screen: "review", more: false, sel: null });
  }

  private flip() { const r = this.rv; if (!r || r.i >= r.queue.length || r.flip || r.conf == null) return; const c = r.queue[r.i]; r.flip = true; r.previews = previewIntervals(this.plugin.practice.get(c.topic), c, new Date(), this.plugin.retentionOf(c.topic)).map(x => fmtGap(x.ms)); this.render(); }

  /** Huỷ lượt chấm vừa rồi: đợi lần ghi xong, ghi trả nhật ký (và 2 trường frontmatter nếu lượt kiểm đã đổi), lùi về câu đó để làm lại. */
  private async doUndo() {
    const u = this.undoSnap; if (!u || this.undoing) return; this.undoSnap = null; this.undoing = true;
    u.back(); this.render();   // lùi màn ngay; chấm câu mới bị chặn tới khi ghi trả xong
    try {
      await u.wrote;
      for (const { t, log } of u.logs) await this.plugin.practice.write(t, undoGrade(this.plugin.practice.get(t), log, u.at));
      const f = u.fm && this.app.vault.getAbstractFileByPath(u.fm.t.path);
      if (u.fm && f instanceof TFile) { const { pend, und } = u.fm;
        await this.app.fileManager.processFrontMatter(f, (fm: Record<string, unknown>) => { for (const [k, x] of [["learn_pending", pend], ["learn_understood", und]] as const) { if (x === undefined) delete fm[k]; else fm[k] = x; } }); }
    } catch (e) { console.error("[pie-study] huỷ lượt chấm lỗi", e); new Notice(tr("Không huỷ được lượt chấm: {0}", String(e))); }
    finally { this.undoing = false; void this.plugin.syncBadges(); this.render(); }
  }


  private async rate(k: number) {
    const r = this.rv; if (!r || !r.flip || r.i >= r.queue.length || this.undoing) return;
    const c = r.queue[r.i], st = this.plugin.practice, conf = r.conf, d = this.td && this.S.screen === "today" ? this.td : null;
    const back = d ? () => { d.i--; d.res.length = d.i; this.tdPrep(); } : () => { r.i--; r.done.pop(); r.flip = false; r.conf = undefined; };
    r.done.push(k); r.i++; r.flip = false; r.conf = undefined;   // sang thẻ kế TRƯỚC khi ghi: bấm 2 lần nhanh không chấm 1 thẻ 2 lần
    if (d) { d.res[d.i] = k >= 1; d.i++; this.tdPrep(); }
    const prev = st.get(c.topic), now = new Date();
    const wrote = st.write(c.topic, recordAttempt(recordCard(st.get(c.topic), c, (k + 1) as Grade, now, this.plugin.retentionOf(c.topic)), { src: "card", key: cardKey(c.q), token: c.token, ok: k >= 1, conf, rating: k + 1 }, now));
    this.undoSnap = { wrote, at: now, logs: [{ t: c.topic, log: prev }], back }; this.render();
    await wrote;
    if (r.i >= r.queue.length) { r.sure = sureWrong(st.all()); this.render(); }
    void this.plugin.syncBadges();
  }

  /* ── Gắn / gỡ học liệu (17/11): plugin ghi đúng trường learn_materials khi người dùng bấm ── */
  private maTopic() { return this.plugin.index.all.find(t => t.slug === this.ma?.slug); }
  private maDomain() { return this.plugin.index.domains.find(d => d.id === this.ma?.dom); }
  /** File đích: note bài hoặc file curriculum-* của lộ trình. */
  private maFile(): TFile | null { const ma = this.ma; if (!ma) return null; const p = ma.scope === "dom" ? this.maDomain()?.curPath : this.maTopic()?.path; const f = p ? this.app.vault.getAbstractFileByPath(p) : null; return f instanceof TFile ? f : null; }
  private maFiles() {
    const skip = [this.plugin.settings.stateDir, this.plugin.quizDir(), this.app.vault.configDir].map(x => normalizePath(x) + "/");
    return pickMaterialFiles(this.app.vault.getFiles().map(f => ({ path: f.path, ext: f.extension.toLowerCase(), title: f.basename, mtime: f.stat.mtime })), this.ma?.q || "", this.ma?.kind || "", skip);
  }
  /** Các file đã gắn ở đích (so theo đích resolve) để mờ + "Đã gắn". */
  private maHave() {
    const f = this.maFile(), ma = this.ma; if (!f || !ma) return new Set<string>();
    const links = ma.scope === "dom" ? this.maDomain()?.materials : this.maTopic()?.materials;
    return new Set((links || []).map(l => this.app.metadataCache.getFirstLinkpathDest(l, f.path)?.path).filter((x): x is string => !!x));
  }
  private maHost(C: Ctx) {
    const ma = this.ma!, d = this.maDomain(), f = this.maFile();
    return `<div class="qd" style="display:contents">${matModal(C, ma, this.maFiles(), this.maHave(), f?.path || (ma.scope === "dom" ? `curriculum-${ma.dom}.md` : `${ma.slug}.md`), !!d?.curPath, this.S.screen === "topic")}</div>`;
  }
  private maClick(d: DOMStringMap) {
    if (d.mtrm != null) return void this.mtRemove(d);
    if (d.mtadd) { this.ma = { scope: d.mtadd as MA["scope"], slug: this.S.topic, dom: this.S.dom, q: "", kind: "", sel: [] }; return this.render(); }
    const ma = this.ma; if (!ma) return;
    if ("mtclose" in d) { this.ma = null; return this.render(); }
    if (d.mtscope) { ma.scope = d.mtscope as MA["scope"]; ma.sel = []; return this.render(); }
    if (d.mtkind != null) { ma.kind = d.mtkind as MA["kind"]; return this.render(); }
    if (d.mtf) { ma.sel = ma.sel.includes(d.mtf) ? ma.sel.filter(x => x !== d.mtf) : [...ma.sel, d.mtf]; return this.render(); }
    if ("mtok" in d) return void this.mtSubmit();
  }
  private async mtSubmit() {
    const ma = this.ma, f = this.maFile(); if (!ma || !ma.sel.length) return;
    if (!f) { new Notice(tr("Không tìm thấy file để ghi học liệu.")); return; }
    const sel = [...ma.sel], res = (l: string) => this.app.metadataCache.getFirstLinkpathDest(linkTarget(l) ?? l, f.path)?.path ?? null;
    try {
      await this.app.fileManager.processFrontMatter(f, fm => { fm.learn_materials = appendMaterials(fm.learn_materials, sel, res); });   // chỉ đúng trường này
      this.ma = null; new Notice(tr("Đã gắn {0} học liệu", sel.length)); this.render();
    } catch (e) { console.error("[pie-study] không ghi được learn_materials", f.path, e); new Notice(tr("Không ghi được học liệu: {0}", String(e))); }
  }
  /** Nút × trên thẻ: bỏ đúng phần tử khỏi learn_materials của bài hoặc của file lộ trình (khớp theo đích resolve). File học liệu vẫn còn trong vault. */
  private async mtRemove(d: DOMStringMap) {
    const [scope, key] = (d.mtown || "").split(/:(.*)/s), idx = this.plugin.index;
    const p = scope === "dom" ? idx.domains.find(x => x.id === key)?.curPath : idx.all.find(t => t.slug === key)?.path, f = p ? this.app.vault.getAbstractFileByPath(p) : null;
    if (!(f instanceof TFile)) { new Notice(tr("Không tìm thấy file để ghi học liệu.")); return; }
    const res = (l: string) => this.app.metadataCache.getFirstLinkpathDest(linkTarget(l) ?? l, f.path)?.path ?? null;
    try {
      await this.app.fileManager.processFrontMatter(f, fm => { fm.learn_materials = removeMaterial(fm.learn_materials, d.mtpath || null, d.mtrm || "", res); });
      new Notice(tr("Đã gỡ khỏi danh sách · file vẫn còn trong vault")); this.render();
    } catch (e) { console.error("[pie-study] không ghi được learn_materials", f.path, e); new Notice(tr("Không ghi được học liệu: {0}", String(e))); }
  }

  /* ── đợt 8a: hộp Thêm nguồn ── */
  /** File .md / .pdf / .epub có trong vault để chọn (bỏ nhật ký và quiz của chính plugin), lọc theo ô tìm. */
  private nsFiles(): { files: VFile[]; total: number } {
    const skip = [this.plugin.settings.stateDir, this.plugin.quizDir(), this.app.vault.configDir].map(x => normalizePath(x) + "/");
    return pickFiles(this.app.vault.getFiles().map(f => ({ path: f.path, ext: f.extension.toLowerCase(), title: f.basename, mtime: f.stat.mtime })), this.ns?.q || "", skip);
  }
  private nsHost(C: Ctx) { return `<div class="qd" style="display:contents">${nsModal(C, this.ns!, this.nsFiles())}</div>`; }
  private nsClick(d: DOMStringMap) {
    if ("addsrc" in d) {
      this.ns = nsFromTrigger(d.addsrc);
      if (d.addkind === "file" || d.addkind === "web" || d.addkind === "notebooklm") this.ns.kind = d.addkind;
      const view = this.rootEl.querySelector(".view"), C = this.ctx();
      if (view && C.agentReady) { appendHtml(view, this.nsHost(C)); return; }   // mở hộp không vẽ lại cả màn
      return this.render();
    }
    const ns = this.ns; if (!ns) return;
    if ("nsclose" in d) { this.ns = null; return this.render(); }
    if (d.nskind) { ns.kind = d.nskind as NS["kind"]; ns.err = undefined; ns.name = ""; return this.render(); }
    if (d.nspath) { ns.paths = ns.paths.includes(d.nspath) ? ns.paths.filter(x => x !== d.nspath) : [...ns.paths, d.nspath]; return this.render(); }
    if (d.nsf) { const f = this.app.vault.getAbstractFileByPath(d.nsf); if (f instanceof TFile) this.nsPick({ path: f.path, name: f.name, ext: f.extension.toLowerCase(), title: f.basename }); return; }
    if ("nsdrop" in d) { this.rootEl.querySelector<HTMLInputElement>("[data-nsfile]")?.click(); return; }
    if ("nsadd" in d) return void this.nsSubmit();
  }
  /** Chọn file → đọc nhanh xem plugin tự làm được gì (mục lục từ tiêu đề / mục lục nhúng PDF), hiện ngay trong hộp. */
  private nsPick(f: NSFile) {
    const ns = this.ns; if (!ns) return; ns.file = { ...f, info: "loading" }; ns.name = ""; ns.err = undefined; this.render();
    void inspectFile(this.app, f).then(info => { if (this.ns === ns && ns.file?.name === f.name && ns.file.path === f.path) { ns.file = { ...ns.file, info }; this.render(); } });
  }
  /** File kéo thả / chọn từ máy: đọc nội dung vào bộ nhớ, chỉ chép vào Pie Study/nguon/ khi bấm "Thêm vào kho". */
  private async nsTake(file: File) {
    const ns = this.ns; if (!ns) return; const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
    if (!["md", "pdf", "epub"].includes(ext)) { ns.err = tr("Chỉ nhận file .md, .pdf, .epub."); ns.drag = false; return this.render(); }
    this.nsPick({ path: null, name: file.name, ext, title: file.name.replace(/\.[^.]+$/, ""), bytes: await file.arrayBuffer() });
  }
  private nsDrag(e: DragEvent) {
    const z = (e.target as HTMLElement).closest?.("[data-nsdrop]"); if (!this.ns || !z) return;
    e.preventDefault();
    if (e.type === "drop") { const f = e.dataTransfer?.files?.[0]; this.ns.drag = false; if (f) void this.nsTake(f); else this.render(); return; }
    const on = e.type === "dragover"; if (this.ns.drag !== on) { this.ns.drag = on; z.classList.toggle("on", on); }
  }
  /** Gõ không vẽ lại cả hộp (giữ con trỏ); chỉ vẽ lại khi nút "Thêm vào kho" đổi trạng thái. */
  private nsInput(t: HTMLInputElement) {
    const ns = this.ns!, was = nsReady(ns);
    if (t.matches("[data-nsq]")) { ns.q = t.value; const box = this.rootEl.querySelector(".ns-files"); if (box) { const r = this.nsFiles(); setHtml(box, nsFilesHtml(ns, r.files, r.total)); } return; }   // chỉ vẽ lại danh sách, không vẽ lại cả màn
    if (t.matches("[data-nslink]")) ns.link = t.value; else if (t.matches("[data-nsnb]")) ns.nb = t.value; else ns.name = t.value;
    if (was !== nsReady(ns)) { const pos = t.selectionStart ?? t.value.length, sel = t.matches("[data-nslink]") ? "[data-nslink]" : t.matches("[data-nsnb]") ? "[data-nsnb]" : "[data-nsname]"; this.render(); const n = this.rootEl.querySelector<HTMLInputElement>(sel); n?.focus(); n?.setSelectionRange(pos, pos); }
    else this.rootEl.querySelector<HTMLButtonElement>("[data-nsadd]")?.toggleAttribute("disabled", !nsReady(ns));
  }
  private async nsSubmit() {
    const ns = this.ns; if (!ns || !nsReady(ns)) return;
    ns.busy = true; ns.err = undefined; this.render();
    try {
      const fresh = await loadLibrary(this.app);   // đọc lại ngay trước khi ghi: agent có thể vừa sửa kho
      if (!fresh.ok) throw new Error(tr("Kho nguồn không đọc được. Mở màn Kho nguồn để tạo lại."));
      const now = new Date(), title = nsName(ns);
      const r = ns.kind === "file"
        ? await addVaultSource(this.app, fresh.lib, { path: ns.file!.path || await writeDropped(this.app, ns.file!.name, ns.file!.bytes!), title, paths: ns.paths }, now)
        : addRemoteSource(fresh.lib, { kind: ns.kind, ref: ns.kind === "web" ? ns.link : ns.nb, title, paths: ns.paths }, now);
      await saveLibrary(this.app, r.lib); await this.plugin.loadLib();
      this.ns = null; this.S.libSel = r.id; this.S.libTab = "all";
      new Notice(r.status === "ready" ? tr("Đã thêm vào kho") : tr("Đã thêm vào kho · chờ {0} rút mục lục", agentName(this.app)));
    } catch (e) { console.error("[pie-study] không thêm được nguồn", e); ns.busy = false; ns.err = e instanceof Error ? e.message : String(e); }
    this.render();
  }

  /* ── 7.9: nhờ agent ra đề tự luận ── */
  /** Gửi lệnh ra đề (Free: chép lệnh) rồi chờ file đề; agent ghi đè file cũ thì chỉ nhận bản ghi SAU lúc gửi. */
  startEssayReq(notePath: string) {
    const p = this.plugin, note = p.topicFor(notePath); if (!note) return;
    const path = normalizePath(essayPath(p.quizDir(), notePath.split("/").pop()!.replace(/\.md$/, ""))), cmd = essayReqCmd(note.slug, path);
    const back = this.er?.back || (this.S.screen === "essreq" ? "topic" : this.S.screen);
    void (agentReady(this.app) ? ask(this.app, cmd) : copyCommand(cmd));
    this.er = { note, path, stage: "wait", sentAt: Date.now(), cmd, back };
    this.go({ screen: "essreq", topic: note.slug, more: false, sel: null });
  }
  private async erVet() {
    const r = this.er; if (!r) return;
    let v: Awaited<ReturnType<typeof this.plugin.vetEssayFile>> = null;
    try { v = await this.plugin.vetEssayFile(r.path); } catch (e) { console.error("[pie-study] không đọc được đề tự luận", r.path, e); }
    if (this.er !== r) return;
    r.vet = v?.vet || { prompt: null, why: "broken" }; r.stage = r.vet.prompt ? "ready" : "bad";
    this.go({ screen: "essreq" });
  }
  /** Quiz nhanh đã có (7.9, menu Thêm): mở thẳng màn sẵn sàng. */
  private openQuick(notePath: string) {
    const p = this.plugin, note = p.topicFor(notePath); if (!note) return;
    const path = normalizePath(quizPath(p.quizDir(), notePath.split("/").pop()!.replace(/\.md$/, "")));
    if (this.S.screen !== "quiznote") this.back = this.S.screen;
    this.rv = this.qz = this.td = null;
    this.qn = { note, path, stage: "exists", sentAt: 0, cmd: quizCmd(note.slug, path), easier: false };
    this.S.more = false; void this.qnVet();
  }

  /* ── đợt 6: quiz note ── */
  /** Từ lệnh "Quiz note đang mở", nút "Quiz nhanh" ở trang bài học, hoặc "Luyện thêm bộ dễ hơn" (easier = token sai). */
  startQuizNote(notePath: string, easier?: string[]) {
    const p = this.plugin, note = p.topicFor(notePath); if (!note) return;
    const path = normalizePath(quizPath(p.quizDir(), notePath.split("/").pop()!.replace(/\.md$/, "")));
    if (this.S.screen !== "quiznote" && !["quiz", "today"].includes(this.S.screen)) this.back = this.S.screen;
    this.rv = this.qz = this.td = null;
    this.qn = { note, path, stage: "exists", sentAt: 0, cmd: quizCmd(note.slug, path, easier), easier: !!easier?.length };
    if (easier?.length || !this.app.vault.getAbstractFileByPath(path)) return this.qnSend();
    this.go({ screen: "quiznote", more: false, sel: null });
  }
  /** Gửi lệnh cho agent (Free: chép lệnh) rồi chờ file; agent ghi đè file cũ thì chỉ nhận bản ghi SAU lúc gửi. */
  private qnSend() {
    const q = this.qn; if (!q) return;
    const cmd = q.cmd + dropNote(q.vet?.rows || []);   // soạn lại: kèm câu bị loại và lý do để agent không lặp lỗi
    void (agentReady(this.app) ? ask(this.app, cmd) : copyCommand(cmd));
    Object.assign(q, { stage: "wait", sentAt: Date.now(), vet: undefined });
    this.go({ screen: "quiznote", more: false, sel: null });
  }
  private async qnVet() {
    const q = this.qn; if (!q) return;
    let r: Awaited<ReturnType<typeof this.plugin.vetQuizFile>> = null;
    try { r = await this.plugin.vetQuizFile(q.path); } catch (e) { console.error("[pie-study] không đọc được quiz", q.path, e); }
    if (this.qn !== q) return;
    q.vet = r?.vet || { items: [], rows: [], broken: true }; q.stage = q.vet.items.length ? "ready" : "empty";
    this.go({ screen: "quiznote" });
  }
  private qnStart() {
    const q = this.qn; if (!q?.vet?.items.length) return;
    const z: QZ = { key: `${q.path}/quiz`, title: tr("Quiz nhanh · {0}", q.note.title), topic: q.note, topics: [q.note], items: q.vet.items, i: 0, res: [], st: {}, input: "", start: 0, phase: "ask", bet: 0,
      coins: 100, selLeft: null, shuf: [], wrongAt: null, html: {}, img: this.imgOf(q.path) };
    freshItem(z); this.qn = null; this.qz = z;
    this.go({ screen: "quiz", topic: q.note.slug, more: false, sel: null });
  }

  /* ── đợt 4: phiên hôm nay ── */
  private dueCards(now: Date) {
    const p = this.plugin, out: { topic: Topic; card: RvCard; recall: number }[] = [];
    for (const t of p.index.all) {
      const cs = p.cards.get(t.path); if (!cs?.length || !p.practice.has(t)) continue;
      const log = p.practice.get(t);
      for (const c of cs) { const k = cardKey(c.q), s = log.cards[k]; if (s && new Date(s.due) <= now) out.push({ topic: t, card: { ...c, topic: t }, recall: cardRecall(log, k, now) }); }
    }
    return out;
  }
  /** "all": câu sai làm lại được + thẻ tới hạn, trong trần sessionCap trừ mục đã làm hôm nay. "miss" (từ màn Lỗi sai): chỉ câu sai, không trần. */
  private queueOf(mode: "all" | "miss", mk = this.ctx().mk) {
    const now = new Date(), p = this.plugin;
    return mode === "miss" ? todayQueue(mk, [] as { topic: Topic; card: RvCard; recall: number }[], Infinity, 0)
      : todayQueue(mk, this.dueCards(now), p.settings.sessionCap, doneToday(p.practice.all(), now), dueChecks(p.checks, t => p.practice.get(t), todayStr(now), t => p.retentionOf(t)));
  }
  /** Nhịp học: thẻ tới hạn của mọi nhật ký + bài tới hạn (learn_next) cho 14 ngày tới; days của mọi bài cho 12 tuần qua. */
  private rhythm() {
    const logs = this.plugin.practice.all(), today = todayStr(new Date()), days: Record<string, number> = {};
    for (const l of logs) for (const [d, n] of Object.entries(l.days || {})) days[d] = (days[d] || 0) + n;
    const s = streaks(Object.keys(days), today);
    return { f: forecast(logs.flatMap(l => Object.values(l.cards).map(c => c.due)), this.plugin.index.all, today), h: history(days, today), now: s.now, best: s.best };
  }
  private todayInfo(mk: Ctx["mk"]): TodayInfo {
    const now = new Date(), logs = this.plugin.practice.all(), q = this.queueOf("all", mk), miss = q.items.filter(x => x.kind === "miss").length, checks = q.items.filter(x => x.kind === "check").length;
    return { n: q.items.length, miss, checks, cards: q.items.length - miss - checks, later: q.later, done: doneToday(logs, now), streak: streakNow(logs, now) };
  }
  startToday(mode: "all" | "miss") {
    const q = this.queueOf(mode);
    this.back = this.S.screen; this.es = this.lc = null;
    this.td = { items: q.items, i: 0, res: [], mode };
    this.tdPrep();
    this.go({ screen: "today", more: false, sel: null });
  }
  /** Dựng màn cho mục đang tới: thẻ → một phiên ôn 1 thẻ; câu sai → một quest 1 câu (dùng lại màn luyện tập sẵn có). */
  private tdPrep() {
    const d = this.td!, it = d.items[d.i]; this.rv = this.qz = this.ck = null; if (!it) return;
    if (it.kind === "check") {
      if (it.item.kind === "essay") { this.ck = { text: "", shown: false, ticks: [] }; return; }
      const z: QZ = { key: checkKey(it.item), title: tdTitle(d.mode), topic: it.topic, topics: [it.topic], items: [toQItem(it.item)], i: 0, res: [], st: {}, input: "", start: 0, phase: "ask", bet: 0,
        coins: 100, selLeft: null, shuf: [], wrongAt: null, html: {}, img: () => "" };
      freshItem(z); this.qz = z; return;
    }
    if (it.kind === "card") { this.rv = { queue: [it.card], i: 0, flip: false, done: [], title: tdTitle(d.mode) }; return; }
    const r = it.row, qp = [...this.plugin.quests, ...this.plugin.quizQuests()].find(q => r.m.ref.startsWith((q.uid || q.path) + "/"))?.path || "";
    const z: QZ = { key: r.m.ref, title: tdTitle(d.mode), topic: r.topic, topics: [r.topic], items: [r.item!], i: 0, res: [], st: {}, input: "", start: 0, phase: "ask", bet: 0,
      coins: r.item!.coins || 100, selLeft: null, shuf: [], wrongAt: null, html: {}, img: this.imgOf(qp) };
    freshItem(z); this.qz = z; this.loadHtml(z);
  }
  private todayHtml(C: Ctx) {
    const d = this.td!, n = d.items.length, top = focusTop(tdTitle(d.mode), d.i, n, !!this.undoSnap);
    if (d.i >= n) {
      const logs = this.plugin.practice.all(), old = C.idx.due[0], nx = nextUp(C);
      return tdDone(C, top, { n, cards: d.items.filter(x => x.kind === "card").length, cleared: d.items.filter((x, k) => x.kind === "miss" && d.res[k]).length,
        still: C.mk.filter(r => r.m.status === "open" && !r.gone).length, streak: streakNow(logs, new Date()), mode: d.mode, old, next: nx?.nx, oldDays: old ? overdueDaysT(old, C.today) : 0, nextDom: nx ? domName(nx.d) : "" },
        old ? cmdReview(old) : "", nx?.nx ? cmdLearn(nx.nx) : "");
    }
    const nChk = d.items.filter(x => x.kind === "check").length, it = d.items[d.i];
    if (it.kind === "check") { const ph = tdCheckPhase(d.i + 1, nChk); return it.item.kind === "essay" ? checkEssayScreen(top, ph, it.item, this.ck!) : quizScreen(C, this.qz!, { top, phase: ph }); }
    const nMiss = d.items.filter(x => x.kind === "miss").length, miss = it.kind === "miss";
    const phase = tdPhase(miss, miss ? d.i - nChk + 1 : d.i - nChk - nMiss + 1, miss ? nMiss : n - nChk - nMiss);
    return miss ? quizScreen(C, this.qz!, { top, phase, fate: tdFate, pill: tdAtt(it.row) }) : practiceReview(C, this.rv!, { top, phase });
  }
  /** Câu sai làm lại: sang mục kế TRƯỚC khi ghi (bấm đôi không ghi 2 dòng), rồi ghi lượt + áp luật gỡ/mở lại của sổ. */
  private async tdNext() {
    const d = this.td; if (!d || this.undoing) return;
    if (d.items[d.i]?.kind === "check") return this.ckNext();
    const z = this.qz; if (!z) return; const v = verdict(z); if (v == null) return;
    const it = d.items[d.i]; if (it?.kind !== "miss") return;
    d.res[d.i] = v; d.i++; this.tdPrep();
    const r = it.row, st = this.plugin.practice, q = r.item!;
    let log = st.get(r.topic); const prev = log, at = new Date(); if (q.token) log = recordAnswer(log, q.token, v);
    const wrote = st.write(r.topic, recordAttempt(log, { src: "quest", key: r.key, token: q.token, ok: v, conf: z.conf, q: itemText(q), ref: r.m.ref }, at));
    this.undoSnap = { wrote, at, logs: [{ t: r.topic, log: prev }], back: () => { d.i--; d.res.length = d.i; this.tdPrep(); } }; this.render();
    await wrote; void this.plugin.syncBadges(); this.render();
  }
  /** Đợt 9: chốt câu kiểm (choice/short qua màn quiz, essay qua tick ý), sang mục kế trước khi ghi, rồi ghi lượt theo token. Ghi 2 trường learn_pending / learn_understood (spec 7.13 mục 7-9). */
  private async ckNext() {
    const d = this.td!, it = d.items[d.i]; if (it?.kind !== "check") return;
    const c = it.item, v = c.kind === "essay" ? (this.ck?.shown ? gradeEssay(this.ck.ticks, c.points || []) : null) : this.qz ? verdict(this.qz) : null; if (v == null) return;
    const conf = c.kind === "essay" ? undefined : this.qz?.conf;   // choice/short đi qua màn quiz nên có hỏi độ tự tin; essay không
    d.res[d.i] = v; d.i++; this.tdPrep();
    const st = this.plugin.practice, prev = st.get(it.topic), now = new Date();
    const snap: UndoSnap = { wrote: Promise.resolve(), at: now, logs: [{ t: it.topic, log: prev }], back: () => { d.i--; d.res.length = d.i; this.tdPrep(); } };
    const f = this.app.vault.getAbstractFileByPath(it.topic.path);
    snap.wrote = (async () => {
      await st.write(it.topic, recordCheck(recordAttempt(recordAnswer(prev, c.token, v), { src: "check", key: checkKey(c), token: c.token, ok: v, conf }, now), checkKey(c), v, now, this.plugin.retentionOf(it.topic)));
      if (f instanceof TFile) await this.app.fileManager.processFrontMatter(f, (fm: Record<string, unknown>) => {   // chỉ đúng 2 trường learn_pending / learn_understood; không ở pending → không ghi
        const r = applyCheck(fm, c.token, v); if (r) { snap.fm = { t: it.topic, pend: fm.learn_pending, und: fm.learn_understood }; Object.assign(fm, r); }
      });
    })();
    this.undoSnap = snap; this.render();
    await snap.wrote; void this.plugin.syncBadges(); this.render();
  }
  private imgOf(questPath: string) {
    return (path: string) => { const f = this.app.metadataCache.getFirstLinkpathDest(path, questPath) || this.app.vault.getAbstractFileByPath(path); return f instanceof TFile ? this.app.vault.getResourcePath(f) : ""; };
  }
  private loadHtml(z: QZ) {
    void Promise.all(z.items.filter(q => q.html).map(async q => { try { z.html[q.html!] = await this.app.vault.adapter.read(q.html!); } catch { /* báo trong màn */ } })).then(() => this.render());
  }

  /** Quest: node ứng với bài, hoặc trận boss của một nhóm (slugs). */
  startQuest(opt: { topic?: string; boss?: string[] }) {
    const p = this.plugin, t = opt.topic ? p.index.all.find(x => x.slug === opt.topic) : undefined;
    let hit: { quest: Quest; node: QNode } | null = null;
    if (opt.boss) hit = bossFor(p.quests, opt.boss);
    else if (t) for (const q of p.quests.filter(x => x.topics.includes(t.slug))) { const n = nodeForTopic(q, t); if (n) { hit = { quest: q, node: n }; break; } }
    if (!hit) return;
    const topics = opt.boss ? hit.quest.topics.map(s => p.index.all.find(x => x.slug === s)).filter((x): x is Topic => !!x) : [t!];
    this.back = this.S.screen; this.rv = null;
    const z: QZ = { key: questKey(hit.quest, hit.node), title: tr("Quest · {0}", hit.node.title), topic: t, topics, items: hit.node.items, i: 0, res: [],
      st: {}, input: "", start: 0, phase: "ask", bet: 0, coins: hit.node.items.find(x => x.coins)?.coins || 100, selLeft: null, shuf: [], wrongAt: null, html: {},
      img: this.imgOf(hit.quest.path) };
    freshItem(z); this.qz = z; this.loadHtml(z);
    this.go({ screen: "quiz", more: false, sel: null });
  }
  questFor = (slug: string) => this.plugin.quests.some(q => q.topics.includes(slug) && q.nodes.some(n => !n.boss && n.items.length));

  private async next() {
    if (this.td && this.S.screen === "today") return this.tdNext();
    const z = this.qz; if (!z || this.undoing) return; const v = verdict(z); if (v == null) return;
    const coins = z.coins, st = this.plugin.practice, prev = z.topics.map(t => ({ t, log: st.get(t) }));
    z.res.push(v); (z.picks ||= []).push({ ...z.st, input: z.input }); (z.confs ||= [])[z.i] = z.conf;
    if (z.items[z.i].type === "auction") z.coins = Math.max(0, z.coins + (v ? z.bet : -z.bet)); z.i++; freshItem(z);
    const snap: UndoSnap = { wrote: Promise.resolve(), at: new Date(), logs: [], back: () => { z.i--; z.res.pop(); z.picks?.pop(); z.coins = coins; freshItem(z); } };
    this.undoSnap = snap;
    if (z.i >= z.items.length) {   // xong node: ghi kết quả theo token vào nhật ký các bài liên quan
      const graded = z.items.map((q, k) => ({ q, ok: z.res[k], conf: z.confs?.[k] })).filter(x => !isEssay(x.q));   // câu tự luận: trung tính, không tính là sai, không vào sổ
      const results = graded.map(x => ({ token: x.q.token, ok: x.ok }));
      const now = new Date(), main = z.topic || z.topics[0];   // từng lượt + sổ lỗi sai ghi vào bài chính (boss nhiều bài: bài đầu), để sổ không lặp
      const withAttempts = (log: PracticeLog) => graded.reduce((l, { q, ok, conf }) => recordAttempt(l, { src: "quest", key: questItemKey(itemText(q)), token: q.token, ok, conf, assisted: z.redo, q: itemText(q), ref: z.key }, now), log);
      snap.logs = prev; snap.at = now;   // nhật ký chỉ ghi khi xong node: huỷ lúc này mới phải trả lại nhật ký
      snap.wrote = (async () => { for (const t of z.topics) { const log = recordQuest(st.get(t), z.key, results, now); await st.write(t, t === main ? withAttempts(log) : log); } })();
      await snap.wrote; void this.plugin.syncBadges();
    }
    this.render();
  }

  private onKey(e: KeyboardEvent) {
    if (!this.rootEl?.isConnected || !this.containerEl.isShown()) return;
    if (e.key === "Escape") { if (this.ns) { this.ns = null; return this.render(); } if (this.S.more) return this.go({ more: false }); if (this.S.screen === "badges" && this.S.badge) return this.go({ badge: "" }); if ((this.qn && this.S.screen === "quiznote") || (this.er && this.S.screen === "essreq") || this.td || this.rv || this.qz || this.es || this.lc) return this.exit(); }
    if ((e.target as HTMLElement).closest?.("input,textarea,select,[contenteditable]")) { if (e.key === "Enter" && this.qz && (e.target as HTMLElement).matches("[data-qz-input]")) {
      const boxes = [...this.rootEl.querySelectorAll<HTMLInputElement>("[data-qz-input]")], k = boxes.indexOf(e.target as HTMLInputElement);
      if (k >= 0 && k < boxes.length - 1) { e.preventDefault(); boxes[k + 1].focus(); } else this.check();   // nhiều chỗ trống: Enter sang ô kế, ô cuối mới nộp
    } return; }
    if (this.undoSnap && ["review", "quiz", "today"].includes(this.S.screen) && e.key.toLowerCase() === "z" && !e.altKey && !e.shiftKey) { e.preventDefault(); return void this.doUndo(); }   // Z hoặc Ctrl/Cmd+Z: huỷ lượt chấm vừa rồi
    const conf = e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 ? -1 : CONF_KEYS.indexOf(e.key.toLowerCase());
    if ((this.S.screen === "quiz" || this.S.screen === "today") && this.qz && conf >= 0 && needConf(this.qz)) return this.pickConf(conf);
    if ((this.S.screen === "review" || this.S.screen === "today") && this.rv) {
      if (e.key === " ") { e.preventDefault(); this.flip(); }
      else if (!this.rv.flip && conf >= 0) this.pickConf(conf);
      else if ("1234".includes(e.key) && e.key.length === 1) void this.rate(+e.key - 1);
    }
    if ((this.S.screen === "quiz" || this.S.screen === "today") && this.qz && e.key === "Enter" && verdict(this.qz) != null) void this.next();
  }
  /** Đợt 9: chọn 1 trong 3 mức tự tin (thẻ: trước khi lật; quest: trước khi hiện phương án, đồng hồ bắt đầu từ đây). */
  private pickConf(k: number) {
    if (this.rv && !this.rv.flip) this.rv.conf = k;
    else if (this.qz && needConf(this.qz)) { this.qz.conf = k; this.qz.start = Date.now(); }
    else return;
    this.render();
  }
  private check() {
    const z = this.qz; if (!z || z.st.checked != null) return;
    const it = this.S.screen === "today" ? this.td?.items[this.td.i] : undefined;
    z.st.checked = it?.kind === "check" ? gradeShort(z.input, it.item.accept || []) : gradeInput(z.input, z.items[z.i]); this.render();
  }

  /** Đồng hồ: chỉ cập nhật số giây; hết giờ thì chốt sai (countdown/chain) hoặc chuyển từ "nhìn" sang "hỏi" (snapshot/palace). */
  private tick() {
    const z = this.qz; if (!z || (this.S.screen !== "quiz" && this.S.screen !== "today") || z.i >= z.items.length || verdict(z) != null) return;
    const left = secsLeft(z); if (left == null) return;
    const el = this.rootEl.querySelector(".q-timer b"); if (el) el.textContent = String(left);
    if (left > 0) return;
    if (z.phase === "flash") { z.phase = "ask"; z.start = Date.now(); } else z.st = { ...z.st, timedOut: true };
    this.render();
  }

  /** Chọn một mục trong order / chain / timeline / nối cặp. */
  private pickItem(d: DOMStringMap) {
    const z = this.qz; if (!z) return; const q = z.items[z.i], st = z.st;
    if (d.ord != null) {
      const k = +d.ord, ord = st.order || [];
      if (q.kind === "chain" && q.order![ord.length] !== k) { z.wrongAt = k; z.st = { ...st, mistakes: (st.mistakes || 0) + 1 }; return this.render(); }   // chain: bấm sai = mất lượt
      z.wrongAt = null; z.st = { ...st, order: [...ord, k] }; return this.render();
    }
    if (d.ml != null) { z.selLeft = +d.ml; z.wrongAt = null; return this.render(); }
    if (d.mr != null && z.selLeft != null) {
      const r = +d.mr;
      if (r === z.selLeft) z.st = { ...st, matched: [...(st.matched || []), r] }; else { z.wrongAt = r; z.st = { ...st, mistakes: (st.mistakes || 0) + 1 }; }
      z.selLeft = null; return this.render();
    }
  }

  private onClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (this.S.more && !target.closest(".q-more")) { this.S.more = false; if (!target.closest("[data-go],[data-bob],[data-copy],[data-ttab],[data-sel],[data-open]")) return this.render(); }   // bấm ra ngoài thì đóng bảng Thêm
    if (target.closest("[data-more]")) return this.go({ more: !this.S.more });
    const bd = target.closest<HTMLElement>("[data-badge]"); if (bd) return this.go({ badge: bd.dataset.badge || "" });
    const pr = target.closest<HTMLElement>("[data-exit],[data-undo],[data-conf],[data-flip],[data-rate],[data-pick],[data-ord],[data-ml],[data-mr],[data-bet],[data-qz-phase],[data-qnext],[data-qz-check],[data-qz-redo],[data-review],[data-quest],[data-migrate],[data-essay-submit],[data-essay-copy],[data-essay-again],[data-ck-show],[data-ck-tick],[data-ck-done]");
    if (pr) {
      const d = pr.dataset;
      if ("exit" in d) return this.exit();
      if ("flip" in d) return this.flip();
      if (d.conf != null) return this.pickConf(+d.conf);
      if ("undo" in d) return void this.doUndo();
      if (d.rate) return void this.rate(+d.rate);
      if (d.pick && this.qz && this.qz.st.pick == null) { this.qz.st = { ...this.qz.st, pick: +d.pick }; return this.render(); }
      if (d.ord != null || d.ml != null || d.mr != null) return this.pickItem(d);
      if (d.bet && this.qz) { this.qz.bet = +d.bet; this.qz.phase = "ask"; this.qz.start = Date.now(); return this.render(); }
      if ("qzPhase" in d && this.qz) { this.qz.phase = this.qz.items[this.qz.i].type === "auction" ? "bet" : "ask"; this.qz.start = Date.now(); return this.render(); }
      if ("qnext" in d) return void this.next();
      if ("ckShow" in d && this.ck?.text.trim()) { this.ck.shown = true; return this.render(); }
      if (d.ckTick && this.ck) { const j = +d.ckTick; this.ck.ticks = this.ck.ticks.slice(); this.ck.ticks[j] = !this.ck.ticks[j]; return this.render(); }
      if ("ckDone" in d) return void this.ckNext();
      if ("qzCheck" in d) return this.check();
      if ("qzRedo" in d && this.qz) { Object.assign(this.qz, { i: 0, res: [], picks: [], confs: [], sel: undefined, redo: true, coins: this.qz.items.find(x => x.coins)?.coins || 100 }); freshItem(this.qz); return this.render(); }
      if (d.review != null) return this.startReview(d.review ? { topic: d.review } : { dom: this.S.dom });
      if (d.quest) return this.startQuest(d.quest.startsWith("boss:") ? { boss: d.quest.slice(5).split(",") } : { topic: d.quest });
      if (d.migrate) return void this.plugin.migrateEngram(d.migrate === "write");
      if ("essaySubmit" in d) return this.essaySubmit();
      if ("essayCopy" in d && this.es) { e.stopPropagation(); return void copyCommand(essayCmd(this.es.topic.slug, this.es.p, this.es.text)); }
      if ("essayAgain" in d && this.es) { this.es = { ...this.es, text: "", stage: "write", revAtSend: undefined }; return this.render(); }
    }
    const lb = target.closest<HTMLElement>("[data-lbgo]");
    if (lb && this.lc) { const id = lb.dataset.lbgo!; this.rootEl.querySelector<HTMLIFrameElement>("iframe[data-lecture]")?.contentWindow?.postMessage({ type: "pie-study/goto", id }, "*"); return; }
    const lre = target.closest<HTMLElement>("[data-lbre]"); if (lre && this.lc) this.lc.at = lre.dataset.lbre!;   // soạn lại khối: nạp lại xong thì quay về khối này (ask chạy ở nhánh data-bob bên dưới)
    const qr = target.closest<HTMLElement>("[data-qrsel],[data-qeasy]");
    if (qr?.dataset.qrsel != null && this.qz) { this.qz.sel = +qr.dataset.qrsel; return this.render(); }
    if (qr?.dataset.qeasy != null && qr.dataset.path) return this.startQuizNote(qr.dataset.path, qr.dataset.qeasy.split(",").filter(Boolean));
    const mt = target.closest<HTMLElement>("[data-mtadd],[data-mtclose],[data-mtscope],[data-mtkind],[data-mtf],[data-mtok],[data-mtrm]");
    if (mt) { e.stopPropagation(); e.preventDefault(); return void this.maClick(mt.dataset); }
    const ns8 = target.closest<HTMLElement>("[data-addsrc],[data-nsclose],[data-nskind],[data-nsf],[data-nspath],[data-nsadd],[data-nsdrop]");
    if (ns8) { e.stopPropagation(); return this.nsClick(ns8.dataset); }
    const lb8 = target.closest<HTMLElement>("[data-lib],[data-libtab],[data-libreset],[data-ext],[data-cvsrc],[data-cvsel]");
    if (lb8) { const d = lb8.dataset; e.stopPropagation();
      if (d.lib) return this.go({ libSel: this.S.libSel === d.lib ? null : d.lib });
      if (d.libtab) return this.go({ libTab: d.libtab });
      if (d.cvsrc) return this.go({ covSrc: d.cvsrc, covSel: null });
      if (d.cvsel) return this.go({ covSel: this.S.covSel === d.cvsel ? null : d.cvsel });
      if (d.ext) { const u = webUrl(d.ext); if (u) window.open(u, "_blank"); return; }   // mở ra ngoài khi người dùng bấm; plugin không tự tải gì
      if ("libreset" in d) return void recreateLibrary(this.app).then(() => this.plugin.loadLib()).then(() => { new Notice(tr("Đã tạo lại kho nguồn. Bản cũ giữ ở kho-nguon.json.bak.")); this.render(); }, err => new Notice(String(err))); }
    const lq = target.closest<HTMLElement>("[data-lreq]"); if (lq?.dataset.lreq) { e.stopPropagation(); return this.startLectureReq(lq.dataset.lreq); }
    const lf = target.closest<HTMLElement>("[data-lecf]"); if (lf) { e.stopPropagation(); return this.go({ lecF: lf.dataset.lecf }); }
    const er = target.closest<HTMLElement>("[data-ereq],[data-ego],[data-qnopen]");
    if (er) { const d = er.dataset; if (d.ereq) return this.startEssayReq(d.ereq); if (d.qnopen) return this.openQuick(d.qnopen);
      if ("ego" in d && this.er?.vet?.prompt) { const r = this.er, pr = r.vet!.prompt!; this.er = null; this.startEssay(r.note.slug, pr); this.back = r.back; return; } }
    const qn = target.closest<HTMLElement>("[data-qreq],[data-qn-old],[data-qn-new],[data-qn-go]");
    if (qn) { const d = qn.dataset; if (d.qreq) return this.startQuizNote(d.qreq); if ("qnOld" in d) return void this.qnVet(); if ("qnNew" in d) return this.qnSend(); if ("qnGo" in d) return this.qnStart(); }
    const rt = target.closest<HTMLElement>("[data-ret]");
    if (rt) { const { [rt.dataset.ret!]: _old, ...rest } = this.plugin.settings.retentionByDomain || {}; return void this.plugin.saveSetting({ retentionByDomain: rt.dataset.v ? { ...rest, [rt.dataset.ret!]: +rt.dataset.v } : rest }); }
    const tds = target.closest<HTMLElement>("[data-tdstart]"); if (tds) return this.startToday(tds.dataset.tdstart === "miss" ? "miss" : "all");
    const mk = target.closest<HTMLElement>("[data-mkf],[data-mkdrop]");
    if (mk?.dataset.mkf) return this.go({ mkf: { ...(this.S.mkf || { dom: "", tok: "" }), st: mk.dataset.mkf as "open" } });
    if (mk?.dataset.mkdrop) return void this.dropMistake(mk.dataset.topic || "", mk.dataset.mkdrop);
    const el = target.closest<HTMLElement>("[data-go],[data-bob],[data-copy],[data-ttab],[data-dim],[data-cmmode],[data-sel],[data-open],[data-sug],[data-newpath-go],[data-set-motion],[data-set-timetrack]");
    if (!el) {   // chạm ra ngoài bảng bật = đóng
      if (this.S.sel && target.closest(".qscroll") && !target.closest(".q-pop")) this.go({ sel: null });
      return;
    }
    const ds = el.dataset;
    if (ds.bob) { e.stopPropagation(); void ask(this.app, ds.bob); return; }
    if (ds.copy != null) { e.stopPropagation(); void copyCommand(ds.copy); return; }
    if (ds.open) { e.stopPropagation(); void this.app.workspace.openLinkText(ds.open, "", true); return; }
    if (ds.ttab) return this.go({ ttab: ds.ttab });
    if (ds.cmmode) return this.go({ cmMode: ds.cmmode as View["cmMode"] });
    if (ds.dim != null && !ds.go) return this.go({ dim: ds.dim });
    if (ds.sug) { const inp = this.rootEl.querySelector<HTMLInputElement>("[data-newpath]"); if (inp) { inp.value = ds.sug; inp.focus(); } return; }
    if (ds.newpathGo) return this.newPath(ds.newpathGo === "copy");
    if ("setTimetrack" in ds) { void this.plugin.saveSetting({ timeTrack: !this.plugin.settings.timeTrack }); return; }
    if ("setMotion" in ds) { void this.plugin.saveSetting({ motion: !this.plugin.settings.motion }); return; }
    if (ds.sel != null && !ds.go) return this.go({ sel: ds.sel || null });
    if (ds.go) {
      e.preventDefault();
      if (this.td) this.td = this.rv = this.qz = null;   // rời thẻ Xong hôm nay
      if (ds.go === "review") return this.startReview(ds.topic ? { topic: ds.topic } : { dom: ds.dom || this.S.dom });
      if (ds.go === "quiz" && ds.topic) return this.startQuest({ topic: ds.topic });
      if (ds.go === "essay" && ds.topic) return this.startEssay(ds.topic);
      if (ds.go === "lecture" && ds.topic) return void this.startLecture(ds.topic);
      const patch: Partial<View> = { screen: ds.go === "home" ? "home" : ds.go, sel: null, more: false };
      if (ds.dom) patch.dom = ds.dom;
      if (ds.dim != null) patch.dim = ds.dim;
      if (ds.ttabGo) patch.ttab = ds.ttabGo;
      if (ds.topic) { patch.topic = ds.topic; const t = this.plugin.index.all.find(x => x.slug === ds.topic); if (t) patch.dom = t.dom; }
      this.go(patch);
    }
  }

  /** "Bỏ khỏi sổ": chỉ khi người học bấm (câu không còn trong vault). */
  private async dropMistake(slug: string, key: string) {
    const t = this.plugin.index.all.find(x => x.slug === slug); if (!t) return;
    await this.plugin.practice.write(t, dropMistake(this.plugin.practice.get(t), key));
    new Notice(tr("Đã bỏ câu này khỏi sổ")); this.render();
  }

  private newPath(copy: boolean) {
    const v = this.rootEl.querySelector<HTMLInputElement>("[data-newpath]")?.value.trim() || "";
    const cmd = cmdNewPath(v);
    void (copy ? copyCommand(cmd) : ask(this.app, cmd));
  }

  private onChange(e: Event) {
    const t = e.target as HTMLInputElement;
    if (t.matches("[data-nsfile]") && this.ns && t.files?.[0]) return void this.nsTake(t.files[0]);
    if (t.matches("[data-qdom]")) return this.go({ dom: t.value, sel: null, screen: "home" });
    if (t.matches("[data-nbdom]")) return this.go({ dom: t.value });
    if (t.matches("[data-mkdom],[data-mktok]")) { const f = this.S.mkf || { st: "open", dom: "", tok: "" }; return this.go({ mkf: t.matches("[data-mkdom]") ? { ...f, dom: t.value } : { ...f, tok: t.value } }); }
    if (t.matches("[data-set-folder]")) void this.plugin.saveSetting({ folder: t.value.trim() });
    if (t.matches("[data-set-quizdir]")) void this.plugin.saveSetting({ quizDir: t.value.trim() || DEFAULT_QUIZ_DIR });
    if (t.matches("[data-set-lecturedir]")) void this.plugin.saveSetting({ lectureDir: t.value.trim() || DEFAULT_LECTURE_DIR });
    if (t.matches("[data-set-statedir]")) void this.plugin.saveSetting({ stateDir: t.value.trim() || DEFAULT_STATE_DIR });
    if (t.matches("[data-set-retention]")) void this.plugin.saveSetting({ retention: +t.value });
    if (t.matches("[data-set-newday]")) void this.plugin.saveSetting({ newPerDay: +t.value });
    if (t.matches("[data-set-sessioncap]")) { const n = Math.round(+t.value); void this.plugin.saveSetting({ sessionCap: Number.isFinite(n) ? Math.min(100, Math.max(5, n)) : 20 }); }
  }
}
