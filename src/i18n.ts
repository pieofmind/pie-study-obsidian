/* tr(): khoá = câu tiếng Việt; bản en trong EN. {0}, {1}… = tham số. Ngôn ngữ theo Obsidian. */
import { EN } from "./i18n-en.ts";
let lang = "vi";
export const setLang = (l: string) => { lang = l.startsWith("vi") ? "vi" : "en"; };
export const getLang = () => lang;
/** Tiếng Anh: "1 lessons" → "1 lesson" (bảng dịch viết dạng số nhiều; tiếng Việt không có số ít/nhiều). */
const SINGULAR = /(^|[^\d.])1((?:<\/b>)? )(lesson|path|card|day|word|stage|session|boss|quest|node|minute|hour|token|mistake|time|item|question|block)(e?s)\b/g;   // số có thể nằm trong <b>…</b>
export function tr(s: string, ...a: (string | number)[]): string {
  const t = (lang === "en" && EN[s] ? EN[s] : s).replace(/\{(\d)\}/g, (_: string, k: string) => String(a[+k] ?? ""));
  return lang === "en" ? t.replace(SINGULAR, "$1" + "1$2$3") : t;
}
