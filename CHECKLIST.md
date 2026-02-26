# Checklist 8 mục yêu cầu

## ✅ Mục 1: Tab Calendar & Dashboard
- **1.1** Tạo task: nhấn vào ô trên calendar hoặc nút **"+ Thêm task mới"** góc phải trên.  
- **1.2** Calendar 4 mode: **Ngày**, **Tuần**, **Tháng**, **Năm** (nút trên toolbar calendar).

## ✅ Mục 2: Cấu hình task
- **2.1** Thời gian ước lượng (phút) – trường "Thời gian ước lượng" trong form task.
- **2.2** Mức độ ưu tiên – Quan trọng / Gấp (2 select trong form).
- **2.3** Thông tin cơ bản: tên task (bắt buộc).
- **2.4** Ghi chú riêng – textarea "Ghi chú" trong form task.
- **2.5** Task cha (nhiều task con): checkbox "Đây là task cha", thêm/xóa task con. Tổng thời gian task cha = tổng con + 10%. Hiển thị % hoàn thành theo số task và theo thời gian (trên Dashboard, thanh bar). Đệ quy: task con có thể có task con (thêm task con từ form task khi đang sửa task).
- **2.6** Chọn "Một ngày" hoặc "Nhiều ngày". Deadline bắt buộc (datetime-local).

## ✅ Mục 3: Lịch trình cố định trong ngày
- Nút **"Lịch cố định"** trên Calendar: thêm/sửa/xóa các khung giờ cố định (label + start + end). Các khung này được trừ ra khi tính thời gian rảnh để sắp task.

## ✅ Mục 4: Tự động sắp xếp theo thời gian rảnh
- Phần **"Lịch trong ngày (tự động sắp xếp)"**: hiển thị lịch cố định + các task được xếp vào khung rảnh theo ưu tiên.
- **Hàng chờ**: task không đủ chỗ hiển thị trong **"Hàng chờ (không đủ thời gian)"** với nút Done / Sửa / Hủy.
- Cập nhật theo thời gian hiện tại (slot đã qua không hiển thị, task bị dồn sang hàng chờ nếu cần).

## ✅ Mục 5: Lưu localStorage
- Toàn bộ dữ liệu (tasks, lịch cố định, KPI, rewards, history) lưu trong **localStorage**. Mở lại web không mất data.
- **Cài đặt** → Xuất dữ liệu / Nhập dữ liệu (file JSON).

## ✅ Mục 6: Dashboard – sort & thanh bar gradient
- Task sắp theo **thời gian** và **độ ưu tiên** (quan trọng+gấp → không quan trọng+không gấp).
- Mỗi task là **thanh bar** với gradient theo mức báo động:
  - **alert-high** (đỏ): Gấp + Quan trọng
  - **alert-mid-high** (cam): Quan trọng + Không gấp
  - **alert-mid-low** (xanh dương): Không quan trọng + Gấp
  - **alert-low** (xanh nhạt): Không quan trọng + Không gấp

## ✅ Mục 7: Biểu đồ thống kê
- Trong Dashboard: phần **Thống kê**, chọn **Ngày / Tuần / Tháng / Năm**.
- Biểu đồ tròn: **Số task hoàn thành** (done), **Trễ deadline** (late), **Hủy** (cancelled) và tỷ lệ.

## ✅ Mục 8: KPI & Reward
- **Cài đặt** → KPI: chọn loại (tỷ lệ task done / tỷ lệ hoàn thành theo thời gian), mục tiêu %, reward tùy chỉnh (để trống = dùng points).
- **Rewards**: points tự động khi hoàn thành task (điểm theo độ ưu tiên). Hiển thị trên Dashboard trong phần "KPI & Rewards".

---

**Cách chạy:** Mở `index.html` trong trình duyệt.
