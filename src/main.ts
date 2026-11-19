import { pool } from "./data/pool.ts";
import { extractDone } from "./data/goal.ts";
import { Plugin, TFile, TAbstractFile, MarkdownView, debounce, getLanguage, parseYaml, Notice } from "obsidian";
import { setLang, tr } from "./i18n.ts";
import { todayStr } from "./status.ts";
import { buildIndex, parseCards, mapGroups, groupDone, sessionsFor, OUTSIDE, type Index, type Topic, type FileRec } from "./data/index.ts";
import { parseSoHoc, type SoHoc } from "./data/sohoc.ts";
import { StudyView, VIEW_TYPE } from "./views/StudyView.ts";
import { snapshot, diffEvents, type Fx } from "./views/motion.ts";
import { parseQuest, type Quest } from "./data/quest.ts";
import { PracticeStore, atomicWrite, restoreBak } from "./practice/store.ts";
import { BADGES, LEDGER_PATH, practiceStats, earned, mergeLedger, ledgerDates, type Stats } from "./data/badges.ts";
import { releaseIcons, type BadgeData } from "./views/badges.ts";
import { isDone } from "./status.ts";
import { stampSolid } from "./practice/solid.ts";
import { addSecs } from "./practice/secs.ts";
import { StudyClock } from "./practice/studyclock.ts";
import { agentReady } from "./agent.ts";
import { EMPTY_LIB, loadLibrary, type LibState } from "./library-io.ts";
import { LIB_PATH, SRC_DIR, tocPathOf } from "./data/library.ts";
import { setRetention, logFileName, retentionFor, DEFAULT_STATE_DIR } from "./practice/log.ts";
import { DEFAULT_QUIZ_DIR, vetQuiz, type Vetted } from "./data/quiznote.ts";
import { vetEssay, type EssayFilePrompt, type EssayVet } from "./data/essaynote.ts";
import { DEFAULT_LECTURE_DIR, GUIDE_PATH, QUIZ_GUIDE_PATH, PIE_STUDY_DIR, guideNeedsWrite } from "./data/lecguide.ts";
import GUIDE from "./lecture-guide.md";
import QUIZ_GUIDE from "./quiz-guide.md";
import { migrateEngram, type MigrateReport, type SrEntry, type QuestState } from "./practice/migrate.ts";

interface Settings { folder: string; motion: boolean; stateDir: string; retention: number; newPerDay: number; sessionCap: number; quizDir: string; lectureDir: string; retentionByDomain: Record<string, number>; timeTrack: boolean; solidSeeded: boolean; installDay: string }
const DEFAULTS: Settings = { folder: "", motion: true, stateDir: DEFAULT_STATE_DIR, retention: 0.9, newPerDay: 20, sessionCap: 20, quizDir: DEFAULT_QUIZ_DIR, lectureDir: DEFAULT_LECTURE_DIR, retentionByDomain: {}, timeTrack: true, solidSeeded: false, installDay: "" };
export type CardT = { token?: string; q: string; a: string };
/* Thư mục dữ liệu của EngramQuest (mặc định của plugin đó) — chỉ đọc khi người dùng bấm chuyển. */
const ENGRAM_SR = "engram-review/sr", ENGRAM_QUEST = "engram-quest/state";

