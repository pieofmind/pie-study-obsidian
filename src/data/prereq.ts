/* Điều kiện học trước: "cần (n)" trong mục "## Lộ trình học" của file curriculum-* (skill curriculum, templates.md §3). Plugin chỉ đọc. Thuần. */
import { coreTmp, isDone, type Status } from "../status.ts";

const ITEM = /^\s*(\d+)\.\s+.*?\[\[([^\]|#]+)/;
const NEED = /cần\s*:?\s*((?:\(?\s*\d+(?:\s*,\s*\d+)*\s*\)?\s*)+)/;

/** Mục "Lộ trình học" (tới heading ## kế); không có mục đó → cả thân. */
function pathSection(body: string): string[] {
  const lines = body.split("\n"), s = lines.findIndex(l => /^##\s+Lộ trình học/i.test(l));
  if (s < 0) return lines;
  const e = lines.findIndex((l, k) => k > s && /^##\s/.test(l));
  return lines.slice(s + 1, e < 0 ? undefined : e);
}

/** slug bài → slug các bài phải học trước. Số trỏ tới bài không có trong danh sách thì bỏ. */
export function parseNeeds(body: string): Map<string, string[]> {
  const items = pathSection(body).map(l => l.match(ITEM)).filter((m): m is RegExpMatchArray => !!m).map((m, k, all) => ({ n: m[1], slug: m[2].trim(), line: all[k].input || "" }));
  const byNum = new Map(items.map(x => [x.n, x.slug]));
  const out = new Map<string, string[]>();
  for (const x of items) {
    const m = x.line.match(NEED);
    const req = m ? [...new Set((m[1].match(/\d+/g) || []).map(n => byNum.get(n)).filter((s): s is string => !!s && s !== x.slug))] : [];
    if (req.length) out.set(x.slug, req);
  }
  return out;
}

interface LockT { slug: string; und: string[]; pend?: string[]; status: string }

/** Bài cần trước chưa đủ 5 lõi (tính cả token tạm learn_pending). Bài đã vững không khoá; bài cần trước chưa có note thì không chặn (không biết được). */
export function lockOf(t: LockT, needs: Map<string, string[]>, topics: LockT[]): string[] {
  if (isDone(t.status as Status)) return [];
  return (needs.get(t.slug) || []).filter(s => {
    const p = topics.find(x => x.slug === s);
    return !!p && !coreTmp(p.und, p.pend);
  });
}
