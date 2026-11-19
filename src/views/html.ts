/* Đổ chuỗi HTML của các màn vào DOM — MỌI chỗ đi qua đây, qua bộ lọc sanitizeHTMLToDom của Obsidian (luật store: không gán innerHTML).
   Bộ lọc bỏ thuộc tính srcdoc của iframe (bài giảng, câu quest nhúng), nên nội dung khung đi đường riêng (frames.ts):
   lọc xong thì gắn lại srcdoc. iframe vẫn giữ sandbox do chuỗi HTML khai. */
import { sanitizeHTMLToDom } from "obsidian";
import { takeFrameDocs } from "./frames.ts";

function frag(html: string): DocumentFragment {
  const f = sanitizeHTMLToDom(html), docs = takeFrameDocs();
  f.querySelectorAll<HTMLIFrameElement>("iframe[data-frame]").forEach(fr => {
    const d = docs.get(fr.dataset.frame ?? "");
    if (d != null) { fr.referrerPolicy = "no-referrer"; fr.srcdoc = d; }
  });
  return f;
}

/** Thay toàn bộ nội dung của el. */
export function setHtml(el: Element, html: string): void { el.replaceChildren(frag(html)); }
/** Thêm vào cuối el. */
export function appendHtml(el: Element, html: string): void { el.append(frag(html)); }
/** Dựng thành fragment để lấy một phần (không gắn vào trang). */
export function htmlFrag(html: string): DocumentFragment { return frag(html); }
