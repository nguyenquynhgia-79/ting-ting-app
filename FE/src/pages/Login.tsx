import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useDialog } from '../contexts/DialogContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const dialog = useDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.token, response.data.user);
      
      if (response.data.user.status === 'require_password_change') {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      padding: '24px',
      justifyContent: 'center'
    }}>
      {/* Branding */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        marginBottom: 48,
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 24, 
          backgroundColor: '#fff',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          marginBottom: 16
        }}>
          <img src="/logoTingTing.png" alt="Logo" style={{ width: 48, height: 48 }} />
        </div>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 800, 
          color: 'var(--text-primary)', 
          letterSpacing: '-1px',
          marginBottom: 4
        }}>
          TingTing
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500 }}>
          Quản lý chi tiêu nhóm dễ dàng
        </p>
      </div>

      {/* Login Card */}
      <div style={{ 
        backgroundColor: 'var(--surface)', 
        borderRadius: 32,
        padding: '32px 24px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.03)',
        border: '1px solid var(--border)',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Đăng nhập</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>Tên đăng nhập</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ 
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: 16,
                  backgroundColor: '#F3F4F6', border: '1px solid transparent',
                  color: 'var(--text-primary)', fontSize: 16, outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={20} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ 
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: 16,
                  backgroundColor: '#F3F4F6', border: '1px solid transparent',
                  color: 'var(--text-primary)', fontSize: 16, outline: 'none'
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ 
              padding: '12px', borderRadius: 12, backgroundColor: '#FEF2F2', 
              color: 'var(--negative)', fontSize: 14, fontWeight: 600, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '18px', borderRadius: 18,
              backgroundColor: 'var(--primary)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              border: 'none', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
              cursor: 'pointer', marginTop: 8
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Vào ứng dụng
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Chưa có tài khoản?{' '}
          <button 
            type="button"
            style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', fontSize: 15, cursor: 'pointer' }}
            onClick={() => dialog.alert('Vui lòng liên hệ Admin để cấp tài khoản.')}
          >
            Liên hệ Admin
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;

