/* Đồ thị khái niệm trên canvas (prototype d17): cuộn = phóng to quanh con trỏ, kéo nền = di chuyển, kéo chấm = xếp lại, bấm chấm đặc = mở note.
   Logic xếp chỗ nằm ở data/conceptmap.ts (thuần, có test); file này chỉ vẽ và nghe chuột. */
import { buildGraph, tick, settle, separate, PAL, BIG, type CmBlock, type CmGraph, type CmParse } from "../data/conceptmap.ts";

export interface MountOpts { parse: CmParse; pathOf: (text: string, link: string | null) => string | null; open: (path: string) => void; go: (slug: string) => void }
const LOD_K = .9;   // đồ thị lớn: khái niệm (lod) chỉ hiện khi phóng to tới mức này hoặc khi rê vào bài chứa nó

/** Dựng đồ thị vào `box` (đã có sẵn nút +/−/vừa khung). Trả false nếu không đọc được sơ đồ. */
export function mountGraph(box: HTMLElement, o: MountOpts): boolean {
  const cs = getComputedStyle(box), FONT = cs.fontFamily || "system-ui, sans-serif";
  const mctx = document.createElement("canvas").getContext("2d")!;
  const g0: CmGraph | null = buildGraph(o.parse, (t, px) => { mctx.font = `600 ${px}px ${FONT}`; return mctx.measureText(t).width; }, o.pathOf);
  if (!g0) return false;
  const G: CmGraph = g0;
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d")!; box.prepend(cv);
  const big = g0.N.length > BIG, T = { k: 1, x: 0, y: 0 }; let alpha = settle(G), hot: CmBlock | null = null, drag: { o: CmBlock; moved: boolean } | null = null, pan: { mx: number; my: number; x: number; y: number } | null = null, W = 0, H = 0;
  const css = (n: string) => getComputedStyle(box).getPropertyValue(n).trim();
  const size = () => { const dpr = devicePixelRatio || 1; W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const shown = (b: CmBlock, L: Set<string> | null) => !big || !b.lod || T.k >= LOD_K || !!(L && L.has(b.id));
  const fit = () => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of G.N) { if (big && b.lod) continue; x0 = Math.min(x0, b.x - b.hw); x1 = Math.max(x1, b.x + b.hw); y0 = Math.min(y0, b.y - b.top); y1 = Math.max(y1, b.y + b.bot); }
    T.k = Math.min(1.4, Math.min((W - 40) / (x1 - x0), (H - 40) / (y1 - y0))); T.x = W / 2 - (x0 + x1) / 2 * T.k; T.y = H / 2 - (y0 + y1) / 2 * T.k;
  };
  const toW = (mx: number, my: number) => ({ x: (mx - T.x) / T.k, y: (my - T.y) / T.k });
  const ink = () => css("--text-normal") || "#222";
  const col = (b: CmBlock) => b.d === 0 ? ink() : PAL[b.b % PAL.length];
  const lit = () => {
    if (!hot) return null; const s = new Set<string>();
    for (let x: CmBlock | undefined = hot; x; x = x.par ? G.byId.get(x.par) : undefined) s.add(x.id);
    const down = (b: CmBlock) => { s.add(b.id); b.kids.forEach(k => down(G.byId.get(k)!)); }; down(hot); return s;
  };
  function paint() {
    const bg = css("--background-primary") || "#fff", fg = ink(), mute = css("--text-muted") || "#777", L = lit();
    ctx.clearRect(0, 0, W, H); ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
    for (const [s, t] of G.E) {
      const p = G.byId.get(s)!, q = G.byId.get(t)!, on = !L || (L.has(s) && L.has(t));
      if (!shown(q, L)) continue;
      ctx.globalAlpha = on ? (L ? 1 : .5) : .08; ctx.strokeStyle = col(q); ctx.lineWidth = (L && on ? 2.6 : 1.5) / Math.sqrt(T.k);
      const mx = (p.x + q.x) / 2 - (q.y - p.y) * .08, my = (p.y + q.y) / 2 + (q.x - p.x) * .08;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(mx, my, q.x, q.y); ctx.stroke();
    }
    for (const b of G.N) {
      if (!shown(b, L)) continue;
      const on = !L || L.has(b.id), c = col(b), has = !!(b.path || b.slug); ctx.globalAlpha = on ? 1 : .15;
      if (has) { ctx.fillStyle = c; ctx.globalAlpha *= .16; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6 + (b === hot ? 4 : 0), 0, 7); ctx.fill(); ctx.globalAlpha = on ? 1 : .15; }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = has ? c : bg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = c; ctx.stroke();
      if (!(b.d <= 1 || T.k > .55 || (L && L.has(b.id)))) continue;   // tên mờ dần theo mức phóng
      ctx.globalAlpha = on ? Math.min(1, b.d <= 1 ? 1 : (T.k - .55) * 4 + (L ? 1 : 0)) : .15;
      ctx.font = `${b.d === 0 ? 800 : b.d === 1 ? 700 : has ? 600 : 500} ${b.px}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = has || b.d < 2 ? fg : mute; ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = bg;   // viền chữ cùng màu nền
      b.lines.forEach((ln, j) => { ctx.strokeText(ln, b.x, b.y + b.r + 6 + j * b.lh); ctx.fillText(ln, b.x, b.y + b.r + 6 + j * b.lh); });
    }
    ctx.restore();
  }
  const at = (mx: number, my: number) => { const p = toW(mx, my), L = lit(); return G.N.find(b => shown(b, L) && Math.hypot(b.x - p.x, b.y - p.y) < b.r + 6 || (Math.abs(b.x - p.x) < b.w / 2 && p.y > b.y + b.r && p.y < b.y + b.bot)); };
  const ro = new ResizeObserver(() => size());
  let crowded = big;
  function loop() { if (!box.isConnected) return ro.disconnect(); if (alpha > .02) { tick(G, alpha); alpha *= .985; } else if (crowded) crowded = separate(G, 4) > 0; paint(); requestAnimationFrame(loop); }
  size(); fit(); ro.observe(box); loop();
  const pos = (e: PointerEvent | WheelEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("wheel", e => { e.preventDefault(); const [mx, my] = pos(e), k = Math.max(.25, Math.min(4, T.k * Math.exp(-e.deltaY * .0015))); T.x = mx - (mx - T.x) * k / T.k; T.y = my - (my - T.y) * k / T.k; T.k = k; }, { passive: false });
  cv.addEventListener("pointerdown", e => { const [mx, my] = pos(e), b = at(mx, my); cv.setPointerCapture(e.pointerId); if (b) { drag = { o: b, moved: false }; b.fixed = true; } else pan = { mx, my, x: T.x, y: T.y }; });
  cv.addEventListener("pointermove", e => {
    const [mx, my] = pos(e);
    if (drag) { const p = toW(mx, my); drag.o.x = p.x; drag.o.y = p.y; drag.moved = true; alpha = Math.max(alpha, .25); return; }
    if (pan) { T.x = pan.x + mx - pan.mx; T.y = pan.y + my - pan.my; cv.style.cursor = "grabbing"; return; }
    hot = at(mx, my) || null; cv.style.cursor = hot && (hot.path || hot.slug) ? "pointer" : hot ? "grab" : "default";
  });
  cv.addEventListener("pointerup", () => { if (drag && !drag.moved) { if (drag.o.slug) o.go(drag.o.slug); else if (drag.o.path) o.open(drag.o.path); } if (drag) drag.o.fixed = false; drag = pan = null; cv.style.cursor = "default"; });
  cv.addEventListener("pointerleave", () => { hot = null; });
  box.querySelector(".gv-ctl")?.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-gz]"); if (!b) return; e.stopPropagation();
    if (b.dataset.gz === "fit") return fit();
    const k = Math.max(.25, Math.min(4, T.k * (b.dataset.gz === "in" ? 1.3 : 1 / 1.3))); T.x = W / 2 - (W / 2 - T.x) * k / T.k; T.y = H / 2 - (H / 2 - T.y) * k / T.k; T.k = k;
  });
  return true;
}
