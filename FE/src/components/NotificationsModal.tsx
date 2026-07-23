import React from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    
    if (notif.related_entity_id) {
      navigate(`/groups/${notif.related_entity_id}`);
      onClose(); // Close modal after navigating
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end'
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        width: '100%',
        maxWidth: 500,
        height: '80vh',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '20px 20px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Thông báo</h2>
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: 'var(--negative)',
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={24} />
          </button>
        </div>

        {unreadCount > 0 && (
          <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={markAllAsRead}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <CheckCircle2 size={16} />
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p>Bạn chưa có thông báo nào</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: notif.is_read ? 'var(--background)' : '#F0FDF4',
                  border: `1px solid ${notif.is_read ? 'var(--border)' : '#A7F3D0'}`,
                  display: 'flex',
                  gap: 12,
                  cursor: notif.is_read ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ 
                  width: 40, height: 40, borderRadius: 20, 
                  backgroundColor: notif.is_read ? '#E5E7EB' : '#10B981',
                  color: notif.is_read ? '#6B7280' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bell size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>
                    {notif.title}
                  </h4>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: vi })}
                  </span>
                </div>
                {!notif.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'var(--negative)', marginTop: 6 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