export default class PieStudyPlugin extends Plugin {
  settings: Settings = { ...DEFAULTS };
  index: Index = { domains: [], all: [], due: [] };
  sohoc = new Map<string, { data: SoHoc; path: string }>();
  cards = new Map<string, CardT[]>();
  quests: Quest[] = [];
  essays = new Map<string, { prompt: EssayFilePrompt; note: string }>();   // file đề tự luận (7.9) đã kiểm trích dẫn, theo đường dẫn file đề
  quizzes = new Map<string, { quest: Quest; note: string }>();   // file quiz note (đợt 6) đã kiểm trích dẫn, theo đường dẫn file quiz
  outside: Topic[] = [];   // note ngoài lộ trình có quiz / nhật ký
  practice = new PracticeStore(this.app, () => this.settings.stateDir || DEFAULTS.stateDir);
  migration: MigrateReport | null = null;
  dupes: string[] = [];
  today = todayStr();
  ready = false;
  lib: LibState = EMPTY_LIB;   // kho nguồn (đợt 8a)
  private libWatch = new Set<string>();
  /** Đồng hồ giờ học (7.10 bước 6): chỉ chạy khi có Pie Agent (Free ẩn hẳn đợt 8a) và công tắc "Đo giờ học" bật. */
  clock = new StudyClock((key, day, secs) => this.addStudySecs(key, day, secs), t => todayStr(new Date(t)), () => this.settings.timeTrack && agentReady(this.app));
  private badgeDates: Record<string, string> = {};
  private badgeSeen: Set<string> | null = null;   // huy hiệu đã có lúc mở phiên: chỉ cái mở SAU đó mới phát chuyển động
  private ledgerWarned = false;
  private bodyCache = new Map<string, { mtime: number; cards: CardT[] }>();
  private buoi: { basename: string; path: string; links: string[] }[] = [];
  private building = false;
  private again = false;

  onunload() { this.clock.stop(Date.now()); releaseIcons(); }

  async onload() {
    try { setLang(getLanguage()); } catch { setLang("vi"); }
    this.settings = { ...DEFAULTS, ...(await this.loadData()) };
    setRetention(this.settings.retention);
    this.registerView(VIEW_TYPE, leaf => new StudyView(leaf, this));
    this.addRibbonIcon("graduation-cap", "Pie Study", () => void this.activate());
    this.addCommand({ id: "open", name: tr("Mở Pie Study"), callback: () => void this.activate() });
    this.addCommand({ id: "quiz-note", name: tr("Quiz note đang mở"), checkCallback: checking => {
      const f = this.app.workspace.getActiveFile(); if (!f || f.extension !== "md") return false;
      if (!checking) void this.activate().then(() => this.views()[0]?.startQuizNote(f.path));
      return true;
    } });
    const later = debounce(() => void this.rebuild(true), 300, true);
    this.registerEvent(this.app.metadataCache.on("changed", f => { if (this.relevant(f)) later(); }));
    for (const ev of ["create", "modify"] as const) this.registerEvent(this.app.vault.on(ev as "modify", (f: TAbstractFile) => { if (f instanceof TFile && /^html?$/i.test(f.extension) && this.relevant(f)) later(); }));   // file bài giảng mới (agent không sửa note)
    this.registerEvent(this.app.vault.on("delete", f => { if (this.relevant(f)) later(); }));
    this.registerEvent(this.app.vault.on("rename", f => { if (this.relevant(f)) later(); }));
    this.app.workspace.onLayoutReady(() => { void this.rebuild(false); void this.ensureGuide(); });
    const libLater = debounce(() => void this.loadLib().then(() => this.redraw()), 300, true);
    for (const ev of ["create", "modify", "delete", "rename"] as const) this.registerEvent(this.app.vault.on(ev as "modify", (f: TAbstractFile) => { if (this.libRelevant(f)) libLater(); }));
    const act = () => this.clock.activity(Date.now());   // thao tác: phím, chuột bấm, cuộn, chạm (không tính di chuột)
    for (const ev of ["keydown", "pointerdown", "wheel", "scroll", "touchstart"]) this.registerDomEvent(window, ev as "keydown", act, { capture: true, passive: true });
    this.registerInterval(window.setInterval(() => this.clock.tick(Date.now(), this.clockCtx()), 1000));
    this.registerInterval(window.setInterval(() => { const t = todayStr(); if (t !== this.today) void this.rebuild(false); }, 60_000));   // qua ngày → tính lại tới hạn
  }

