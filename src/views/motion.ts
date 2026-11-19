/* 5 chuyển động thưởng — port motion.js. Chỉ phát khi plugin thấy frontmatter đổi trong phiên (diffEvents),
   không phát lúc mở lại view. Chỉ dùng transform/opacity; tắt hẳn khi bật giảm chuyển động hoặc tắt trong Cài đặt. */
import { CORE, isDone } from "../status.ts";
import type { Index } from "../data/index.ts";
import { tr } from "../i18n.ts";
import { cheer } from "./mascot.ts";

export type Fx = { kind: "stamp"; slug: string; toks: string[] } | { kind: "basic" | "master"; slug: string } | { kind: "boss" | "stage"; dom: string; gi: number } | { kind: "badge"; el: Element };
type Snap = Map<string, { st: string; und: string[] }>;
export const snapshot = (idx: Index): Snap => new Map(idx.all.map(t => [t.path, { st: t.status, und: t.und }]));

/** So trạng thái cũ/mới → danh sách hiệu ứng. groupsBefore/After: số bài đã nắm theo nhóm của từng lĩnh vực. */
export function diffEvents(old: Snap, idx: Index, gBefore: Map<string, number[][]>, gAfter: Map<string, number[][]>): Fx[] {
  const fx: Fx[] = [];
  for (const t of idx.all) {
    const o = old.get(t.path); if (!o) continue;
    if (t.status === "master" && o.st !== "master") fx.push({ kind: "master", slug: t.slug });
    else if (isDone(t.status) && !isDone(o.st as never)) fx.push({ kind: "basic", slug: t.slug });
    else { const toks = CORE.filter(c => t.und.includes(c) && !o.und.includes(c)); if (toks.length) fx.push({ kind: "stamp", slug: t.slug, toks }); }
  }
  for (const [dom, after] of gAfter) {
    const before = gBefore.get(dom); if (!before) continue;
    after.forEach(([done, n], gi) => {
      const b = before[gi]; if (!b || b[1] !== n) return;
      if (done === n && b[0] < n) fx.push({ kind: "stage", dom, gi });
      else if (done >= Math.min(2, n) && b[0] < Math.min(2, n)) fx.push({ kind: "boss", dom, gi });
    });
  }
  return fx;
}

const PAL = ["#2896A4", "#FF7448", "#1FB573", "#9166FF", "#FFC02E", "#F0609E"];
const restart = (el: Element, cls: string) => { el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };
const css = (s: string) => CSS.escape(s);

/* pháo giấy kiểu sticker: mảnh màu viền mực, bắn tỏa từ một điểm rồi rơi */
function burst(root: HTMLElement, el: Element | null, n = 18, colors = PAL) {
  if (!el) return;
  const r = el.getBoundingClientRect(), host = root.querySelector(".qd") || root, h = host.getBoundingClientRect();
  for (let k = 0; k < n; k++) {
    const p = document.createElement("i"), a = (k / n) * Math.PI * 2 + Math.random() * .4, d = 60 + Math.random() * 70;
    p.className = "q-conf" + (k % 3 === 0 ? " strip" : "");
    p.style.cssText = `left:${r.left - h.left + r.width / 2}px;top:${r.top - h.top + r.height / 2}px;background:${colors[k % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--rot:${Math.random() * 540 - 270}deg;animation-delay:${Math.random() * 60}ms`;
    host.append(p); window.setTimeout(() => p.remove(), 1300);
  }
}

/** Phát trên DOM đã render theo dữ liệu MỚI (trạng thái đích), nên mỗi hiệu ứng là pha "đến nơi". */
export function play(root: HTMLElement, f: Fx) {
  if (f.kind === "badge") { burst(root, f.el, 26, ["#FFC02E", "#fff", "#2896A4", "#F0609E"]); cheer(root); return; }
  if (f.kind === "stamp") {   // 1 · con dấu đập xuống ô trên thẻ Bài kế tiếp
    const hero = root.querySelector(`[data-hero="${css(f.slug)}"]`); if (!hero) return;
    f.toks.forEach(t => { const s = hero.querySelector(`.q-stamp[data-tok="${t}"]`); if (s) { restart(s, "fx-stamp"); window.setTimeout(() => burst(root, s, 10, ["#fff", "#FFC02E"]), 220); } });
    cheer(root); return;
  }
  if (f.kind === "basic" || f.kind === "master") {
    const row = root.querySelector(`.q-row[data-row="${css(f.slug)}"]`), nd = row?.querySelector(".q-node"); if (!row || !nd) return;
    nd.scrollIntoView({ block: "center" });
    if (f.kind === "basic") {   // 2 · nút lún rồi bật thành màu nhóm có tích; đoạn ray tô màu chạy tới bài sau
      restart(nd, "fx-level");
      const st = row.closest(".q-stage")!, rows = [...st.querySelectorAll(".q-path > .q-row")], j = rows.indexOf(row);
      const segs = st.querySelectorAll<SVGPathElement>(".q-road .base path");
      [j - 1, j].forEach(k => { const seg = segs[k]; if (!seg || !seg.classList.contains("d")) return;
        const c = seg.cloneNode() as SVGPathElement; c.setAttribute("class", "d fx-draw"); const L = seg.getTotalLength(); c.style.strokeDasharray = String(L); c.style.strokeDashoffset = String(L); seg.after(c); });
      window.setTimeout(() => burst(root, nd), 180);
    } else {   // 4 · lật một vòng ra mặt vàng có sao; 3 sao sáng lần lượt
      restart(nd, "fx-flip");
      row.querySelectorAll(".q-stars svg").forEach((s, k) => window.setTimeout(() => restart(s, "fx-star"), 520 + k * 140));
      window.setTimeout(() => burst(root, nd, 26, ["#FFC02E", "#fff", "#FF7448"]), 600);
    }
    cheer(root); return;
  }
  const g = f as Extract<Fx, { gi: number }>, stage = root.querySelector(`.q-stage[data-stage="${g.gi}"]`); if (!stage) return;
  if (g.kind === "boss") {   // 3 · ổ khoá bật thành cúp
    const b = stage.querySelector(".q-node.boss"); if (!b) return;
    b.scrollIntoView({ block: "center" }); restart(b, "fx-unlock"); burst(root, b, 22); cheer(root); return;
  }
  const bn = stage.querySelector(".q-banner"); if (!bn) return;   // 5 · đoạn tiến độ đầy dần, nhãn "XONG TẦNG" đập lên banner
  bn.scrollIntoView({ block: "start" });
  const segs = bn.querySelectorAll(".q-seg i");
  segs.forEach((s, k) => window.setTimeout(() => restart(s, "fx-seg"), 250 + k * 90));
  window.setTimeout(() => { bn.querySelector(".q-done")?.remove(); bn.insertAdjacentHTML("beforeend", `<span class="q-done">${tr("Xong tầng")}</span>`); restart(bn, "fx-bump"); burst(root, bn.querySelector(".q-done"), 28); }, 350 + segs.length * 90);
  cheer(root);
}
