/* Gom dữ liệu học từ frontmatter (thuần, không cần Obsidian). Plugin đưa vào danh sách file + frontmatter. */
import { lecturePaths } from "./lecture.ts";
import { topicStatus, isDue, understood, isDone, overdueDays, type Status } from "../status.ts";
import type { SoHoc } from "./sohoc.ts";
import { parseSources, parseNeed } from "./coverage.ts";
import { type Profile } from "./profile.ts";
import { findGoal, profileOf, linkTarget } from "./goal.ts";
import { parseMaterials } from "./materials.ts";

export interface FileRec { path: string; basename: string; fm?: Record<string, unknown> }
export interface Topic {
  slug: string; path: string; uid?: string; title: string; order: number; und: string[]; rev?: string; next?: string;
  cards: number; dom: string; status: Status; due: boolean;
  lectures: string[];   // learn_lecture (spec 4.6), chưa giải thành file
  source: string[];     // learn_source (spec 7.11): "<id nguồn>#<tiêu đề mục>"
  need: "core" | "later";   // learn_need: thiếu = core
  pend?: string[];   // learn_pending (đợt 9): token chấm đạt tạm trong buổi học, chưa qua lượt kiểm; KHÔNG tính vào und / mức xanh
  materials: string[];   // learn_materials (8b): link tới sơ đồ / canvas / pieflow / mindmap của bài
  dimension?: string;    // learn_dimension (8b): link tới MOC của dimension
  outside?: boolean;   // note không thuộc lộ trình (quiz note, đợt 6): dom = OUTSIDE
}
export const OUTSIDE = "__outside__";
export interface Domain { id: string; title: string; curPath?: string; profile?: Profile; materials: string[]; topics: Topic[] }
export interface Index { domains: Domain[]; all: Topic[]; due: Topic[] }
export interface Group { name: string; stage?: number; khoa?: number; outside?: boolean; list: Topic[] }

/** Filter của dashboard-hoc-tap.base: learn_curriculum != null và type != "log". Thêm: bỏ file quest (đọc riêng ở quest.ts), learn_curriculum rỗng hoặc còn nguyên chỗ giữ `<domain>` (note mẫu). */
export const isTopic = (fm?: Record<string, unknown>) => {
  if (!fm || fm.learn_curriculum == null || fm.type === "log" || fm.type === "quest") return false;
  const c = String(fm.learn_curriculum).trim();
  return !!c && !/^<[^>]*>$/.test(c);
};

export function domainTitle(title: unknown, id: string): string {
  const t = typeof title === "string" ? title.replace(/^(Curriculum|Lộ trình)\s*(—\s*)?/i, "").split(" — ")[0].trim() : "";
  return t || id || "—";
}

/** Bỏ tiền tố định vị trong tiêu đề bài ("… · Khóa 1 · Buổi 3 — ", "1.2 — ") để nhãn bản đồ ngắn. */
export const shortTitle = (t: string) => t.replace(/^[^—]*·[^—]*— /, "").replace(/^[^—\d]{0,16}\d+(?:\.\d+)* — /, "");

/** learn_lecture ưu tiên; không có thì file <thư mục bài giảng>/<slug>.html (agent tạo theo cmdNewLecture không sửa note). */
function lecturesOf(field: unknown, slug: string, lecture?: { dir: string; files: Set<string> }): string[] {
  const l = lecturePaths(field); if (l.length || !lecture) return l;
  const p = `${lecture.dir.replace(/\/+$/, "")}/${slug}.html`;
  return lecture.files.has(p) ? [p] : [];
}
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? undefined : String(v));

