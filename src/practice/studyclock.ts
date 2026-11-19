/* Spec 7.10 bước 6: đồng hồ đo giờ học. Thuần, nhận đồng hồ giả trong test. Chỉ đếm khi `on` (cửa sổ đang chọn, đang ở nơi học) và
   có thao tác trong 120 giây gần nhất; ghi gộp mỗi 60 giây và khi đổi bài / dừng. Khoảng nghỉ không được cộng. */
export const IDLE_MS = 120_000, FLUSH_MS = 60_000, MAX_GAP_MS = 5_000;   // MAX_GAP_MS: nhịp cách nhau lâu hơn (máy ngủ) chỉ tính chừng này

export class StudyClock {
  private last: number | null = null; private lastAct = -Infinity; private key: string | null = null; private day = ""; private ms = 0; private since = 0;
  private write: (key: string, day: string, secs: number) => void; private dayOf: (t: number) => string; private enabled: () => boolean;
  constructor(write: (key: string, day: string, secs: number) => void, dayOf: (t: number) => string, enabled: () => boolean = () => true) { this.write = write; this.dayOf = dayOf; this.enabled = enabled; }

  activity(now: number) { this.lastAct = now; }

  /** Gọi đều (vd mỗi giây). ctx.key = bài đang học (đường dẫn note) hoặc null khi không có bài nào. */
  tick(now: number, ctx: { on: boolean; key: string | null }) {
    const dt = this.last == null ? 0 : Math.min(Math.max(now - this.last, 0), MAX_GAP_MS); this.last = now;
    if (!this.enabled()) { this.ms = 0; this.key = null; return; }   // tắt: không ghi, bỏ phần chưa ghi
    const key = ctx.on ? ctx.key : null, day = this.dayOf(now);
    if (key !== this.key || (key && day !== this.day)) { this.flush(now); this.key = key; this.day = day; this.since = now; }
    if (key && now - this.lastAct <= IDLE_MS) this.ms += dt;
    if (this.ms >= 1000 && now - this.since >= FLUSH_MS) this.flush(now);
  }

  /** Ghi phần đã dồn (làm tròn xuống giây, dư giữ lại). Gọi khi đổi bài / đóng màn / tắt plugin. */
  stop(now: number) { this.flush(now); this.key = null; this.last = null; }

  private flush(now: number) {
    const s = Math.floor(this.ms / 1000);
    if (this.key && s > 0) { this.write(this.key, this.day, s); this.ms -= s * 1000; }
    else if (!this.key) this.ms = 0;
    this.since = now;
  }
}
