/* Đọc quest-map v1 (spec 4.5) — khối ```quest-map``` trong quest-<domain>-*.md. YAML parser được truyền vào
   (plugin: parseYaml của Obsidian; test: thư viện yaml) để module này thuần. Dạng chưa chơi được → node.skipped. */
export interface QItem {
  type: string; kind: "choice" | "order" | "input" | "match" | "chain" | "timeline" | "iframe"; token?: string; q: string;
  opts?: string[]; ans?: number; tf?: boolean; items?: string[]; order?: number[]; accept?: string[]; ex?: string;
  pairs?: [string, string][]; slots?: string[]; events?: string[]; timer?: number; coins?: number;
  flash?: { items: string[]; descs?: string[]; time: number };   // snapshot / memory-palace: hiện rồi che trước khi hỏi
  image?: string; region?: { x: number; y: number; w: number; h: number; pct: boolean }; html?: string; height?: number;
  quote?: string;   // quiz note (đợt 6): câu chép nguyên văn từ note làm căn cứ
}
export interface QNode { id: string; title: string; summary?: string; boss: boolean; items: QItem[]; skipped?: string }
export interface Quest { uid?: string; path: string; dom?: string; title: string; topics: string[]; nodes: QNode[] }
type Yaml = (s: string) => unknown;
type O = Record<string, unknown>;

const S = (v: unknown) => (v == null ? "" : String(v));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const CHOICE = ["quiz", "countdown", "auction", "image-quiz", "image", "snapshot"];
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? undefined : Number(v));

function items(c: O): QItem[] {
  const type = S(c.type), tok = c.token ? S(c.token) : undefined;
  let qs: unknown = c.questions_json;
  if (typeof qs === "string") { try { qs = JSON.parse(qs); } catch { qs = null; } }
  const list: O[] = Array.isArray(qs) ? (qs as O[]) : [c];
  const extra = (x: O): Partial<QItem> => {
    const e: Partial<QItem> = {};
    if (type === "countdown" || type === "chain") e.timer = num(x.timer ?? c.timer) ?? (type === "chain" ? 30 : 20);
    if (type === "auction") e.coins = num(x.coins ?? c.coins) ?? 100;
    if (type === "snapshot") e.flash = { items: arr(x.snapshot_items ?? c.snapshot_items).map(S), time: num(x.snapshot_time ?? c.snapshot_time) ?? 4 };
    if (x.image ?? c.image) e.image = S(x.image ?? c.image);
    return e;
  };
  if ((type === "image-quiz" || type === "image") && !arr(c.options).length && arr(c.keywords).length)   // ảnh + gõ tự do
    return [{ type, kind: "input", token: tok, q: S(c.question ?? c.prompt), accept: arr(c.keywords).map(S), image: S(c.image), ex: S(c.explanation) }];
  if (CHOICE.includes(type)) return list.map(x => ({ type, kind: "choice" as const, token: x.token ? S(x.token) : tok, q: S(x.q ?? x.question), opts: arr(x.opts ?? x.options).map(S), ans: Number(x.ans ?? x.answer), ex: S(x.explanation), ...extra(x) }))
    .filter(x => x.q && x.opts.length && Number.isInteger(x.ans) && x.ans >= 0 && x.ans < x.opts.length);
  if (type === "memory-palace") { const it = arr(c.palace_items).map(S), ans = it.indexOf(S(c.answer));   // answer là CHUỖI khớp một phần tử
    return ans >= 0 ? [{ type, kind: "choice", token: tok, q: S(c.question), opts: it, ans, flash: { items: it, descs: arr(c.palace_descs).map(S), time: num(c.palace_time) ?? 10 }, ex: S(c.explanation) }] : []; }
  if (type === "match") { const pairs = arr(c.pairs).filter(Array.isArray).map(p => [S((p as unknown[])[0]), S((p as unknown[])[1])] as [string, string]).filter(p => p[0] && p[1]);
    return pairs.length >= 2 ? [{ type, kind: "match", token: tok, q: S(c.question), pairs, ex: S(c.explanation) }] : []; }
  if (type === "chain") { const it = arr(c.chain_items).map(S), ord = arr(c.answer).map(Number); return it.length && ord.length === it.length ? [{ type, kind: "chain", token: tok, q: S(c.question), items: it, order: ord, timer: num(c.timer) ?? 30, ex: S(c.explanation) }] : []; }
  if (type === "timeline") { const sl = arr(c.slots).map(S), ev = arr(c.events).map(S), ord = arr(c.answer).map(Number); return sl.length && ord.length === sl.length ? [{ type, kind: "timeline", token: tok, q: S(c.question), slots: sl, events: ev, order: ord, ex: S(c.explanation) }] : []; }
  if (type === "image-occlusion") { const pct = c.region_x_pct != null, g = (k: string) => num(c[pct ? `region_${k}_pct` : `region_${k}`]) ?? 0;
    return c.image && c.answer != null ? [{ type, kind: "input", token: tok, q: S(c.prompt ?? c.question), accept: [S(c.answer)], image: S(c.image), region: { x: g("x"), y: g("y"), w: g("width"), h: g("height"), pct }, ex: S(c.explanation) }] : []; }
  if (type === "iframe") return c.html ? [{ type, kind: "iframe", token: tok, q: S(c.question ?? c.prompt), html: S(c.html), height: num(c.height) ?? 520 }] : [];
  if (type === "truefalse") return list.map(x => ({ type, kind: "choice" as const, tf: true, token: x.token ? S(x.token) : tok, q: S(x.statement ?? x.q ?? x.question), opts: ["Đúng", "Sai"], ans: x.answer === true || x.answer === "true" || x.ans === true ? 0 : 1, ex: S(x.explanation) })).filter(x => x.q);
  if (type === "order") { const it = arr(c.items).map(S), ord = arr(c.answer).map(Number); return it.length && ord.length === it.length ? [{ type, kind: "order", token: tok, q: S(c.question), items: it, order: ord, ex: S(c.explanation) }] : []; }
  if (type === "cloze") return list.map(x => { const s = S(x.sentence ?? x.q); const acc = [...s.matchAll(/\{\{c\d+::([^}]+?)\}\}/g)].map(m => m[1].trim());
    return { type, kind: "input" as const, token: x.token ? S(x.token) : tok, q: s.replace(/\{\{c\d+::[^}]+?\}\}/g, "____"), accept: acc, ex: S(x.explanation) }; }).filter(x => x.accept.length);
  if (type === "text" || type === "input") return list.map(x => ({ type, kind: "input" as const, token: x.token ? S(x.token) : tok, q: S(x.prompt ?? x.question ?? x.q), accept: arr(x.keywords).map(S).filter(Boolean), ex: S(x.explanation) })).filter(x => x.q && x.accept.length);
  return [];
}

