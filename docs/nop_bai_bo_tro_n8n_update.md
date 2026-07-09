# Cập nhật danh sách lớp-học viên cho trang nộp bài bổ trợ

## File liên quan

- `nop_bai_bo_tro.html`: trang public cho học viên.
- `data/nop_bai_bo_tro_classes.json`: file dữ liệu lớp-học viên để n8n cập nhật.
- `index.html`: redirect từ trang gốc sang `nop_bai_bo_tro.html`.

## Định dạng JSON

```json
{
  "IC2200": [
    "Nguyễn Văn A",
    "Trần Thị B"
  ],
  "IC2201": [
    "Lê Văn C"
  ]
}
```

Quy tắc:

- Key cấp 1 là mã lớp.
- Value là mảng tên học viên.
- Không thêm field khác nếu trang HTML chưa được sửa để đọc field đó.
- Trước khi ghi lên GitHub, n8n phải kiểm tra JSON parse được và mỗi value là array.

## Workflow n8n khuyến nghị

Pattern: HTTP API integration.

Node sequence:

1. `Manual Trigger` hoặc `Schedule Trigger`
2. Node lấy nguồn lớp-học viên mới, ví dụ Lark Base / Google Sheet / API nội bộ
3. `Code`: chuẩn hóa về object JSON như schema trên, sort lớp, sort học viên, loại dòng rỗng/trùng
4. `HTTP Request`: GET file hiện tại từ GitHub
5. `Code`: lấy `sha`, stringify JSON mới, encode Base64 UTF-8
6. `HTTP Request`: PUT file mới lên GitHub
7. `Wait`: chờ 30-60 giây cho GitHub Pages build
8. `HTTP Request`: GET public JSON URL để smoke test
9. `IF`: nếu không thấy lớp mới hoặc JSON lỗi thì báo Telegram/Slack/email

## GitHub API

Repo:

```text
tranhoangduc90/khoa-67
```

File path:

```text
data/nop_bai_bo_tro_classes.json
```

GET current file:

```text
GET https://api.github.com/repos/tranhoangduc90/khoa-67/contents/data/nop_bai_bo_tro_classes.json?ref=main
```

PUT update file:

```text
PUT https://api.github.com/repos/tranhoangduc90/khoa-67/contents/data/nop_bai_bo_tro_classes.json
```

Body:

```json
{
  "message": "Update nop_bai_bo_tro class list",
  "content": "BASE64_UTF8_JSON",
  "sha": "SHA_FROM_GET_RESPONSE",
  "branch": "main"
}
```

Headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <GITHUB_TOKEN>
X-GitHub-Api-Version: 2026-03-10
```

## Code node mẫu

Input giả định: mỗi item có `lop` và `hocVien`.

```javascript
const grouped = {};

for (const item of $input.all()) {
  const lop = String(item.json.lop || '').trim();
  const hocVien = String(item.json.hocVien || '').trim();
  if (!lop || !hocVien) continue;
  if (!grouped[lop]) grouped[lop] = new Set();
  grouped[lop].add(hocVien);
}

const sorted = {};
for (const lop of Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'vi'))) {
  sorted[lop] = [...grouped[lop]].sort((a, b) => a.localeCompare(b, 'vi'));
}

return [{
  json: {
    classStudents: sorted,
    jsonText: JSON.stringify(sorted, null, 2) + '\n'
  }
}];
```

Base64 UTF-8 trong n8n Code node:

```javascript
const jsonText = $json.jsonText;
const content = Buffer.from(jsonText, 'utf8').toString('base64');

return [{
  json: {
    content,
    message: 'Update nop_bai_bo_tro class list'
  }
}];
```

## Rủi ro cần kiểm soát

- GitHub token phải để trong n8n credential, không hard-code trong node.
- Token chỉ cần quyền `Contents: Read and write` cho repo `khoa-67`.
- Nếu PUT bị `409`, file đã đổi trong lúc workflow chạy; cần GET lại `sha` rồi retry một lần.
- Không ghi trực tiếp nếu danh sách mới rỗng bất thường.
- Nên test bằng branch/dev trước nếu workflow thay đổi logic mapping dữ liệu.
