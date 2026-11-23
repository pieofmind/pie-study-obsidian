/* Đợt 6 (spec 7.6) — port d6.js (bản D2): màn chờ Quiz nhanh. Màn sẵn sàng KHÔNG hiện câu hỏi hay trích dẫn (khỏi lộ đáp án). */
import { tr } from "../i18n.ts";
import { i, esc, tokName, cmdLearn, type Ctx } from "./shared.ts";
import { resultRows, answerText, mineText } from "../data/result.ts";
import type { QZ } from "./practice.ts";
import type { Topic } from "../data/index.ts";
import type { Vetted, VetWhy } from "../data/quiznote.ts";

export interface QN { note: Topic; path: string; stage: "exists" | "wait" | "ready" | "empty"; sentAt: number; cmd: string; easier: boolean; vet?: Vetted }

const WHY = (w: VetWhy) => ({ ok: tr("trích dẫn khớp note"), notfound: tr("Bỏ: trích dẫn không có trong note"), noquote: tr("Bỏ: thiếu trích dẫn"), short: tr("Bỏ: trích dẫn quá ngắn"),
  type: tr("Bỏ: dạng câu quiz nhanh chưa nhận"), shape: tr("Bỏ: câu sai khuôn hoặc thiếu đáp án"), noq: tr("Bỏ: thiếu câu hỏi"), opts: tr("Bỏ: dưới 2 phương án"),
  ans: tr("Bỏ: đáp án không hợp lệ"), blank: tr("Bỏ: cloze không có chỗ trống"), keys: tr("Bỏ: thiếu từ khoá") }[w] ?? w);

export function quizNoteScreen(C: Ctx, q: QN) {
  const top = `<div class="focus-top"><button class="ibtn" data-exit title="${tr("Thoát (Esc)")}" aria-label="${tr("Thoát (Esc)")}">${i("x")}</button><span style="font-size:var(--pa-fs-sm);font-weight:560">${esc(tr("Quiz nhanh · {0}", q.note.title))}</span><span style="flex:1"></span><span class="src">${i("file", 12)}${esc(q.path)}</span></div>`;
  const wrap = (body: string) => `<div class="focus q-play qd">${top}<div class="focus-body"><div class="sumry in qq"><div class="eyebrow">${tr("Quiz nhanh")}</div>${body}</div></div></div>`;
  const step = (st: string, b: string, sm: string) => `<div class="qq-step ${st}"><span class="d">${st === "ok" ? i("check", 14) : st === "now" ? "<i></i>" : ""}</span><div><b>${b}</b><small>${sm}</small></div></div>`;
  const again = `<button class="btn ghost" data-qn-new>${i("refresh", 14)}${tr("Nhờ soạn bộ mới")}</button>`;
  if (q.stage === "exists") return wrap(`<h2 class="qq-h">${tr("Đã có bộ quiz cho note này")}</h2><p class="sub">${tr("Làm lại bộ cũ, hoặc nhờ {0} soạn bộ mới (ghi đè file).", esc(C.agent))}</p>
    <div class="acts" style="justify-content:center"><button class="btn" data-qn-old>${tr("Làm lại bộ cũ")}</button>${again}</div>`);
  if (q.stage === "wait") return wrap(`<h2 class="qq-h">${tr("Đang chờ {0} soạn câu hỏi", esc(C.agent))}</h2>
    <p class="sub">${tr("{0} đọc note này rồi ghi 5 câu vào file bên dưới. Màn này tự đổi khi file xuất hiện.", esc(C.agent))}</p>
    <div class="qq-steps">${step("ok", C.agentReady ? tr("Đã gửi lệnh cho {0}", esc(C.agent)) : tr("Đã chép lệnh"), esc(q.cmd.split(", ghi vào")[0]))}${step("now", tr("{0} đang soạn câu hỏi", esc(C.agent)), tr("Mỗi câu phải kèm một câu chép nguyên văn từ note."))}${step("", tr("Kiểm trích dẫn"), tr("Plugin loại câu nào có trích dẫn không nằm trong note."))}</div>
    ${C.agentReady ? `<p class="sub qq-hint">${tr("Chờ lâu? Mở khung chat của {0}: có thể {0} đang chờ duyệt quyền ghi vào thư mục quiz.", esc(C.agent))}</p>` : ""}
    <div class="acts" style="justify-content:center"><button class="btn ghost" data-exit>${tr("Huỷ")}</button></div>`);
  const v = q.vet!, kept = v.items.length, rows = v.rows.map(r => `<div class="qq-it ${r.why === "ok" ? "ok" : "no"}"><span class="d">${i(r.why === "ok" ? "check" : "x", 13)}</span><div><b>${tr("Câu {0}", r.n)}</b><small>${r.token ? `<span class="pill tok">${esc(r.token)}</span>` : ""}${WHY(r.why)}</small></div></div>`).join("");
  if (!kept) return wrap(`<h2 class="qq-h">${tr("Không còn câu nào hợp lệ")}</h2><p class="sub">${v.broken ? tr("File quiz hỏng hoặc không đúng khuôn.") : tr("Không câu nào có trích dẫn khớp note.")}</p>
    ${rows ? `<div class="qq-list">${rows}</div>` : ""}<div class="acts" style="justify-content:center">${again.replace("btn ghost", "btn")}<button class="btn ghost" data-exit>${tr("Huỷ")}</button></div>`);
  return wrap(`<h2 class="qq-h">${tr("{0} câu sẵn sàng", kept)}</h2>
    <p class="sub">${tr("{0} soạn {1} câu.", esc(C.agent), v.rows.length)} ${tr("Plugin giữ {0} câu có trích dẫn khớp note và bỏ {1} câu.", kept, v.rows.length - kept)}</p>
    <div class="qq-list">${rows}</div><p class="sub qq-hint">${tr("Câu hỏi và trích dẫn chỉ hiện khi làm bài, để không lộ đáp án.")}</p>
    <div class="acts" style="justify-content:center"><button class="btn" data-qn-go>${tr("Bắt đầu {0} câu", kept)}</button>${again}</div>`);
}

