# Hướng dẫn soạn bài giảng tương tác (Pie Study) — v4

> File do plugin Pie Study ghi. Sửa tay sẽ bị ghi đè.

## Bài giảng để làm gì
Để người học **đoán, thao tác và thấy hệ quả** trên mô hình của khái niệm. Dễ hình dung là phương tiện; đích là sau đó người học tự giải thích được.

## Trước khi viết
1. Đọc note bài. Liệt kê 2–4 ý khó nhất.
2. Với từng ý, hỏi: có cơ chế, cấu trúc, quan hệ hay đại lượng nào người học **tự tay đổi được và thấy kết quả đổi theo** không?
   - Có → một khối `visual`. Vẽ mô hình cho thấy cơ chế, không vẽ sơ đồ ô và mũi tên cho an toàn.
   - Không → không ép hình. Dùng khối `predict` với một tình huống hoặc phản ví dụ.
3. Cả bài không có ý nào thao tác được → **không ghi file**. Nói rõ lý do và đề xuất: thêm hình tĩnh vào note, hoặc học hỏi đáp.
4. Lập dàn 5–10 khối: xen kẽ giải thích, thao tác, luyện tập, ý sâu hơn. Không đặt hai khối cùng loại liền nhau. Ít nhất một khối `visual`, tối đa ba.

## Định dạng file
- Dòng đầu tiên đúng là: `<!--pie-study:blocks v1-->`
- Sau đó chỉ gồm các khối, mỗi khối một thẻ:
  `<section data-block="<loại>" data-id="<id>" data-title="<tiêu đề ngắn>"> … </section>`
- `id`: chữ thường, số, gạch nối, tối đa 32 ký tự, không trùng trong file.
- **Không viết** `<html>`, `<head>`, `<body>`, nút Tiếp, chấm tiến độ, hay bất kỳ CSS và script nào của khung. Plugin tự thêm.
- Mỗi khối mở đầu bằng `<span class="e">nhãn ngắn</span><h1>tiêu đề</h1>`.

## Khối có khuôn (plugin đã có sẵn giao diện và script, chỉ viết nội dung)
- `intro`: `<p>…</p>`, tuỳ chọn `<div class="tok"><span>…</span><span>…</span></div>`.
- `predict` (thêm `data-token="<kiểu hiểu>"` vào section): `<div class="opts"><button data-a="0"><b>A</b>…</button><button data-a="1"><b>B</b>…</button>…</div><div class="fb"></div>`. `data-a="1"` là đáp án đúng. Đừng luôn đặt đáp án đúng ở cùng một vị trí.
- `timeline`: `<div class="tl"><div class="on"><b>1</b><span>Bước<small>giải thích</small></span></div><div><b>2</b>…</div></div><button class="more">Bước kế</button>`.
- `cards`: `<div class="fc"><button><small>Bấm để lật</small><span class="q">Hỏi</span><span class="a">Đáp</span></button>…</div>`.
- `deeper`: `<div class="dp"><b>Câu hỏi</b><p>…</p><button class="more dp-btn">Đánh dấu muốn đào sâu</button></div>`.
- `takeaway`: `<p>…</p><div class="key"><small>Mang về dùng</small>…</div>`.

## Khối `visual` (phần chính)
Thuộc tính trên `<section>`:
- `data-predict="<câu hỏi>"` — **bắt buộc**. Câu hỏi người học phải tự trả lời trong đầu trước khi được đụng vào mô hình. Hỏi về điều mô hình sẽ cho thấy ("Kéo X lên gấp đôi thì Y thế nào?"), không hỏi kiến thức thuộc lòng.
- `data-quote="<một câu chép NGUYÊN VĂN từ note>"` — **bắt buộc**, ít nhất 12 ký tự. Đây là câu mà mô hình này minh hoạ. Plugin đối chiếu với note; không khớp thì khối bị gắn nhãn "chưa bám note". Chép cả dấu câu và dấu ngoặc kép của câu gốc; trong giá trị thuộc tính, viết dấu `"` thành `&quot;`.
- `data-token="<kiểu hiểu>"` — tuỳ chọn, khi khối có chấm đúng sai.

