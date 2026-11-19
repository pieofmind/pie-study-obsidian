/* Luật trạng thái — MỘT chỗ duy nhất, khớp công thức dashboard-hoc-tap.base (spec 4.1):
   status: if(learn_understood.length >= 17, master, if(containsAll(5 core), basic, if(learn_reviewed, learning, new)))
   tới hạn: learn_next && date(learn_next) <= today() */
export type Status = "master" | "basic" | "learning" | "new";
export const CORE = ["essence", "mechanism", "application", "discrimination", "teach-back"];

export function understood(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(x => x != null).map(String);
  return typeof v === "string" && v.trim() ? [v.trim()] : [];
}

export function topicStatus(und: string[], reviewed: unknown): Status {
  if (und.length >= 17) return "master";
  if (CORE.every(c => und.includes(c))) return "basic";
  if (reviewed != null && reviewed !== "" && reviewed !== false) return "learning";
  return "new";
}

export const isDone = (s: Status) => s === "basic" || s === "master";

/** "YYYY-MM-DD[ THH:MM[:SS]]" → mốc giờ máy; không phải ngày → null (Bases date() lỗi → không tới hạn). */
export function localMs(s: unknown): number | null {
  const m = typeof s === "string" && s.match(/^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d))?)?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime() : null;
}

export function isDue(next: unknown, today: string): boolean {
  const n = localMs(next), t = localMs(today);
  return n != null && t != null && n <= t;
}

export function overdueDays(next: string, today: string): number {
  const n = localMs(next), t = localMs(today);
  return n == null || t == null ? 0 : Math.round((t - n) / 864e5);
}

/** 1 sao = đủ 5 core · 2 = từ 12/17 (và đủ core) · 3 = 17/17 (spec Q6). */
export function starsOf(und: string[]): number {
  const st = topicStatus(und, null);
  return und.length >= 17 ? 3 : isDone(st) && und.length >= 12 ? 2 : isDone(st) ? 1 : 0;
}

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** dd/mm (hoặc dd/mm/yyyy) từ chuỗi bắt đầu bằng YYYY-MM-DD. Giá trị thiếu hoặc không phải ngày (vd frontmatter ghi nhầm "learn_next") → "—", không cắt chuỗi mù. */
export function fmtDate(s: unknown, year = false): string {
  const m = typeof s === "string" && s.match(/^(\d{4})-(\d\d)-(\d\d)/);
  return m ? `${m[3]}/${m[2]}${year ? "/" + m[1] : ""}` : "—";
}
