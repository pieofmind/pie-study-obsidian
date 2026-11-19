/* Hình thu nhỏ MẪU theo loại học liệu (prototype d16): vẽ phác SVG, gieo theo tên file. Đợt 8b chưa đọc file thật. Thuần. */
import type { MatKind } from "./materials.ts";

const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const rnd = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

export function matThumb(kind: MatKind, name: string): string {
  const R = rnd(hash(name)), j = (v: number, a = 3) => v + (R() - .5) * a;
  const rough = (x: number, y: number, w: number, h: number) => `M${j(x)} ${j(y)} L${j(x + w)} ${j(y)} L${j(x + w)} ${j(y + h)} L${j(x)} ${j(y + h)} Z M${j(x + 2)} ${j(y - 1)} L${j(x + w - 1)} ${j(y + 2)}`;
  let g = "";
  if (kind === "excalidraw") {
    const bx = ([[22, 26, 62, 34], [128, 18, 70, 30], [118, 82, 82, 36], [30, 92, 54, 30]] as number[][]).map(([x, y, w, h]) => [j(x, 10), j(y, 8), w, h]);
    g += bx.map(([x, y, w, h], k) => `<path d="${rough(x, y, w, h)}" class="tb-s" style="${k === 1 ? "fill:var(--tk-soft)" : ""}"/><path d="M${x + 10} ${y + h / 2} q${w / 4} -4 ${w - 22} 0" class="tb-t"/>`).join("");
    g += `<path d="M${bx[0][0] + 64} ${bx[0][1] + 16} C 105 ${j(30)}, 110 ${j(30)}, ${bx[1][0] - 4} ${bx[1][1] + 14}" class="tb-a"/><path d="M${bx[1][0] + 30} ${bx[1][1] + 32} L${bx[2][0] + 34} ${bx[2][1] - 4}" class="tb-a"/><path d="M${j(150)} ${j(140)} q20 -14 40 0 t40 0" class="tb-s"/>`;
  } else if (kind === "canvas") {
    for (let y = 10; y < 150; y += 14) for (let x = 10; x < 230; x += 14) g += `<circle cx="${x}" cy="${y}" r=".9" class="tb-dot"/>`;
    const c = [[20, 24, 70, 44], [140, 16, 78, 34], [130, 84, 88, 50], [26, 96, 64, 38]];
    g += `<path d="M90 46 C115 46 115 33 140 33 M90 46 C110 46 110 108 130 108 M58 68 V96" class="tb-l"/>`;
    g += c.map(([x, y, w, h], k) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="tb-c" style="${k === 2 ? "stroke:var(--tk)" : ""}"/><rect x="${x + 8}" y="${y + 9}" width="${w * .55}" height="4" rx="2" class="tb-tl"/><rect x="${x + 8}" y="${y + 18}" width="${w * .7}" height="3" rx="1.5" class="tb-tl2"/>`).join("");
  } else if (kind === "pieflow") {
    g += `<path d="M34 78 H64 M114 78 H136 M168 78 H188 M152 62 V36 H96 V60" class="tb-l"/>`;
    g += `<circle cx="24" cy="78" r="10" class="tb-c"/><rect x="64" y="62" width="50" height="32" rx="8" class="tb-c" style="stroke:var(--tk)"/><rect x="72" y="72" width="30" height="4" rx="2" class="tb-tl"/>`;
    g += `<path d="M152 62 L168 78 L152 94 L136 78 Z" class="tb-c"/><rect x="188" y="62" width="40" height="32" rx="8" class="tb-c"/><rect x="194" y="72" width="26" height="4" rx="2" class="tb-tl"/><circle cx="152" cy="122" r="9" class="tb-c" style="stroke-width:3"/><path d="M152 94 V113" class="tb-l"/>`;
  } else {
    const cx = 120, cy = 76, n = 6;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + k * 2 * Math.PI / n + (R() - .5) * .3, x = cx + Math.cos(a) * 70, y = cy + Math.sin(a) * 46;
      g += `<path d="M${cx} ${cy} Q${(cx + x) / 2} ${cy} ${x} ${y}" class="tb-l" style="stroke:var(--tk)"/><rect x="${x - 22}" y="${y - 7}" width="44" height="14" rx="7" class="tb-c"/>`;
      const x2 = x + Math.cos(a) * 30, y2 = y + Math.sin(a) * 18; g += `<path d="M${x} ${y} L${x2} ${y2}" class="tb-l"/><circle cx="${x2}" cy="${y2}" r="3" class="tb-n"/>`;
    }
    g += `<rect x="${cx - 30}" y="${cy - 11}" width="60" height="22" rx="11" class="tb-c" style="fill:var(--tk);stroke:var(--tk)"/>`;
  }
  return `<svg viewBox="0 0 240 150" class="tb-svg" aria-hidden="true">${g}</svg>`;
}
