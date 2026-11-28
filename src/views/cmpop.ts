/* Bảng nổi khi bấm một chấm trên sơ đồ khái niệm: hỏi nhanh (trả lời ngay trong bảng, không vào hội thoại),
   mở note / mở bài, hoặc nhờ agent tạo note khái niệm. Neo ở đáy khung sơ đồ (không đặt style theo con trỏ). */
import { tr } from "../i18n.ts";
import { appendHtml } from "./html.ts";
import { i, esc } from "./shared.ts";
import { cmAskPrompt, cmDeeperCmd, cmNewNoteCmd, type CmDot } from "../data/cmask.ts";

export interface PopOpts {
  lesson: string;   // ngữ cảnh cho agent, vd "bài [[slug]] (Tiêu đề)"
  agent: string;
  quick: ((text: string) => Promise<string>) | null;
  ask: (cmd: string) => void;
  open: (path: string) => void;
  go: (slug: string) => void;
  md: (text: string, el: HTMLElement) => void;
}

export function openCmPop(box: HTMLElement, d: CmDot, o: PopOpts) {
  box.querySelector(".cm-pop")?.remove();   // bảng cũ: listener Esc của nó tự gỡ ở phím kế (pop.isConnected = false)
  const nav = d.slug ? `<button class="btn" data-cpo>${i("book", 14)}${tr("Mở bài")}</button>`
    : d.path ? `<button class="btn" data-cpo>${i("file", 14)}${tr("Mở note")}</button>`
    : `<button class="btn" data-cpn>${i("plus", 14)}${tr("Nhờ {0} tạo note khái niệm", o.agent)}</button>`;
  appendHtml(box, `<div class="cm-pop" role="dialog" aria-label="${esc(d.lab)}">
    <div class="cm-pop-h"><div><b>${esc(d.lab)}</b>${d.trail.length ? `<small>${esc(d.trail.join(" › "))}</small>` : ""}</div><button class="cm-pop-x" data-cpx aria-label="${tr("Đóng")}">${i("x", 16)}</button></div>
    <div class="cm-pop-q"><input type="text" data-cpq placeholder="${tr("Câu hỏi thêm (tuỳ chọn)")}"><button class="btn pri" data-cpa>${i("zap", 14)}${tr("Hỏi nhanh")}</button></div>
    <div class="cm-pop-a" data-cpout hidden></div>
    <div class="cm-pop-ft">${nav}<button class="btn ghost" data-cpd hidden>${i("chat", 14)}${tr("Nói sâu hơn với {0}", o.agent)}</button></div></div>`);
  const pop = box.querySelector<HTMLElement>(".cm-pop")!, q = pop.querySelector<HTMLInputElement>("[data-cpq]")!, out = pop.querySelector<HTMLElement>("[data-cpout]")!, deeper = pop.querySelector<HTMLElement>("[data-cpd]")!;
  let busy = false;
  const doc = activeDocument;   // ghim document lúc mở: cửa sổ popout đổi activeDocument thì vẫn gỡ đúng chỗ
  const esc2 = (e: KeyboardEvent) => { if ((e.key === "Escape" && !e.defaultPrevented) || !pop.isConnected) close(); };   // Esc đóng cả khi focus đã rời bảng; Esc đã có nơi khác xử lý (đóng modal…) thì bỏ qua
  const close = () => { pop.remove(); doc.removeEventListener("keydown", esc2); };
  doc.addEventListener("keydown", esc2);
  const run = async () => {
    if (busy) return;
    if (!o.quick) { out.hidden = false; out.setText(tr("Cần Pie Agent bản mới để trả lời ngay tại đây. Bấm \"Nói sâu hơn\" để hỏi trong hội thoại.")); deeper.hidden = false; return; }
    busy = true; out.hidden = false; out.setText(tr("Đang hỏi {0}…", o.agent));
    try { const a = await o.quick(cmAskPrompt(d, o.lesson, q.value)); out.empty(); o.md(a || tr("Không có câu trả lời."), out); }
    catch (e) { out.setText(tr("Không hỏi được: {0}", e instanceof Error ? e.message : String(e))); }
    finally { busy = false; deeper.hidden = false; }
  };
  pop.addEventListener("click", e => {
    e.stopPropagation();   // mọi click trong bảng dừng ở đây, không tới bộ xử lý click của màn (vd đóng menu Thêm làm vẽ lại)
    const lk = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.internal-link");   // link [[...]] trong câu trả lời: tự mở, vì click không nổi lên nữa
    if (lk) { e.preventDefault(); const h = lk.dataset.href || lk.getAttribute("href"); if (h) o.open(h); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>("button"); if (!t) return;
    if (t.matches("[data-cpx]")) close();
    else if (t.matches("[data-cpa]")) void run();
    else if (t.matches("[data-cpo]")) { if (d.slug) o.go(d.slug); else if (d.path) o.open(d.path); }
    else if (t.matches("[data-cpn]")) { o.ask(cmNewNoteCmd(d, o.lesson)); close(); }
    else if (t.matches("[data-cpd]")) { o.ask(cmDeeperCmd(d, o.lesson, q.value)); close(); }
  });
  pop.addEventListener("keydown", e => { if (e.key === "Enter" && e.target === q) { e.preventDefault(); void run(); } });
  pop.addEventListener("pointerdown", e => e.stopPropagation());
  pop.addEventListener("wheel", e => e.stopPropagation());
  q.focus();
}