Bên trong, sau `<h1>` và một `<p>` dẫn ngắn:
```html
<div class="vz"> …HTML, SVG hoặc canvas của mô hình… </div>
<style> /* mọi selector bắt đầu bằng [data-id="<id của khối>"] .vz */ </style>
<script> /* chạy trong một hàm, có sẵn hai biến: root và ps */ </script>
```
Luật cho script:
- `root` là chính thẻ `<section>` của khối. Chỉ tìm phần tử bằng `root.querySelector(...)`. Không dùng `document.querySelector`, không tạo biến toàn cục.
- `ps.answer(true|false)` báo kết quả về plugin. Chỉ dùng khi khối có `data-token` và người học vừa chốt một câu trả lời có đúng có sai. Không gọi khi người học chỉ đang thao tác thử.
- Không gọi mạng, không `import`, không `localStorage`, không `alert`. Chỉ JavaScript thuần, SVG, canvas; cần vẽ trục, thang đo, biểu đồ thì dùng d3 theo mục "Thư viện d3" bên dưới (plugin mang sẵn, không tải từ mạng).
- Viết ngắn. Trước khi ghi file, đọc lại script một lượt để chắc ngoặc và dấu nháy đóng đủ.

### Thư viện d3 (tuỳ chọn)
Cần vẽ thang đo, trục, biểu đồ cột / đường / lưới mà viết tay bằng SVG thuần rối hơn nhiều thì khai báo `data-libs="d3"` trên `<section>` của khối đó:
- Plugin mang sẵn d3 (bản 7) và chèn vào trang khi có khối khai báo; trong script dùng biến `d3`. Không `import`, không tải từ mạng.
- Chỉ có `d3`. Tên thư viện khác bị bỏ qua. Khối không khai báo thì không có `d3`.
- Mô hình đơn giản (thanh trượt, vài hình) cứ dùng SVG thuần, đừng dùng d3 cho có.

Ví dụ dùng d3:
```html
<section data-block="visual" data-id="thang-do" data-title="Kéo để đổi độ dài cột" data-libs="d3" data-predict="Kéo thanh trượt lên gấp đôi thì cột dài ra thế nào?" data-quote="<câu nguyên văn trong note>">
<span class="e">Thử kéo</span><h1>Kéo để đổi độ dài cột</h1><p>Kéo thanh trượt và nhìn độ dài cột.</p>
<div class="vz"><input type="range" min="0" max="10" value="4"><svg viewBox="0 0 200 30" width="100%"><rect y="3" height="24" fill="var(--c)"></rect></svg><p class="out"></p></div>
<style>[data-id="thang-do"] .vz input{width:100%;height:40px}</style>
<script>const r=root.querySelector('input'),bar=d3.select(root.querySelector('rect')),o=root.querySelector('.out'),x=d3.scaleLinear([0,10],[0,200]);const draw=()=>{bar.attr('width',x(+r.value));o.textContent='Giá trị: '+r.value};r.oninput=draw;draw();</script>
</section>
```

Luật cho mô hình:
- Có ít nhất một điều khiển làm **trạng thái đổi thấy được**: thanh trượt, kéo thả, nút chuyển bước, bật tắt.
- Có một dòng chữ đọc ra trạng thái hiện tại bằng lời, để người học đối chiếu với điều mình vừa đoán.
- Mọi con số, nhãn, kết luận trong mô hình phải lấy từ note. Không thêm kiến thức ngoài note.
- Dùng được trên điện thoại: rộng tối đa 640px và co theo chiều rộng (SVG dùng `viewBox`), nút cao ít nhất 40px, không dựa vào rê chuột.
- Khung `.vz` đã có sẵn viền và nền. Không định lại kiểu cho chính `.vz`; chỉ viết kiểu cho các phần tử bên trong. Selector nào không nằm trong `.vz` sẽ đè lên nút và nhãn của khung.
- Màu lấy từ biến có sẵn, tự đổi theo sáng và tối: `--bg` `--card` `--ink` `--ink2` `--ol` (viền) `--c` (nhấn) `--t` (nền nhấn nhạt) `--gold` `--ok` `--ok-t` `--no` `--no-t`. Không dùng nền gradient. Font kế thừa, không khai báo font khác.

