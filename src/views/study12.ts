/* Đợt 8b: màn "Bài giảng của lộ trình" (screen `lectures`). Số khối đọc từ file khi cần, có cache theo mtime ở StudyView. */
import { tr } from "../i18n.ts";
import { i, esc, crumb, curDom, domName, STLABEL, type Ctx } from "./shared.ts";
import type { Topic } from "../data/index.ts";
import { cmdNewLecture, GUIDE_PATH } from "../data/lecguide.ts";

export function lecturesScreen(C: Ctx) {
  const d = curDom(C); if (!d) return "";
  const f = C.S.lecF || "all", rows = d.topics.map((t, k) => ({ t, k, has: t.lectures.length > 0 }));
  const has = rows.filter(r => r.has).length, list = rows.filter(r => f === "all" || (f === "has" ? r.has : !r.has));
  const tabs: [string, string, number][] = [["all", tr("Tất cả"), rows.length], ["has", tr("Đã có"), has], ["none", tr("Chưa có"), rows.length - has]];
  const row = ({ t, k, has }: { t: Topic; k: number; has: boolean }) => {
    const st = C.lecInfo(t), cmd = cmdNewLecture(t.slug, GUIDE_PATH, C.lectureDir);
    const info = has ? `<span class="lc-ok">${i("slides", 13)}${st ? tr("{0} khối", st.blocks) : tr("Bài giảng")}</span>${st && st.ungrounded ? `<span class="lc-warn">${tr("{0} khối chưa bám note", st.ungrounded)}</span>` : ""}` : `<span class="lc-no">${tr("Chưa có bài giảng")}</span>`;
    const act = has ? `<button class="btn" data-go="lecture" data-topic="${esc(t.slug)}">${i("play", 14)}${tr("Mở")}</button>`
      : C.agentReady ? `<button class="btn ghost" data-lreq="${esc(t.slug)}">${i("zap", 14)}${tr("Nhờ {0} soạn", esc(C.agent))}</button>`
      : `<button class="btn ghost" data-copy="${esc(cmd)}">${i("copy", 14)}${tr("Chép lệnh")}</button>`;
    return `<div class="lc-row ${has ? "" : "none"}"><span class="lc-n">${k + 1}</span><div class="lc-tx"><b>${esc(t.title)}</b><small>${info}<span class="lc-st">${esc(STLABEL(t.status))}</span></small></div><div class="lc-act">${act}</div></div>`;
  };
  return `<div class="page lcs">${crumb(`<a data-go="home">${esc(domName(d))}</a>`, `<span>${tr("Bài giảng")}</span>`)}
    <h1 class="t" style="margin-top:10px">${tr("Bài giảng của lộ trình")}</h1><p class="sub">${tr("{0}/{1} bài đã có bài giảng tương tác.", has, rows.length)}</p>
    <div class="lib-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" class="${f === k ? "on" : ""}" data-lecf="${k}">${esc(l)}<span>${n}</span></button>`).join("")}</div>
    <div class="lc-list">${list.map(row).join("") || `<p class="sub" style="padding:16px;margin:0">${tr("Không có bài nào.")}</p>`}</div></div>`;
}
