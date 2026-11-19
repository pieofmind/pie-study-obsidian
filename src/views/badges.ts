/* Màn Huy hiệu — port y nguyên prototype badges.js (?v=82): huy hiệu Flat khớp D2, icon Fluent Emoji Flat;
   R vành bạc, LEG vành vàng; chưa mở = nét đứt, icon xám. Chữ đi qua tr(). */
import { tr } from "../i18n.ts";
import { esc, type Ctx } from "./shared.ts";
import I_card from "../../assets/fluent-flat/card.svg";
import I_cards from "../../assets/fluent-flat/cards.svg";
import I_deck from "../../assets/fluent-flat/deck.svg";
import I_crown from "../../assets/fluent-flat/crown.svg";
import I_flame from "../../assets/fluent-flat/flame.svg";
import I_bolt from "../../assets/fluent-flat/bolt.svg";
import I_sprout from "../../assets/fluent-flat/sprout.svg";
import I_star from "../../assets/fluent-flat/star.svg";
import I_clock from "../../assets/fluent-flat/clock.svg";
import I_flag from "../../assets/fluent-flat/flag.svg";
import I_trophy from "../../assets/fluent-flat/trophy.svg";
import I_gem from "../../assets/fluent-flat/gem.svg";
import I_map from "../../assets/fluent-flat/map.svg";
import I_mic from "../../assets/fluent-flat/mic.svg";
import { BADGES, FAM, RAR, type Badge, type Field, type Rarity } from "../data/badges.ts";

const GRAD: Record<string, string[]> = { review: ["#2EC4D6", "#1E5FD0"], streak: ["#FF9A3C", "#F0457E"], daily: ["#FFD23F", "#FF7A1A"], learn: ["#34D399", "#0E8F7E"], conquer: ["#A78BFA", "#4B3FD8"], teach: ["#FF7EB6", "#A23BD1"] };
const mix = (h: string, t: number) => "#" + [1, 3, 5].map(k => Math.round(parseInt(h.slice(k, k + 2), 16) * (1 - t) + 255 * t).toString(16).padStart(2, "0")).join("");   // pha trắng

export interface BadgeData { st: Record<Field, number>; dates: Record<string, string> }
/** Huy hiệu đã mở thì giữ mãi: đạt ngưỡng HOẶC đã có trong sổ chung. */
export const isOn = (b: Badge, D: BadgeData) => D.st[b.field] >= b.th || !!D.dates[b.id];
const ddmm = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(+d) ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : ""; };

/* Icon = Microsoft Fluent Emoji Flat (MIT, THIRD_PARTY/fluentui-emoji-LICENSE), nhúng dạng chữ SVG.
   Đổi một lần sang blob: URL để chuỗi HTML của 28 huy hiệu không phải chép lại cả file SVG mỗi lần vẽ. */
const ICON: Record<string, string> = { card: I_card, cards: I_cards, deck: I_deck, crown: I_crown, flame: I_flame, bolt: I_bolt, sprout: I_sprout, star: I_star, clock: I_clock, flag: I_flag, trophy: I_trophy, gem: I_gem, map: I_map, mic: I_mic };
const blobs: Record<string, string> = {};
const iconUrl = (g: string) => blobs[g] ||= URL.createObjectURL(new Blob([ICON[g]], { type: "image/svg+xml" }));
/** Gọi khi tắt plugin để trả bộ nhớ blob. */
export const releaseIcons = () => { Object.values(blobs).forEach(u => URL.revokeObjectURL(u)); for (const k in blobs) delete blobs[k]; };

/* port badge() ?v=82 (bản Flat, khớp D2): đĩa màu nhóm viền mực, vành đặc theo độ hiếm (R bạc, LEG vàng), lòng sáng viền mực, icon 54px.
   Chưa mở: đĩa kem nét đứt, icon xám (CSS). */
const RIMC: Partial<Record<Rarity, string>> = { R: "#CBD3DF", LEG: "#FFC02E" };

export function badgeSvg(b: Badge, on: boolean, size = 96) {
  const [c1, c2] = GRAD[b.fam], rim = RIMC[b.rar];
  const img = `<image href="${iconUrl(b.g)}" x="-27" y="-28" width="54" height="54" class="fi"/>`;
  if (!on) return `<svg class="bd off" viewBox="-60 -60 120 120" width="${size}" height="${size}"><circle r="54" class="lk"/><circle r="40" class="lk2"/>${img}</svg>`;
  return `<svg class="bd on ${b.rar}" viewBox="-60 -60 120 120" width="${size}" height="${size}">
      <circle r="54" fill="${c2}" stroke="#17223F" stroke-width="2.5"/>
      ${rim ? `<circle r="49" fill="none" stroke="${rim}" stroke-width="5"/>` : ""}
      <circle r="40" fill="${mix(c1, .85)}" stroke="#17223F" stroke-width="2"/>${img}</svg>`;
}

