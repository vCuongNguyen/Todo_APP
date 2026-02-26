# Todo App - Calendar & Dashboard

Webapp todo với tab Calendar và Dashboard, lưu dữ liệu trên localStorage.

## Chạy ứng dụng

Mở file `index.html` trực tiếp trong trình duyệt (Chrome, Edge, Firefox,...). Không cần cài đặt hay chạy server.

### Đăng nhập Google để lưu data lên cloud

1. Mở file **`firebase-config.js`**.
2. Tạo project trên [Firebase Console](https://console.firebase.google.com/) → Thêm app Web → copy config vào `FIREBASE_CONFIG` (thay `YOUR_API_KEY`, `YOUR_PROJECT_ID`, ...).
3. Trong Firebase: **Authentication** → Sign-in method → Bật **Google**.
4. **Firestore Database** → Tạo database → Rules (chỉ user đọc/ghi dữ liệu của mình):
   ```
   match /users/{userId}/data/{document} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```
5. Mở lại app: nút **"Đăng nhập Google"** sẽ hiện; đăng nhập xong data tự động lưu/đồng bộ theo tài khoản Google.

## Tính năng đã triển khai

1. **Tab Calendar & Dashboard**
   - Tạo task: nhấn vào ô trên calendar hoặc nút "Thêm task mới" góc phải trên.
   - Calendar 4 chế độ: Ngày, Tuần, Tháng, Năm.

2. **Cấu hình task**
   - Thời gian ước lượng (phút), mức độ ưu tiên (quan trọng / gấp), tên, ghi chú.
   - Task cha: chứa nhiều task con, tổng thời gian = tổng con + 10%. Hiển thị % hoàn thành theo số task và theo thời gian. Hỗ trợ đệ quy (task con có thể có task con).
   - Thực hiện trong 1 ngày hoặc nhiều ngày, deadline bắt buộc.

3. **Lịch trình cố định trong ngày**
   - Nút "Lịch cố định" trên Calendar: thêm các khung giờ cố định (ăn, ngủ,...) không dùng để xếp task.

4. **Tự động sắp xếp**
   - Theo thời gian rảnh (trừ lịch cố định), xếp task theo ưu tiên, cập nhật theo thời gian hiện tại.
   - Task không đủ chỗ → đưa vào "Hàng chờ" (Done / Sửa / Hủy).

5. **Lưu trữ**
   - Tự động lưu vào localStorage. Xuất/Nhập dữ liệu trong Cài đặt.

6. **Dashboard**
   - Task sắp theo thời gian và ưu tiên (quan trọng+gấp → không quan trọng+không gấp).
   - Thanh bar gradient theo mức báo động (đỏ đậm = gấp+quan trọng, xanh nhạt = thấp nhất).

7. **Thống kê**
   - Biểu đồ tròn theo Ngày/Tuần/Tháng/Năm: số task hoàn thành, trễ deadline, hủy.

8. **KPI & Rewards**
   - Cài đặt KPI: tỷ lệ task done hoặc tỷ lệ hoàn thành theo thời gian, mục tiêu %.
   - Reward: nhập tùy chỉnh hoặc dùng points tự động (theo độ ưu tiên khi hoàn thành task).

## Cấu trúc file

- `index.html` – Giao diện, tab, modal.
- `styles.css` – Giao diện.
- `data.js` – Model, localStorage, task cha/con, KPI.
- `scheduler.js` – Tính khung rảnh, xếp task, hàng chờ.
- `calendar.js` – View calendar (ngày/tuần/tháng/năm), click tạo task.
- `dashboard.js` – Danh sách task, thanh gradient.
- `stats.js` – Thống kê, biểu đồ.
- `kpi.js` – KPI và rewards.
- `app.js` – Tab, modal, form task, lịch cố định, timeline, export/import.

## Yêu cầu trình duyệt

- Trình duyệt hiện đại (ES6+, localStorage).
- Chart.js qua CDN (biểu đồ thống kê).
