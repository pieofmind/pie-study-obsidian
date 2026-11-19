/* Spec 7.10 bước 2: ngày "nắm cơ bản" (solidAt). Thuần, bất biến: trả log mới, hoặc đúng log cũ khi không có gì đổi. */
import { CORE } from "../status.ts";
import type { PracticeLog } from "./log.ts";

export const isSolid = (und: string[]) => CORE.every(k => und.includes(k));

/** Ngày YYYY-MM-DD → ISO tại giữa trưa địa phương (không lệch ngày khi đổi múi giờ). */
function dayIso(s: string | undefined) {
  const m = s?.match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12); return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** firstRun: lần đầu chạy bản 8a, bài đã đủ từ trước lấy learn_reviewed (không có thì ngày cài) và est: true.
    Đã có solidAt thì không bao giờ ghi đè t; tụt dưới 5 cốt lõi → thêm lost một lần; đủ lại → gỡ lost. */
export function stampSolid(log: PracticeLog, t: { und: string[]; rev?: string }, o: { now: Date; firstRun: boolean; installDay: string }): PracticeLog {
  const solid = isSolid(t.und), cur = log.solidAt;
  if (!cur) {
    if (!solid) return log;
    const at = o.firstRun ? { t: dayIso(t.rev) || dayIso(o.installDay) || o.now.toISOString(), est: true as const } : { t: o.now.toISOString() };
    return { ...log, solidAt: at };
  }
  if (solid && cur.lost) { const { lost: _l, ...rest } = cur; return { ...log, solidAt: rest }; }
  if (!solid && !cur.lost) return { ...log, solidAt: { ...cur, lost: o.now.toISOString() } };
  return log;
}