export function parseQuest(text: string, path: string, yaml: Yaml): Quest | null {
  const m = text.match(/```quest-map\s*\n([\s\S]*?)\n```/); if (!m) return null;
  let d: O, fm: O = {};
  try { d = yaml(m[1]) as O; } catch { return null; }
  if (!d || !Array.isArray(d.nodes)) return null;
  const f = text.match(/^---\n([\s\S]*?)\n---/);
  if (f) { try { fm = (yaml(f[1]) as O) || {}; } catch { fm = {}; } }
  const nodes = (d.nodes as O[]).filter(n => n && n.id).map(n => {
    const c = (n.challenge || {}) as O, it = items(c);
    const node: QNode = { id: S(n.id), title: S(n.title) || S(n.id), summary: n.summary ? S(n.summary) : undefined, boss: n.boss === true, items: it };
    if (!it.length) node.skipped = S(c.type) || "?";
    return node;
  });
  return { uid: fm.uid ? S(fm.uid) : undefined, path, dom: fm.learn_curriculum ? S(fm.learn_curriculum) : undefined, title: S(fm.title) || path.split("/").pop()!.replace(/\.md$/, ""), topics: arr(fm.source_topics).map(x => S(x).replace(/^\[\[|\]\]$/g, "")), nodes };
}

export const questKey = (q: Quest, n: QNode) => `${q.uid || q.path}/${n.id}`;
/** Chữ định danh một câu (đợt 4: khoá sổ lỗi sai): câu hỏi, câu không có đề (nối cặp, sắp thứ tự) thì ghép các mục. */
export const itemText = (it: QItem) => it.q || [...(it.items || []), ...(it.pairs || []).flat(), ...(it.events || [])].join(" · ");

