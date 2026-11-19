/* Đợt 7b (spec 7.8) — file bài giảng "chỉ chứa khối": plugin bọc khung lúc hiển thị (CSS, nút Tiếp/Trước, chấm, message của 7.7, theme).
   Thuần, test bằng node. Agent không chép và không sửa được phần khung. File thiếu dòng mở đầu → không qua đây (mở nguyên trạng như trước). */

import { prepareLectureDoc, isBlockId, lectureBlocks, type LecBlock } from "./lecture.ts";
import { quoteOk } from "./quiznote.ts";

export const BLOCKS_MARK = "<!--pie-study:blocks v1-->";
export const isBlocksFile = (text: string) => text.replace(/^﻿/, "").trimStart().startsWith(BLOCKS_MARK);

/** Mọi chữ khung hiện trong iframe — truyền vào đã qua tr(). */
export interface ShellStrings {
  next: string; done: string; ok: string; wrong: string; tryAgain: string; deeperSent: string;
  predictLabel: string; predictDone: string; predictAfter: string; brokenTitle: string; brokenBody: string; notGrounded: string; notGroundedBody: string;
}
/** note = chữ note bài (kiểm data-quote của khối visual). libs = thư viện gói kèm plugin (tên → mã), chỉ chèn khi khối visual khai báo data-libs. */
export interface ShellOpts { css: string; L: ShellStrings; note?: string; libs?: Record<string, string> }

/** JSON nhúng trong <script>: chặn "</script" và "<!--" thoát khỏi thẻ. */
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/** Thêm class "s" (khối đầu thêm "on") vào thẻ <section>, giữ nguyên mọi thuộc tính khác. */
function markSection(tag: string, first: boolean) {
  const add = first ? "s on" : "s", m = tag.match(/\sclass\s*=\s*"([^"]*)"/i);
  return m ? tag.replace(m[0], ` class="${m[1]} ${add}"`) : tag.replace(/^<section\b/i, `<section class="${add}"`);
}

/** Script khung: điều hướng + đánh số nhãn + goto/theme/at + chấm khối predict + timeline + thẻ lật + đào sâu (cùng việc với mẫu 7.7). */
const SHELL_JS = `const S=[...document.querySelectorAll('section.s')],dots=document.querySelector('.dots'),send=m=>parent.postMessage(m,'*'),p=document.getElementById('p'),x=document.getElementById('x');
S.forEach((s,j)=>{const e=s.querySelector('.e');if(e)e.textContent+=' · '+(j+1)+'/'+S.length});
dots.innerHTML=S.map(()=>'<i></i>').join('');const D=[...dots.children];let k=0;
const show=(n,tell)=>{if(!S.length)return;S[k].classList.remove('on');k=Math.max(0,Math.min(S.length-1,n));S[k].classList.add('on');D.forEach((e,j)=>e.classList.toggle('on',j<=k));p.disabled=k===0;x.textContent=k===S.length-1?L.done:L.next;if(tell&&S[k].dataset.id)send({type:'pie-study/at',block:S[k].dataset.id})};
show(0,false);x.onclick=()=>show(k+1,true);p.onclick=()=>show(k-1,true);
addEventListener('message',e=>{const d=e.data;if(e.source!==parent||!d||typeof d!=='object')return;
  if(d.type==='pie-study/goto'){const n=S.findIndex(s=>s.dataset.id===d.id);if(n>=0)show(n,true)}
  if(d.type==='pie-study/theme'&&(d.theme==='light'||d.theme==='dark')){document.body.classList.remove('light','dark');document.body.classList.add(d.theme)}});
const say=(fb,ok)=>{if(!fb)return;fb.textContent='';const t=document.createElement('span');t.className=ok?'ok-t':'no-t';t.textContent=ok?L.ok:L.wrong;fb.append(t);if(!ok)fb.append(' '+L.tryAgain)};
document.querySelectorAll('[data-block="predict"] .opts').forEach(o=>{const s=o.closest('section'),fb=s.querySelector('.fb');o.onclick=e=>{const b=e.target.closest('button');if(!b||o.dataset.done)return;const ok=b.dataset.a==='1';b.classList.add(ok?'ok':'no');if(ok)o.dataset.done=1;
  say(fb,ok);if(s.dataset.token)send({type:'pie-study/answer',token:s.dataset.token,ok,block:s.dataset.id})}});
document.querySelectorAll('[data-block="timeline"]').forEach(s=>{const b=s.querySelector('.more'),tl=s.querySelector('.tl');if(b&&tl)b.onclick=()=>{const n=tl.querySelector('div:not(.on)');if(n)n.classList.add('on');if(!tl.querySelector('div:not(.on)'))b.disabled=true}});
document.querySelectorAll('.fc').forEach(f=>f.onclick=e=>{const b=e.target.closest('button');if(b)b.classList.toggle('f')});
document.querySelectorAll('[data-block="deeper"] .dp-btn').forEach(b=>b.onclick=()=>{b.disabled=true;b.textContent=L.deeperSent;send({type:'pie-study/deeper',block:b.closest('section').dataset.id})});`;

