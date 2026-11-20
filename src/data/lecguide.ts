/* Đợt 7b (spec 7.8): file hướng dẫn soạn bài giảng plugin ghi vào vault cho agent đọc, và lệnh tạo bài giảng. Thuần, test bằng node.
   Hướng dẫn hiện chỉ có tiếng Việt. */

export const PIE_STUDY_DIR = "Pie Study";
export const GUIDE_PATH = `${PIE_STUDY_DIR}/huong-dan-soan-bai-giang.md`;
export const QUIZ_GUIDE_PATH = `${PIE_STUDY_DIR}/huong-dan-soan-quiz.md`;
export const CHECK_GUIDE_PATH = `${PIE_STUDY_DIR}/huong-dan-kiem.md`;   // đợt 9: có file này = skill bật chế độ kiểm độc lập
export const DEFAULT_LECTURE_DIR = `${PIE_STUDY_DIR}/lectures`;

const firstLine = (s: string) => s.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].trim();
/** Phiên bản ghi ở cuối dòng tiêu đề ("… — v1"). */
export const guideVersion = (guide: string) => firstLine(guide).match(/\bv\d+$/)?.[0] || "";
/** Dòng tiêu đề (mang phiên bản) khác thì ghi lại; người dùng sửa thân mà giữ tiêu đề thì để yên tới khi đổi phiên bản. */
export const guideNeedsWrite = (existing: string | null, guide: string) => existing == null || firstLine(existing) !== firstLine(guide);

/** Lệnh gửi agent — tiếng Việt, không qua tr(). */
export const cmdNewLecture = (slug: string, guide: string, dir: string) =>
  `tạo bài giảng tương tác cho [[${slug}]] theo hướng dẫn "${guide}" (làm theo file này, không cần nạp skill), ghi vào "${dir.replace(/\/+$/, "")}/${slug}.html"`;
