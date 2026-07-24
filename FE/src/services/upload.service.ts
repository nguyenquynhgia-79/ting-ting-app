import api from './api';
import { compressImage } from '../utils/imageCompression';

export type UploadType = 'avatar' | 'group_cover' | 'expense_proof';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB (Nén lại sau)

interface UploadResult {
  publicUrl: string;
  key: string;
}

interface UploadOptions {
  type: UploadType;
  file: File;
  userId?: string;
  groupId?: string;
  expenseId?: string;
}

/**
 * Upload file trực tiếp lên BE qua multipart/form-data.
 * Đã tích hợp tự động nén ảnh trên trình duyệt trước khi gửi.
 */
export async function uploadFile(opts: UploadOptions): Promise<string> {
  const { type, file, userId, groupId, expenseId } = opts;

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP (file hiện tại: ${file.type || 'unknown'})`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ảnh quá lớn (${sizeMB} MB). Vui lòng chọn ảnh dưới 20 MB.`);
  }

  // Tiết kiệm băng thông: Nén ảnh ở client
  const finalFile = await compressImage(file);

  const formData = new FormData();
  formData.append('file', finalFile);
  formData.append('type', type);
  if (userId)    formData.append('userId', userId);
  if (groupId)   formData.append('groupId', groupId);
  if (expenseId) formData.append('expenseId', expenseId);

  const token = localStorage.getItem('token');
  const baseUrl = (api.defaults.baseURL || 'http://localhost:3000/api').replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/storage/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed: ${res.status} – ${text}`);
  }

  const data: UploadResult = await res.json();
  return data.publicUrl;
}