/** Khối visual nào có câu trích nguyên văn trong note (cùng hàm kiểm của quiz note). Dùng chung cho khung và cột phải. */
export const groundedMap = (blocks: LecBlock[], note: string) =>
  Object.fromEntries(blocks.filter(b => b.kind === "visual").map(b => [b.id, quoteOk(b.quote, note) === "ok"]));

/** Câu trích hiện cho người đọc: bỏ dấu markdown (theo wrap.py d0a3808). */
export const shownQuote = (q: string) => q.replace(/\*\*|\*|__|`|\[\[|\]\]/g, "").trim();

/** Phần tử khung nằm TRONG section (cổng đoán, thẻ khối lỗi, nhãn chưa bám note): CSS khối do agent viết có thể thoát khỏi .vz
    ([data-id="x"] button{}, [data-id] *{}). Mọi luật ở đây mang :not(#_ps) (độ ưu tiên mức id) và tự khai đủ kiểu, không dựa vào luật .more của mẫu. */
const B = ":not(#_ps)";
const FRAME = [
  `.vq${B},.vq${B} *,.vbad${B},.vbad${B} *,.vsrc${B},.vsrc${B} *{letter-spacing:normal;text-transform:none;text-decoration:none;text-shadow:none;font-style:normal;float:none;position:static;visibility:visible}`,
  `.vq${B}{display:block;margin:18px 0 0;max-width:640px;padding:14px 16px;border-radius:16px;background:var(--t);border:2.5px solid var(--ol);box-shadow:none;color:var(--ink);font:400 14px/1.45 "Be Vietnam Pro",sans-serif;opacity:1;transform:none}`,
  `.vq${B} small,.vsrc${B} small{display:block;margin:0;font:900 11px "Be Vietnam Pro",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);background:none;border:0}`,
  `.vq${B} b{display:block;margin:4px 0 0;font:800 17px/1.35 "Be Vietnam Pro",sans-serif;color:var(--ink);background:none;border:0;text-transform:none;letter-spacing:normal}`,
  `.vq${B} .ps-btn{display:inline-flex;align-items:center;width:auto;min-width:0;min-height:0;margin:12px 0 0;height:42px;padding:0 16px;border-radius:13px;border:2.5px solid var(--ol);box-shadow:0 3px 0 var(--ol);background:var(--gold);color:#17223F;font:900 14px "Be Vietnam Pro",sans-serif;text-transform:none;letter-spacing:normal;opacity:1;transform:none;cursor:pointer}`,
  `.vq${B} .ps-btn:active{transform:translateY(3px);box-shadow:none}`,
  `.vq.done${B}{background:transparent;border-style:dashed}`,
  `.vq.done${B} span{display:block;margin:6px 0 0;font:600 13px "Be Vietnam Pro",sans-serif;color:var(--ink2)}`,
  `section.bad .vq${B}{display:none}`,
  `.vbad${B}{display:block;margin:16px 0 0;max-width:640px;padding:14px 16px;border-radius:16px;border:2.5px solid var(--no);background:var(--no-t);box-shadow:none;color:var(--ink);font:600 14px/1.45 "Be Vietnam Pro",sans-serif;opacity:1}`,
  `.vbad${B} b{display:block;margin:0;font:900 14px/1.45 "Be Vietnam Pro",sans-serif;color:var(--ink);background:none;border:0}`,
  `.vsrc${B}{display:block;margin:12px 0 0;max-width:640px;font:italic 500 13px/1.45 "Be Vietnam Pro",sans-serif;color:var(--ink2);background:none;border:0;opacity:1}`,
  `.vsrc.no${B} small{font-style:normal;color:var(--no)}`,
].join("\n");

