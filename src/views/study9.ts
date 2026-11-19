/* Spec 7.9: màn chờ ra đề tự luận (cùng khuôn màn chờ quiz nhanh của đợt 6) → "Đề đã sẵn sàng" / "Đề không bám note". */
import { tr } from "../i18n.ts";
import { i, esc, type Ctx } from "./shared.ts";
import type { Topic } from "../data/index.ts";
import type { EssayVet } from "../data/essaynote.ts";

export interface ER { note: Topic; path: string; stage: "wait" | "ready" | "bad"; sentAt: number; cmd: string; back: string; vet?: EssayVet }

const WHY = (w: string) => ({ notfound: tr("Trích dẫn của đề không có nguyên văn trong note."), noquote: tr("Đề không kèm trích dẫn từ note."), short: tr("Trích dẫn của đề quá ngắn."),
  type: tr("File không phải đề tự luận."), shape: tr("File không có đề."), broken: tr("File đề hỏng hoặc không đúng khuôn.") }[w] || "");

export function essayReqScreen(C: Ctx, r: ER) {
  const top = `<div class="focus-top"><button class="ibtn" data-exit title="${tr("Thoát (Esc)")}" aria-label="${tr("Thoát (Esc)")}">${i("x")}</button><span style="font-size:var(--pa-fs-sm);font-weight:560">${esc(tr("Đề tự luận · {0}", r.note.title))}</span><span style="flex:1"></span><span class="src">${i("file", 12)}${esc(r.path)}</span></div>`;
  const wrap = (body: string) => `<div class="focus q-play qd">${top}<div class="focus-body"><div class="sumry in qq"><div class="eyebrow">${tr("Tự luận")}</div>${body}</div></div></div>`;
  const step = (st: string, b: string, sm: string) => `<div class="qq-step ${st}"><span class="d">${st === "ok" ? i("check", 14) : st === "now" ? "<i></i>" : ""}</span><div><b>${b}</b><small>${sm}</small></div></div>`;
  const again = (cls: string) => `<button class="btn${cls}" data-ereq="${esc(r.note.path)}">${i("refresh", 14)}${tr("Nhờ ra đề khác")}</button>`;
  if (r.stage === "wait") return wrap(`<h2 class="qq-h">${tr("Đang chờ {0} ra đề", esc(C.agent))}</h2>
    <p class="sub">${tr("{0} đọc note này rồi ghi một đề tự luận vào file bên dưới. Màn này tự đổi khi file xuất hiện.", esc(C.agent))}</p>
    <div class="qq-steps">${step("ok", C.agentReady ? tr("Đã gửi lệnh cho {0}", esc(C.agent)) : tr("Đã chép lệnh"), esc(r.cmd.split(", ghi vào")[0]))}${step("now", tr("{0} đang ra đề", esc(C.agent)), tr("Đề phải bám một câu chép nguyên văn từ note."))}${step("", tr("Kiểm trích dẫn"), tr("Đề có trích dẫn không nằm trong note thì không dùng."))}</div>
    ${C.agentReady ? `<p class="sub qq-hint">${tr("Chờ lâu? Mở khung chat của {0}: có thể {0} đang chờ duyệt quyền ghi vào thư mục quiz.", esc(C.agent))}</p>` : ""}
    <div class="acts" style="justify-content:center"><button class="btn ghost" data-exit>${tr("Huỷ")}</button></div>`);
  const p = r.vet?.prompt;
  if (r.stage === "bad" || !p) return wrap(`<h2 class="qq-h">${tr("Đề không bám note")}</h2><p class="sub">${WHY(r.vet?.why || "broken")} ${tr("Plugin không dùng đề này.")}</p>
    <div class="acts" style="justify-content:center">${again("")}<button class="btn ghost" data-exit>${tr("Huỷ")}</button></div>`);
  return wrap(`<h2 class="qq-h">${tr("Đề đã sẵn sàng")}</h2>
    <p class="sub">${tr("{0} ra một đề theo kiểu hiểu {1}. Trích dẫn khớp note.", esc(C.agent), `<span class="pill tok">${esc(p.token)}</span>`)}</p>
    <div class="es-q"><small>${tr("Đề")}</small><b>${esc(p.q)}</b><span class="es-src"><small>${tr("Căn cứ trong note")}</small>“${esc(p.quote)}”</span></div>
    <div class="acts" style="justify-content:center"><button class="btn" data-ego>${tr("Viết bài")}</button>${again(" ghost")}</div>`);
}
