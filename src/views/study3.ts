/* Đợt 3 (spec 7.3) — port essayScreen / lectureScreen của prototype D2. Plugin không tự chấm, không đổi mastery:
   Tự luận chỉ soạn lệnh cho agent; Bài giảng chạy trong iframe cách ly và chỉ được báo kết quả theo khuôn cố định. */
import { tr } from "../i18n.ts";
import { i, esc, bobBtn, cmdLearn, type Ctx } from "./shared.ts";
import { focusTop, corner } from "./practice.ts";
import { shortTitle, type Topic } from "../data/index.ts";
import type { EssayPrompt, LecBlock } from "../data/lecture.ts";
import { shownQuote } from "../data/lecshell.ts";

export interface ES { topic: Topic; p: EssayPrompt; text: string; stage: "write" | "sent"; revAtSend?: string }
export interface LC { topic: Topic; path: string; doc: string; log: { token: string; ok: boolean }[]; blocks: LecBlock[]; at: string | null; deeper: string[]; grounded: Record<string, boolean>; bad: string[]; back?: string }
const KIND = (k: string) => ({ intro: tr("Ý chính"), predict: tr("Đoán trước"), timeline: tr("Các bước"), graph: tr("Sơ đồ khái niệm"), cards: tr("Thẻ tự kiểm"), deeper: tr("Đào sâu"), takeaway: tr("Mang về dùng"), visual: tr("Trực quan") }[k] || k);
/** Lệnh gửi agent — tiếng Việt, không qua tr(). */
export const cmdRewriteBlock = (l: LC, b: LecBlock, guide: string) => `soạn lại khối ${b.id} (${b.kind}) của bài giảng "${l.path}" cho [[${l.topic.slug}]] theo hướng dẫn "${guide}" (làm theo file này, không cần nạp skill)${l.bad.includes(b.id) ? " — khối đang lỗi" : ""}`;
export const cmdDeeper = (l: LC, id: string, guide: string) => `đào sâu [[${l.topic.slug}]] — theo khối ${id} của bài giảng "${l.path}" theo hướng dẫn "${guide}" (làm theo file này, không cần nạp skill)`;
/** Đợt 7: mục lục khối (đọc từ chữ file) + dòng "Đào sâu" (tiêu đề lấy từ file, không lấy chữ iframe gửi). Bài giảng cũ không có khối → không hiện. */
function blockRail(C: Ctx, l: LC, tpl: string) {
  if (!l.blocks.length) return "";
  const title = (id: string) => l.blocks.find(b => b.id === id)?.title || id;
  const reBtn = (b: LecBlock, hot: boolean) => { const cmd = cmdRewriteBlock(l, b, tpl);
    return !C.agentReady
      ? `<button class="lb-re${hot ? " hot" : ""}" data-copy="${esc(cmd)}" title="${tr("Chép lệnh soạn lại khối này")}" aria-label="${tr("Chép lệnh soạn lại khối này")}">${i("copy", 14)}</button>`
      : `<button class="lb-re${hot ? " hot" : ""}" data-bob="${esc(cmd)}" data-lbre="${esc(b.id)}" title="${esc(tr("Nhờ {0} soạn lại khối này", C.agent))}" aria-label="${esc(tr("Nhờ {0} soạn lại khối này", C.agent))}">${i("refresh", 14)}</button>`; };
  const rows = l.blocks.map(b => { const v = b.kind === "visual", bad = l.bad.includes(b.id);
    const tags = (bad ? `<span class="lb-tag no">${tr("lỗi")}</span>` : "") + (v && !l.grounded[b.id] ? `<span class="lb-tag warn">${tr("chưa bám note")}</span>` : "") + (v && !b.predict ? `<span class="lb-tag warn">${tr("thiếu câu đoán trước")}</span>` : "");
    return `<div class="lb-row${l.at === b.id ? " on" : ""}${bad ? " bad" : ""}" data-lbrow="${esc(b.id)}"><button class="lb-go" data-lbgo="${esc(b.id)}"><small>${KIND(b.kind)}</small><b>${esc(b.title || b.id)}</b>${tags ? `<span class="lb-tags">${tags}</span>` : ""}</button>${reBtn(b, bad)}</div>`; }).join("");
  const badNow = l.blocks.filter(b => l.bad.includes(b.id)), b0 = badNow[0];
  const broken = !b0 ? "" : `<div class="lb-broken"><b>${tr("{0} khối bị lỗi nên không chạy", badNow.length)}</b><small>${esc(badNow.map(b => b.title || b.id).join(", "))}. ${tr("Các khối khác vẫn dùng bình thường.")}</small>${!C.agentReady
    ? `<button class="btn primary" data-copy="${esc(cmdRewriteBlock(l, b0, tpl))}">${i("copy")}${tr("Chép lệnh soạn lại khối lỗi")}</button>`
    : `<button class="btn primary" data-bob="${esc(cmdRewriteBlock(l, b0, tpl))}" data-lbre="${esc(b0.id)}">${i("refresh")}${esc(tr("Nhờ {0} soạn lại khối lỗi", C.agent))}</button>`}</div>`;
  const deep = l.deeper.map(id => { const cmd = cmdDeeper(l, id, tpl);
    return `<button class="lb-deep" ${!C.agentReady ? `data-copy="${esc(cmd)}"` : `data-bob="${esc(cmd)}"`}><span><small>${!C.agentReady ? tr("Chép lệnh đào sâu") : esc(tr("Nhờ {0} đào sâu", C.agent))}</small><b>${esc(title(id))}</b></span>${i(!C.agentReady ? "copy" : "arrow", 16)}</button>`; }).join("");
  const cur = l.blocks.find(b => b.id === l.at);
  const src = cur?.kind !== "visual" ? "" : `<div class="eyebrow" style="margin-top:18px">${tr("Căn cứ trong note")}</div>` + (l.grounded[cur.id]
    ? `<div class="lq">${i("check", 14)}<div><p>"${esc(shownQuote(cur.quote || ""))}"</p><small>${tr("Câu này có nguyên văn trong note bài.")}</small></div></div>`
    : `<div class="lq no">${i("info", 14)}<div><p>${tr("Khối này chưa bám note.")}</p><small>${tr("Câu trích không có nguyên văn trong note. Đối chiếu với note trước khi tin mô hình.")}</small></div></div>`);
  return `<div class="eyebrow">${tr("Các khối trong bài")}</div><div class="lb-list">${rows}</div>${broken}${src}${deep ? `<div class="eyebrow" style="margin-top:18px">${tr("Bài giảng gợi ý đào sâu")}</div><div class="lb-deeps">${deep}</div>` : ""}`;
}

