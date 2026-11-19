/* Spec 7.10 bước 1 (đổi 2026-11-17): mục tiêu lấy từ goal note của skill muc-tieu. Thuần; plugin chỉ đọc, không ghi. */
import { parseProfile, type Profile } from "./profile.ts";

export interface GoalRec { path: string; basename: string; fm?: Record<string, unknown> }
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const PACES = ["ahead", "on-track", "behind"] as const;

/** "[[a|b]]" / "[[a#c]]" / "a" → "a". */
export function linkTarget(v: unknown): string | undefined {
  const s = text(v); if (!s) return undefined;
  return s.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0].split("#")[0].trim() || undefined;
}

/** Goal đang hoạt động của lộ trình: type goal + status active + learn_path trỏ đúng file lộ trình (resolve = link resolution của metadataCache).
    Nhiều goal → updated rồi created mới nhất. */
export function findGoal<T extends GoalRec>(files: T[], curPath: string, resolve: (link: string, from: string) => string | undefined): T | null {
  const hit = files.filter(f => {
    const fm = f.fm; if (!fm || fm.type !== "goal" || fm.status !== "active") return false;
    const l = linkTarget(fm.learn_path); return !!l && resolve(l, f.path) === curPath;
  });
  const key = (f: T) => text(f.fm!.updated) || text(f.fm!.created) || "";
  return hit.sort((a, b) => key(b).localeCompare(key(a)))[0] || null;
}

const day = (v: unknown) => { const s = text(v)?.slice(0, 10); return s && /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(new Date(s).getTime()) ? s : undefined; };

/** Hồ sơ: có goal → lấy tên/deadline/progress/pace từ goal, learn_level / learn_hours_week / learn_plan_week từ file lộ trình; không có → trường learn_goal cũ. */
export function profileOf(curFm: Record<string, unknown> | undefined, goal?: GoalRec | null): Profile | null {
  if (!goal) return parseProfile(curFm);
  const g = goal.fm || {}, c = curFm || {}, pos = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
  const p: Profile = { goal: text(g.title) || goal.basename, goalPath: goal.path };
  const deadline = day(g.deadline), level = text(c.learn_level), hoursWeek = pos(c.learn_hours_week), planWeek = pos(c.learn_plan_week);
  const progress = typeof g.progress === "number" && Number.isFinite(g.progress) && g.progress >= 0 ? Math.min(100, g.progress) : undefined;
  const pace = PACES.find(x => x === g.pace);
  if (deadline) p.deadline = deadline; if (level) p.level = level; if (hoursWeek) p.hoursWeek = hoursWeek; if (planWeek) p.planWeek = planWeek;
  if (progress != null) p.progress = progress; if (pace) p.pace = pace;
  return p;
}

/** Bỏ ký hiệu markdown để hiện thành chữ thường: [[a|b]] → b, [[a#c]] → a, [t](url) → t, **đậm**, _nghiêng_, ~~gạch~~, ==nổi==, `mã`. */
export function plainText(md: string): string {
  return md
    .replace(/\[\[([^\]|]*?)(?:\|([^\]]*))?\]\]/g, (_, a: string, b?: string) => (b ?? a.split("#")[0]).trim())
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|~~|==|`)(.+?)\1/g, "$2").replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/[`*]/g, "").replace(/\s+/g, " ").trim();
}

/** Mục `## Định nghĩa "xong"` (dấu nháy thẳng hoặc cong): chỉ đoạn văn đầu tiên, bỏ gạch đầu dòng và markdown, thành một dòng; không có mục → undefined. */
export function extractDone(md: string): string | undefined {
  const lines = md.replace(/\r/g, "").split("\n"), i = lines.findIndex(l => /^##\s+Định nghĩa\s+["“”]xong["“”]\s*$/i.test(l)); if (i < 0) return undefined;
  const out: string[] = [];
  for (const l of lines.slice(i + 1)) {
    if (/^#{1,6}\s/.test(l)) break;
    const t = l.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "").trim();
    if (!t) { if (out.length) break; continue; }   // dòng trống sau khi đã có chữ = hết đoạn đầu
    out.push(t);
  }
  return plainText(out.join(" ")) || undefined;
}
