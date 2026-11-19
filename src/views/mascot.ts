/* Pie Bot 2D: một ảnh, biểu cảm bằng chuyển động CSS (idle thở · wave chào · celebrate nhảy …) — port mascot.js. */
import PIEBOT from "../../assets/piebot.png";
let key: string | null = null, mood: string | null = null;
export function syncMascot(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>("[data-mascot]");
  if (!el) { key = mood = null; return; }
  const m = el.dataset.mood || "idle", k = el.dataset.mkey || "", fresh = k !== key;
  const play = m === "idle" && fresh && el.dataset.greet ? "wave" : m;
  // cùng chỗ + cùng mood thì không phát lại (render lại bản đồ không làm Pie Bot chào lần nữa)
  el.empty(); el.createEl("img", { cls: `mascot-img m-${fresh || m !== mood ? play : m + " still"}`, attr: { src: PIEBOT, alt: "", draggable: "false" } });
  key = k; mood = m;
}
export function cheer(root: HTMLElement) {
  const m = root.querySelector<HTMLElement>(".qwrap [data-mascot]");
  if (m) { m.dataset.mood = "celebrate"; m.dataset.mkey += "+"; syncMascot(root); }
}
