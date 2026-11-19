/* Đọc/ghi nhật ký luyện tập trong vault: <stateDir>/<uid>.json (spec 5). Ghi qua file tạm rồi đổi tên để không hỏng file khi ngắt giữa chừng. */
import { App, Notice, normalizePath } from "obsidian";
import { tr } from "../i18n.ts";
import { pool } from "../data/pool.ts";
import type { Topic } from "../data/index.ts";
import { emptyLog, logFileName, adoptOrphans, mergeLogs, type PracticeLog, type CardRef } from "./log.ts";

export class PracticeStore {
  private logs = new Map<string, PracticeLog>();   // theo đường dẫn bài
  private loose = new Map<string, PracticeLog>();   // log của note không thuộc lộ trình (quiz note, đợt 6): theo pathHint, để không bị ghi đè bằng log rỗng
  constructor(private app: App, private dir: () => string) {}

  private file(t: { uid?: string; path: string }) { return normalizePath(`${this.dir()}/${logFileName(t)}`); }
  all(): PracticeLog[] { return [...this.logs.values(), ...this.loose.values()]; }
  get(t: Topic): PracticeLog { return this.logs.get(t.path) || this.loose.get(t.path) || emptyLog(t); }
  has(t: Topic) { return this.logs.has(t.path) || this.loose.has(t.path); }
  /** Note ngoài lộ trình đang có nhật ký (pathHint). */
  loosePaths() { return [...this.loose.keys()]; }

  /** Nạp log của mọi bài có trong thư mục state; thẻ bị sửa câu hỏi thì khớp mờ rồi ghi lại (R2). */
  async loadAll(topics: Topic[], cards: (t: Topic) => CardRef[]) {
    const ad = this.app.vault.adapter, out = new Map<string, PracticeLog>(), loose = new Map<string, PracticeLog>();
    if (!(await ad.exists(this.dir()))) { this.logs = out; this.loose = loose; return; }
    const byFile = new Map(topics.map(t => [logFileName(t), t]));
    const byHint = new Map(topics.map(t => [t.path, t]));
    for (const f of (await ad.list(this.dir())).files.filter(x => x.endsWith(".json.bak"))) await restoreBak(this.app, f.slice(0, -4));
    const seen = new Map(this.logs);   // người dùng có thể ghi trong lúc nạp nền: bản trong bộ nhớ mới hơn thì giữ
    const found = new Map<string, { t: Topic; uid?: PracticeLog; legacy: PracticeLog[] }>();   // theo path bài: log <uid>.json và các log path__ của đúng path này
    await pool((await ad.list(this.dir())).files.filter(x => x.endsWith(".json")), 8, async f => {
      try {
        const log = JSON.parse(await ad.read(f)) as PracticeLog, name = f.split("/").pop()!;
        const t = byFile.get(name) || byHint.get(log.topic?.pathHint);
        if (log.version !== 1) return;
        if (!t) { if (log.topic?.pathHint) loose.set(log.topic.pathHint, log); return; }
        const e = found.get(t.path) || { t, legacy: [] }; found.set(t.path, e);
        if (t.uid && name === logFileName(t)) e.uid = log; else if (t.uid && name === logFileName({ path: t.path })) e.legacy.push(log); else e.uid = log;
      } catch (e) { console.error("[pie-study] nhật ký hỏng, bỏ qua", f, e); }
    });
    for (const { t, uid, legacy } of found.values()) {
      try {
        // note được gắn uid sau khi đã có log path__: gộp vào <uid>.json, không xoá file cũ
        const merged = legacy.reduce((acc, o) => mergeLogs(acc, o), uid ?? emptyLog(t)), changed = legacy.length > 0 && JSON.stringify(merged) !== JSON.stringify(uid);
        const r = adoptOrphans(merged, cards(t));
        out.set(t.path, r.log);
        if (r.adopted || changed) await this.write(t, r.log);
      } catch (e) { console.error("[pie-study] nhật ký hỏng, bỏ qua", t.path, e); }
    }
    for (const [k, v] of this.logs) if (seen.get(k) !== v) out.set(k, v);
    this.logs = out; this.loose = loose;
  }

  private chain = new Map<string, Promise<unknown>>();
  /** Bộ nhớ đổi NGAY (người đọc kế tiếp thấy bản mới, đợt 8a có thêm người ghi định kỳ là đồng hồ giờ học); ghi đĩa tuần tự theo file để hai lần ghi không giẫm nhau. */
  async write(t: { uid?: string; path: string }, log: PracticeLog) {
    const path = this.file(t);
    if (this.loose.has(t.path)) this.loose.set(t.path, log); else this.logs.set(t.path, log);
    const run = (this.chain.get(path) || Promise.resolve()).catch(() => {}).then(() => atomicWrite(this.app, path, JSON.stringify(this.logs.get(t.path) || this.loose.get(t.path) || log, null, 1)));
    this.chain.set(path, run);
    try { await run; } catch (e) { console.error("[pie-study] không ghi được nhật ký", path, e); new Notice(tr("Không ghi được nhật ký luyện tập: {0}", String(e))); throw e; }
  }

  async readJsonDir<T>(dir: string): Promise<{ file: string; data: T }[]> {
    const ad = this.app.vault.adapter; if (!(await ad.exists(dir))) return [];
    const out: { file: string; data: T }[] = [];
    for (const f of (await ad.list(dir)).files.filter(x => x.endsWith(".json"))) { try { out.push({ file: f.split("/").pop()!, data: JSON.parse(await ad.read(f)) as T }); } catch { /* file hỏng: báo ở report qua thiếu khớp */ } }
    return out;
  }
}

/** Ghi qua file tạm rồi đổi tên (adapter, nên ghi được cả thư mục ẩn như .achievements). */
export async function atomicWrite(app: App, path: string, text: string) {
  const ad = app.vault.adapter, dir = path.split("/").slice(0, -1).join("/"), tmp = path + ".tmp", bak = path + ".bak";
  if (dir && !(await ad.exists(dir))) await ad.mkdir(dir);
  await restoreBak(app, path);
  await ad.write(tmp, text);
  if (await ad.exists(path)) await ad.rename(path, bak);   // giữ bản cũ tới khi bản mới đã vào chỗ: hỏng giữa chừng vẫn còn .bak để khôi phục
  await ad.rename(tmp, path);
  if (await ad.exists(bak)) await ad.remove(bak);
}
/** Lần ghi trước hỏng giữa chừng (mất file chính, còn .bak) → đưa .bak về chỗ cũ. */
export async function restoreBak(app: App, path: string) {
  const ad = app.vault.adapter, bak = path + ".bak";
  if (!(await ad.exists(path)) && (await ad.exists(bak))) await ad.rename(bak, path);
}
