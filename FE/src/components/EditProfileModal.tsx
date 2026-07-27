import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Loader2, Save } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onUpdateSuccess: (updatedData: any) => void;
}

const EditProfileModal = ({ isOpen, onClose, profile, onUpdateSuccess }: EditProfileModalProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();

  useEffect(() => {
    if (isOpen && profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setPhone(profile.phone_number || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.put('/users/profile', {
        username,
        email,
        phone_number: phone || null
      });
      
      toast.success('Cập nhật thông tin thành công');
      updateUser({ username: data.username, email: data.email, phone_number: data.phone_number });
      onUpdateSuccess(data);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
    }}>
      <div 
        style={{
          width: '100%', maxWidth: 480,
          backgroundColor: 'var(--background)',
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: '24px 20px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Cập nhật thông tin</h2>
          <button 
            onClick={onClose}
            style={{ 
              width: 36, height: 36, borderRadius: 18, border: 'none',
              backgroundColor: 'var(--surface)', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, marginLeft: 12 }}>
              TÊN ĐĂNG NHẬP / HIỂN THỊ
            </label>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'var(--surface)', borderRadius: 20,
              padding: '16px', border: '1px solid var(--border)'
            }}>
              <User size={20} style={{ color: 'var(--primary)' }} />
              <input 
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Tên của bạn" required
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, marginLeft: 12 }}>
              EMAIL
            </label>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'var(--surface)', borderRadius: 20,
              padding: '16px', border: '1px solid var(--border)'
            }}>
              <Mail size={20} style={{ color: 'var(--primary)' }} />
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com" required
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, marginLeft: 12 }}>
              SỐ ĐIỆN THOẠI
            </label>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'var(--surface)', borderRadius: 20,
              padding: '16px', border: '1px solid var(--border)'
            }}>
              <Phone size={20} style={{ color: 'var(--primary)' }} />
              <input 
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Ví dụ: 0987654321"
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            style={{ 
              marginTop: 16,
              backgroundColor: loading ? 'var(--text-muted)' : 'var(--primary)',
              color: 'white', padding: '18px', borderRadius: 20, border: 'none',
              fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              boxShadow: loading ? 'none' : '0 8px 25px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <Save size={20} />
                Lưu Thay Đổi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
