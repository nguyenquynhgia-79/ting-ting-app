import { useEffect, useState } from 'react';
import { Bell, QrCode, Plus, ChevronRight, Users as UsersIcon } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import NotificationsModal from '../components/NotificationsModal';

const Home = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();

  const { user: authUser } = useAuth();
  const { unreadCount, socket } = useSocket();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [profileRes, groupsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/groups/me')
      ]);
      
      setUserProfile(profileRes.data);
      setGroups(groupsRes.data);
      setTotalBalance(profileRes.data.summary.total_balance);
    } catch (err) {
      console.error("Error fetching home data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('Real-time update on Home');
      fetchData();
    };

    socket.on('EXPENSE_UPDATED', handleUpdate);
    socket.on('GROUP_UPDATED', handleUpdate);

    return () => {
      socket.off('EXPENSE_UPDATED', handleUpdate);
      socket.off('GROUP_UPDATED', handleUpdate);
    };
  }, [socket]);

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--background)', 
      color: 'var(--text-primary)',
      overflow: 'hidden',
      overscrollBehavior: 'none'
    }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            onClick={() => navigate('/profile')}
            style={{ 
              width: 38, height: 38, borderRadius: '12px', overflow: 'hidden', 
              border: '1px solid var(--border)',
              cursor: 'pointer',
              backgroundColor: 'var(--background)'
            }}
          >
            <img 
              src={authUser?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.username || authUser?.username || 'User'}&background=10B981&color=fff`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           <div style={{ 
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             width: 28,
             height: 28,
             overflow: 'hidden'
           }}>
             <img src="/logoTingTing.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
           </div>
           <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>TingTing</span>
        </div>
        
        <button 
          onClick={() => setIsNotifOpen(true)}
          style={{ 
          width: 40, height: 40, borderRadius: '12px', 
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
          cursor: 'pointer',
          position: 'relative'
        }}>
          <Bell size={20} fill="var(--primary)" fillOpacity={0.1} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: 'var(--negative)',
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
              width: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--surface)'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Balance Card */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
          borderRadius: 32, 
          padding: '32px 24px', 
          color: '#fff',
          boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>TỔNG SỐ DƯ</p>
            <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 4, letterSpacing: '-1px' }}>
              {totalBalance.toLocaleString()}đ
            </h1>
            <p style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>
              {totalBalance >= 0 ? 'Tổng tiền người khác nợ bạn' : 'Tổng tiền bạn nợ người khác'}
            </p>
          </div>
          {/* Abstract pattern */}
          <div style={{ 
            position: 'absolute', right: -20, bottom: -20, width: 120, height: 120, 
            backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' 
          }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 16, padding: '0 20px', marginBottom: 32 }}>
        <button 
          onClick={() => navigate('/groups/join', { state: { tab: 'qr' } })}
          style={{ 
            flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: 24,
            border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'
          }}
        >
          <div style={{ padding: 10, backgroundColor: '#ECFDF5', borderRadius: 16, color: '#10B981' }}>
            <QrCode size={24} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Quét mã</span>
        </button>
        <button 
          onClick={() => navigate('/groups/join', { state: { tab: 'code' } })}
          style={{ 
            flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: 24,
            border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'
          }}
        >
          <div style={{ padding: 10, backgroundColor: '#F0FDF4', borderRadius: 16, color: '#10B981' }}>
            <Plus size={24} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Thêm mã nhóm</span>
        </button>
      </div>

      {/* Group List Header */}
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Nhóm của bạn</h2>
        <button 
          onClick={() => navigate('/groups')}
          style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Tất cả
        </button>
      </div>

      {/* Group List Scrollable Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Đang tải...</div>
          ) : groups.length > 0 ? groups.slice(0, 5).map((group) => {
            const myBalance = Number(group.members[0]?.balance || 0);
            
            return (
              <div 
                key={group.id} 
                onClick={() => navigate(`/groups/${group.id}`)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px', 
                  borderRadius: 24, backgroundColor: '#fff', border: '1px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer'
                }}
              >
                <div style={{ 
                  width: 52, height: 52, borderRadius: 16, 
                  backgroundColor: '#F3F4F6', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {group.qr_code_url ? (
                    <img 
                      src={group.qr_code_url} 
                      alt={group.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UsersIcon size={24} color="#9CA3AF" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{group.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{group._count?.members || 0} thành viên</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    display: 'block', fontWeight: 800, fontSize: 15, 
                    color: myBalance > 0 ? 'var(--positive)' : myBalance < 0 ? 'var(--negative)' : 'var(--text-muted)'
                  }}>
                    {myBalance > 0 ? '+' : ''}{myBalance.toLocaleString()}đ
                  </span>
                  <span style={{ 
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: myBalance > 0 ? 'var(--positive)' : myBalance < 0 ? 'var(--negative)' : 'var(--text-muted)'
                  }}>
                    {myBalance > 0 ? 'Bạn thu' : myBalance < 0 ? 'Bạn trả' : 'Đã xong'}
                  </span>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            );
          }) : (
            <div style={{ 
              textAlign: 'center', padding: '48px 20px', 
              backgroundColor: '#fff', borderRadius: 28,
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 20 }}>Bạn chưa có nhóm nào</p>
              <button 
                onClick={() => navigate('/groups')}
                style={{ 
                  padding: '12px 24px', borderRadius: 16,
                  backgroundColor: 'var(--primary)', color: '#fff',
                  border: 'none', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Tham gia nhóm
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      <NotificationsModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
};

export default Home;