const MIN = 20;   // ký tự tối thiểu trước khi cho nộp (như prototype)
export const essayReady = (text: string) => text.trim().length >= MIN;
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function essayScreen(C: Ctx, e: ES, cmd: string) {
  const t = e.topic, title = tr("Tự luận · {0}", e.p.token);
  if (e.stage === "write") {
    const btn = C.agentReady
      ? `<button class="btn pri" data-essay-submit ${essayReady(e.text) ? "" : "disabled style='opacity:.45;pointer-events:none'"}>${i("chat")}${tr("Nộp cho {0} chấm", C.agent)}</button>`
      : `<button class="btn" data-essay-copy title="${esc(cmd.split("\n")[0])}">${i("copy")}${tr("Chép bài + lệnh")}</button>`;
    return `<div class="focus q-play qd">${focusTop(title, 0, 1)}<div class="focus-body"><div class="essay in"><div style="display:flex;gap:6px"><span class="pill tok">${esc(e.p.token)}</span><span class="pill">${esc(shortTitle(t.title))}</span></div>
    <p class="qq" style="font-size:var(--pa-fs-lg);font-weight:600;line-height:1.4;margin:12px 0 16px">${esc(e.p.q)}</p>
    <textarea data-essay placeholder="${esc(tr("Viết bằng lời của mình. Không cần hoàn hảo — {0} sẽ hỏi lại chỗ còn mơ.", C.agent))}">${esc(e.text)}</textarea>
    <div class="bar"><span data-essay-words>${tr("{0} từ", words(e.text))}</span><span>${tr("Nháp lưu tạm trên máy này")}</span><span class="sp"></span>${btn}</div>
    <div class="note-call info">${i("info")}<div>${tr("{0} chấm theo rubric 17 rồi ghi kết quả vào sổ học như một buổi học. Plugin không tự chấm và không đổi mastery.", C.agent)}</div></div></div></div>${corner("typing", "essay-" + t.slug)}</div>`;
  }
  const graded = e.revAtSend !== undefined && (C.idx.all.find(x => x.path === t.path)?.rev ?? "") !== e.revAtSend;   // agent ghi lại learn_reviewed = đã chấm và ghi sổ
  const st = (n: number) => (graded || n === 1 ? "done" : n === 2 ? "run" : "");
  const d = (n: number) => (st(n) === "done" ? i("check", 12) : String(n));
  return `<div class="focus q-play qd">${focusTop(title, 1, 1)}<div class="focus-body"><div class="essay in"><div class="eyebrow">${tr("Đã gửi")}</div><h2 class="t" style="font-size:var(--pa-fs-lg);margin:6px 0 0">${graded ? tr("{0} đã chấm xong", C.agent) : tr("{0} đang chấm", C.agent)}</h2>
    <div class="steps"><div class="step ${st(1)}"><span class="d">${d(1)}</span><div><b>${tr("Gửi bài sang {0}", C.agent)}</b><small>${tr("kèm đề, token {0} và link bài", e.p.token)}</small></div></div>
    <div class="step ${st(2)}"><span class="d">${d(2)}</span><div><b>${tr("Chấm theo rubric, hỏi lại nếu cần")}</b><small>${tr("diễn ra trong khung chat của {0}", C.agent)}</small></div></div>
    <div class="step ${st(3)}"><span class="d">${d(3)}</span><div><b>${tr("Ghi vào sổ học sau khi duyệt")}</b><small>${tr("plugin thấy file đổi thì cập nhật ở đây")}</small></div></div></div>
    <div class="acts" style="margin-top:18px"><button class="btn" data-go="topic" data-topic="${esc(t.slug)}">${tr("Về bài học")}</button><button class="btn ghost" data-essay-again>${i("pen")}${tr("Viết bài khác")}</button></div></div></div>${corner(graded ? "celebrate" : "think", "essay-sent-" + t.slug + (graded ? "-g" : ""))}</div>`;
}