/** CSS riêng của khối visual (theo wrap.py của sketch 002). Thanh điều hướng đặc (d0a3808) nằm trong mẫu, dùng chung cho bài giảng cũ. */
const VISUAL_CSS = `
section[data-block="visual"] .vz{margin-top:16px;max-width:640px;padding:16px;border-radius:18px;background:var(--card);border:2.5px solid var(--ol);box-shadow:0 5px 0 var(--ol);transition:opacity .25s}
.vz.lock{opacity:.3}section.bad .vz{opacity:.3}
${FRAME}`;

/** Bắt lỗi theo khối. Chỉ đổ lỗi cho một khối khi lỗi xảy ra LÚC code của khối đó chạy: giữa begin/end (nạp script) hoặc trong lúc xử lý một sự kiện người dùng có đích nằm trong khối (click, input, kéo thanh…).
    Lỗi không rõ nguồn (từ khung, Electron, "ResizeObserver loop…") KHÔNG gắn cho khối nào, chỉ ghi console. Tin báo kèm câu lỗi ngắn đã lọc (`why`) để ghi log. */
export const BLAME_JS = `const __ps={cur:null,ev:null,bad:{},begin(id){this.cur=id},end(){this.cur=null},
 api(id){const s=document.querySelector('section[data-id="'+id+'"]');return{answer(ok){if(s&&s.dataset.token)send({type:'pie-study/answer',token:s.dataset.token,ok:!!ok,block:id})}}},
 broken(id,why){if(!id||this.bad[id])return;const s=document.querySelector('section[data-id="'+id+'"]');if(!s||s.dataset.block!=='visual')return;this.bad[id]=1;s.classList.add('bad');
  const b=document.createElement('div'),t=document.createElement('b');b.className='vbad';t.textContent=L.brokenTitle;b.append(t,L.brokenBody);
  const z=s.querySelector('.vz');if(z){z.before(b);z.setAttribute('inert','')}else s.append(b);const m={type:'pie-study/broken',block:id};if(why)m.why=why;send(m)}};
const __why=e=>String((e&&(e.message||(e.reason&&(e.reason.message||e.reason))))||'').replace(/[\\u0000-\\u001f\\u007f]/g,' ').trim().slice(0,160);
const __blame=e=>{const id=__ps.cur||__ps.ev;if(id)__ps.broken(id,__why(e));else console.warn('[pie-study] lỗi ngoài khối, không gắn khối nào:',__why(e))};
addEventListener('error',__blame);addEventListener('unhandledrejection',__blame);
['click','input','change','pointerdown','pointerup','keydown','keyup','submit','wheel'].forEach(t=>addEventListener(t,e=>{const s=e.target&&e.target.closest&&e.target.closest('section[data-block="visual"]');if(s){__ps.ev=s.dataset.id;setTimeout(()=>{__ps.ev=null},0)}},true));
`;