export function buildIndex(files: FileRec[], today: string, cardCount: (path: string) => number = () => 0, resolve: (link: string, from: string) => string | undefined = () => undefined, lecture?: { dir: string; files: Set<string> }): Index {
  const doms = new Map<string, Domain>(), cur = new Map<string, FileRec>();
  for (const f of files) if (f.fm && f.fm.domain != null && f.basename.startsWith("curriculum-") && !f.basename.includes(".")) cur.set(String(f.fm.domain), f);
  const goals = files.filter(f => f.fm?.type === "goal");
  for (const f of files) {
    if (!isTopic(f.fm)) continue;
    const fm = f.fm!, id = String(fm.learn_curriculum), und = understood(fm.learn_understood);
    const o = Number(fm.learn_order);
    const t: Topic = {
      slug: f.basename, path: f.path, uid: fm.uid ? String(fm.uid) : undefined, title: str(fm.title) || f.basename, order: Number.isFinite(o) ? o : Infinity,
      und, pend: understood(fm.learn_pending).filter(k => !und.includes(k)), rev: str(fm.learn_reviewed), next: str(fm.learn_next), cards: cardCount(f.path), dom: id,
      status: topicStatus(und, fm.learn_reviewed), due: isDue(fm.learn_next, today), lectures: lecturesOf(fm.learn_lecture, f.basename, lecture),
      source: parseSources(fm.learn_source), need: parseNeed(fm.learn_need), materials: parseMaterials(fm.learn_materials), dimension: linkTarget(fm.learn_dimension),
    };
    if (!doms.has(id)) { const c = cur.get(id); const profile = c ? profileOf(c.fm, findGoal(goals, c.path, resolve)) : null; doms.set(id, { id, title: domainTitle(c?.fm?.title, id), curPath: c?.path, ...(profile ? { profile } : {}), materials: parseMaterials(c?.fm?.learn_materials), topics: [] }); }
    doms.get(id)!.topics.push(t);
  }
  const domains = [...doms.values()].sort((a, b) => (!a.id ? 1 : 0) - (!b.id ? 1 : 0) || a.id.localeCompare(b.id));   // lĩnh vực rỗng xuống cuối
  for (const d of domains) d.topics.sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));   // R8: trùng learn_order → tên file
  const all = domains.flatMap(d => d.topics);
  return { domains, all, due: all.filter(t => t.due).sort((a, b) => (a.next || "").localeCompare(b.next || "")) };
}

/** Bài kế tiếp: bài đang học đầu tiên, không có thì bài chưa học đầu tiên. */
export const nextOf = (d: Domain) => d.topics.find(t => t.status === "learning") || d.topics.find(t => t.status === "new");

export function domStats(d: Domain) {
  const c = { master: 0, basic: 0, learning: 0, new: 0 };
  d.topics.forEach(t => c[t.status]++);
  return { ...c, done: c.master + c.basic, due: d.topics.filter(t => t.due).length, n: d.topics.length };
}

/** Nhóm bản đồ = nhóm thật của sổ học (Tầng/Phần/Khóa); sổ không có nhóm → chặng 6 bài theo learn_order. */
export function mapGroups(d: Domain, sh: SoHoc | undefined): Group[] {
  if (sh && sh.groups.length > 1) {
    const by = new Map(d.topics.map(t => [t.slug, t])), seen = new Set<string>();
    const g: Group[] = sh.groups.map(([name, slugs]) => ({ name, list: slugs.map(s => by.get(s)).filter((t): t is Topic => !!t && !seen.has(t.slug) && !!seen.add(t.slug)) })).filter(x => x.list.length);
    const rest = d.topics.filter(t => !seen.has(t.slug));
    if (rest.length) g.push({ name: "", outside: true, list: rest });
    if (g.length) return g;
  }
  const g: Group[] = [];
  for (const t of d.topics) {
    const khoa = t.order > 100 && Number.isFinite(t.order) ? Math.floor(t.order / 100) : undefined;
    const stage = khoa ? undefined : Number.isFinite(t.order) ? Math.floor((t.order - 1) / 6) + 1 : undefined;
    let x = g.find(y => y.khoa === khoa && y.stage === stage);
    if (!x) g.push(x = { name: "", khoa, stage, list: [] });
    x.list.push(t);
  }
  if (g.length > 1 && g[g.length - 1].list.length < 3) g[g.length - 2].list.push(...g.pop()!.list);   // chặng đuôi quá ngắn thì gộp
  return g;
}

export const groupDone = (g: Group) => g.list.filter(t => isDone(t.status)).length;

/** Thẻ %%card%% … token: / Q: / A: … %%card%% (spec 4.4). token có thể thiếu (thẻ cũ). */
export function parseCards(body: string): { token?: string; q: string; a: string }[] {
  const out: { token?: string; q: string; a: string }[] = [];
  for (const m of body.matchAll(/^%%card%%\s*\n([\s\S]*?)\n%%card%%\s*$/gm)) {
    const tk = m[1].match(/^token:\s*(\S+)/m), q = m[1].match(/^Q:\s*([\s\S]*?)(?=^A:|$(?![\s\S]))/m), a = m[1].match(/^A:\s*([\s\S]*)$/m);
    if (q && q[1].trim()) out.push({ token: tk?.[1], q: q[1].trim(), a: a ? a[1].trim() : "" });
  }
  return out;
}
export const countCards = (body: string) => parseCards(body).length;

export function sessionsFor(slug: string, buoi: { basename: string; links: string[] }[]): string[] {
  return buoi.filter(b => b.basename.replace(/^\d{4}-\d\d-\d\d-/, "") === slug || b.basename.includes(slug) || b.links.some(l => l.split("/").pop()!.replace(/\.md$/, "") === slug))
    .map(b => b.basename).sort();
}

export const overdueDaysT = (t: Topic, today: string) => (t.next ? overdueDays(t.next, today) : 0);
