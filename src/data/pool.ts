/* Chạy fn trên từng phần tử, tối đa n việc cùng lúc. Lỗi một việc được nuốt (fn tự xử lý/ghi log) để không dừng cả lô. */
export async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let k = 0;
  const run = async () => { while (k < items.length) { const x = items[k++]; try { await fn(x); } catch { /* fn tự ghi log */ } } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}
