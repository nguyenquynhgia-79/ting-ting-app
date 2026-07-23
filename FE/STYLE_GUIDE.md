# TingTing Frontend Style Guide

## 1. Màu sắc (Color Palette)
Sử dụng các biến CSS trong `index.css`:
- **Primary (Chủ đạo):** `#10B981` (Emerald Green) - `--primary`
- **Background:** `#F9FAFB` (Xám cực nhạt) - `--background`
- **Surface:** `#FFFFFF` (Trắng) - `--surface`
- **Border:** `#F3F4F6` - `--border`
- **Text Primary:** `#111827` - `--text-primary`
- **Text Secondary:** `#4B5563` - `--text-secondary`
- **Positive:** `#10B981` - `--positive`
- **Negative:** `#EF4444` - `--negative`

## 2. Typography
- **Font Family:** `Plus Jakarta Sans`, sans-serif.
- **Tiêu đề Header:** `18px`, `Font Weight 600`.
- **Tiêu đề Card:** `16px`, `Font Weight 700`.
- **Nội dung phụ:** `13px` hoặc `14px`, `Font Weight 500`, màu `--text-secondary`.

## 3. Thành phần Giao diện (Components)

### A. Header (Thanh đầu trang)
Tất cả các màn hình phải có Header đồng nhất:
```jsx
<div style={{ 
  position: 'sticky', top: 0, zIndex: 100,
  backgroundColor: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  padding: '12px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
}}>
  {/* Left: Back button hoặc Avatar */}
  <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
    <ChevronLeft size={24} />
  </button>
  
  {/* Center: Title */}
  <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Tiêu đề trang</h1>
  
  {/* Right: Action button hoặc empty div (40px) để cân bằng */}
  <div style={{ width: 40 }}></div>
</div>
```

### B. Cards (Thẻ nội dung)
- **Bo góc (Border Radius):** `24px` cho thẻ lớn, `16px` cho thẻ nhỏ.
- **Đổ bóng (Shadow):** Rất nhẹ `0 4px 12px rgba(0,0,0,0.02)` hoặc chỉ sử dụng border.
- **Padding:** `16px` đến `24px`.

### C. Buttons (Nút bấm)
- **Nút chính (Primary):** Background `--primary`, màu chữ trắng, bo góc `16px` hoặc `18px`.
- **Nút phụ (Secondary):** Background trắng, border `--border`, màu chữ `--text-primary`.
- **Hiệu ứng:** `transition: all 0.2s ease`, `active: scale(0.96)`.

### D. Inputs (Ô nhập liệu)
- Không sử dụng border mặc định của trình duyệt.
- Sử dụng background nhẹ (Xám nhạt) hoặc border `--border`.
- Focus state: `outline: none`, có thể thêm shadow nhẹ hoặc đổi màu border sang `--primary`.

## 4. Icons
- Sử dụng thư viện `lucide-react`.
- Kích thước mặc định: `24px` cho header, `20px` cho các hành động trong trang.
- Stroke width: Mặc định (2px).

## 5. Bố cục (Layout)
- **Mobile First:** Thiết kế tối ưu cho chiều ngang tối đa `480px`.
- **Sticky Footer:** Các nút hành động chính (như "Lưu", "Thêm") nên được đặt ở vị trí cố định cuối màn hình (Fixed Bottom) trên một nền trắng có border-top.