  /** Bài đang được học theo màn Pie Study (ôn thẻ, quest, quiz nhanh, tự luận, bài giảng) hoặc note bài học đang mở; cửa sổ phải đang chọn và hiện. */
  /** Đọc lại kho nguồn + mục lục của từng nguồn; nhớ các đường dẫn cần canh để kho tự cập nhật khi file mục lục xuất hiện / đổi. */
  async loadLib() {
    this.lib = await loadLibrary(this.app);
    this.libWatch = new Set(this.lib.lib.sources.flatMap(s => [tocPathOf(s), s.kind === "vault" ? s.ref : null].filter((x): x is string => !!x)));
  }
  libRelevant(f: TAbstractFile) { return f.path === LIB_PATH || f.path.startsWith(SRC_DIR + "/") || this.libWatch.has(f.path); }
  private clockCtx(): { on: boolean; key: string | null } {
    if (activeDocument.visibilityState !== "visible" || !activeDocument.hasFocus()) return { on: false, key: null };
    const ws = this.app.workspace, view = ws.getActiveViewOfType(StudyView);
    if (view) { const k = view.studyKey(); return { on: !!k, key: k }; }
    const f = ws.getActiveViewOfType(MarkdownView)?.file;
    return f && this.index.all.some(t => t.path === f.path) ? { on: true, key: f.path } : { on: false, key: null };
  }
  private addStudySecs(path: string, day: string, secs: number) {
    const t = this.index.all.find(x => x.path === path) || this.topicFor(path); if (!t) return;
    void this.practice.write(t, addSecs(this.practice.get(t), day, secs)).catch(() => {});
  }
  /** Spec 7.10 bước 2: bài nào đủ 5 cốt lõi mà nhật ký chưa có solidAt thì ghi (lần đầu bản 8a: est). Chỉ khi có Pie Agent. */
  private async stampSolidAll() {
    if (!agentReady(this.app)) return;
    const first = !this.settings.solidSeeded, now = new Date(), installDay = this.settings.installDay || todayStr(now);
    for (const t of this.index.all) {
      const log = this.practice.get(t), next = stampSolid(log, t, { now, firstRun: first, installDay });
      if (next !== log) { try { await this.practice.write(t, next); } catch { /* đã báo */ } }
    }
    if (first) { await this.saveData({ ...this.settings, solidSeeded: true, installDay }); this.settings = { ...this.settings, solidSeeded: true, installDay }; }
  }

  async activate() {
    const ws = this.app.workspace;
    // luôn là một tab ở vùng giữa (như Pie Task); leaf cũ nằm ở sidebar thì gỡ đi
    ws.getLeavesOfType(VIEW_TYPE).filter(l => l.getRoot() !== ws.rootSplit).forEach(l => l.detach());
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = ws.getLeaf("tab"); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    void ws.revealLeaf(leaf);
  }

  async saveSetting(p: Partial<Settings>) {
    this.settings = { ...this.settings, ...p };
    await this.saveData(this.settings);
    if ("retention" in p) setRetention(this.settings.retention);
    if ("folder" in p || "stateDir" in p || "quizDir" in p) await this.rebuild(false); else this.redraw();
  }

