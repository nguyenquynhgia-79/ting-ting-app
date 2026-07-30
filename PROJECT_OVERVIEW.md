# Tổng Quan Dự Án TingTing (Project Overview)

Tài liệu này cung cấp cái nhìn tổng quan toàn diện về dự án TingTing, dành cho Development Team (Frontend, Backend) và Design Team để nắm bắt nhanh kiến trúc, công nghệ, quy trình làm việc và các quy chuẩn giao diện.

---

## 1. Giới thiệu dự án (Introduction)
**TingTing** là một ứng dụng quản lý chi tiêu nhóm, cho phép người dùng theo dõi các khoản thu/chi, tự động tính toán công nợ và số tiền cần thanh toán giữa các thành viên một cách minh bạch, chính xác. 
Hệ thống bao gồm 2 phần giao diện chính:
- **App Người Dùng (FE):** Dành cho user cuối tạo nhóm, thêm chi tiêu, theo dõi công nợ.
- **Trang Quản Trị (FE-Admin):** Dành cho Admin hệ thống cấp phát tài khoản, quản lý dữ liệu tổng quan.

---

## 2. Tech Stack (Công nghệ sử dụng)

### 2.1 Backend (API Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Ngôn ngữ:** TypeScript
- **ORM:** Prisma
- **Cơ sở dữ liệu:** PostgreSQL
- **Xác thực:** JWT (JSON Web Token)
- **Upload:** Supabase Storage (hoặc Cloudinary/AWS S3 tùy cấu hình)

### 2.2 Frontend (Web App / Mobile Web)
- **Core:** React.js (phiên bản 18+)
- **Build tool:** Vite
- **Ngôn ngữ:** TypeScript
- **Styling:** CSS thuần (CSS Variables) + Utility Classes, không phụ thuộc nặng TailwindCSS.
- **Routing:** React Router DOM
- **Icons:** `lucide-react`
- **Hosting:** Vercel

---

## 3. Cấu trúc thư mục (Project Structure)

Dự án áp dụng mô hình Monorepo đơn giản với 3 thư mục chính nằm chung trong thư mục gốc:

```text
TingTing/
├── FE/                 # Mã nguồn của App Người dùng cuối (User App)
│   ├── src/
│   │   ├── components/ # Các component UI dùng chung
│   │   ├── pages/      # Các màn hình chính (Home, GroupDetails, AddExpense...)
│   │   ├── services/   # Gọi API giao tiếp với Backend
│   │   └── ...
├── FE-Admin/           # Mã nguồn của Trang Quản Trị (Admin Panel)
│   ├── src/
│   │   ├── pages/      # Màn hình quản lý User, System...
│   │   └── ...
├── src/                # Mã nguồn Backend (API Server)
│   ├── controllers/    # Xử lý logic nghiệp vụ
│   ├── routes/         # Định tuyến API endpoints
│   ├── prisma/         # Schema database của Prisma
│   └── ...
└── PROJECT_OVERVIEW.md # Tài liệu tổng quan (file này)
```

---

## 4. Quy trình phát triển (Development Workflow)

1. **Mô hình Git Flow:**
   - `main`: Nhánh gốc (Production), chứa code ổn định nhất. Deploy tự động lên môi trường thực tế.
   - `develop`: Nhánh gom tính năng (Staging/Testing).
   - `feature/*`: Nhánh phát triển tính năng mới (Ví dụ: `feature/v2-upgrade`).
2. **Quy tắc làm việc:**
   - Mọi tính năng mới phải được phát triển trên nhánh `feature/...` rẽ nhánh từ `main`.
   - Test và duyệt kỹ lưỡng trước khi gộp (merge) vào `develop`.
   - Khi `develop` đã ổn định, xác nhận với Owner rồi mới merge vào `main`.
3. **Môi trường chạy cục bộ (Local):**
   - Chạy Database Postgres (Supabase/Local).
   - Backend: `npm run dev` ở thư mục gốc (cổng 5000).
   - Frontend User: `cd FE && npm run dev` (cổng 5173).
   - Frontend Admin: `cd FE-Admin && npm run dev` (cổng 5174).

---

## 5. Các Quy Chuẩn UI / UX (Frontend Design Rules)

Mọi màn hình và luồng giao diện đều phải tuân thủ nghiêm ngặt bảng Design Guidelines sau để giữ tính đồng bộ:

### 5.1. Triết Lý Thiết Kế
- **Phong cách:** Minimalist (Tối giản), Clean UI. Ưu tiên giao diện Mobile-first (thiết kế khung dọc).
- **Họa tiết:** Không sử dụng bóng đổ (shadows) quá gắt. Ưu tiên Flat Design hoặc Neumorphism rất nhẹ nhàng.
- **Bố cục (Layout):** Không gian thoáng (White space rộng rãi). Phân chia khối bằng nền xám/trắng hoặc viền (border) nét siêu mỏng (1px).

### 5.2. Bảng Màu (Color Palette)
Hệ thống quản lý màu bằng CSS Variables, tuyệt đối sử dụng biến thay vì hard-code:
- **Primary (`var(--primary)`):** Xanh Ngọc `#10B981`. Dùng cho nút bấm chính, Text nhấn mạnh.
- **Background (`var(--background)`):** Trắng xám `#F9FAFB`. Làm nền dưới cùng cho App.
- **Surface (`var(--surface)`):** Trắng tinh `#FFFFFF`. Dùng làm nền cho các Card, Header, Modal.
- **Trạng thái:**
  - Tiền dương/Thành công: Xanh lá `#10B981` (`var(--positive)`).
  - Nợ/Khoản chi/Lỗi: Đỏ `#EF4444` (`var(--negative)`).
- **Text:**
  - Text chính (`var(--text-primary)`): Xám đen nhạt `#111827`. (Tuyệt đối không dùng `#000000`).
  - Text phụ (`var(--text-secondary)`): Xám tro `#6B7280`.
- **Viền (`var(--border)`):** Xám nhạt `#E5E7EB`.

### 5.3. Typography & Cấu trúc
- **Font chữ:** Dùng Font mặc định hệ thống (SF Pro, Roboto, Inter). Không dùng font có chân.
- **Header:** Luôn cố định (Sticky) trên cùng, nền trắng, có nút Back và viền mỏng ở dưới đáy.
- **Thẻ Card:** Nền `#FFFFFF`, viền mỏng `#E5E7EB`, bo góc mềm mại (12px - 16px).
- **Buttons (Nút bấm):**
  - **Nút chính:** Bo góc, nền `#10B981`, chữ trắng, chiều cao 48-50px.
  - **Nút phụ:** Nền xám nhạt, chữ đen/xám.
- **Icons:** Thống nhất sử dụng 100% từ thư viện `lucide-react` (nét vẽ line 2px, kích thước 20-24px).
- **Loading:** Luôn sử dụng icon `Loader2` có hiệu ứng xoay tròn.

---

> **Lưu ý cho toàn đội ngũ:** Mọi thay đổi về cấu trúc Database hoặc Design Framework cần được thảo luận tập trung và chốt phương án trước khi thực hiện viết code. Không được tự ý đưa thư viện UI mới vào Frontend mà chưa có sự đồng thuận.
