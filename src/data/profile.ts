/* Spec 7.10 bước 1: hồ sơ lộ trình đọc từ frontmatter file curriculum-<domain>.md. Plugin chỉ đọc, agent ghi. Thuần. */
export interface Profile { goal: string; level?: string; deadline?: string; hoursWeek?: number; planWeek?: number;
  goalPath?: string; progress?: number; pace?: "ahead" | "on-track" | "behind"; done?: string; final?: import("./goal.ts").FinalTest }   // 4 trường cuối chỉ có khi lấy từ goal note (src/data/goal.ts)

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
function day(v: unknown) {
  const s = text(v), m = s?.match(/^(\d{4})-(\d\d)-(\d\d)$/); if (!m) return undefined;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? s : undefined;
}

/** Thiếu learn_goal = chưa có hồ sơ. Trường sai kiểu bị bỏ đúng trường đó. */
export function parseProfile(fm: Record<string, unknown> | undefined): Profile | null {
  const goal = text(fm?.learn_goal); if (!fm || !goal) return null;
  const p: Profile = { goal };
  const level = text(fm.learn_level), deadline = day(fm.learn_deadline), hoursWeek = num(fm.learn_hours_week), planWeek = num(fm.learn_plan_week);
  if (level) p.level = level; if (deadline) p.deadline = deadline; if (hoursWeek) p.hoursWeek = hoursWeek; if (planWeek) p.planWeek = planWeek;
  return p;
}
