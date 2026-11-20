/* Mảnh dùng chung — port từ prototype app.js / quest.js (kiểu D). */
import { tr } from "../i18n.ts";
import { CHECK_GUIDE_PATH } from "../data/lecguide.ts";
import { RUBRIC, TOKNAME } from "../data/rubric.ts";
import type { Topic, Index, Domain } from "../data/index.ts";
import type { SoHoc } from "../data/sohoc.ts";
import { fmtDate, type Status } from "../status.ts";
import type { PracticeLog } from "../practice/log.ts";
import type { Quest } from "../data/quest.ts";
import type { MigrateReport } from "../practice/migrate.ts";
import type { MkRow } from "../practice/today.ts";

export const IC: Record<string, string> = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15.3 15.3 0 0 1 0 18M12 3a15.3 15.3 0 0 0 0 18"/>',
  music: '<path d="M9 18V5l9-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
  excali: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
  canvas: '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h4a2 2 0 0 1 2 2v5"/>',
  flow: '<circle cx="5" cy="12" r="2"/><rect x="9" y="9" width="6" height="6" rx="1.5"/><path d="M19 9l3 3-3 3-3-3z"/><path d="M7 12h2M15 12h1"/>',
  mind: '<circle cx="12" cy="12" r="2.5"/><path d="M14.5 12H20M9.5 12H4M12 9.5V5M12 14.5V19"/><circle cx="20" cy="12" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="12" cy="20" r="1"/>',
  tree: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h4m0 0V5h6m-6 7h6m-6 0v7h6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13M15 6.5v13"/>',
  cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.1A8 8 0 1 1 21 12z"/>',
  right: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M6 4v16l14-8z"/>', file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  quest: '<path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z"/>', pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  slides: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};
export const i = (n: string, s?: number) => `<svg class="i" viewBox="0 0 24 24" ${s ? `style="width:${s}px;height:${s}px"` : ""}>${IC[n] || ""}</svg>`;
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>").replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_m, x) => `<a data-open="${x}">${x.split("/").pop()}</a>`);

export const QPAL = [["#2896A4", "#1B6B76", "#D3EEF0"], ["#FF7448", "#C7431C", "#FFE2D8"], ["#1FB573", "#11804E", "#D3F3E3"], ["#9166FF", "#5C36C8", "#E7DDFF"], ["#FFAE1F", "#C47B00", "#FFEFCB"], ["#F0609E", "#B8306C", "#FDDDEB"]];
export const sty = (k: number) => { const p = QPAL[k % QPAL.length]; return `--c:${p[0]};--d:${p[1]};--t:${p[2]}`; };
export const STLABEL = (s: Status) => ({ master: tr("Master"), basic: tr("Nắm cơ bản"), learning: tr("Đang học"), new: tr("Chưa học") }[s]);
export const tokName = (k: string) => tr(TOKNAME[k] || k);
export const fmtD = (s?: string) => fmtDate(s);
export const qNum = (t: Topic) => (t.order > 100 && Number.isFinite(t.order) ? t.order % 100 : Number.isFinite(t.order) ? t.order : "·");

