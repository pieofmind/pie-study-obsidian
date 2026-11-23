# Hướng dẫn soạn quiz nhanh và đề tự luận (Pie Study) — v3

> File do plugin Pie Study ghi. Sửa tay sẽ bị ghi đè khi plugin đổi phiên bản. Plugin chỉ đọc file bạn soạn rồi kiểm bằng code; file sai khuôn hoặc trích dẫn không có trong note thì bị bỏ.

Đọc file này khi lệnh gửi tới bắt đầu bằng `quiz note [[...]]` (soạn câu trắc nghiệm) hoặc `ra đề tự luận [[...]]` (ra một đề tự luận). Cả hai đều là việc **soạn câu hỏi từ một note**, không phải dạy, không chấm điểm, không sửa note.

## Nguyên tắc chung

1. **Đọc thân note trước khi soạn.** Chỉ dùng ý có trong note đó. Note quá mỏng so với số câu yêu cầu thì nói thẳng và soạn ít câu hơn (hoặc dừng), không bịa thêm kiến thức ngoài note.
2. **Ghi đúng đường dẫn có trong lệnh** (sau chữ `ghi vào`). File đã có thì ghi đè. Không đổi tên, không ghi chỗ khác.
3. **Mỗi câu bắt buộc có `quote`**: một câu chép **nguyên văn** từ thân note (từ 12 ký tự trở lên), làm căn cứ cho đáp án đúng. Plugin so với thân note (bỏ qua dấu `*` `_` `` ` ``, ngoặc `[[ ]]`, khoảng trắng thừa, hoa thường); không khớp thì câu bị loại. Không sửa chữ, không tóm tắt, không dịch. Không lấy câu từ phần frontmatter.
4. **Không tick mức hiểu.** Không sửa `learn_understood`, không sửa frontmatter của note. Kết quả làm bài nằm trong nhật ký của plugin.
5. **Mỗi câu đúng một đáp án.** Câu mà thực chất có từ hai đáp án đúng trở lên ("đâu là các cách…", hai phương án cùng đúng) thì viết lại cho chỉ còn một đáp án rõ ràng, hoặc tách thành nhiều câu. Không ép câu nhiều đáp án vào dạng một đáp án.
6. **Hỏi nội dung, không hỏi cấu trúc note.** Không hỏi tên tiêu đề, thứ tự các mục, tên file, thư mục, link hay tag. Câu hỏi phải đo ý hiểu, không đo việc nhớ note trình bày thế nào.
7. Xong chỉ báo **một dòng**: đã ghi bao nhiêu câu / đề vào file nào. Không in lại câu hỏi và đáp án ra khung chat.

## 17 kiểu hiểu (`token`)

Mỗi câu gắn **một** `token`. Ưu tiên 5 kiểu core (có dấu `*`):

`definition` · `essence`* · `problem` · `origin-context` · `mechanism`* · `root-cause` · `rationale` · `scope-boundary` · `tradeoffs` · `consequences` · `application`* · `measurement` · `create` · `connection` · `discrimination`* · `metacognition` · `teach-back`*

Lệnh có `tập trung token: ...` thì chỉ soạn các token đó. Lệnh có chữ `dễ hơn` thì hỏi trực diện hơn, phương án nhiễu bớt đánh đố.

## Quiz nhanh (lệnh `quiz note`)

- **Vị trí file:** `<thư mục quiz>/<tên note>.quiz.md`, đúng đường dẫn trong lệnh.
- **Số câu:** đúng số trong lệnh (mặc định 5), cộng dồn qua mọi node.
- **Khuôn file:** frontmatter có `quiz_for` trỏ về note, rồi **một** khối `quest-map`. Mỗi **dạng** câu là **một node** riêng; trong node, `challenge.type` là tên dạng và `questions_json` là một chuỗi JSON trong dấu nháy đơn, chứa các câu của dạng đó.
- **Mọi câu** đều có `token` và `quote` như nguyên tắc chung, bất kể dạng.

### Chọn dạng theo kiểu hiểu

Trắc nghiệm chỉ đo **nhận ra** đáp án đặt sẵn trước mắt. Các dạng khác bắt người học **tự nhớ ra** hoặc tự nói ra. Chọn theo `token` của câu:

| Token | Dạng nên dùng |
|---|---|
| `essence`, `definition` | `cloze` (điền chỗ trống) |
| `discrimination`, `scope-boundary` | `truefalse` (một mệnh đề dễ lẫn) |
| `application`, `create` | `input` (tự gõ ngắn, có chấm) |
| `mechanism`, `consequences`, `root-cause`, `tradeoffs` và còn lại | `quiz` (trắc nghiệm) |

Bộ 5 câu nên có **ít nhất 2 dạng**, và **không quá 3 câu `quiz`**. Note chỉ toàn định nghĩa thì `cloze` nhiều cũng được; đừng ép dạng không hợp với ý trong note.

### Khuôn từng dạng (các trường trong một phần tử của `questions_json`)

- **`quiz`**: `q`, `opts` (từ 2 phương án, thường 4), `ans` (vị trí đáp án đúng trong `opts`, đếm từ 0), `explanation`.
  - Phương án nhiễu là hiểu lầm cụ thể, có thật; không có phương án đùa. Plugin **xáo thứ tự phương án** khi hiện, nên không viết phương án tham chiếu vị trí ("cả A và B", "tất cả các ý trên", "không ý nào đúng"). Mỗi phương án phải tự đứng được.
- **`cloze`**: `sentence` là một câu có **đúng một** chỗ trống viết `{{c1::đáp án}}`, cộng `explanation`. Người học gõ đáp án, so **nguyên văn** (không phân biệt hoa thường), nên chỗ trống là một từ hoặc cụm ngắn, chỉ có một cách viết đúng. Câu phải đủ ngữ cảnh để chỉ một đáp án hợp lý.
- **`truefalse`**: `statement` (một mệnh đề), `answer` (`true` hoặc `false`), `explanation`. Mệnh đề sai phải là một hiểu lầm có thật, không phải câu đúng bị đổi một chữ cho bẫy.
- **`input`**: `prompt` (câu hỏi cần trả lời bằng một hai câu), `keywords` (1 đến 3 cụm ngắn có trong note; bài làm chứa **một** cụm là đạt), `explanation`. Chọn cụm mà người hiểu chắc chắn phải dùng tới.

Trong `questions_json` (nằm trong dấu nháy đơn của YAML) không dùng dấu nháy đơn `'`; nếu cần thì viết lại câu. Dấu nháy kép trong chữ phải thoát bằng `\"`. Plugin chưa nhận các dạng khác (`order`, `match`, ...) trong quiz nhanh: node dạng đó bị bỏ. Không dùng `text` trong quiz nhanh: `text` là câu tự luận, plugin không chấm và không ghi kết quả. Muốn người học tự giảng lại (`teach-back`) thì dùng lệnh ra đề tự luận.

## Đề tự luận (lệnh `ra đề tự luận`)

- **Vị trí file:** `<thư mục quiz>/<tên note>.essay.md`, đúng đường dẫn trong lệnh.
- **Một đề duy nhất** bắt người học tự giải thích bằng lời của mình: giảng lại cho người chưa biết, so sánh hai trường hợp, áp vào tình huống riêng của họ. Không hỏi thuộc lòng, không gợi sẵn đáp án trong đề.
- **Chọn một `token`:** ưu tiên kiểu core mà bài chưa có trong `learn_understood`; không có gì nổi bật thì dùng `teach-back`.
- **Khuôn file:** như quiz nhưng node có `challenge.type: text`, và `questions_json` chỉ có một phần tử gồm `q`, `token`, `quote` (ý mà bài làm tốt phải nêu được), `points` (**bắt buộc**, 2 đến 4 ý mà bài làm đạt phải nêu, mỗi ý một câu ngắn lấy từ note; đây là barem để agent chấm từng ý Đạt / Thiếu / Sai), `keywords` (2 đến 4 cụm từ có trong note, chỉ để đọc khuôn, không dùng để chấm).

## Ví dụ

Chỉ là ví dụ rút gọn (quiz mẫu có 4 câu, mỗi câu một dạng; bạn soạn đủ số câu trong lệnh). Chép đúng khuôn, thay nội dung theo note thật.

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
  - id: cloze
    title: "Cache là gì"
    challenge:
      type: cloze
      questions_json: '[{"sentence":"Cache lưu {{c1::bản sao}} của dữ liệu hay dùng để lần sau lấy nhanh hơn.","explanation":"Cache không giữ dữ liệu gốc mà giữ một bản sao ở nơi nhanh hơn.","token":"essence","quote":"lưu bản sao của dữ liệu hay dùng để lần sau lấy nhanh hơn"}]'
  - id: quiz
    title: "Cache là gì"
    challenge:
      type: quiz
      questions_json: '[{"q":"Cái giá phải trả khi dùng cache là gì?","opts":["Có thể giữ dữ liệu đã cũ khi nguồn gốc đã đổi","Dữ liệu gốc bị mất vĩnh viễn","Mọi lần truy cập đều chậm đi","Bắt buộc phải dùng nhiều nguồn gốc"],"ans":0,"explanation":"Bản sao có thể lỗi thời nếu chưa được làm mới.","token":"tradeoffs","quote":"cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi"}]'
  - id: truefalse
    title: "Cache là gì"
    challenge:
      type: truefalse
      questions_json: '[{"statement":"Khi nguồn gốc thay đổi, cache luôn tự có dữ liệu mới ngay.","answer":false,"explanation":"Cache chỉ có dữ liệu mới sau khi được làm mới; trước đó nó vẫn giữ bản cũ.","token":"discrimination","quote":"cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi mà cache chưa được làm mới"}]'
  - id: input
    title: "Cache là gì"
    challenge:
      type: input
      questions_json: '[{"prompt":"Vì sao đọc dữ liệu qua cache nhanh hơn đọc thẳng từ nguồn gốc?","keywords":["bản sao","nhanh"],"explanation":"Cache là vùng nhớ nhỏ và nhanh giữ sẵn bản sao, nên không phải lấy lại từ nguồn chậm.","token":"application","quote":"Cache là vùng nhớ nhỏ và nhanh"}]'
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
      questions_json: '[{"q":"Hãy giảng lại cho một người chưa biết: vì sao dùng cache vừa nhanh hơn vừa có rủi ro, và bạn sẽ làm gì để giảm rủi ro đó trong một ứng dụng của riêng bạn?","token":"teach-back","quote":"cache có thể giữ dữ liệu đã cũ nếu nguồn gốc thay đổi mà cache chưa được làm mới","points":["cache giữ bản sao ở nơi nhanh nên lần sau lấy nhanh hơn","bản sao có thể đã cũ khi nguồn gốc đổi","phải làm mới cache để giảm rủi ro dữ liệu cũ"],"keywords":["bản sao","dữ liệu đã cũ","làm mới"]}]'
```
````

## Kiểm lại trước khi ghi

- Đúng đường dẫn trong lệnh, đúng đuôi `.quiz.md` hoặc `.essay.md`.
- Một khối `quest-map`. Quiz: mỗi dạng một node, `type` thuộc `quiz` `cloze` `truefalse` `input`; có ít nhất 2 dạng. Tự luận: một node `type: text`, có `points` 2 đến 4 ý.
- Mỗi câu có `token` trong 17 kiểu hiểu và `quote` chép nguyên văn từ thân note.
- `quiz`: `ans` nằm trong khoảng của `opts`; không có phương án tham chiếu vị trí. `cloze`: đúng một `{{c1::...}}`. `truefalse`: `answer` là `true` hoặc `false`. `input`: có `keywords`.
- Không đụng frontmatter của note, không tick `learn_understood`.
