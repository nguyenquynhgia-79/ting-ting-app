import React, { useState } from 'react';
import { X, CreditCard, Banknote, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import { useDialog } from '../contexts/DialogContext';

interface BankInfoModalProps {
  onClose: () => void;
  onSuccess: (updatedInfo: any) => void;
  initialData?: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
  };
}

const BankInfoModal: React.FC<BankInfoModalProps> = ({ onClose, onSuccess, initialData }) => {
  const [banks, setBanks] = useState<any[]>([]);
  const [bankName, setBankName] = useState(initialData?.bank_name || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.account_number || '');
  const [accountName, setAccountName] = useState(initialData?.account_name || '');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  React.useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setBanks(data.data);
        }
      })
      .catch(err => console.error("Failed to fetch banks", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      dialog.alert({ message: "Vui lòng điền đầy đủ thông tin (Ngân hàng, STK, Tên)", type: 'error' });
      return;
    }
    const isConfirmed = await dialog.confirm(`Vui lòng kiểm tra kỹ:\nNgân hàng: ${bankName}\nSố TK: ${accountNumber}\nTên: ${accountName.toUpperCase()}\n\nBạn có chắc chắn thông tin này là chính xác?`);
    if (!isConfirmed) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.patch('/users/me/bank', {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName
      });
      onSuccess(res.data);
    } catch (err: any) {
      dialog.alert({ message: err.response?.data?.message || 'Lỗi cập nhật ngân hàng', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--background)', width: '100%',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '32px 24px',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Thông tin nhận tiền (VietQR)
          </h2>
          <button onClick={onClose} style={{
            background: 'var(--surface)', border: 'none', width: 40, height: 40,
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)'
          }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
          Thông tin này sẽ được dùng để tạo mã VietQR tự động khi thành viên khác muốn thanh toán cho bạn.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Bank Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              CHỌN NGÂN HÀNG
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Banknote size={20} />
              </div>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  borderRadius: 16, border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)', fontSize: 16,
                  color: 'var(--text-primary)', fontWeight: 600,
                  appearance: 'none', outline: 'none'
                }}
              >
                <option value="">-- Chọn ngân hàng --</option>
                {banks.map(b => (
                  <option key={b.id || b.bin} value={b.shortName}>
                    {b.shortName} - {b.name}
                  </option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Account Number */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              SỐ TÀI KHOẢN
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <CreditCard size={20} />
              </div>
              <input 
                type="text" 
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="Nhập số tài khoản"
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  borderRadius: 16, border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)', fontSize: 16,
                  color: 'var(--text-primary)', fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Account Name */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
              TÊN CHỦ TÀI KHOẢN
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <UserIcon size={20} />
              </div>
              <input 
                type="text" 
                value={accountName}
                onChange={e => setAccountName(e.target.value.toUpperCase())}
                placeholder="VD: NGUYEN VAN A"
                style={{
                  width: '100%', padding: '16px 16px 16px 48px',
                  borderRadius: 16, border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)', fontSize: 16,
                  color: 'var(--text-primary)', fontWeight: 600,
                  textTransform: 'uppercase',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', padding: 18, borderRadius: 20, border: 'none',
              backgroundColor: 'var(--primary)', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
            }}
          >
            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BankInfoModal;
