/* Nội dung iframe chờ gắn (thuần, test bằng node được): bộ lọc HTML bỏ srcdoc, nên chuỗi HTML chỉ mang data-frame="khoá"; html.ts gắn lại sau khi lọc. */
const docs = new Map<string, string>();
let seq = 0;

/** Cất nội dung một iframe; trả khoá để đặt vào `data-frame="…"` trong chuỗi HTML. */
export function frameDoc(doc: string): string { const k = String(++seq); docs.set(k, doc); return k; }
/** Lấy hết nội dung đang chờ rồi xoá: dựng chuỗi và đổ vào DOM cùng một nhịp, khoá chưa dùng là chuỗi bị bỏ (không giữ bài giảng trong bộ nhớ). */
export function takeFrameDocs(): Map<string, string> { const m = new Map(docs); docs.clear(); return m; }