export function lectureScreen(C: Ctx, l: LC, newLectureCmd: string, tpl = "") {
  const t = l.topic, name = l.path.split("/").pop() || l.path;
  const lines = l.log.length ? l.log.slice(-50).map(x => `<div class="logline"><span class="pill tok">${esc(x.token)}</span><span class="${x.ok ? "" : "muted"}">${x.ok ? tr("trả lời đúng") : tr("trả lời sai")}</span></div>`).join("")
    : `<p class="sub muted" style="font-size:var(--pa-fs-sm);margin-top:8px">${tr("Câu hỏi trong bài giảng gửi kết quả về đây và vào nhật ký luyện tập.")}</p>`;
  return `<div class="focus q-play qd q-lec"><div class="focus-top"><button class="ibtn" data-exit title="${tr("Thoát (Esc)")}" aria-label="${tr("Thoát (Esc)")}">${i("x")}</button><span style="font-size:var(--pa-fs-sm);font-weight:560">${esc(tr("Bài giảng · {0}", shortTitle(t.title)))}</span><span style="flex:1"></span><span class="src">${i("file", 12)}${esc(name)}</span></div>
    <div class="lect"><div class="frame"><iframe data-lecture sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${esc(l.doc)}"></iframe></div>
    <aside class="rail${l.blocks.length ? " lb" : ""}">${blockRail(C, l, tpl)}<div class="eyebrow"${l.blocks.length ? ' style="margin-top:18px"' : ""}>${tr("Ghi nhận từ bài giảng")}</div><div style="margin-top:6px">${lines}</div>
    <div class="note-call info" style="margin-top:18px">${i("info")}<div>${tr("Bài giảng chạy cách ly: không đọc được vault, chỉ được gửi kết quả theo một khuôn cố định.")}</div></div>
    <div class="acts" style="flex-direction:column;align-items:stretch">${bobBtn(C, tr("Hỏi {0} về bài giảng", C.agent), cmdLearn(t) + " — vừa xem bài giảng, có câu muốn hỏi")}${C.agentReady ? `<button class="btn ghost" data-bob="${esc(newLectureCmd)}">${i("plus")}${tr("Nhờ {0} soạn bài giảng mới", C.agent)}</button>` : ""}</div></aside></div></div>`;
}
