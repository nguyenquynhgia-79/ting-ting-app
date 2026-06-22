import React, { useState } from 'react';
import { Lock, Check, Loader2, ChevronLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/change-password', { 
        currentPassword,
        newPassword 
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cập nhật mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)',
        opacity: 0.4,
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
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            width: 40, height: 40, borderRadius: '12px',
            background: 'var(--surface)', border: '1px solid var(--border)', 
            color: 'var(--text-primary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ 
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--primary)',
          whiteSpace: 'nowrap'
        }}>
          Bảo mật & Mật khẩu
        </h2>
        <div style={{ width: 40 }}></div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', paddingBottom: 120, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 10 }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: 28, 
            backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 20px', color: 'var(--primary)',
            boxShadow: '0 12px 24px rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--primary-light)'
          }}>
            <ShieldCheck size={40} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Đổi mật khẩu</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 auto', fontWeight: 500 }}>
            Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để cập nhật bảo mật.
          </p>
        </div>

        <form onSubmit={handleSubmit} id="change-password-form" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400, margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: 'var(--surface)', 
            borderRadius: 32, 
            border: '1px solid var(--border)', 
            padding: '12px 24px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.03)'
          }}>
            <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mật khẩu hiện tại</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <KeyRound size={20} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mật khẩu mới</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Lock size={20} style={{ color: 'var(--primary)' }} />
                <input 
                  type="password" 
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ padding: '20px 0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Xác nhận mật khẩu</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Check size={20} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ 
              padding: '16px', borderRadius: 20, 
              backgroundColor: '#FEF2F2', color: '#DC2626', 
              fontSize: 14, fontWeight: 700, textAlign: 'center',
              border: '1px solid #FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#DC2626' }} />
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Sticky Footer */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)',
        padding: '20px',
        zIndex: 100
      }}>
        <button 
          form="change-password-form"
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            backgroundColor: loading ? 'var(--text-muted)' : 'var(--primary)', 
            color: 'white', 
            padding: '18px', 
            borderRadius: 20, 
            fontSize: 16,
            fontWeight: 800, 
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: loading ? 'none' : '0 10px 25px rgba(16, 185, 129, 0.25)',
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <ShieldCheck size={20} strokeWidth={2.5} />
              Cập nhật mật khẩu
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;