export function badgesScreen(C: Ctx, D: BadgeData) {
  const st = D.st, sel = BADGES.find(b => b.id === C.S.badge), on = (b: Badge) => isOn(b, D), got = BADGES.filter(on);
  const nm = (b: Badge) => esc(tr(b.name));
  const recent = got.filter(b => D.dates[b.id]).sort((a, b) => D.dates[b.id].localeCompare(D.dates[a.id])).slice(0, 4);
  const nextUp = BADGES.filter(b => !on(b)).map(b => ({ b, p: st[b.field] / b.th })).sort((x, y) => y.p - x.p).slice(0, 3);
  const cnt = (r: Rarity) => `${got.filter(b => b.rar === r).length}/${BADGES.filter(b => b.rar === r).length}`;
  const when = (b: Badge) => ddmm(D.dates[b.id]);
  const cell = (b: Badge) => { const o = on(b), v = Math.min(st[b.field], b.th);
    return `<button class="bd-cell ${o ? "on" : ""} ${C.S.badge === b.id ? "sel" : ""}" data-badge="${b.id}">${badgeSvg(b, o)}<b>${nm(b)}</b>
        ${o ? `<small>${when(b) ? tr("Mở {0}", when(b)) : tr("Đã mở")}</small>` : `<span class="bd-prog"><i style="width:${Math.round(v / b.th * 100)}%"></i></span><small>${v}/${b.th}</small>`}</button>`; };
  const rarIcon = (r: Rarity) => badgeSvg({ ...BADGES.find(b => b.rar === r)!, g: r === "LEG" ? "star" : r === "R" ? "gem" : "sprout" }, true, 44);
  return `<div class="page bd-page">
      <section class="bd-head"><div><small class="bd-kick">${tr("Bộ sưu tập")}</small><h1 class="t">${tr("Huy hiệu")}</h1><p>${tr("{0}/{1} đã mở", got.length, BADGES.length)}</p></div>
        <div class="bd-rar">${(["UC", "R", "LEG"] as Rarity[]).map(r => `<span class="${r}">${rarIcon(r)}<b>${cnt(r)}</b><small>${tr(RAR[r])}</small></span>`).join("")}</div></section>
      <div class="bd-row2"><section class="bd-card"><small class="bd-kick">${tr("Mới mở")}</small><div class="bd-recent">${recent.map(b => `<button data-badge="${b.id}">${badgeSvg(b, true, 72)}<b>${nm(b)}</b><small>${when(b)}</small></button>`).join("")}</div></section>
        <section class="bd-card"><small class="bd-kick">${tr("Sắp mở")}</small>${nextUp.map(({ b, p }) => `<div class="bd-next" data-badge="${b.id}">${badgeSvg(b, false, 46)}<div><b>${nm(b)}</b><span class="bd-prog"><i style="width:${Math.round(p * 100)}%;background:${FAM[b.fam][1]}"></i></span></div><small>${st[b.field]}/${b.th}</small></div>`).join("")}</section></div>
      ${Object.entries(FAM).map(([k, [fn, c]]) => { const L = BADGES.filter(b => b.fam === k); return `<section class="bd-fam" style="--c:${c}"><header><span class="bd-dot"></span><b>${tr(fn)}</b><small>${L.filter(on).length}/${L.length}</small></header><div class="bd-grid">${L.map(cell).join("")}</div></section>`; }).join("")}
      ${sel ? `<div class="bd-sheet-bg" data-badge=""></div><div class="bd-sheet" style="--c:${FAM[sel.fam][1]}">${badgeSvg(sel, on(sel), 150)}<span class="bd-rtag ${sel.rar}">${tr(RAR[sel.rar])}</span><h2>${nm(sel)}</h2><p>${esc(tr(sel.desc))}</p>
        ${on(sel) ? `<p class="bd-when">${when(sel) ? tr("Mở ngày {0}", when(sel)) : tr("Đã mở")}</p>` : `<span class="bd-prog lg"><i style="width:${Math.round(Math.min(1, st[sel.field] / sel.th) * 100)}%"></i></span><p class="bd-when">${st[sel.field]}/${sel.th}</p>`}
        <button class="qb o" data-badge="">${tr("Đóng")}</button></div>` : ""}</div>`;
}

/** Khoảnh khắc mở huy hiệu: thẻ huy hiệu bật lên giữa màn (bd-pop của prototype) rồi tự tắt. */
export const unlockToast = (ids: string[]) => `<div class="bd-toast">${BADGES.filter(b => ids.includes(b.id)).slice(0, 3).map(b => `<span>${badgeSvg(b, true, 96)}<b>${esc(tr(b.name))}</b></span>`).join("")}<small>${tr("Mở huy hiệu mới")}</small></div>`;