/* ── Màn kết quả quest (thay màn tổng kết cũ; dùng cho cả quest và quiz note) ── */
export function questResult(C: Ctx, z: QZ, top: string) {
  const r = resultRows(z.items, z.res, z.picks || []), sel = z.sel === undefined ? r.first : z.sel, row = sel != null ? r.rows[sel] : null;
  const t = z.topic || z.topics[0], toks = r.wrongTokens, names = toks.map(x => tokName(x)).join(", ");
  const cmdRe = t ? (t.outside ? `giảng lại [[${t.slug}]] — quest sai token ${toks.join(", ")}` : `${cmdLearn(t)} — quest sai token ${toks.join(", ")}`) : "";
  const line = (ic: string, b: string, sm: string, attr: string) => `<button class="td-row" ${attr}><span class="ic">${i(ic, 18)}</span><span><b>${b}</b><small>${esc(sm)}</small></span>${i(!C.agentReady ? "copy" : "arrow", 16)}</button>`;
  const chip = (x: typeof r.rows[0]) => `<button class="${x.state}${sel === x.k ? " on" : ""}" data-qrsel="${x.k}" title="${esc(tr("Câu {0}", x.k + 1) + ": " + (x.state === "ok" ? tr("đúng") : x.state === "no" ? tr("sai") : tr("tự luận")))}">${x.k + 1}${i(x.state === "ok" ? "check" : x.state === "no" ? "x" : "pen", 12)}</button>`;
  const detail = row ? `<div class="qr-detail"><div class="qr-dh">${row.q.token ? `<span class="pill tok">${esc(row.q.token)}</span>` : ""}<b>${tr("Câu {0}", row.k + 1)}</b></div><p class="qr-q">${esc(row.q.q || answerText(row.q))}</p>
    ${row.state === "ok" ? `<div class="qr-l ok">${i("check", 14)}<span><small>${tr("Bạn trả lời đúng")}</small>${esc(answerText(row.q))}</span></div>`
      : row.state === "neu" ? `<div class="qr-l">${i("pen", 14)}<span><small>${tr("Bài của bạn")}</small>${esc(mineText(row.q, row.pick))}</span></div>`
      : `<div class="qr-l no">${i("x", 14)}<span><small>${tr("Bạn chọn")}</small>${esc(mineText(row.q, row.pick))}</span></div><div class="qr-l ok">${i("check", 14)}<span><small>${tr("Đáp án")}</small>${esc(answerText(row.q))}</span></div>`}
    ${row.q.ex ? `<p class="qr-ex">${esc(row.q.ex)}</p>` : ""}${row.q.quote ? `<p class="qr-src"><small>${tr("Căn cứ trong note")}</small>"${esc(row.q.quote)}"</p>` : ""}</div>`
    : `<p class="sub" style="margin:10px 0 0">${tr("Bấm một ô số để xem lại câu đó.")}</p>`;
  const wrong = r.rows.filter(x => x.state === "no").length;
  return `<div class="focus q-play qd">${top}<div class="focus-body"><div class="sumry in qr"><div class="eyebrow">${tr("Hoàn thành {0}", esc(z.title))}</div><div class="big">${r.ok}/${r.graded}</div>
    <div class="qr-chips">${r.rows.map(chip).join("")}</div>${detail}
    <p class="sub qr-note">${wrong ? tr("{0} câu sai đã vào sổ lỗi sai. Làm lại được từ ngày mai.", wrong) : tr("Không sai câu nào. Kết quả đã ghi vào nhật ký luyện tập.")}</p>
    <div class="acts" style="justify-content:center"><button class="btn" data-exit>${tr("Xong")}</button><button class="btn ghost" data-qz-redo>${i("refresh", 14)}${tr("Làm lại")}</button></div>
    ${wrong && t ? `<div class="td-more"><small>${tr("Muốn chắc hơn ở chỗ sai")}</small>
      ${line("chat", !C.agentReady ? tr("Chép lệnh nhờ giảng lại chỗ sai") : tr("Nhờ {0} giảng lại chỗ sai", esc(C.agent)), names, !C.agentReady ? `data-copy="${esc(cmdRe)}"` : `data-bob="${esc(cmdRe)}"`)}
      ${line("zap", tr("Luyện thêm bộ dễ hơn"), tr("5 câu mới về {0}", names), `data-qeasy="${esc(toks.join(","))}" data-path="${esc(t.path)}"`)}</div>` : ""}</div></div>
    <div class="mascot-slot corner" data-mascot data-mood="${r.graded && r.ok * 2 >= r.graded ? "celebrate" : "sad"}" data-mkey="qz-end"></div></div>`;
}
