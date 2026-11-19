/* Huy hiệu (spec 7.2b) — thuần, không đụng Obsidian. Bảng 28 huy hiệu theo prototype badges.js (?v=65).
   Mỗi huy hiệu = một ngưỡng trên một chỉ số; mở rồi thì ghi vào sổ chung .achievements/state.json (khoá `unlocked`) để Pie Galaxy cũng hiện được. */
import { streaks } from "../practice/rhythm.ts";
import type { PracticeLog } from "../practice/log.ts";

export type Rarity = "UC" | "R" | "LEG";
export type Fam = "review" | "streak" | "daily" | "learn" | "conquer" | "teach";
export interface Stats { reviews: number; streak: number; daily: number; ontime: number; bosses: number; perfect: number; basics: number; masters: number; teach: number; stages: number; paths: number }
export type Field = keyof Stats;
export interface Badge { id: string; fam: Fam; rar: Rarity; field: Field; th: number; name: string; desc: string; g: string }

export const LEDGER_PATH = ".achievements/state.json";
/** Trận boss tính là thắng khi đúng từ một nửa số câu. */
export const BOSS_WIN_PCT = 50;

export const FAM: Record<Fam, [string, string]> = {
  review: ["Ôn thẻ", "#2896A4"], streak: ["Chuỗi ngày", "#FF7448"], daily: ["Một ngày chăm", "#FFAE1F"],
  learn: ["Hiểu bài", "#1FB573"], conquer: ["Chinh phục", "#9166FF"], teach: ["Dạy lại", "#F0609E"],
};
export const RAR: Record<Rarity, string> = { UC: "Thường", R: "Hiếm", LEG: "Huyền thoại" };

export const BADGES: Badge[] = ([
  ["ps_first_card", "review", "UC", "reviews", 1, "Thẻ đầu tiên", "Ôn thẻ lần đầu", "card"],
  ["ps_cards_10", "review", "UC", "reviews", 10, "Mười lá", "Ôn 10 thẻ", "cards"],
  ["ps_cards_50", "review", "R", "reviews", 50, "Năm mươi lá", "Ôn 50 thẻ", "cards"],
  ["ps_cards_100", "review", "R", "reviews", 100, "Trăm thẻ", "Ôn 100 thẻ", "deck"],
  ["ps_cards_500", "review", "LEG", "reviews", 500, "Thư viện sống", "Ôn 500 thẻ", "deck"],
  ["ps_cards_1000", "review", "LEG", "reviews", 1000, "Nghìn lần nhớ", "Ôn 1000 thẻ", "crown"],
  ["ps_streak_3", "streak", "UC", "streak", 3, "Ba ngày", "Học 3 ngày liền", "flame"],
  ["ps_streak_7", "streak", "R", "streak", 7, "Trọn tuần", "Học 7 ngày liền", "flame"],
  ["ps_streak_30", "streak", "LEG", "streak", 30, "Một tháng", "Học 30 ngày liền", "flame"],
  ["ps_streak_100", "streak", "LEG", "streak", 100, "Trăm ngày", "Học 100 ngày liền", "flame"],
  ["ps_daily_20", "daily", "UC", "daily", 20, "Buổi chăm", "Ôn 20 thẻ trong một ngày", "bolt"],
  ["ps_daily_50", "daily", "R", "daily", 50, "Buổi dài", "Ôn 50 thẻ trong một ngày", "bolt"],
  ["ps_daily_100", "daily", "LEG", "daily", 100, "Ngày vàng", "Ôn 100 thẻ trong một ngày", "bolt"],
  ["ps_basic_1", "learn", "UC", "basics", 1, "Bài đầu nắm chắc", "Nắm cơ bản 1 bài (đủ 5 dấu cốt lõi)", "sprout"],
  ["ps_basic_10", "learn", "R", "basics", 10, "Mười bài vững", "Nắm cơ bản 10 bài", "sprout"],
  ["ps_basic_50", "learn", "LEG", "basics", 50, "Năm mươi bài", "Nắm cơ bản 50 bài", "sprout"],
  ["ps_master_1", "learn", "R", "masters", 1, "Master đầu tiên", "Đủ 17/17 kiểu hiểu một bài", "star"],
  ["ps_master_10", "learn", "LEG", "masters", 10, "Bậc thầy", "Đủ 17/17 kiểu hiểu ở 10 bài", "star"],
  ["ps_ontime_20", "learn", "R", "ontime", 20, "Đúng hẹn", "Ôn 20 bài ngay trong ngày tới hạn", "clock"],
  ["ps_stage_1", "conquer", "UC", "stages", 1, "Qua tầng", "Nắm hết bài trong một tầng", "flag"],
  ["ps_stage_5", "conquer", "R", "stages", 5, "Năm tầng", "Qua 5 tầng", "flag"],
  ["ps_boss_1", "conquer", "R", "bosses", 1, "Hạ boss", "Thắng một trận tổng hợp", "trophy"],
  ["ps_boss_10", "conquer", "LEG", "bosses", 10, "Săn boss", "Thắng 10 trận tổng hợp", "trophy"],
  ["ps_perfect", "conquer", "LEG", "perfect", 1, "Không sai câu nào", "Một quest đúng hết", "gem"],
  ["ps_paths_3", "conquer", "R", "paths", 3, "Ba lộ trình", "Đang học 3 lĩnh vực", "map"],
  ["ps_teach_1", "teach", "UC", "teach", 1, "Lần đầu dạy lại", "Teach-back đạt ở một bài", "mic"],
  ["ps_teach_10", "teach", "R", "teach", 10, "Người kể chuyện", "Teach-back đạt ở 10 bài", "mic"],
  ["ps_teach_30", "teach", "LEG", "teach", 30, "Người thầy", "Teach-back đạt ở 30 bài", "mic"],
] as const).map(([id, fam, rar, field, th, name, desc, g]) => ({ id, fam, rar, field, th, name, desc, g }));

