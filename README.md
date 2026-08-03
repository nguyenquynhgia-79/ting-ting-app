# TingTing (Ứng dụng Quản lý Chi tiêu và Lịch trình nhóm)

TingTing là một nền tảng toàn diện giúp bạn và bạn bè quản lý tài chính nhóm (chia tiền, đòi nợ) một cách minh bạch, đồng thời tích hợp trợ lý AI để tự động lên lịch trình đi chơi dựa trên ngân sách và sở thích.

## Các tính năng nổi bật
- **Quản lý Nhóm & Thành viên:** Tạo nhóm bằng mã mời (Invite Code).
- **Quản lý Chi tiêu (Sổ Thu Chi - Ledger):** Ghi chép các khoản thu/chi, hỗ trợ tự động tính toán công nợ và số tiền cần thanh toán giữa các thành viên. (Đang phát triển)
- **AI Trip Planner (Lên lịch trình thông minh):** Sử dụng Google Gemini kết hợp Foursquare và Mapbox để gợi ý lịch trình chi tiết (ăn uống, tham quan, cafe) xung quanh một điểm tập kết cho trước. Hệ thống tự động tính toán khoảng cách và sắp xếp lộ trình hợp lý.
- **Bản đồ tương tác:** Chọn điểm tập kết trực quan trên bản đồ Mapbox GL JS, hỗ trợ định vị GPS và Reverse Geocoding.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, CSS Variables (Tailwind-free)
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Bản đồ & AI:** Mapbox GL JS, Mapbox Geocoding, Foursquare Places API, Google Gemini API.

## Cài đặt và Chạy cục bộ

Yêu cầu: `Node.js >= 18`, `PostgreSQL`

1. Clone dự án và cài đặt dependencies cho Backend:
   ```bash
   npm install
   ```

2. Cài đặt dependencies cho Frontend:
   ```bash
   cd FE
   npm install
   ```

3. Cấu hình các biến môi trường:
   - Tạo file `.env` ở thư mục gốc (dành cho Backend). Cấu hình Database URL, JWT Secret, Mapbox Token, Foursquare API, Gemini API.
   - Tạo file `.env` ở thư mục `FE/` (dành cho Frontend). Cấu hình `VITE_API_URL` và `VITE_MAPBOX_ACCESS_TOKEN`.

4. Cập nhật Database:
   ```bash
   npx prisma db push
   ```

5. Chạy Server:
   - Backend: `npm run dev`
   - Frontend: `cd FE && npm run dev`

Để xem chi tiết hơn về cấu trúc thư mục, kiến trúc Database và các luồng xử lý, vui lòng tham khảo file `PROJECT_OVERVIEW.md`.