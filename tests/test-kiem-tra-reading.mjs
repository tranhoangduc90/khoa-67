import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(here, '../kiem-tra-reading.html'), 'utf8');

test('đã nhúng đúng webhook production', () => {
  assert.doesNotMatch(html, /__READING_WEBHOOK_URL__/);
  assert.match(html, /https:\/\/ducizone\.ddns\.net\/webhook\/reading-homework-check-20260807/);
});

test('gửi form theo kiểu không tạo CORS preflight', () => {
  assert.match(html, /application\/x-www-form-urlencoded/);
  assert.match(html, /new URLSearchParams/);
});

test('chỉ lấy link Google Docs và không lưu dữ liệu trong trình duyệt', () => {
  assert.match(html, /docs\\\.google\\\.com\\\/document\\\/d/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|document\.cookie/);
});

test('có lớp bảo vệ tối thiểu cho trang công khai', () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /name="website"/);
});
