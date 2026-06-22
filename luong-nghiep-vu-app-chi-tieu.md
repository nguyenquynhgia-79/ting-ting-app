# Tạo nội dung cho file Markdown dựa trên các yêu cầu nghiệp vụ đã thống nhất
markdown_content = """# Tài liệu Luồng Nghiệp vụ - Dự án Quản lý Chi tiêu Nhóm

Tài liệu này chi tiết hóa các quy tắc nghiệp vụ (Business Logic) dành cho ứng dụng quản lý chi tiêu nhóm, được thiết kế để triển khai với Backend Node.js và Frontend React Native.

## 1. Nghiệp vụ Quản trị & Xác thực (Admin-only Auth)

Hệ thống hoạt động theo mô hình đóng, trong đó Admin quản lý danh sách người dùng.

* **Khởi tạo tài khoản:** * Admin tạo tài khoản thủ công trong cơ sở dữ liệu.
    * Thông tin bao gồm: `username`, `email`, `password` (tạm thời), `status` (mặc định là `require_password_change`).
* **Đăng nhập & Bảo mật:**
    * **Luồng đăng nhập đầu tiên:** Người dùng nhập thông tin Admin cấp. Hệ thống kiểm tra trạng thái `require_password_change`. Nếu đúng, bắt buộc chuyển hướng đến màn hình đổi mật khẩu.
    * **Đổi mật khẩu:** Sau khi đổi thành công, trạng thái chuyển sang `active`. Chỉ tài khoản `active` mới có thể tạo/tham gia nhóm.
    * **Quản lý phiên:** Sử dụng JWT (JSON Web Token). Khi Admin vô hiệu hóa tài khoản (`inactive`), toàn bộ Token cũ sẽ bị thu hồi.

## 2. Nghiệp vụ Quản lý Nhóm (Group Isolation)

Nhóm là đơn vị cô lập dữ liệu cao nhất.

* **Tạo nhóm:** Một thành viên tạo nhóm và trở thành chủ nhóm.
* **Thêm thành viên:** Thành viên trong nhóm có thể thêm người dùng khác vào nhóm bằng cách quét mã QR của nhóm hoặc và mã id của nhóm.
* **Ràng buộc Rời nhóm/Xóa thành viên:**
    * Một người dùng chỉ có thể rời nhóm hoặc bị xóa nếu **Số dư (Balance)** của họ trong nhóm đó bằng 0.
    * Nếu Balance < 0: Phải trả hết nợ mới được rời đi.
    * Nếu Balance > 0: Phải thu hồi hết nợ mới được rời đi.

## 3. Nghiệp vụ Khoản chi & Minh chứng (Expense & Proof)

Mỗi khoản chi phát sinh trong một nhóm cụ thể và không ảnh hưởng đến các nhóm khác.

* **Lưu trữ minh chứng (S3/R2 Strategy):**
    * Ảnh hóa đơn/sản phẩm được nén tại Client để tiết kiệm dung lượng.
    * Sử dụng **S3 Pre-signed URL** để upload trực tiếp từ Mobile App lên Bucket.
    * Cấu hình linh hoạt qua biến môi trường để sẵn sàng chuyển đổi từ AWS S3 sang Cloudflare R2 khi cần tối ưu phí băng thông (Egress).
* **Logic chia tiền (Split Logic):** Khi tạo một khoản chi mới, người tạo (Payer) bắt buộc chọn 1 trong 2 phương thức chia:

    * **Phương thức 1: Chia đều (Split Equally)**
        * **Luồng thao tác:** Hệ thống hiển thị danh sách toàn bộ thành viên trong nhóm kèm theo Checkbox. Người tạo khoản chi sẽ tích chọn những ai có tham gia (bao gồm cả chính mình nếu có sử dụng).
        * **Tính toán:** `Phần nợ mỗi người = Tổng hóa đơn / Số người được tick chọn`.
        * **Xử lý số lẻ (Rounding):** Phần dư (ví dụ 1đ, 2đ) do phép chia không hết sẽ được hệ thống tự động cộng dồn vào phần nợ của người tạo khoản chi. Đảm bảo: `Tổng tiền thụ hưởng = Tổng hóa đơn`.

    * **Phương thức 2: Chia tùy chỉnh (Custom Split)**
        * **Luồng thao tác:** Người tạo khoản chi thêm các thành viên tham gia vào danh sách và trực tiếp nhập số tiền cụ thể cho từng người.
        * **Cơ chế tự động bù trừ (Auto-Remainder):** Người tạo không cần tự nhập số tiền của chính mình. Hệ thống sẽ tự động tính: `Số tiền của người tạo = Tổng hóa đơn - Tổng số tiền đã gán cho các thành viên khác`. (Ví dụ: Hóa đơn 70k, thêm người B và nhập 40k -> App tự động hiển thị số tiền của chủ khoản chi là 30k).
        * **Ràng buộc (Validation):** Frontend phải khóa chặn, không cho phép nhập tổng số tiền của những người được thêm vượt quá "Tổng hóa đơn" để tránh phát sinh số dư âm cho chủ khoản chi.

## 4. Nghiệp vụ Sổ cái & Đối trừ (Ledger & Settlement)

Áp dụng nguyên tắc kế toán để quản lý dòng tiền một cách minh bạch.

* **Sổ cái nhóm (Group Ledger):**
    * Mỗi giao dịch sẽ tạo ra các bản ghi biến động số dư.
    * Người chi trả (Payer): Balance tăng (Số dương - Hệ thống nợ họ).
    * Người thụ hưởng (Beneficiaries): Balance giảm (Số âm - Họ nợ hệ thống).
    * **Bất biến:** Tổng Balance của toàn bộ thành viên trong một nhóm luôn luôn bằng 0.
* **Tối giản nợ (Debt Simplification):**
    * Hệ thống chạy thuật toán gom nhóm để giảm thiểu số lần chuyển khoản.
    * Ví dụ: A nợ B 100k, B nợ C 100k => Hệ thống gợi ý A trả thẳng cho C 100k.
* **Quyết toán (Settle Up):**
    * Người nợ tạo một bản ghi `Payment`.
    * Hệ thống cập nhật Balance của cả hai bên nhưng ở trạng thái `Pending`.
    * Người nhận bấm "Xác nhận đã nhận tiền" => Balance mới chính thức được cập nhật vào sổ cái và xóa nợ.

## 5. Cấu trúc lưu trữ hình ảnh (Folder Structure)

Để quản lý dễ dàng trên S3/R2:
`images/groups/{group_id}/expenses/{expense_id}/{timestamp}_{filename}.jpg`

---
*Tài liệu này được soạn thảo dựa trên yêu cầu về một hệ thống quản lý chi tiêu tinh gọn, bảo mật và tối ưu chi phí vận hành.*
"""

with open("luong-nghiep-vu-app-chi-tieu.md", "w", encoding="utf-8") as f:
    f.write(markdown_content)

print("File .md đã được tạo thành công.")