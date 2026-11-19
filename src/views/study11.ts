/* Màn chờ soạn bài giảng (đợt 8b): cùng khuôn màn chờ quiz nhanh / đề tự luận. File bài giảng xuất hiện thì StudyView tự mở bài giảng. */
import { tr } from "../i18n.ts";
import { i, esc, type Ctx } from "./shared.ts";
import type { Topic } from "../data/index.ts";

export interface LR { topic: Topic; sentAt: number; cmd: string; back: string }

export function lectureReqScreen(C: Ctx, r: LR) {
  const top = `<div class="focus-top"><button class="ibtn" data-exit title="${tr("Thoát (Esc)")}" aria-label="${tr("Thoát (Esc)")}">${i("x")}</button><span style="font-size:var(--pa-fs-sm);font-weight:560">${esc(tr("Bài giảng · {0}", r.topic.title))}</span></div>`;
  const step = (st: string, b: string, sm: string) => `<div class="qq-step ${st}"><span class="d">${st === "ok" ? i("check", 14) : st === "now" ? "<i></i>" : ""}</span><div><b>${b}</b><small>${sm}</small></div></div>`;
  return `<div class="focus q-play qd">${top}<div class="focus-body"><div class="sumry in qq"><div class="eyebrow">${tr("Bài giảng")}</div>
    <h2 class="qq-h">${tr("Đang chờ {0} soạn bài giảng", esc(C.agent))}</h2>
    <p class="sub">${tr("{0} đọc note này rồi ghi một bài giảng tương tác (file HTML) và nối vào note. Màn này tự mở bài giảng khi file xuất hiện.", esc(C.agent))}</p>
    <div class="qq-steps">${step("ok", C.agentReady ? tr("Đã gửi lệnh cho {0}", esc(C.agent)) : tr("Đã chép lệnh"), esc(r.cmd.split(", ghi vào")[0]))}${step("now", tr("{0} đang soạn bài giảng", esc(C.agent)), tr("Bài giảng bám note, có câu hỏi tự chấm."))}</div>
    ${C.agentReady ? `<p class="sub qq-hint">${tr("Chờ lâu? Mở khung chat của {0}: có thể {0} đang chờ duyệt quyền ghi vào thư mục bài giảng.", esc(C.agent))}</p>` : ""}
    <div class="acts" style="justify-content:center"><button class="btn ghost" data-exit>${tr("Huỷ")}</button></div></div></div></div>`;
}