import type { BadgeData } from "./badges.ts";
export interface View {   // trạng thái màn (như S của prototype)
  screen: string; dom: string; topic: string; ttab: string; sel: string | null; more?: boolean; badge?: string;
  mkf?: { st: "open" | "cleared" | "all"; dom: string; tok: string };   // bộ lọc màn Lỗi sai
  lecF?: string;   // màn Bài giảng của lộ trình: tab lọc all | has | none
  covSrc?: string; covSel?: string | null;   // bản đồ phủ (đợt 8b): nguồn đang xem, mục đang mở
  cmMode?: "merge" | "outline";   // sơ đồ tổng: ghép từ các bài (mặc định) hoặc dàn ý lộ trình do agent vẽ
  dim?: string;   // màn Sơ đồ khái niệm: dimension đang xem ("" = tổng)
  libTab?: string; libSel?: string | null;   // màn Kho nguồn (đợt 8a): tab lọc và nguồn đang chọn
}
export interface Ctx {
  idx: Index; sohoc: Map<string, { data: SoHoc; path: string }>; sessions: (t: Topic) => { basename: string; path: string }[];
  cards: (t: Topic) => { token?: string; q: string; a: string }[];
  today: string; phone: boolean; frame: "phone" | "mid" | "desktop"; agent: string; agentReady: boolean; agentVersion: string;
  S: View; folder: string; motion: boolean; dupes: string[];
  log: (t: Topic) => PracticeLog; quests: Quest[]; settings: { stateDir: string; retention: number; newPerDay: number; sessionCap: number; quizDir: string; lectureDir: string; retentionByDomain: Record<string, number>; timeTrack: boolean }; migration: MigrateReport | null;
  badges: BadgeData;
  mk: MkRow<Topic>[];   // sổ lỗi sai của mọi bài (đợt 4)
  lib: import("../library-io.ts").LibState;   // kho nguồn (đợt 8a)
  resource: (path: string) => string | null;   // đường dẫn ảnh trong vault cho thẻ <img> (bìa nguồn)
  essayFile: (t: Topic) => { q: string; token: string; quote: string } | null;   // đề tự luận từ file (7.9)
  materials: (links: string[], from: string) => import("../data/materials.ts").Material[];   // resolve learn_materials (8b): 3 trạng thái
  cm: { src: (path: string) => string | null | undefined; resolve: (link: string, from: string) => string | null; title: (link: string, from: string) => string };   // sơ đồ khái niệm: khối mermaid đã đọc (undefined = đang đọc), resolve liên kết, tên dimension
  lecInfo: (t: Topic) => { blocks: number; ungrounded: number } | undefined;   // số liệu bài giảng đã đọc (cache theo mtime); chưa đọc → undefined
  lectureDir: string;
  checks: (t: Topic) => { token: string }[];   // câu kiểm hợp lệ của bài (đợt 9)
  quick: (t: Topic) => { path: string; n: number; last?: string } | null;   // quiz nhanh hợp lệ (7.9)
  rhythm: () => import("./study5.ts").Rhythm;   // khối Nhịp học (đợt 5, tính khi cần)
  todayInfo: () => { n: number; miss: number; cards: number; later: number; done: number; streak: number };   // nút Phiên hôm nay (tính khi cần)
}
/** Tên lĩnh vực để hiện: bài có learn_curriculum rỗng gom vào một nhóm không tên → hiện nhãn thay vì "—". */
export const domName = (d?: { id: string; title: string }) => (d ? (d.id ? d.title : tr("Chưa gán lộ trình")) : "");
export const curDom = (C: Ctx): Domain | undefined => C.idx.domains.find(x => x.id === C.S.dom) || C.idx.domains[0];
export const findT = (C: Ctx, slug: string) => C.idx.all.find(t => t.slug === slug);

export const cmdLearn = (t: Topic) => `học tiếp ${t.dom}: [[${t.slug}]]`;
export const cmdReview = (t: Topic) => `ôn bài [[${t.slug}]]`;
export const cmdCheck = (t: Topic, toks: string[]) => `soạn câu kiểm cho [[${t.slug}]] theo ${CHECK_GUIDE_PATH} — token: ${toks.join(", ")}`;
export const cmdNewPath = (topic = "") => `thiết kế lộ trình học ${topic}`.trim();

/** Nút gọi Pie Agent (kiểu D). Không có API ask → "Chép lệnh". */
export const qBtn = (C: Ctx, label: string, cmd: string, cls = "w") => !C.agentReady
  ? `<button class="qb ${cls}" data-copy="${esc(cmd)}">${i("copy", 18)}${tr("Chép lệnh")}</button>`
  : `<button class="qb ${cls}" data-bob="${esc(cmd)}">${esc(label)}${i("arrow", 18)}</button>`;
export function bobBtn(C: Ctx, label: string, cmd: string, cls = "pri", short = false) {
  return !C.agentReady ? `<button class="btn ${cls === "pri" ? "" : cls}" data-copy="${esc(cmd)}" title="${tr("Chép lệnh")}">${i("copy")}${short ? esc(label) : tr("Chép lệnh")}</button>` : `<button class="btn ${cls}" data-bob="${esc(cmd)}">${i("chat")}${esc(label)}</button>`;
}
export const stDot = (t: Topic) => `<span class="st ${t.status}${t.due ? " due" : ""}" style="--p:${Math.round(t.und.length / 17 * 100)}%" title="${STLABEL(t.status)}${t.due ? " · " + tr("tới hạn ôn") : ""}"></span>`;
export function ring(v: number, max: number, size = 92, stroke = 7, ok = false) {
  const r = (size - stroke) / 2, Cc = 2 * Math.PI * r, off = Cc * (1 - v / max);
  return `<span class="ring ${ok ? "ok" : ""}"><svg width="${size}" height="${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${Cc}" stroke-dashoffset="${Cc}" data-off="${off}"/></svg><span class="lbl"><b>${v}</b><small>/${max}</small></span></span>`;
}
export const crumb = (...parts: string[]) => `<div class="crumb"><a data-go="home">Pie Study</a>${parts.map(p => i("right", 12) + p).join("")}</div>`;
export { RUBRIC };