/** Chỉ số lấy từ nhật ký luyện tập. bossKeys = khoá quest của các node boss (một boss ghi vào mọi bài nguồn, nên gộp theo khoá). */
export function practiceStats(logs: PracticeLog[], bossKeys: Set<string>): Pick<Stats, "reviews" | "streak" | "daily" | "ontime" | "bosses" | "perfect"> {
  let reviews = 0, ontime = 0;
  const days = new Map<string, number>(), best = new Map<string, number>();
  for (const l of logs) {
    for (const c of Object.values(l.cards)) reviews += c.reps || 0;
    ontime += l.ontime || 0;
    for (const [d, n] of Object.entries(l.days || {})) days.set(d, (days.get(d) || 0) + n);
    for (const [k, q] of Object.entries(l.quests)) best.set(k, Math.max(best.get(k) ?? 0, q.scorePct));
  }
  const streak = streaks(days.keys(), "").best;   // cùng hàm với Nhịp học (đợt 5)
  const bosses = [...best].filter(([k, p]) => bossKeys.has(k) && p >= BOSS_WIN_PCT).length;
  const perfect = [...best.values()].filter(p => p === 100).length;
  return { reviews, streak, daily: Math.max(0, ...days.values()), ontime, bosses, perfect };
}

export const earned = (st: Stats) => BADGES.filter(b => st[b.field] >= b.th).map(b => b.id);

/** Đọc → gộp → trả nội dung mới của sổ chung. Chỉ thêm id chưa có vào `unlocked`; mọi khoá khác giữ nguyên.
    Sổ hỏng thì không ghi (text null, error "corrupt") để khỏi xoá huy hiệu của plugin khác. Không có gì mới thì text null. */
export function mergeLedger(raw: string | null, add: Badge[], nowIso: string): { text: string | null; added: string[]; error?: "corrupt" } {
  let cur: Record<string, unknown> = { version: 1 };
  if (raw != null) {
    try { cur = JSON.parse(raw); } catch { return { text: null, added: [], error: "corrupt" }; }
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return { text: null, added: [], error: "corrupt" };
  }
  const prev = cur.unlocked && typeof cur.unlocked === "object" && !Array.isArray(cur.unlocked) ? cur.unlocked as Record<string, unknown> : {};
  const added = add.filter(b => !(b.id in prev));
  if (!added.length) return { text: null, added: [] };
  const unlocked = { ...prev, ...Object.fromEntries(added.map(b => [b.id, { unlockedAt: nowIso, name: b.name, rarity: b.rar }])) };
  return { text: JSON.stringify({ ...cur, unlocked }, null, 2), added: added.map(b => b.id) };
}

/** Ngày mở các huy hiệu ps_* đã có trong sổ (để hiện "Mới mở" và giữ huy hiệu dù chỉ số tụt). */
export function ledgerDates(raw: string | null): Record<string, string> {
  try {
    const u = raw ? JSON.parse(raw)?.unlocked : null;
    return u && typeof u === "object" ? Object.fromEntries(Object.entries(u).filter(([k]) => k.startsWith("ps_")).map(([k, v]) => [k, String((v as { unlockedAt?: unknown })?.unlockedAt || "")])) : {};
  } catch { return {}; }
}
