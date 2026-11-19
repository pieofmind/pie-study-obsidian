/* Đợt 5 (spec 7.5 việc 1) — độ vững từng kiểu hiểu, tính từ attempts. Thuần. Là tín hiệu cho agent đọc, KHÔNG phải mastery. */
import type { Attempt } from "./log.ts";

const W = [0.5, 0.7, 0.85, 0.95, 1.0];   // trọng số từ cũ tới mới; ít lượt thì lấy các trọng số cuối
const CAP: Record<number, number> = { 1: 0.5, 2: 0.8 };   // chặn đoán trúng may mắn

/** Tối đa 5 lượt gần nhất của kiểu hiểu, bỏ lượt assisted. Chưa có lượt nào → null. */
export function strengthOf(attempts: Attempt[], token: string): number | null {
  const r = attempts.filter(a => a.token === token && !a.assisted).slice(-5); if (!r.length) return null;
  const w = W.slice(-r.length), tot = w.reduce((s, x) => s + x, 0);
  return Math.min(r.reduce((s, a, k) => s + (a.ok ? w[k] : 0), 0) / tot, CAP[r.length] ?? 1);
}
/** { token: độ vững làm tròn 2 số } cho mọi kiểu hiểu có lượt — ghi vào nhật ký cùng lần với attempts. */
export function strengths(attempts: Attempt[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tok of new Set(attempts.map(a => a.token).filter((x): x is string => !!x))) { const s = strengthOf(attempts, tok); if (s != null) out[tok] = Math.round(s * 100) / 100; }
  return out;
}
/** 0 chưa có lượt · 1 yếu (< 0.5) · 2 đang lên (< 0.85) · 3 vững. Ngưỡng 0.85 để 2 lượt đúng (chặn 0.8) chưa thành vững. */
export const strengthLevel = (s: number | null | undefined) => (s == null ? 0 : s < 0.5 ? 1 : s < 0.85 ? 2 : 3);
