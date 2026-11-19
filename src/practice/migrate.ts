/* Chuyển dữ liệu EngramQuest (spec 5.1): đọc một lần, KHÔNG xoá dữ liệu cũ, không ghi đè lịch mới hơn của Pie Study.
   Thuần: nhận nội dung file đã đọc, trả các log cần ghi + báo cáo. Việc ghi do plugin làm sau khi người dùng bấm. */
import { emptyLog, logFileName, cardKey, normQ, similarity, type PracticeLog, type CardRef } from "./log.ts";

export interface SrEntry { due?: string; interval?: number; stability?: number; difficulty?: number; state?: number; repetitions?: number }
export interface QuestState { questPath?: string; nodes?: Record<string, { completed?: boolean; scorePct?: number; attempts?: number; lastPlayed?: string }>; tokens?: Record<string, { ok?: number; miss?: number }> }
export interface TopicRef { uid?: string; path: string; cards: CardRef[] }
export interface MigrateInput {
  sr: { file: string; data: Record<string, SrEntry> }[];
  quests: { file: string; data: QuestState }[];
  findTopic: (path: string) => TopicRef | null;
  findQuest: (path: string) => { key: string; topics: string[] } | null;   // topics = path các bài nguồn
  existing: (t: TopicRef) => PracticeLog | undefined;
}
export interface MigrateReport { srFiles: number; matched: number; fuzzy: number; kept: number; unmatched: { file: string; q: string }[]; notTopic: string[]; questFiles: number; questNodes: number; questMissing: string[] }

const fileToPath = (f: string) => f.replace(/\.json$/, "").split("__").join("/") + ".md";
const localDay = (d: string) => { const m = d.match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d); };

export function migrateEngram(inp: MigrateInput): { logs: Map<string, PracticeLog>; report: MigrateReport } {
  const logs = new Map<string, PracticeLog>(), rep: MigrateReport = { srFiles: inp.sr.length, matched: 0, fuzzy: 0, kept: 0, unmatched: [], notTopic: [], questFiles: inp.quests.length, questNodes: 0, questMissing: [] };
  const logOf = (t: TopicRef) => { const k = logFileName(t); if (!logs.has(k)) logs.set(k, inp.existing(t) || emptyLog(t)); return [k, logs.get(k)!] as const; };

  for (const { file, data } of inp.sr) {
    const t = inp.findTopic(fileToPath(file)); if (!t) { rep.notTopic.push(file); continue; }
    let [k, log] = logOf(t);
    for (const [q, e] of Object.entries(data || {})) {
      let card = t.cards.find(c => normQ(c.q) === normQ(q)), fuzzy = false;
      if (!card) { const best = t.cards.map(c => [c, similarity(c.q, q)] as const).sort((a, b) => b[1] - a[1])[0]; if (best && best[1] >= 0.7) { card = best[0]; fuzzy = true; } }
      if (!card || !e?.due) { rep.unmatched.push({ file, q }); continue; }
      const key = cardKey(card.q);
      if (log.cards[key]) { rep.kept++; continue; }   // Pie Study đã có lịch riêng → giữ
      const due = localDay(e.due), last = new Date(due.getTime() - (e.interval || 0) * 864e5);
      log = { ...log, cards: { ...log.cards, [key]: { ...(card.token ? { token: card.token } : {}), q: normQ(card.q), due: due.toISOString(), stability: e.stability ?? 0, difficulty: e.difficulty ?? 5, state: e.state ?? 0, reps: e.repetitions ?? 0, lapses: 0, steps: 0, last: last.toISOString() } } };
      fuzzy ? rep.fuzzy++ : rep.matched++;
    }
    logs.set(k, log);
  }

  for (const { file, data } of inp.quests) {
    const q = inp.findQuest(data?.questPath || fileToPath(file)); if (!q) { rep.questMissing.push(file); continue; }
    const ts = q.topics.map(p => inp.findTopic(p)).filter((x): x is TopicRef => !!x);
    ts.forEach((t, n) => {
      let [k, log] = logOf(t), added = 0;
      for (const [id, s] of Object.entries(data.nodes || {})) {
        const key = `${q.key}/${id}`; if (log.quests[key]) continue;
        log = { ...log, quests: { ...log.quests, [key]: { scorePct: s.scorePct ?? 0, attempts: s.attempts ?? 0, last: s.lastPlayed || "" } } };
        added++; if (n === 0) rep.questNodes++;
      }
      if (n === 0 && added && data.tokens) {   // tokens chỉ cộng vào bài nguồn đầu tiên, và chỉ khi quest này mới được chuyển lần đầu (chạy lại không cộng dồn)
        const tk = { ...log.tokens };
        for (const [tok, v] of Object.entries(data.tokens)) { const o = tk[tok] || { ok: 0, miss: 0 }; tk[tok] = { ok: o.ok + (v.ok || 0), miss: o.miss + (v.miss || 0) }; }
        log = { ...log, tokens: tk };
      }
      logs.set(k, log);
    });
  }
  return { logs, report: rep };
}
