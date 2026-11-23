# Hướng dẫn soạn file kiểm độc lập (Pie Study) — v2

> File do plugin Pie Study ghi. Sửa tay sẽ bị ghi đè khi plugin đổi phiên bản. Có file này nghĩa là Pie Study đang bật lượt kiểm độc lập: kiểu hiểu chấm đạt trong buổi học chỉ ghi tạm (`learn_pending`), plugin hỏi lại sau vài ngày, không gợi ý, rồi mới chuyển sang `learn_understood`.

Đọc file này khi chấm đạt một kiểu hiểu (`token`) trong buổi học và cần soạn câu kiểm lại. Đây là việc **soạn câu hỏi**, không dạy, không chấm.

## Đường dẫn

`<thư mục quiz>/<tên note>.check.md`. Thư mục quiz theo Cài đặt Pie Study, mặc định `Pie Study/quiz`. Ví dụ note `Bases filter` → `Pie Study/quiz/Bases filter.check.md`.

## Khuôn

- Frontmatter có `check_for: "[[<tên note>]]"`.
- Thân là **một** khối `quest-map` (version 1) có **một** node, `id` = tên note, `challenge.type: quiz`, các câu nằm trong `questions_json` (mảng JSON trên một dòng).
- Mỗi câu kiểm đúng **một** token, có các trường:
  - `q`: câu hỏi. Không lặp lại ví dụ đã dùng trong buổi học, không gợi ý đáp án.
  - `token`: đúng một token rubric (17 kiểu hiểu).
  - `kind`: `choice` | `short` | `essay`.
  - `quote`: một câu chép **nguyên văn** từ thân note (từ 12 ký tự trở lên), chỗ đáp án dựa vào. Plugin so với thân note (bỏ qua `*` `_` `` ` ``, ngoặc `[[ ]]`, khoảng trắng thừa, hoa thường); không khớp thì câu bị bỏ.
  - `due`: ngày kiểm `YYYY-MM-DD` = ngày học + 2 ngày.
  - `choice`: thêm `opts` (2–6 phương án) và `ans` (chỉ số phương án đúng, đếm từ 0).
  - `short`: thêm `accept` (mảng đáp án ngắn được chấp nhận). Plugin chấm khớp **cả câu trả lời** với một đáp án, bỏ dấu, bỏ hoa, bỏ dấu câu — nên ghi đủ các cách gọi đúng.
  - `essay`: thêm `points` (2–3 ý chính, mỗi ý một câu ngắn) và `answer` (đáp án mẫu vài câu). Người học viết xong mới thấy `answer` + `points` và tự tick ý đã nói được; đủ mọi ý mới đạt.
- Mỗi câu đúng **một** đáp án: câu thực chất có nhiều đáp án đúng thì viết lại cho còn một, hoặc tách câu. Không hỏi về cấu trúc note (tiêu đề, thứ tự mục, tên file, link, tag); chỉ hỏi ý hiểu.
- File đã có: đọc trước, rồi **thêm** câu mới vào `questions_json`, giữ nguyên câu của token khác; token đã có câu chưa kiểm thì thay câu cũ của đúng token đó. Không ghi đè cả file.
- Không sửa frontmatter của note, không tick `learn_understood`. Plugin ghi kết quả lượt kiểm.

## Ví dụ

Note `Bases filter`, học ngày 2026-11-19:

````markdown
---
check_for: "[[Bases filter]]"
---

```quest-map
version: 1
nodes:
  - id: Bases filter
    title: Kiểm lại Bases filter
    challenge:
      type: quiz
      questions_json: [{"q": "Một base chỉ cần hiện note có tag #du-an và chưa xong. Đặt điều kiện ở filter của view hay filter chung của base thì các view khác không bị ảnh hưởng?", "token": "application", "kind": "choice", "quote": "filter của view chỉ áp cho view đó", "due": "2026-11-21", "opts": ["Filter chung của base", "Filter của view", "Formula", "Sort của view"], "ans": 1}, {"q": "Gọi tên loại filter lọc mọi view trong base cùng lúc.", "token": "essence", "kind": "short", "quote": "filter chung áp cho mọi view trong base", "due": "2026-11-21", "accept": ["filter chung", "global filter", "filter của base"]}, {"q": "Giải thích cho người mới vì sao thêm view mới vẫn không thấy note đã bị loại ở filter chung.", "token": "teach-back", "kind": "essay", "quote": "filter chung áp cho mọi view trong base", "due": "2026-11-21", "points": ["filter chung chạy trước mọi view", "view chỉ lọc tiếp trên kết quả đã lọc", "muốn thấy lại phải sửa filter chung"], "answer": "Filter chung của base lọc trước, áp cho mọi view. Mỗi view chỉ lọc tiếp trên phần còn lại, nên view mới cũng không thấy note đã bị loại. Muốn thấy lại phải sửa filter chung."}]
```
````

Xong chỉ báo **một dòng**: đã ghi bao nhiêu câu kiểm vào file nào, ngày kiểm.
