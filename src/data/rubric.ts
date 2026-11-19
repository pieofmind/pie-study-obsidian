/* Rubric 17 kiểu hiểu — nhúng sẵn vì user Pie khác có thể không có skill learning-mode (spec 4.1).
   [token, tên, tiêu chí đạt, là core?] — tên/tiêu chí tiếng Việt; bản en ở i18n. */
export type Tok = [string, string, string, boolean?];
export const RUBRIC: [string, Tok[]][] = [
  ["Bản chất & nguồn gốc", [["definition", "Định nghĩa", "phát biểu định nghĩa đúng bằng lời mình"], ["essence", "Bản chất", "chỉ ra bản chất cốt lõi, không phải mô tả bề mặt", true], ["problem", "Vấn đề", "nói được vấn đề nó sinh ra để giải"], ["origin-context", "Bối cảnh ra đời", "nêu bối cảnh / nguồn gốc ra đời"], ["mechanism", "Cơ chế", "giải thích cơ chế vận hành, vì sao ra kết quả", true]]],
  ["Vì sao", [["root-cause", "Nguyên nhân gốc", "đào tới tầng sâu của tại sao"], ["rationale", "Lý lẽ", "biện minh được lựa chọn / thiết kế"]]],
  ["Giới hạn", [["scope-boundary", "Ranh giới", "khi nào dùng, khi nào không"]]],
  ["Đánh đổi & hệ quả", [["tradeoffs", "Đánh đổi", "được gì, mất gì"], ["consequences", "Hệ quả bậc 2", "thấy tác động kéo theo"]]],
  ["Dùng & kiểm", [["application", "Áp dụng", "áp vào tình huống thật / bài toán mới", true], ["measurement", "Đo lường", "đánh giá nó bằng tiêu chí gì"], ["create", "Sáng tạo", "ghép với thứ khác để tạo cái mới"]]],
  ["Quan hệ", [["connection", "Kết nối", "nối với khái niệm đã biết"], ["discrimination", "Phân biệt", "phân biệt với hàng xóm dễ lẫn", true]]],
  ["Siêu nhận thức", [["metacognition", "Tự biết", "biết mình hiểu tới đâu"], ["teach-back", "Dạy lại", "dạy lại cho người khác hiểu", true]]],
];
export const TOKENS: Tok[] = RUBRIC.flatMap(g => g[1]);
export const TOKNAME: Record<string, string> = Object.fromEntries(TOKENS.map(t => [t[0], t[1]]));
