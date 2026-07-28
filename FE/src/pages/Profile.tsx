import { useEffect, useState } from 'react';
import { Mail, LogOut, ChevronRight, Camera, Lock, ArrowUpCircle, ArrowDownCircle, Settings, ShieldCheck, BadgeCheck, Loader2, Trash2, Banknote, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import BankInfoModal from '../components/BankInfoModal';
import EditProfileModal from '../components/EditProfileModal';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { uploadFile } from '../services/upload.service';
import { useDialog } from '../contexts/DialogContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const dialog = useDialog();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };
    fetchProfile();
  }, []);

  const displayUser = profile || user;
  const summary = profile?.summary || { totalBalance: 0, totalOwed: 0, totalOwe: 0 };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !displayUser?.id) return;
    const file = e.target.files[0];
    // Show local preview immediately
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadFile({ type: 'avatar', file, userId: displayUser.id });
      await api.patch('/users/me/avatar', { avatarUrl: publicUrl });
      setProfile((prev: any) => prev ? { ...prev, avatar_url: publicUrl } : prev);
      updateUser({ avatar_url: publicUrl });
    } catch (err) {
      console.error('Avatar upload failed', err);
      setAvatarPreview('');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!displayUser?.avatar_url) return;
    const isConfirmed = await dialog.confirm('Bạn có chắc muốn xóa ảnh đại diện?');
    if (!isConfirmed) return;

    setAvatarUploading(true);
    try {
      await api.patch('/users/me/avatar', { avatarUrl: null });
      setProfile((prev: any) => prev ? { ...prev, avatar_url: null } : prev);
      updateUser({ avatar_url: null });
      setAvatarPreview('');
    } catch (err) {
      console.error('Avatar removal failed', err);
      dialog.alert({ message: 'Không thể xóa ảnh đại diện', type: 'error' });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      paddingBottom: 100, 
      backgroundColor: 'var(--background)', 
      minHeight: '100vh',
      color: 'var(--text-primary)'
    }}>
      {/* Background Glow - Replaced with a very subtle green gradient for light theme */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)',
        opacity: 0.5,
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(16, 185, 129, 0.08)'
      }}>
        <div style={{ width: 40, height: 40 }}></div>
        
        <h2 style={{ 
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--primary)',
          whiteSpace: 'nowrap'
        }}>
          Cá nhân
        </h2>
        
        <button style={{ 
          width: 40, height: 40, borderRadius: '12px', 
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
        }}>
          <Settings size={20} />
        </button>
      </div>

      {/* Avatar Section */}
      <div style={{ 
        padding: '10px 20px 32px', 
        textAlign: 'center', 
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
          <div style={{ 
            width: '100%', height: '100%', borderRadius: 40, 
            overflow: 'hidden', border: '3px solid var(--surface)',
            padding: 4, background: 'var(--surface)',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.15)'
          }}>
            <img 
              src={avatarPreview || displayUser?.avatar_url || `https://ui-avatars.com/api/?name=${displayUser?.full_name || displayUser?.username || 'User'}&background=10B981&color=fff&size=200&bold=true`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: 34, objectFit: 'cover' }} 
            />
          </div>
          {/* Avatar Actions */}
          <div style={{ position: 'absolute', bottom: -2, right: -2, display: 'flex', gap: 8 }}>
            {displayUser?.avatar_url && !avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  color: 'white', 
                  width: 38, height: 38, borderRadius: 12,
                  border: '3px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  cursor: avatarUploading ? 'default' : 'pointer',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <input type="file" id="avatar-upload" hidden accept="image/*" onChange={handleAvatarChange} />
            <label
              htmlFor="avatar-upload"
              style={{ 
                backgroundColor: avatarUploading ? 'var(--border)' : 'var(--primary)',
                color: 'white', 
                width: 38, height: 38, borderRadius: 12,
                border: '3px solid var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                cursor: avatarUploading ? 'default' : 'pointer',
              }}
            >
              {avatarUploading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Camera size={18} />
              }
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {displayUser?.full_name || displayUser?.username || 'Đang tải...'}
          </h1>
          <BadgeCheck size={22} color="var(--primary)" />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500 }}>@{displayUser?.username}</p>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: '0 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative', zIndex: 10 }}>
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          borderRadius: 24, border: '1px solid var(--border)',
          padding: '20px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--positive)', marginBottom: 12 }}>
            <div style={{ backgroundColor: 'var(--primary-light)', padding: 6, borderRadius: 10 }}>
              <ArrowUpCircle size={20} color="var(--primary)" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>ĐƯỢC NHẬN</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--positive)' }}>
            {formatCurrency(summary.totalOwed)}
          </p>
        </div>
        
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          borderRadius: 24, border: '1px solid var(--border)',
          padding: '20px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--negative)', marginBottom: 12 }}>
            <div style={{ backgroundColor: '#FEE2E2', padding: 6, borderRadius: 10 }}>
              <ArrowDownCircle size={20} color="var(--negative)" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>PHẢI TRẢ</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(summary.totalOwe)}
          </p>
        </div>
      </div>

      {/* Settings List */}
      <div style={{ padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          borderRadius: 28, border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
        }}>
          <div 
            onClick={() => setShowEditProfileModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer' 
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>EMAIL</p>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>{displayUser?.email || 'N/A'}</p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>

          <div 
            onClick={() => setShowEditProfileModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer' 
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>SỐ ĐIỆN THOẠI</p>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>{displayUser?.phone_number || 'Chưa cập nhật'}</p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>TRẠNG THÁI</p>
              <p style={{ fontWeight: 700, fontSize: 16, color: displayUser?.status === 'active' ? 'var(--positive)' : 'var(--warning)' }}>
                {displayUser?.status === 'active' ? 'Đã xác thực' : 'Chưa kích hoạt'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/change-password')}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', gap: 16, 
              padding: '20px', border: 'none', background: 'none', cursor: 'pointer',
              transition: 'background-color 0.2s', borderBottom: '1px solid var(--border)'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#FEF3C7', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={24} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Bảo mật & Mật khẩu</p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </button>

          <button 
            onClick={() => setShowBankModal(true)}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', gap: 16, 
              padding: '20px', border: 'none', background: 'none', cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#E0E7FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={24} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Nhận tiền (VietQR)</p>
              {displayUser?.account_number ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{displayUser.bank_name} - {displayUser.account_number}</p>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--negative)', marginTop: 2 }}>Chưa thiết lập</p>
              )}
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </button>
        </div>

        <button 
          onClick={logout}
          style={{ 
            marginTop: 32, width: '100%', height: 64, borderRadius: 20,
            backgroundColor: 'var(--surface)', border: '1px solid #FECACA',
            color: 'var(--negative)', fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
          }}
        >
          <LogOut size={22} />
          Đăng xuất
        </button>
      </div>

      <BottomNav />

      {showBankModal && (
        <BankInfoModal
          initialData={displayUser}
          onClose={() => setShowBankModal(false)}
          onSuccess={(updatedInfo) => {
            setProfile((prev: any) => prev ? { ...prev, ...updatedInfo } : prev);
            updateUser({ ...user, ...updatedInfo });
            setShowBankModal(false);
          }}
        />
      )}

      {showEditProfileModal && (
        <EditProfileModal 
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          profile={displayUser}
          onUpdateSuccess={(updatedData) => {
            setProfile((prev: any) => prev ? { ...prev, ...updatedData } : prev);
          }}
        />
      )}
    </div>
  );
};

export default Profile;

