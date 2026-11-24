# Home Workout 12 tuần

App theo dõi lộ trình home workout 12 tuần (23/11/2026 – 14/02/2027). Là một PWA: mở bằng trình duyệt, cài được lên màn hình chính điện thoại, chạy offline. Không cần tài khoản, không có server — dữ liệu nằm trên máy người dùng.

## Theo dõi gì

| Mục | Cách ghi | Mục tiêu tuần |
| --- | --- | --- |
| Set strength | Bấm "Xong set" trong player | 4/4 buổi |
| Incline walk | Timer tự lưu, hoặc nhập tay số phút | ≥ 90% target |
| Mini Circuit | Player Mini Circuit | ≥ 5 ngày |
| Level từng bài | Nút "Mọi set đều đạt top reps" ở set cuối; 2 buổi đạt thì lên level | – |
| Max Test, cân nặng, vòng eo | Tab Tiến độ | – |

4 tab: **Hôm nay** (vòng tiến độ, dải 7 ngày, buổi tập, walk, Mini), **Lịch**, **Lộ trình** (6 chặng), **Tiến độ** (mục tiêu tuần, progression, từng tuần, Max Test, chỉ số cơ thể, sao lưu). Player toàn màn hình có rest timer, EMOM, bài đếm giây và walk timer.

## Chạy

```bash
npm start
```

Mở http://localhost:5173. Không có bước build và không có dependency.

```bash
npm test
```

## Đưa lên mạng

Thư mục `public/` là toàn bộ app, đưa lên bất kỳ static host nào có HTTPS (cần HTTPS để cài app và chạy offline). `netlify.toml` đã trỏ sẵn `publish = "public"`.

Khi sửa file trong `public/`, tăng số trong `CACHE` ở `public/sw.js` (ví dụ `workout12-v2`) để máy đã cài nhận bản mới ngay.

## Cấu trúc

```
public/
  index.html            khung trang, 4 tab
  css/app.css           giao diện: bê tông (sáng) / thảm cao su (tối), màu đĩa tạ cho từng buổi
  js/data.js            nội dung giáo án: buổi tập, chặng, level
  js/logic.js           quy tắc: tuần hiện tại, số set, walk target, superset, lên level, mục tiêu tuần
  js/store.js           lưu / đọc dữ liệu, sao lưu, khôi phục
  js/app.js             giao diện + player
  js/icons.js           icon SVG
  js/audio.js           chuông hết giờ (mẫu âm tự dựng, dự phòng bằng thẻ audio)
  js/notify.js          thông báo hết giờ, chuông và rung
  sw.js                 offline
  manifest.webmanifest  thông tin cài app
test/logic.test.js      test cho logic.js và store.js
```

Phông Barlow và Barlow Condensed (SIL OFL) nằm trong `public/fonts/`, dùng offline. Mỗi set là một viên đĩa tạ: rỗng khi chưa làm, đặc màu khi xong; màu mỗi buổi lấy theo màu đĩa tạ Olympic.

Đổi giáo án (bài, số set, reps, level) thì sửa `public/js/data.js`. Ngày bắt đầu là `START` trong file đó.

## Dữ liệu

Lưu trong `localStorage`, key `player12`:

| Khóa | Nội dung |
| --- | --- |
| `sets` | `{ngày: {vị trí bài: số set đã xong}}` |
| `mini` | `{ngày: {vị trí bài: số round đã xong}}` |
| `walk` | `{ngày: phút}` |
| `lvl` | `{slot: level}` (0 = level 1), slot = `<session>-<vị trí bài>` |
| `hit` | `{slot: [ngày đạt top reps]}` |
| `lvlD` / `lvlH` | ngày đổi level gần nhất / lịch sử lên level |
| `tests` | Max Test tuần 1 (`a`) và tuần 12 (`b`) |
| `body` | `[{d, kg, w}]` cân nặng và vòng eo |

Dữ liệu chỉ nằm trên một máy, một trình duyệt. Tab Tiến độ có nút **Xuất sao lưu** / **Khôi phục** (file JSON) để giữ bản dự phòng hoặc chuyển sang máy khác.
