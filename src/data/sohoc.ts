/* Parser sổ học so-hoc-<domain>.md — port từ scripts/build-sohoc.py (spec 4.3). Chịu cả 3 khuôn:
   "### " không có [[ ]] = nhóm · "### … [[bài]]" hoặc "N. [[bài]]" = bài · "## Khóa …" cũng là nhóm ·
   "## Bức tranh lớn" = nhận định xuyên bài · wikilink dạng YYYY-MM-DD-… là buổi học, không phải bài. */
export interface SoHocTopic { known: [string, string][]; ev: [string, string][]; gap: string; sessions: string[] }
export interface SoHoc { groups: [string, string[]][]; topics: Record<string, SoHocTopic>; big: string[]; last: string; links: string[] }

const WL = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const DATED = /^\d{4}-\d\d-\d\d-/;
export const base = (s: string) => s.split("/").pop()!.replace(/\.md$/, "");
const links = (s: string) => [...s.matchAll(WL)].map(m => m[1]);

function topSplit(s: string): string[] {   // "a (x, y), b (z)" → ["a (x, y)", "b (z)"]
  const out: string[] = []; let d = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") d++; else if (ch === ")") d--;
    if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  return [...out, cur.trim()].filter(Boolean);
}

function parseTopic(lines: string[]): SoHocTopic {
  const txt = lines.join("\n"), t: SoHocTopic = { known: [], ev: [], gap: "", sessions: [] };
  let m = txt.match(/\*\*Kiến thức đã đạt:\*\*([\s\S]*?)(?: · ✍️|$)/);
  if (m) for (const it of topSplit(m[1].trim().replace(/\.+$/, ""))) {
    const k = it.match(/^([a-z-]+) \(([\s\S]*)\)$/);
    if (k) t.known.push([k[1], k[2]]);
  }
  for (const k of txt.matchAll(/^- \*\*([a-z-]+)\*\* — (.+)$/gm)) t.known.push([k[1], k[2].trim()]);
  m = txt.match(/\*\*Bằng chứng:\*\*([\s\S]*?)(?: · \*\*Mastery|$)/);
  if (m) for (const k of m[1].matchAll(/"([^"]+)" \(([a-z-]+)\)/g)) t.ev.push([k[2], k[1]]);
  for (const k of txt.matchAll(/^- \*\*([a-z-]+)\*\*: "([^"]+)"/gm)) t.ev.push([k[1], k[2]]);
  m = txt.match(/\*\*Gap buổi sau:\*\*\s*([\s\S]*?)(?: >|$)/) || txt.match(/Gap ưu tiên:\s*(.+)/);
  if (m) t.gap = m[1].trim();
  t.sessions = [...new Set(links(txt).map(base).filter(x => DATED.test(x)))].sort();
  return t;
}

export function parseSoHoc(text: string): SoHoc {
  const L = text.split("\n");
  const d: SoHoc = { groups: [], topics: {}, big: [], last: "", links: [] };
  const head = L.slice(0, 20).join("\n");
  const lm = head.match(/Buổi gần nhất:\s*(.+)/);
  if (lm) { const w = links(lm[1]); d.last = w.length ? base(w[0]) : ""; }
  d.links = links(head).map(base).filter(x => x.startsWith("so-do-") || x.startsWith("map-"));
  let zone: "big" | "topics" | null = null, cur: string | null = null, buf: string[] = [];
  const flush = () => { if (cur) d.topics[cur] = parseTopic(buf); };
  for (const ln of L) {
    if (ln.startsWith("## ")) {
      flush(); cur = null; buf = [];
      zone = ln.includes("Bức tranh") ? "big" : "topics";
      if (zone === "topics" && !ln.startsWith("## Theo")) d.groups.push([ln.slice(3).trim(), []]);   // "## Khóa 1 — …" là nhóm
      continue;
    }
    if (zone === "big" && ln.startsWith("- ")) d.big.push(ln.slice(2).trim());
    if (zone !== "topics") continue;
    let tm = ln.match(/^(?:### .*?|\d+\. )\[\[([^\]|]+)/);
    if (tm && DATED.test(base(tm[1]))) tm = null;   // dòng lịch sử buổi, không phải bài
    if (tm) {
      flush(); cur = base(tm[1]); buf = [ln];
      if (!d.groups.length) d.groups.push(["", []]);
      d.groups[d.groups.length - 1][1].push(cur); continue;
    }
    if (ln.startsWith("### ")) { flush(); cur = null; buf = []; d.groups.push([ln.slice(4).trim(), []]); continue; }
    if (cur) buf.push(ln);
  }
  flush();
  d.groups = d.groups.filter(g => g[1].length);
  return d;
}
