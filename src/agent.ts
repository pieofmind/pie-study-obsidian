/* Gọi Pie Agent qua API công khai (chỉ Pro): app.plugins.plugins["pie-agent"]?.api.ask.
   Vắng API (chưa cài / Free / bản cũ) → chép lệnh vào clipboard. Plugin chỉ soạn lệnh, không biết gì về skill. */
import { App, Notice } from "obsidian";
import { tr } from "./i18n.ts";

interface PieAgentApi { version?: number; ask?: (text: string, opts?: { newTab?: boolean; title?: string }) => Promise<void>; quick?: (text: string) => Promise<string>; agentName?: string; name?: string }
const api = (app: App): PieAgentApi | null => {
  const a = (app as unknown as { plugins?: { plugins?: Record<string, { api?: PieAgentApi }> } }).plugins?.plugins?.["pie-agent"]?.api;
  return a && typeof a.ask === "function" ? a : null;
};
export const agentReady = (app: App) => !!api(app);
export const agentVersion = (app: App) => String(api(app)?.version ?? "?");
/** Hỏi nhanh một lượt, trả văn bản về (api.quick, Pie Agent API version 2). Bản cũ không có → null. */
export function quickFn(app: App): ((text: string) => Promise<string>) | null {
  const a = api(app), q = a?.quick;
  return typeof q === "function" ? (t: string) => q.call(a, t) : null;
}
/** Xưng hô là biến cài đặt từng vault — đọc từ Pie Agent nếu API trả về, không có thì "Pie Agent". */
export function agentName(app: App): string {
  const a = api(app), n = a?.agentName || a?.name;
  return typeof n === "string" && n.trim() ? n.trim() : "Pie Agent";
}

export async function copyCommand(cmd: string) {
  try { await navigator.clipboard.writeText(cmd); new Notice(tr("Đã chép lệnh — dán vào khung chat agent")); }
  catch { new Notice(tr("Không chép được. Lệnh: {0}", cmd), 8000); }
}

export async function ask(app: App, cmd: string) {
  const a = api(app);
  if (!a?.ask) return copyCommand(cmd);
  try { await a.ask(cmd, { title: "Pie Study" }); }
  catch (e) { console.error("[pie-study] ask lỗi", e); new Notice(tr("Pie Agent không nhận lệnh — đã chép để dán tay.")); await copyCommand(cmd); }
}
