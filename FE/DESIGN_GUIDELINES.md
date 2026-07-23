# TingTing Frontend - Hướng Dẫn Thiết Kế (Design Guidelines)

Tài liệu này định nghĩa các quy chuẩn thiết kế, phong cách giao diện và các thành phần (components) được sử dụng trong dự án TingTing. Mục đích là để đảm bảo tất cả các màn hình mới khi được thêm vào đều giữ được sự đồng bộ 100% về UI/UX.

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

- **Phong cách:** Minimalist (Tối giản), Clean UI, Mobile-first (Ưu tiên giao diện trên thiết bị di động).
- **Họa tiết:** Không sử dụng bóng đổ (shadows) quá gắt, ưu tiên phong cách Flat Design hoặc Neumorphism nhẹ nhàng.
- **Bố cục:** Không gian thoáng (White space rộng rãi), các thành phần phân chia rõ ràng bằng màu nền (background) hoặc viền (border) mỏng.

---

## 2. Bảng Màu (Color Palette)

Hệ thống sử dụng các CSS Variables toàn cục (được định nghĩa trong `index.css`). **Tuyệt đối ưu tiên sử dụng CSS Variables** thay vì hard-code mã màu tĩnh.

| Loại màu | CSS Variable | Mã màu tham khảo | Ý nghĩa & Cách dùng |
| :--- | :--- | :--- | :--- |
| **Primary** | `var(--primary)` | `#10B981` (Emerald) | Màu thương hiệu chính, dùng cho Button chính, text nổi bật, các action quan trọng. Tạo cảm giác an toàn (liên quan đến tiền bạc). |
| **Background** | `var(--background)` | `#F9FAFB` (Off-white) | Màu nền bao phủ toàn bộ App, giúp làm nổi bật các thẻ Card màu trắng. |
| **Surface** | `var(--surface)` | `#FFFFFF` (Trắng tinh) | Màu nền của các thẻ (Card), Header, Modal, Bottom Nav. |
| **Positive** | `text-green-500` | `#10B981` (Xanh lá) | Dùng cho số tiền được nhận, số dư dương, thông báo thành công. |
| **Negative** | `text-red-500` | `#EF4444` (Đỏ) | Dùng cho số tiền đang nợ, khoản chi, thông báo lỗi. |
| **Text Primary**| `var(--text-primary)` | `#111827` (Đen nhạt) | Dùng cho tiêu đề (Heading), nội dung văn bản chính. Không dùng màu đen `#000000` tuyệt đối. |
| **Text Secondary**| `var(--text-secondary)`| `#6B7280` (Xám tro) | Dùng cho text phụ, chú thích, ngày tháng, nội dung ít quan trọng hơn. |
| **Border** | `var(--border)` | `#E5E7EB` (Xám nhạt) | Viền bao quanh các thẻ Card, đường kẻ phân cách giữa các item trong danh sách. |

---

## 3. Typography (Kiểu chữ)

- **Font chữ:** Font mặc định của hệ thống web hiện đại (system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif).
- **Phân cấp Tiêu đề (Hierarchy):**
  - **Header Title (Tiêu đề trang):** `text-xl font-semibold text-gray-800` (hoặc `var(--text-primary)`).
  - **Card Title (Tiêu đề khối):** `text-lg font-medium text-gray-800`.
  - **Body Text (Nội dung chính):** `text-base` (hoặc `text-[15px]`) `text-gray-800`.
  - **Subtitle / Caption (Chú thích phụ):** `text-sm text-gray-500`.

---

## 4. Hệ Thống Icon

- **Thư viện duy nhất:** `lucide-react`. **KHÔNG** sử dụng các thư viện icon khác để tránh nặng app và mất đồng bộ.
- **Kích thước chuẩn (Size):**
  - **Icon trên Header / Action Buttons:** `size={20}` hoặc `size={24}` (khuyến nghị 20 để tinh tế hơn).
  - **Icon trong danh sách (List Items) / Avatar placeholder:** `size={20}` đến `size={24}`.
  - **Icon chú thích nhỏ:** `size={14}` hoặc `size={16}`.
- **Độ dày (Stroke width):** Khuyến nghị giữ mặc định của `lucide-react` (`strokeWidth={2}`).

---

## 5. Bố Cục Chuẩn Mực (Layout Patterns)

### 5.1. Header (Thanh điều hướng trên cùng)
- Mọi trang đều nên có Header cố định trên cùng (Sticky).
- **Style chuẩn:** Nền trắng (`var(--surface)`), viền mỏng ở dưới (`border-b border-[var(--border)]`), chữ canh giữa hoặc canh trái đồng bộ.
- **Code mẫu:**
  ```tsx
  <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[var(--text-secondary)]">
      <ChevronLeft size={24} />
    </button>
    <h1 className="text-xl font-semibold text-[var(--text-primary)]">Tiêu Đề Trang</h1>
    <div className="w-10"></div> {/* Div rỗng để cân bằng button back, giúp text nằm chính giữa */}
  </div>
  ```

### 5.2. Container (Khu vực nội dung)
- Tổng thể App luôn được bọc trong một container để hiển thị đẹp trên cả Mobile và PC (trên PC sẽ hiển thị dạng khung điện thoại).
- Nền nền màu `var(--background)`.
- Các khối nội dung bên trong được phân cách bằng khoảng cách dọc (margin/gap). Thường dùng `p-4 space-y-4`.

### 5.3. Cards (Thẻ nội dung)
- **Style chuẩn:** Nền trắng (`var(--surface)`), viền mỏng nhẹ (`border border-[var(--border)]`), bo góc mềm mại (`rounded-xl` hoặc `rounded-2xl`).
- **Tuyệt đối không dùng:** `shadow-md` hay shadow gắt.
- **Code mẫu:**
  ```tsx
  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
    {/* Content */}
  </div>
  ```

### 5.4. Buttons (Nút bấm)
- **Primary Button (Nút chính):** Nền màu thương hiệu, chữ màu trắng, bo góc. Thường dùng chiều cao lớn để dễ chạm trên mobile.
  - Vị trí: Canh dưới cùng (Sticky bottom) đối với các form nhập liệu, hoặc nằm hẳn bên trong form.
  - **Code mẫu:** `className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-medium hover:opacity-90 active:scale-[0.98] transition-all"`
- **Secondary / Action Button (Nút phụ):** Nền xám nhạt (`bg-gray-100`), chữ đen/xám, bo góc.

---

## 6. Ảnh Đại Diện (Avatars)

- Luôn dùng chuẩn kích thước cố định bằng flex/grid để tránh vỡ khung.
- Nên có viền ngoài hoặc đổ bóng thật nhẹ nếu nền avatar có thể trùng với nền trắng.
- **Code mẫu:**
  ```tsx
  <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white flex-shrink-0">
    <span className="font-semibold text-sm">A</span>
  </div>
  ```

## 7. Trạng Thái Của Dữ Liệu (Loading / Empty States)

- **Đang tải (Loading):** Luôn sử dụng icon `Loader2` từ `lucide-react` xoay vòng kèm text mờ.
  - `<Loader2 className="animate-spin text-[var(--primary)]" />`
- **Trống (Empty State):** Khi danh sách không có dữ liệu, cần có icon xám nhạt cỡ to và text hướng dẫn người dùng.
  - Căn giữa màn hình (`flex flex-col items-center justify-center text-gray-500 py-10`).