  private views() { return this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l => l.view).filter((v): v is StudyView => v instanceof StudyView); }
  private redraw(fx: Fx[] = []) { this.views().forEach(v => v.render(fx)); }

  /** Thư mục học: cài đặt, hoặc tự dò thư mục chứa file learn_progress_index / dashboard-hoc-tap.base. "" = cả vault. */
  learningFolder(): string {
    if (this.settings.folder) return this.settings.folder.replace(/\/+$/, "");
    for (const f of this.app.vault.getFiles()) {
      if (f.name === "dashboard-hoc-tap.base" || (f.extension === "md" && this.app.metadataCache.getFileCache(f)?.frontmatter?.learn_progress_index === true)) return f.parent?.path === "/" ? "" : f.parent?.path || "";
    }
    return "";
  }

  private relevant(f: TAbstractFile) {
    if (f instanceof TFile && /^html?$/i.test(f.extension)) return f.path.startsWith(this.lectureDir() + "/");   // file bài giảng mới / xoá → dựng lại chỉ mục
    if (!(f instanceof TFile) || f.extension !== "md") return false;
    const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
    return fm?.learn_curriculum != null || fm?.type === "goal" || this.index.domains.some(d => d.profile?.goalPath === f.path) || f.basename.startsWith("quest-") || f.path.startsWith(this.quizDir() + "/") || this.index.all.some(t => t.path === f.path) || /^(so-hoc-|curriculum-)/.test(f.basename) || f.path.includes("/buoi/");
  }

  sessionsOf(t: Topic) { const names = sessionsFor(t.slug, this.buoi); return this.buoi.filter(b => names.includes(b.basename)).sort((a, b) => a.basename.localeCompare(b.basename)); }

  /** Đọc lại toàn bộ (frontmatter qua metadataCache; thân file chỉ đọc khi mtime đổi). live = thay đổi trong phiên → có chuyển động. */
  async rebuild(live: boolean) {
    if (this.building) { this.again = true; return; }
    this.building = true;
    const t0 = performance.now(), marks: string[] = [], mark = (k: string) => marks.push(`${k} ${Math.round(performance.now() - t0)}`);   // TIMING: bỏ khi đo xong
    try {
      const { vault, metadataCache: mc } = this.app;
      const folder = this.learningFolder(), inFolder = (p: string) => !folder || p.startsWith(folder + "/");
      const md = vault.getMarkdownFiles();
      const resolve = (link: string, from: string) => mc.getFirstLinkpathDest(link, from)?.path;   // link resolution của Obsidian cho learn_path
      const lecDir = this.lectureDir(), lecture = { dir: lecDir, files: new Set(vault.getFiles().filter(f => /^html?$/i.test(f.extension) && f.path.startsWith(lecDir + "/")).map(f => f.path)) };   // bài giảng nhận theo tên file khi note không có learn_lecture
      const recs: FileRec[] = md.map(f => ({ path: f.path, basename: f.basename, fm: mc.getFileCache(f)?.frontmatter }));
      this.today = todayStr();
      const before = live ? snapshot(this.index) : null, gBefore = live ? this.groupCounts() : null;
      mark("recs"); const pre = buildIndex(recs, this.today, undefined, resolve, lecture); mark("pre");
      const cards = new Map<string, CardT[]>();
      // Pha 1 (không đọc thân file): chỉ mục từ frontmatter → hiện bản đồ ngay; thẻ, sổ học, nhật ký, quiz, kho nguồn nạp nền rồi vẽ lại.
      if (!this.ready) { this.index = buildIndex(recs, this.today, p => this.bodyCache.get(p)?.cards.length || 0, resolve, lecture); this.ready = true; mark("phase1"); this.redraw([]); }
      await pool(pre.all, 8, async t => {
        const f = vault.getAbstractFileByPath(t.path); if (!(f instanceof TFile)) return;
        let c = this.bodyCache.get(t.path);
        if (!c || c.mtime !== f.stat.mtime) { c = { mtime: f.stat.mtime, cards: parseCards(await vault.cachedRead(f)) }; this.bodyCache.set(t.path, c); }
        cards.set(t.path, c.cards);
      });
      mark("cards"); this.cards = cards;
      this.index = buildIndex(recs, this.today, p => cards.get(p)?.length || 0, resolve, lecture);
      for (const d of this.index.domains) {   // dòng "xong trông như thế nào" của goal: đọc thân goal note (chỉ đọc)
        const gp = d.profile?.goalPath, gf = gp ? vault.getAbstractFileByPath(gp) : null;
        if (d.profile && gf instanceof TFile) { try { const done = extractDone(await vault.cachedRead(gf)); if (done) d.profile = { ...d.profile, done }; } catch (e) { console.error("[pie-study] không đọc được goal note", gp, e); } }
      }
      const sohoc = new Map<string, { data: SoHoc; path: string }>();
      for (const d of this.index.domains) {
        const f = md.find(x => x.basename === `so-hoc-${d.id}` && inFolder(x.path));
        if (f) { try { sohoc.set(d.id, { data: parseSoHoc(await vault.cachedRead(f)), path: f.path }); } catch (e) { console.error("[pie-study] không đọc được sổ học", f.path, e); } }
      }
      mark("sohoc"); this.sohoc = sohoc;
      this.buoi = md.filter(f => inFolder(f.path) && f.path.includes("/buoi/")).map(f => ({ basename: f.basename, path: f.path, links: (mc.getFileCache(f)?.links || []).map(l => l.link) }));
      const qs: Quest[] = [];
      for (const f of md.filter(x => inFolder(x.path) && x.basename.startsWith("quest-"))) {
        try { const q = parseQuest(await vault.cachedRead(f), f.path, parseYaml); if (q) qs.push(q); } catch (e) { console.error("[pie-study] không đọc được quest", f.path, e); }
      }
      mark("quests"); this.quests = qs;
      await this.practice.loadAll(this.index.all, t => this.cards.get(t.path) || []);
      mark("loadAll"); await this.loadQuizzes(); mark("quizzes");
      await this.stampSolidAll(); mark("stamp");
      await this.loadLib(); mark("lib");
      this.dupes = [...new Set(this.index.domains.flatMap(d => d.topics.filter((t, k) => Number.isFinite(t.order) && d.topics.some((u, j) => j !== k && u.order === t.order)).map(t => `${d.id}/${t.slug}`)))];
      this.ready = true; mark("done"); console.debug(`[pie-study] rebuild(${live}) files=${md.length} topics=${this.index.all.length} ms: ${marks.join(" · ")}`);
      this.redraw(before && gBefore ? diffEvents(before, this.index, gBefore, this.groupCounts()) : []);
      void this.syncBadges();
    } finally {
      this.building = false;
      if (this.again) { this.again = false; void this.rebuild(live); }
    }
  }

  /** Mức ôn của lĩnh vực chứa bài (đợt 6): mức riêng hoặc mức chung. */
  retentionOf(t: Topic) { return retentionFor(this.settings.retentionByDomain, t.dom, this.settings.retention); }
  lectureDir() { return (this.settings.lectureDir || DEFAULT_LECTURE_DIR).replace(/\/+$/, ""); }
  /** File hướng dẫn cho agent (bài giảng 7.8; quiz nhanh + đề tự luận 8b). Ghi khi chưa có hoặc khác phiên bản (dòng tiêu đề); sửa tay giữ tiêu đề thì để yên. */
  async ensureGuide() {
    for (const [path, text] of [[GUIDE_PATH, GUIDE], [QUIZ_GUIDE_PATH, QUIZ_GUIDE]] as const) {
      try {
        const v = this.app.vault, f = v.getAbstractFileByPath(path);
        if (!guideNeedsWrite(f instanceof TFile ? await v.read(f) : null, text)) continue;
        if (f instanceof TFile) await v.modify(f, text);
        else { if (!v.getAbstractFileByPath(PIE_STUDY_DIR)) await v.createFolder(PIE_STUDY_DIR); await v.create(path, text); }
      } catch (e) { console.error("[pie-study] không ghi được file hướng dẫn", path, e); }
    }
  }
  quizDir() { return (this.settings.quizDir || DEFAULT_QUIZ_DIR).replace(/\/+$/, ""); }
  /** Bài trong lộ trình, hoặc "bài" tạm cho note ngoài lộ trình (quiz note): nhật ký vẫn khoá theo uid/path của chính note đó. */
  topicFor(path: string): Topic | null {
    const t = this.index.all.find(x => x.path === path); if (t) return t;
    const f = this.app.vault.getAbstractFileByPath(path); if (!(f instanceof TFile) || f.extension !== "md") return null;
    const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
    return { slug: f.basename, path, uid: fm?.uid ? String(fm.uid) : undefined, title: fm?.title ? String(fm.title) : f.basename, order: NaN, und: [], cards: 0, dom: OUTSIDE, status: "new", due: false, lectures: [], source: [], need: "core", materials: [], outside: true };
  }
  quizQuests() { return [...this.quizzes.values()].map(x => x.quest); }
  /** Đọc + kiểm trích dẫn một file quiz note. null = file không có / không trỏ được về note. */
  async vetQuizFile(qp: string): Promise<{ vet: Vetted; note: Topic } | null> {
    const f = this.app.vault.getAbstractFileByPath(qp); if (!(f instanceof TFile)) return null;
    const text = await this.app.vault.read(f), m = text.match(/^---\n[\s\S]*?quiz_for:\s*["']?\[\[([^\]|]+)/);
    const nf = m ? this.app.metadataCache.getFirstLinkpathDest(m[1].trim(), qp) : null, note = nf ? this.topicFor(nf.path) : null; if (!nf || !note) return null;
    const vet = vetQuiz(text, await this.app.vault.cachedRead(nf), parseYaml);
    this.quizzes.set(qp, { quest: { path: qp, title: note.title, topics: [], nodes: [{ id: "quiz", title: note.title, boss: false, items: vet.items }] }, note: note.path });
    return { vet, note };
  }
  /** Spec 7.9: file đề tự luận — cùng cách tìm note như quiz note; đề không qua kiểm thì không vào danh sách. */
  async vetEssayFile(ep: string): Promise<{ vet: EssayVet; note: Topic } | null> {
    const f = this.app.vault.getAbstractFileByPath(ep); if (!(f instanceof TFile)) return null;
    const text = await this.app.vault.read(f), m = text.match(/^---\n[\s\S]*?quiz_for:\s*["']?\[\[([^\]|]+)/);
    const nf = m ? this.app.metadataCache.getFirstLinkpathDest(m[1].trim(), ep) : null, note = nf ? this.topicFor(nf.path) : null; if (!nf || !note) return null;
    const vet = vetEssay(text, await this.app.vault.cachedRead(nf), parseYaml);
    if (vet.prompt) this.essays.set(ep, { prompt: vet.prompt, note: note.path }); else this.essays.delete(ep);
    return { vet, note };
  }
  essayFor(t: Topic) { for (const x of this.essays.values()) if (x.note === t.path) return x.prompt; return null; }
  /** Quiz nhanh hợp lệ của bài (đợt 6): đường dẫn file + số câu giữ lại. */
  quickFor(t: Topic) { for (const [path, x] of this.quizzes) { const n = x.quest.nodes[0]?.items.length || 0; if (x.note === t.path && n) return { path, n }; } return null; }
  private async loadQuizzes() {
    const dir = this.quizDir(); this.quizzes = new Map(); this.essays = new Map();
    for (const f of this.app.vault.getFiles().filter(x => x.path.startsWith(dir + "/") && x.name.endsWith(".essay.md"))) { try { await this.vetEssayFile(f.path); } catch (e) { console.error("[pie-study] không đọc được đề tự luận", f.path, e); } }
    for (const f of this.app.vault.getFiles().filter(x => x.path.startsWith(dir + "/") && x.name.endsWith(".quiz.md"))) { try { await this.vetQuizFile(f.path); } catch (e) { console.error("[pie-study] không đọc được quiz", f.path, e); } }
    const paths = new Set([...[...this.quizzes.values()].map(x => x.note), ...this.practice.loosePaths()]);
    this.outside = [...paths].map(p => this.topicFor(p)).filter((t): t is Topic => !!t?.outside);
  }

  /** Chuyển dữ liệu EngramQuest (spec 5.1). write=false: chỉ đếm để báo cáo, không ghi gì. */
  async migrateEngram(write: boolean): Promise<MigrateReport> {
    const byPath = new Map(this.index.all.map(t => [t.path, t]));
    const ref = (p: string) => { const t = byPath.get(p); return t ? { uid: t.uid, path: t.path, cards: this.cards.get(t.path) || [] } : null; };
    const r = migrateEngram({
      sr: await this.practice.readJsonDir<Record<string, SrEntry>>(ENGRAM_SR), quests: await this.practice.readJsonDir<QuestState>(ENGRAM_QUEST),
      findTopic: ref, existing: t => { const x = byPath.get(t.path); return x && this.practice.has(x) ? this.practice.get(x) : undefined; },
      findQuest: p => { const q = this.quests.find(x => x.path === p); return q ? { key: q.uid || q.path, topics: q.topics.map(s => this.index.all.find(t => t.slug === s)?.path).filter((x): x is string => !!x) } : null; },
    });
    if (write) {
      for (const t of this.index.all) { const log = r.logs.get(logFileName(t)); if (log) await this.practice.write(t, log); }
      new Notice(tr("Đã chuyển {0} thẻ và {1} node quest từ EngramQuest.", r.report.matched + r.report.fuzzy, r.report.questNodes));
    }
    this.migration = r.report;
    this.redraw();
    return r.report;
  }

  /** Chỉ số huy hiệu: phần học (basics/masters/teach/stages/paths) từ frontmatter, phần luyện tập từ nhật ký. */
  badgeStats(): Stats {
    const all = this.index.all, bossKeys = new Set(this.quests.flatMap(q => q.nodes.filter(n => n.boss).map(n => `${q.uid || q.path}/${n.id}`)));
    const stages = [...this.groupCounts().values()].flat().filter(([done, n]) => n > 0 && done === n).length;
    return { ...practiceStats(this.practice.all(), bossKeys), basics: all.filter(t => isDone(t.status)).length, masters: all.filter(t => t.status === "master").length,
      teach: all.filter(t => t.und.includes("teach-back")).length, stages, paths: this.index.domains.filter(d => d.topics.some(t => t.rev)).length };
  }
  badgeData(): BadgeData { return { st: this.badgeStats(), dates: this.badgeDates }; }

  /** Ghi huy hiệu mới đạt vào sổ chung (đọc → gộp → ghi tạm rồi đổi tên). Sổ hỏng thì không ghi, báo một lần. */
  async syncBadges() {
    if (!this.ready) return;
    const ad = this.app.vault.adapter, ids = earned(this.badgeStats());
    let raw: string | null = null;
    try { await restoreBak(this.app, LEDGER_PATH); raw = (await ad.exists(LEDGER_PATH)) ? await ad.read(LEDGER_PATH) : null; } catch (e) { console.error("[pie-study] không đọc được sổ huy hiệu", e); return; }
    this.badgeDates = ledgerDates(raw);
    const r = mergeLedger(raw, BADGES.filter(b => ids.includes(b.id)), new Date().toISOString());
    if (r.error && !this.ledgerWarned) { this.ledgerWarned = true; new Notice(tr("Sổ huy hiệu {0} bị hỏng nên Pie Study không ghi vào.", LEDGER_PATH)); }
    if (r.text) {
      try { await atomicWrite(this.app, LEDGER_PATH, r.text); this.badgeDates = ledgerDates(r.text); }
      catch (e) { console.error("[pie-study] không ghi được sổ huy hiệu", e); new Notice(tr("Không ghi được sổ huy hiệu: {0}", String(e))); }
    }
    const fresh = this.badgeSeen ? ids.filter(id => !this.badgeSeen!.has(id)) : [];
    this.badgeSeen = new Set([...(this.badgeSeen || []), ...ids, ...Object.keys(this.badgeDates)]);
    if (r.text) this.views().forEach(v => v.onBadges());
    if (fresh.length) this.views().forEach(v => v.celebrate(fresh));
  }

  private groupCounts() { return new Map(this.index.domains.map(d => [d.id, mapGroups(d, this.sohoc.get(d.id)?.data).map(g => [groupDone(g), g.list.length])])); }
}
