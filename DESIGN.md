# Yêu cầu Thiết kế Giao diện (UI/UX Specification) - App Quản lý Chi tiêu Nhóm

## 1. Định hướng Thiết kế (Design Guidelines)
* **Phong cách:** Minimalist (Tối giản), Clean UI, Mobile-first. Không sử dụng bóng đổ (shadows) quá gắt, ưu tiên phong cách Flat Design hoặc Neumorphism nhẹ nhàng.
* **Màu sắc chủ đạo (Color Palette):**
    * `Primary (Thương hiệu):` #10B981 (Emerald Green - tạo cảm giác an toàn, liên quan đến tiền bạc).
    * `Background:` #F9FAFB (Off-white/Xám cực nhạt - giúp nổi bật các thẻ Card trắng).
    * `Surface:` #FFFFFF (Trắng tinh cho các Cards, Modals).
    * `Positive (Nhận tiền):` #10B981 (Xanh lá).
    * `Negative (Nợ tiền):` #EF4444 (Đỏ).
    * `Text:` #111827 (Đen nhạt cho tiêu đề), #6B7280 (Xám cho mô tả phụ).
* **Typography:** Font chữ Sans-serif hiện đại, nét tròn trịa, dễ đọc (Inter, Roboto, hoặc SF Pro).
* **Tương tác (UX):** Ưu tiên các nút bấm lớn (touch-friendly), hạn chế số lần chạm (clicks) để hoàn thành việc thêm khoản chi.

---

## 2. Cấu trúc các Màn hình (Screen Specifications)

### Màn hình 1: Đăng nhập & Đổi mật khẩu (Auth Screen)
* **Layout:** Căn giữa màn hình (Center-aligned).
* **Visual:** Logo app đơn giản ở trên cùng, câu chào mừng ngắn gọn.
* **Components:**
    * 2 Input fields (Tên đăng nhập, Mật khẩu) với border mỏng, bo góc tròn (rounded-lg).
    * Button `Đăng nhập` to, rộng tràn viền (full-width), màu Primary.
* **State đổi mật khẩu:** Nếu là lần đăng nhập đầu, form chuyển sang 2 input: "Mật khẩu mới" và "Xác nhận mật khẩu".

### Màn hình 2: Trang chủ - Danh sách Nhóm (Home / Groups List)
* **Header:** Lời chào người dùng (Vd: "Chào buổi sáng, Gia!") và Avatar nhỏ góc phải.
* **Summary Card:** Một thẻ lớn trên cùng hiển thị "Tổng số dư của bạn" (Xanh/Đỏ tùy thuộc vào việc đang nợ hay đang được nợ tính trên mọi nhóm).
* **List Groups:** Danh sách các nhóm dưới dạng các Card.
    * Mỗi Card hiển thị: Tên nhóm, Số lượng thành viên, và Số dư cá nhân trong nhóm đó (ghi rõ "Bạn đang nợ: 50k" chữ đỏ hoặc "Bạn nhận lại: 100k" chữ xanh).
* **Action:** Nút Floating Action Button (FAB) hình dấu `+` to ở góc dưới bên phải màn hình để tạo nhóm mới hoặc quét QR vào nhóm.

### Màn hình 3: Chi tiết Nhóm (Group Dashboard)
* **Header:** Tên nhóm. Góc phải có biểu tượng mã QR (bấm vào sẽ hiện popup mã QR to để người khác quét).
* **Navigation:** Một Segmented Control (Tabs) để chuyển đổi giữa 2 view: `Hoạt động` (Expenses) và `Sổ cái` (Balances).
* **Tab Hoạt động (Expenses Feed):**
    * Danh sách cuộn dọc các khoản chi đã tạo.
    * Mỗi item (list tile) gồm: Icon danh mục, Tiêu đề (Vd: "Tiền ăn tối"), Ngày tháng, Tổng tiền hóa đơn, và dòng chữ nhỏ cho biết người đăng nhập "cho mượn" hay "đã mượn" bao nhiêu từ khoản này.
* **Tab Sổ cái (Balances - Chức năng tối giản nợ):**
    * Hiển thị danh sách tóm tắt: Ai cần trả cho ai.
    * Vd: "Avatar Bạn -> mũi tên -> Avatar Sang: 50.000đ". Kèm theo một nút `Thanh toán` bên cạnh.
* **Action:** Nút FAB `+ Thêm khoản chi` luôn nổi ở góc dưới.

### Màn hình 4: Thêm Khoản Chi (Add Expense Modal/Screen) - Màn hình quan trọng nhất
* **Layout:** Form nhập liệu thiết kế rộng rãi, bàn phím số (numpad) hiện lên tự động khi vào trang.
* **Inputs chính:**
    * Input `Số tiền` (Rất to, in đậm, căn giữa).
    * Input `Mô tả` (Ví dụ: Tiền taxi...).
    * Nút Upload hóa đơn (Icon camera/gallery nhỏ nhắn).
* **Khu vực Chia tiền (Split Logic):**
    * **Toggle Switch:** Cho phép chọn giữa `Chia đều` và `Tùy chỉnh`.
    * *Nếu chọn Chia đều:* Hiển thị danh sách thành viên dạng Checkbox/Avatars. Mặc định check tất cả. App tự chia con số ở dưới.
    * *Nếu chọn Tùy chỉnh:* Hiển thị danh sách thành viên với ô Input nhập số tiền kế bên. Dưới cùng tự động hiển thị: "Phần còn lại của bạn: [Số tiền tự tính]".
* **Action:** Nút `Lưu khoản chi` (Màu Primary, chỉ sáng lên khi tổng tiền hợp lệ).

### Màn hình 5: Popup Thanh toán (Settle Up Modal)
* **Visual:** Giao diện dạng Bottom Sheet trượt từ dưới lên.
* **Nội dung:** "Bạn xác nhận đã chuyển khoản 50.000đ cho Sang?".
* **Components:** Tùy chọn tải lên ảnh chụp màn hình chuyển khoản (tùy chọn) và nút `Xác nhận đã chuyển` to, rõ ràng.

---

## 3. Hoạt ảnh (Animations - Tùy chọn thêm để mượt mà)
* Chuyển trang (Transitions): Trượt ngang mượt mà (Slide in/out) khi vào chi tiết nhóm.
* Hiệu ứng (Feedback): Nút bấm đổi màu nhẹ khi chạm (Ripple effect).
* Hiệu ứng số (Number Count): Khi số dư thay đổi, con số nhảy chạy từ 0 đến kết quả thực tế tạo cảm giác sinh động.