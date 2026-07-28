import React, { useState } from 'react';
import { Crown, X } from 'lucide-react';
import api from '../services/api';
import { useDialog } from '../contexts/DialogContext';

interface Member {
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface Props {
  groupId: string;
  groupName: string;
  members: Member[]; // all members except current user
  onSuccess: () => void; 
  onClose: () => void;
  isLeaving?: boolean;
}

const TransferOwnershipModal: React.FC<Props> = ({ groupId, groupName, members, onSuccess, onClose, isLeaving = false }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleTransfer = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.patch(`/groups/${groupId}/transfer-owner`, { newOwnerId: selected });
      onSuccess();
    } catch (err: any) {
      dialog.alert({ message: err.response?.data?.message || 'Chuyển quyền thất bại', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
    }}>
      <div style={{
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 500,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={18} color="#F59E0B" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Chuyển quyền Chủ nhóm</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 40 }}>
              Chọn thành viên mới cho nhóm <strong>"{groupName}"</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Member list */}
        <div style={{ maxHeight: '40vh', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <div
              key={m.user_id}
              onClick={() => setSelected(m.user_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                border: `2px solid ${selected === m.user_id ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: selected === m.user_id ? '#F0FDF4' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {m.user.avatar_url ? (
                <img src={m.user.avatar_url} alt={m.user.username}
                  style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: 'var(--primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16
                }}>
                  {m.user.username[0].toUpperCase()}
                </div>
              )}
              <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{m.user.username}</span>
              {selected === m.user_id && (
                <Crown size={18} color="var(--primary)" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: 14, border: '1px solid var(--border)',
              backgroundColor: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selected || loading}
            style={{
              flex: 2, padding: '14px', borderRadius: 14, border: 'none',
              backgroundColor: selected && !loading ? 'var(--primary)' : 'var(--border)',
              color: selected && !loading ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 15, cursor: selected && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Đang xử lý...' : (
              <>
                <Crown size={16} />
                {isLeaving ? 'Chuyển quyền & Rời nhóm' : 'Xác nhận chuyển quyền'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipModal;