const fold = (s: string) => s.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
export function gradeInput(answer: string, it: QItem): boolean {
  const a = fold(answer); if (!a) return false;
  return it.type === "cloze" || it.type === "image-occlusion" ? (it.accept || []).some(x => fold(x) === a) : (it.accept || []).some(x => a.includes(fold(x)));
}

/** Trạng thái một câu đang làm (do view giữ). */
export interface QState { pick?: number | null; order?: number[]; checked?: boolean | null; matched?: number[]; mistakes?: number; score?: number | null; timedOut?: boolean }
/** Đúng/sai của một câu theo dạng; null = chưa xong. order/chain/timeline: order = chỉ số đã chọn theo lượt. */
export function judge(q: QItem, s: QState): boolean | null {
  if (s.timedOut) return false;
  const ord = s.order || [], miss = s.mistakes || 0;
  switch (q.kind) {
    case "choice": return s.pick == null ? null : s.pick === q.ans;
    case "input": return s.checked ?? null;
    case "order": return ord.length === (q.items || []).length ? ord.every((x, k) => x === q.order![k]) : null;
    case "chain": return miss >= 3 ? false : ord.length === (q.items || []).length ? true : null;   // chain chỉ nhận bước đúng
    case "timeline": return ord.length === (q.slots || []).length ? ord.every((x, k) => x === q.order![k]) : null;
    case "match": return (s.matched || []).length === (q.pairs || []).length ? miss === 0 : null;
    case "iframe": return s.score == null ? null : s.score >= 50;
  }
  return null;
}

const words = (s: string) => new Set(fold(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").split(/[^a-z0-9]+/).filter(w => w.length > 1));
/** Node ứng với một bài: nhiều từ chung nhất giữa (id + tiêu đề node) và (slug + tiêu đề bài); không có thì node thường đầu tiên. */
export function nodeForTopic(q: Quest, t: { slug: string; title: string }): QNode | null {
  const want = new Set([...words(t.slug), ...words(t.title)]);
  const play = q.nodes.filter(n => !n.boss && n.items.length);
  let best: [QNode, number] | null = null;
  for (const n of play) { const w = [...words(n.id + " " + n.title)].filter(x => want.has(x)).length; if (!best || w > best[1]) best = [n, w]; }
  return best && best[1] > 0 ? best[0] : play[0] || null;
}

/** Boss của một nhóm: node boss của quest có bài nguồn nằm trong nhóm. */
export function bossFor(quests: Quest[], slugs: string[]): { quest: Quest; node: QNode } | null {
  for (const q of quests) { if (!q.topics.some(s => slugs.includes(s))) continue; const n = q.nodes.find(x => x.boss && x.items.length); if (n) return { quest: q, node: n }; }
  return null;
}

/** Phương án tham chiếu vị trí ("cả A và B", "tất cả các ý trên", "none of the above"…) → không được xáo. Chỉ để đỡ file cũ; skill đã cấm kiểu viết này. */
const POSITIONAL = [/\b(cả|both)\s+[a-h]\s+(và|and)\s+[a-h]\b/i, /^\s*[a-h]\s+(và|and)\s+[a-h]\b/i, /tất cả (các )?(ý|đáp án|phương án|câu)( ở)? trên/i, /không (có )?(ý|đáp án|phương án) nào/i, /\b(all|none) of the above\b/i];
export const positionalOpts = (opts: string[]) => opts.some(o => POSITIONAL.some(r => r.test(o)));
/** Thứ tự HIỆN của phương án câu trắc nghiệm một đáp án: hoán vị ngẫu nhiên các chỉ số gốc (ô thứ pos hiện opts[order[pos]]).
    Chấm, xem lại, khoá câu và nhật ký vẫn dùng chỉ số gốc. Đúng/sai, 1 phương án, hoặc có phương án tham chiếu vị trí → giữ nguyên. */
export function optionOrder(q: QItem, rand: () => number = Math.random): number[] {
  const n = (q.opts || []).length, id = [...Array(n).keys()];
  if (q.kind !== "choice" || q.tf || n < 2 || positionalOpts(q.opts!)) return id;
  for (let k = n - 1; k > 0; k--) { const j = Math.min(k, Math.floor(rand() * (k + 1))); [id[k], id[j]] = [id[j], id[k]]; }
  return id;
}