/** Khung cho khối visual: ps.answer, bắt lỗi theo khối (BLAME_JS), cổng đoán trước, nhãn chưa bám note. Mọi chữ lấy từ L / dataset qua textContent. */
const VISUAL_JS = BLAME_JS + `document.querySelectorAll('section[data-block="visual"]').forEach(s=>{const z=s.querySelector('.vz'),q=s.dataset.predict;
 if(!G[s.dataset.id]){const n=document.createElement('div'),h=document.createElement('small');n.className='vsrc no';h.textContent=L.notGrounded;n.append(h,L.notGroundedBody);s.append(n)}
 if(!z||!q)return;
 const g=document.createElement('div'),h=document.createElement('small'),b=document.createElement('b'),btn=document.createElement('button');g.className='vq';btn.className='ps-btn';
 h.textContent=L.predictLabel;b.textContent=q;btn.textContent=L.predictDone;g.append(h,b,btn);z.before(g);z.classList.add('lock');z.setAttribute('inert','');
 btn.onclick=()=>{if(s.classList.contains('bad'))return;z.classList.remove('lock');z.removeAttribute('inert');g.classList.add('done');btn.remove();const n=document.createElement('span');n.textContent=L.predictAfter;g.append(n)}});`;

/** Ghép khung quanh nội dung khối. Kết quả đưa tiếp qua prepareLectureDoc (CSP + class theme) như mọi bài giảng. */
export function buildShell(blocksText: string, o: ShellOpts): string {
  const body = blocksText.replace(/^﻿/, "").trimStart().replace(BLOCKS_MARK, "");
  let n = 0;
  const blockJs: string[] = [], want = new Set<string>();
  const sections = [...body.matchAll(/(<section\b[^>]*>)([\s\S]*?)<\/section>/gi)].map(m => {
    let inner = m[2];
    const id = lectureBlocks(m[1] + "</section>")[0];
    if (/\bdata-block\s*=\s*"visual"/i.test(m[1])) {
      for (const x of (m[1].match(/\bdata-libs\s*=\s*"([^"]*)"/i)?.[1] || "").split(/[\s,]+/)) if (x && o.libs && Object.prototype.hasOwnProperty.call(o.libs, x)) want.add(x);
      const code = [...inner.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x => x[1]).join("\n");
      inner = inner.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
      // id sai dạng thì không chạy script của khối (id được ghép thẳng vào chuỗi JS).
      if (id && isBlockId(id.id) && code.trim()) blockJs.push(`<script>__ps.begin("${id.id}")</script>\n<script>(function(root,ps){\n${code}\n})(document.querySelector('section[data-id="${id.id}"]'),__ps.api("${id.id}"));</script>\n<script>__ps.end()</script>`);
    }
    return markSection(m[1], n++ === 0) + inner + "</section>";
  });
  const G = groundedMap(lectureBlocks(body), o.note ?? "");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${o.css}${VISUAL_CSS}</style></head><body>\n${sections.join("\n")}
<div class="nav"><span class="dots"></span><button id="p" disabled>←</button><button class="n" id="x"></button></div>
<script>const L=${js(o.L)},G=${js(G)};\n${SHELL_JS}\n${VISUAL_JS}</script>\n${[...want].map(x => `<script>${o.libs![x].replace(/<\/script/gi, "<\\/script")}</script>\n`).join("")}${blockJs.join("\n")}\n</body></html>`;
}

/** Một chỗ quyết định cách hiển thị: file khối → bọc khung; còn lại (bài giảng cũ, viết nguyên file) → y như trước (chỉ chèn CSP + theme). */
export const lectureDoc = (html: string, theme: "light" | "dark", o: ShellOpts) => prepareLectureDoc(isBlocksFile(html) ? buildShell(html, o) : html, theme);
/** CSS khung lấy từ mẫu đã build (font nhúng + CSS khối có khuôn): mọi thẻ <style> trong <head>. */
export const shellCssFrom = (template: string) => [...(template.split(/<\/head>/i)[0] || "").matchAll(/<style>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n");
