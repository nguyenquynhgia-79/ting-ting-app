import { useState, useEffect } from 'react';
import { Plus, Search, Users as UsersIcon, Loader2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

const Groups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user: authUser } = useAuth();

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/me');
      setGroups(response.data);
    } catch (err) {
      console.error("Error fetching groups", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('GROUP_UPDATED', (data) => {
      console.log('Group updated event received:', data);
      fetchGroups();
    });

    return () => {
      socket.off('GROUP_UPDATED');
    };
  }, [socket]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#F9FAFB', 
      color: 'var(--text-primary)',
      paddingBottom: 80,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(16, 185, 129, 0.08)'
      }}>
        {showSearch ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }} className="animate-in">
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Tìm tên nhóm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', padding: '10px 16px 10px 44px', borderRadius: 20, 
                  border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                  fontSize: 14, outline: 'none', color: 'var(--text-primary)', fontWeight: 500
                }}
                autoFocus
              />
            </div>
            <button 
              onClick={() => { setShowSearch(false); setSearchQuery(''); }} 
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Hủy
            </button>
          </div>
        ) : (
          <>
            <div 
              onClick={() => navigate('/profile')}
              style={{ 
                width: 38, height: 38, borderRadius: '12px', overflow: 'hidden', 
                backgroundColor: 'var(--background)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <img 
                src={authUser?.avatar_url || `https://ui-avatars.com/api/?name=${authUser?.username || 'User'}&background=10B981&color=fff`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            
            <h2 style={{ 
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Nhóm
            </h2>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setShowSearch(true)}
                style={{ 
                  width: 40, height: 40, borderRadius: '12px', 
                  backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)',
                  cursor: 'pointer'
                }}
              >
                <Search size={20} />
              </button>
              <button 
                onClick={() => navigate('/groups/join')}
                style={{ 
                  width: 40, height: 40, borderRadius: '12px', 
                  backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10B981',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={20} />
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 className="animate-spin" color="#10B981" size={40} />
            </div>
          ) : filteredGroups.map((group) => {
            const myBalance = Number(group.members[0]?.balance || 0);
            
            return (
              <div 
                key={group.id} 
                className="animate-in" 
                style={{ 
                  padding: '16px', 
                  cursor: 'pointer', 
                  borderRadius: 24,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F3F4F6',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div style={{ 
                  width: 56, height: 56, borderRadius: 16, 
                  backgroundColor: '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {group.qr_code_url ? (
                    <img 
                      src={group.qr_code_url} 
                      alt={group.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UsersIcon size={26} color="#9CA3AF" />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px 0', color: '#111827' }}>{group.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UsersIcon size={12} color="#6B7280" />
                    <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{group._count?.members || 0} thành viên</span>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{ 
                    fontWeight: 700, fontSize: 14, margin: '0 0 2px 0',
                    color: myBalance > 0 ? '#10B981' : myBalance < 0 ? '#EF4444' : '#6B7280' 
                  }}>
                    {myBalance > 0 ? 'Bạn được nhận' : myBalance < 0 ? 'Bạn nợ' : 'Hết nợ'}
                  </p>
                  <p style={{ 
                    fontWeight: 800, fontSize: 16, margin: 0,
                    color: myBalance > 0 ? '#10B981' : myBalance < 0 ? '#EF4444' : '#111827' 
                  }}>
                    {Math.abs(myBalance).toLocaleString()}đ
                  </p>
                </div>
              </div>
            );
          })}
          
          {filteredGroups.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: 60 }} className="animate-in">
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', 
                backgroundColor: '#F3F4F6', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', 
                color: '#9CA3AF'
              }}>
                <UsersIcon size={36} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#111827' }}>Chưa có nhóm nào</h3>
              <p style={{ color: '#6B7280', fontSize: 14, maxWidth: 240, margin: '0 auto 24px', lineHeight: 1.6 }}>
                {searchQuery ? 'Không tìm thấy nhóm nào khớp với tìm kiếm của bạn.' : 'Hãy tạo nhóm đầu tiên để bắt đầu quản lý chi tiêu cùng bạn bè!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FABs */}
      <div style={{ position: 'absolute', bottom: 100, right: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Join group */}
        <button
          onClick={() => navigate('/groups/join')}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            backgroundColor: '#fff', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #10B981',
            boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <QrCode size={22} />
        </button>
        {/* Create group */}
        <button 
          onClick={() => navigate('/groups/new')}
          style={{ 
            width: 56, height: 56, borderRadius: '50%',
            backgroundColor: '#10B981', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', fontWeight: 700,
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <Plus size={28} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Groups;

