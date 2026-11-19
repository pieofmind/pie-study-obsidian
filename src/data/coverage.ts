/* Bản đồ phủ (spec 7.11): bài nào trỏ vào mục nào của mục lục nguồn. Thuần, không cần Obsidian. */
import { headingKey, type Heading } from "./library.ts";
import { isSolid } from "../practice/solid.ts";

export type Cov = "none" | "new" | "learning" | "basic";
const RANK: Record<Cov, number> = { none: 0, new: 1, learning: 2, basic: 3 };
interface T { slug: string; path: string; title: string; status: string; und?: string[]; source: string[]; need: "core" | "later" }

export const parseSources = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === "string" && x.includes("#"));
export const parseNeed = (v: unknown): "core" | "later" => (typeof v === "string" && v.trim().toLowerCase() === "later" ? "later" : "core");

const split = (p: string) => { const i = p.indexOf("#"); return { id: p.slice(0, i).trim(), key: headingKey(p.slice(i + 1)).toLowerCase() }; };
/** Mục chứa bài = cấp 2 trở xuống; cấp 1 là nhóm. Mục lục chỉ có cấp 1 thì cấp 1 là mục. */
const isSection = (h: Heading, all: Heading[]) => h.level > 1 || !all.some(x => x.level > 1);
const stateOf = (t: T): Cov => (t.status === "master" || t.status === "basic" ? "basic" : t.status === "learning" ? "learning" : "new");

export interface CovRow { h: Heading; group: boolean; topics: T[]; state: Cov }
export function coverageOf(srcId: string, heads: Heading[], topics: T[]) {
  const rows: CovRow[] = heads.map(h => ({ h, group: !isSection(h, heads), topics: [], state: "none" }));
  const first = new Map<string, CovRow>();
  for (const r of rows) if (!r.group && !first.has(r.h.id.toLowerCase())) first.set(r.h.id.toLowerCase(), r);
  for (const t of topics) for (const p of t.source) {
    const s = split(p); const r = s.id === srcId ? first.get(s.key) : undefined;
    if (r && !r.topics.includes(t)) r.topics.push(t);
  }
  const counts = { none: 0, new: 0, learning: 0, basic: 0 };
  for (const r of rows) {
    if (r.group) continue;
    r.state = r.topics.map(stateOf).reduce((lo, s) => (RANK[s] < RANK[lo] ? s : lo), "basic" as Cov);
    if (!r.topics.length) r.state = "none";
    counts[r.state]++;
  }
  return { rows, counts };
}

/** Bài có ít nhất một giá trị trỏ vào nguồn CÓ mục lục mà không khớp mục nào. Nguồn không có mục lục thì bỏ qua. */
export function badLessons(topics: T[], heads: Map<string, Heading[]>): T[] {
  return topics.filter(t => t.source.some(p => {
    const s = split(p), hs = heads.get(s.id); if (!hs) return false;
    return !hs.some(h => isSection(h, hs) && h.id.toLowerCase() === s.key);
  }));
}

/** Số bài còn phải nắm: chưa nắm cơ bản và không để sau. */
export const neededCount = (topics: T[]) => topics.filter(t => t.need !== "later" && !isSolid(t.und || [])).length;
