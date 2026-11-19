# Hướng dẫn soạn quiz nhanh và đề tự luận (Pie Study) — v1

> File do plugin Pie Study ghi. Sửa tay sẽ bị ghi đè khi plugin đổi phiên bản. Plugin chỉ đọc file bạn soạn rồi kiểm bằng code; file sai khuôn hoặc trích dẫn không có trong note thì bị bỏ.

Đọc file này khi lệnh gửi tới bắt đầu bằng `quiz note [[...]]` (soạn câu trắc nghiệm) hoặc `ra đề tự luận [[...]]` (ra một đề tự luận). Cả hai đều là việc **soạn câu hỏi từ một note**, không phải dạy, không chấm điểm, không sửa note.

## Nguyên tắc chung

1. **Đọc thân note trước khi soạn.** Chỉ dùng ý có trong note đó. Note quá mỏng so với số câu yêu cầu thì nói thẳng và soạn ít câu hơn (hoặc dừng), không bịa thêm kiến thức ngoài note.
2. **Ghi đúng đường dẫn có trong lệnh** (sau chữ `ghi vào`). File đã có thì ghi đè. Không đổi tên, không ghi chỗ khác.
3. **Mỗi câu bắt buộc có `quote`**: một câu chép **nguyên văn** từ thân note (từ 12 ký tự trở lên), làm căn cứ cho đáp án đúng. Plugin so với thân note (bỏ qua dấu `*` `_` `` ` ``, ngoặc `[[ ]]`, khoảng trắng thừa, hoa thường); không khớp thì câu bị loại. Không sửa chữ, không tóm tắt, không dịch. Không lấy câu từ phần frontmatter.
4. **Không tick mức hiểu.** Không sửa `learn_understood`, không sửa frontmatter của note. Kết quả làm bài nằm trong nhật ký của plugin.
5. Xong chỉ báo **một dòng**: đã ghi bao nhiêu câu / đề vào file nào. Không in lại câu hỏi và đáp án ra khung chat.

## 17 kiểu hiểu (`token`)

Mỗi câu gắn **một** `token`. Ưu tiên 5 kiểu core (có dấu `*`):

`definition` · `essence`* · `problem` · `origin-context` · `mechanism`* · `root-cause` · `rationale` · `scope-boundary` · `tradeoffs` · `consequences` · `application`* · `measurement` · `create` · `connection` · `discrimination`* · `metacognition` · `teach-back`*

Lệnh có `tập trung token: ...` thì chỉ soạn các token đó. Lệnh có chữ `dễ hơn` thì hỏi trực diện hơn, phương án nhiễu bớt đánh đố.

## Quiz nhanh (lệnh `quiz note`)

- **Vị trí file:** `<thư mục quiz>/<tên note>.quiz.md`, đúng đường dẫn trong lệnh.
- **Số câu:** đúng số trong lệnh (mặc định 5). Mỗi câu là trắc nghiệm **một đáp án**.
- **Khuôn file:** frontmatter có `quiz_for` trỏ về note, rồi **một** khối `quest-map` với **một** node, `challenge.type: quiz`, và `questions_json` là một chuỗi JSON trong dấu nháy đơn.
- **Mỗi câu gồm:** `q` (câu hỏi), `opts` (từ 2 phương án trở lên, thường 4), `ans` (vị trí đáp án đúng trong `opts`, đếm từ 0), `explanation` (một hai câu giải thích), `token`, `quote`.
- **Phương án nhiễu** là hiểu lầm cụ thể, có thật; không có phương án đùa. Plugin **xáo thứ tự phương án** khi hiện, nên không viết phương án tham chiếu vị trí ("cả A và B", "tất cả các ý trên", "không ý nào đúng"). Mỗi phương án phải tự đứng được.
- Trong `questions_json` (nằm trong dấu nháy đơn của YAML) không dùng dấu nháy đơn `'`; nếu cần thì viết lại câu. Dấu nháy kép trong chữ phải thoát bằng `\"`.

## Đề tự luận (lệnh `ra đề tự luận`)

- **Vị trí file:** `<thư mục quiz>/<tên note>.essay.md`, đúng đường dẫn trong lệnh.
- **Một đề duy nhất** bắt người học tự giải thích bằng lời của mình: giảng lại cho người chưa biết, so sánh hai trường hợp, áp vào tình huống riêng của họ. Không hỏi thuộc lòng, không gợi sẵn đáp án trong đề.
- **Chọn một `token`:** ưu tiên kiểu core mà bài chưa có trong `learn_understood`; không có gì nổi bật thì dùng `teach-back`.
- **Khuôn file:** như quiz nhưng node có `challenge.type: text`, và `questions_json` chỉ có một phần tử gồm `q`, `token`, `quote` (ý mà bài làm tốt phải nêu được), `keywords` (2 đến 4 cụm từ có trong note, chỉ để đọc khuôn, không dùng để chấm).

## Ví dụ

Chỉ là ví dụ rút gọn (quiz mẫu có 2 câu; bạn soạn đủ số câu trong lệnh). Chép đúng khuôn, thay nội dung theo note thật.

Note mẫu (`cache-la-gi.md`):

````note-mau
---
title: Cache là gì
---
# Cache là gì
Cache là vùng nhớ nhỏ và nhanh, lưu bản sao của dữ liệu hay dùng để lần sau lấy nhanh hơn.
Đổi lại, cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi mà cache chưa được làm mới.
````

File quiz mẫu (`cache-la-gi.quiz.md`):

````quiz-mau
---
title: "Quiz · Cache là gì"
quiz_for: "[[cache-la-gi]]"
llm_managed: true
---

```quest-map
version: 1
nodes:
  - id: quiz
    title: "Cache là gì"
    challenge:
      type: quiz
      questions_json: '[{"q":"Cache giúp lần truy cập sau nhanh hơn nhờ điều gì?","opts":["Giữ bản sao dữ liệu hay dùng ở nơi gần và nhanh","Nén dữ liệu gốc cho nhỏ hơn","Tự động sửa dữ liệu sai ở nguồn gốc","Xoá dữ liệu cũ ở nguồn gốc"],"ans":0,"explanation":"Cache lưu bản sao nên lần sau không phải lấy lại từ nguồn chậm.","token":"essence","quote":"lưu bản sao của dữ liệu hay dùng để lần sau lấy nhanh hơn"},{"q":"Cái giá phải trả khi dùng cache là gì?","opts":["Có thể giữ dữ liệu đã cũ khi nguồn gốc đã đổi","Dữ liệu gốc bị mất vĩnh viễn","Mọi lần truy cập đều chậm đi","Bắt buộc phải dùng nhiều nguồn gốc"],"ans":0,"explanation":"Bản sao có thể lỗi thời nếu chưa được làm mới.","token":"tradeoffs","quote":"cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi"}]'
```
````

File đề tự luận mẫu (`cache-la-gi.essay.md`):

````essay-mau
---
title: "Đề tự luận · Cache là gì"
quiz_for: "[[cache-la-gi]]"
llm_managed: true
---

```quest-map
version: 1
nodes:
  - id: essay
    title: "Cache là gì"
    challenge:
      type: text
      questions_json: '[{"q":"Hãy giảng lại cho một người chưa biết: vì sao dùng cache vừa nhanh hơn vừa có rủi ro, và bạn sẽ làm gì để giảm rủi ro đó trong một ứng dụng của riêng bạn?","token":"teach-back","quote":"cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi mà cache chưa được làm mới","keywords":["bản sao","dữ liệu đã cũ","làm mới"]}]'
```
````

## Kiểm lại trước khi ghi

- Đúng đường dẫn trong lệnh, đúng đuôi `.quiz.md` hoặc `.essay.md`.
- Một khối `quest-map`, một node; `type` là `quiz` (trắc nghiệm) hoặc `text` (tự luận).
- Mỗi câu có `token` trong 17 kiểu hiểu và `quote` chép nguyên văn từ thân note.
- Quiz: `ans` nằm trong khoảng của `opts`; không có phương án tham chiếu vị trí.
- Không đụng frontmatter của note, không tick `learn_understood`.
