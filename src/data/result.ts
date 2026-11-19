/* Đợt 6 (spec 7.6 việc 3) — dữ liệu màn kết quả quest: trạng thái từng câu, đáp án / phương án đã chọn để xem lại. Thuần. */
import { tr } from "../i18n.ts";
import type { QItem, QState } from "./quest.ts";

export type Pick = QState & { input?: string };
/** Câu tự luận (gõ tự do theo từ khoá): hiện trung tính, không tính là sai, không vào sổ lỗi sai. */
export const isEssay = (q: QItem) => q.type === "text";

const optText = (q: QItem, k: number | null | undefined) => (k == null ? "—" : q.tf ? [tr("Đúng"), tr("Sai")][k] ?? "—" : (q.opts || [])[k] ?? "—");
const seq = (list: string[] | undefined, idx: number[] | undefined) => (idx || []).map(k => (list || [])[k]).join(" → ") || "—";

export function answerText(q: QItem): string {
  switch (q.kind) {
    case "choice": return optText(q, q.ans);
    case "order": case "chain": return seq(q.items, q.order);
    case "timeline": return (q.slots || []).map((s, k) => `${s} = ${(q.events || [])[q.order![k]]}`).join(" · ");
    case "match": return (q.pairs || []).map(p => `${p[0]} → ${p[1]}`).join(" · ");
    case "input": return (q.accept || []).join(" / ") || "—";
    default: return "—";
  }
}
export function mineText(q: QItem, p: Pick): string {
  if (p.timedOut) return tr("Hết giờ");
  switch (q.kind) {
    case "choice": return optText(q, p.pick);
    case "order": case "chain": return seq(q.items, p.order);
    case "timeline": return (p.order || []).map((e, k) => `${(q.slots || [])[k]} = ${(q.events || [])[e]}`).join(" · ") || "—";
    case "match": return tr("Sai {0} lần khi nối.", p.mistakes || 0);
    case "input": return p.input?.trim() || "—";
    default: return "—";
  }
}

export function resultRows(items: QItem[], res: boolean[], picks: Pick[]) {
  const rows = items.map((q, k) => ({ k, q, state: isEssay(q) ? "neu" as const : res[k] ? "ok" as const : "no" as const, pick: picks[k] || {} }));
  const wrong = rows.filter(r => r.state === "no");
  return { rows, first: wrong[0]?.k ?? null, graded: rows.filter(r => r.state !== "neu").length, ok: rows.filter(r => r.state === "ok").length,
    wrongTokens: [...new Set(wrong.map(r => r.q.token).filter((x): x is string => !!x))] };
}