Ví dụ tối thiểu:
```html
<section data-block="visual" data-id="can-bang" data-title="Hai vế của một cái cân" data-predict="Giữ nguyên vế trái, tăng vế phải lên gấp đôi thì khoảng lệch thế nào?" data-quote="<câu nguyên văn trong note>">
<span class="e">Thử kéo</span><h1>Hai vế của một cái cân</h1><p>Kéo thanh trượt và nhìn khoảng lệch.</p>
<div class="vz"><input type="range" min="0" max="20" value="5"><p class="out"></p></div>
<style>[data-id="can-bang"] .vz input{width:100%;height:40px}</style>
<script>const r=root.querySelector('input'),o=root.querySelector('.out');const draw=()=>{o.textContent='Vế phải: '+r.value+'. Khoảng lệch: '+Math.abs(10-r.value)};r.oninput=draw;draw();</script>
</section>
```

## Lệnh `soạn lại khối <id> (<loại>) của bài giảng "<file>"`
- Mở đúng file trong lệnh. Chỉ thay **một** thẻ `<section … data-id="<id>">…</section>`; giữ nguyên `data-id` và `data-block`, giữ nguyên mọi khối khác và dòng đầu.
- Lệnh có `— khối đang lỗi` → script của khối này chạy hỏng. Tìm lỗi (biến không khai báo, ngoặc hoặc nháy chưa đóng, dùng thứ ngoài `root` và `ps`) rồi viết lại cho chạy được; không cần đổi nội dung nếu nội dung đúng.
- Không có `— khối đang lỗi` → người học thấy khối chưa ổn. Đọc lại note bài, viết lại khối theo đúng các luật ở trên (khối `visual` phải có `data-predict` và `data-quote` chép nguyên văn từ note).
- Không ghi file mới, không đổi tên file, không sửa note bài. Ghi một dòng vào `_agent/log.md` (khối nào, sửa gì). Xong báo một dòng: đã soạn lại khối nào, sửa gì.

## Lệnh `đào sâu [[<bài>]] — theo khối <id> của bài giảng "<file>"`
- Người học đã bấm "Đánh dấu muốn đào sâu" ở khối `deeper` có `data-id="<id>"`. Đọc câu hỏi trong khối đó, đọc note bài và nguồn trong `learn_source` của note.
- **Trả lời ngay trong khung chat**: giải thích câu hỏi đó bằng lời đơn giản, có một ví dụ; ý nào lấy từ note thì nói rõ, ý nào ngoài note thì ghi là ngoài note.
- Không sửa note bài, không sửa file bài giảng.
- Câu hỏi đủ lớn để thành một bài riêng → cuối câu trả lời hỏi người học có muốn tạo bài mới trong lộ trình không. Chỉ tạo khi họ đồng ý, theo skill `curriculum` (bài mới mặc định `learn_need: later`).

## Sau khi ghi file bài giảng
- Ghi một dòng vào `_agent/log.md`.
- Không sửa note bài: Pie Study tự tìm bài giảng theo đường dẫn trong lệnh. Chỉ thêm `learn_lecture` khi lệnh yêu cầu.

## Tự kiểm trước khi ghi file
- Dòng đầu là `<!--pie-study:blocks v1-->`; không có `<html>`, `<head>`, `<body>`.
- Mỗi khối `visual` có `data-predict` và `data-quote`; câu trong `data-quote` có nguyên văn trong note.
- Mỗi script chỉ dùng `root` và `ps`; ngoặc và dấu nháy đóng đủ.
- Không có hai khối cùng loại liền nhau; `id` không trùng.
