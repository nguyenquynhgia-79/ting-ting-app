import React, { useState, useEffect } from 'react';
import { Camera, Check, ChevronDown, Loader2, ToggleLeft, ToggleRight, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { uploadFile } from '../services/upload.service';

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();

  const initialGroupId = location.state?.groupId || '';

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [error, setError] = useState('');

  const getRawAmount = () => {
    const clean = amount.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean || '0');
  };

  // Fetch groups list
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/groups/me');
        setGroups(res.data);
        const groupIdToFetch = initialGroupId || (res.data.length > 0 ? res.data[0].id : null);
        if (groupIdToFetch) {
          const detailRes = await api.get(`/groups/${groupIdToFetch}`);
          setSelectedGroup(detailRes.data);
        }
      } catch (err) {
        console.error('Error fetching groups', err);
      }
    };
    fetchGroups();
  }, [initialGroupId]);

  // Build participants when group changes
  useEffect(() => {
    if (selectedGroup?.members) {
      setParticipants(
        selectedGroup.members.map((m: any) => ({
          userId: m.user_id,
          username: m.user?.full_name || m.user?.username || 'Member',
          avatarUrl: m.user?.avatar_url,
          included: true,
          amount: 0,
        }))
      );
    }
  }, [selectedGroup]);

  const handleGroupChange = async (group: any) => {
    setShowGroupDropdown(false);
    try {
      const detailRes = await api.get(`/groups/${group.id}`);
      setSelectedGroup(detailRes.data);
    } catch (err) {
      console.error('Error fetching group details', err);
    }
  };

  const toggleParticipant = (userId: string) => {
    setParticipants(prev =>
      prev.map(p => p.userId === userId ? { ...p, included: !p.included } : p)
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setProofImage(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const includedParticipants = participants.filter(p => p.included);
  const rawAmount = getRawAmount();
  const equalShare = includedParticipants.length > 0 ? Math.floor(rawAmount / includedParticipants.length) : 0;
  const totalCustom = participants.reduce((s, p) => s + (p.included ? (p.amount || 0) : 0), 0);
  const remaining = rawAmount - totalCustom;
  const isBalanced = splitMode === 'EQUAL' || Math.abs(remaining) < 1;
  const canSave = !!selectedGroup && rawAmount > 0 && !!description.trim() && isBalanced && !loading;

  const handleSave = async () => {
    setError('');
    if (!selectedGroup) { setError('Vui lòng chọn nhóm'); return; }
    if (!rawAmount || rawAmount <= 0) { setError('Vui lòng nhập số tiền hợp lệ'); return; }
    if (!description.trim()) { setError('Vui lòng nhập nội dung chi tiêu'); return; }
    if (splitMode === 'CUSTOM' && !isBalanced) {
      setError(`Còn thiếu ${Math.abs(remaining).toLocaleString('vi-VN')}đ chưa được phân bổ`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn thêm khoản chi ${rawAmount.toLocaleString('vi-VN')}đ cho "${description.trim()}" không?`)) {
      return;
    }

    setLoading(true);
    try {
      const splitData = includedParticipants.map(p => ({
        user_id: p.userId,
        amount_owed: splitMode === 'EQUAL' ? equalShare : p.amount,
      }));

      const expenseRes = await api.post('/expenses', {
        group_id: selectedGroup.id,
        amount: rawAmount,
        description: description.trim(),
        split_type: splitMode,
        splits: splitData,
      });

      // Upload proof image if selected
      if (proofImage && expenseRes.data?.id) {
        try {
          const proofUrl = await uploadFile({
            type: 'expense_proof',
            file: proofImage,
            groupId: selectedGroup.id,
            expenseId: expenseRes.data.id,
          });
          await api.patch(`/expenses/${expenseRes.data.id}`, { proof_url: proofUrl });
        } catch (uploadErr) {
          console.error('Proof upload failed (non-fatal)', uploadErr);
          alert('Tạo chi tiêu thành công nhưng lỗi upload ảnh hóa đơn!');
        }
      }

      navigate(`/groups/${selectedGroup.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => {
            if (selectedGroup?.id || initialGroupId) {
              navigate(`/groups/${selectedGroup?.id || initialGroupId}`);
            } else {
              navigate(-1);
            }
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px', marginLeft: -8,
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Thêm Chi Tiêu
        </h1>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            backgroundColor: canSave ? 'var(--primary)' : 'var(--border)',
            color: canSave ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: canSave ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Lưu'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── AMOUNT CARD ── */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '20px 16px',
        }}>
          {/* Group picker */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, position: 'relative' }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Cùng với</span>
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                backgroundColor: 'var(--background)',
                borderRadius: 20,
                border: '1px solid var(--border)',
                fontWeight: 600, fontSize: 14,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {selectedGroup?.name || 'Chọn nhóm'}
              <ChevronDown size={14} color="var(--text-secondary)" />
            </button>

            {showGroupDropdown && (
              <div style={{
                position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: 'var(--surface)', borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid var(--border)', zIndex: 200,
                minWidth: 200, overflow: 'hidden',
              }}>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleGroupChange(g)}
                    style={{
                      display: 'block', width: '100%', padding: '12px 16px',
                      textAlign: 'left', fontSize: 14,
                      fontWeight: g.id === selectedGroup?.id ? 600 : 400,
                      color: g.id === selectedGroup?.id ? 'var(--primary)' : 'var(--text-primary)',
                      backgroundColor: g.id === selectedGroup?.id ? '#F0FDF4' : 'transparent',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount input */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => {
                const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                if (/^\d*$/.test(raw)) setAmount(raw ? Number(raw).toLocaleString('vi-VN') : '');
              }}
              placeholder="0"
              autoFocus
              style={{
                fontSize: 48, fontWeight: 700,
                color: 'var(--text-primary)',
                border: 'none', outline: 'none',
                background: 'transparent',
                textAlign: 'right',
                letterSpacing: '-1px',
                maxWidth: 260,
              }}
            />
            <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-secondary)' }}>đ</span>
          </div>

          {/* Description */}
          <input
            type="text"
            placeholder="Chi tiêu cho việc gì?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'var(--background)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              fontSize: 15, fontWeight: 500,
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          />
        </div>

        {/* ── PROOF UPLOAD ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <input type="file" id="proof-upload" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          <label
            htmlFor="proof-upload"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: '#F0FDF4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Camera size={20} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>
                {proofPreview ? 'Thay đổi ảnh' : 'Thêm ảnh hóa đơn'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Không bắt buộc</p>
            </div>
            {proofPreview && (
              <img src={proofPreview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            )}
          </label>
        </div>

        {/* ── SPLIT MODE TOGGLE ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '4px' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--background)', borderRadius: 12, padding: 4 }}>
            {(['EQUAL', 'CUSTOM'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSplitMode(mode)}
                style={{
                  flex: 1, padding: '10px',
                  borderRadius: 10,
                  backgroundColor: splitMode === mode ? 'var(--surface)' : 'transparent',
                  fontWeight: splitMode === mode ? 600 : 500,
                  fontSize: 14,
                  color: splitMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: splitMode === mode ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {mode === 'EQUAL' ? 'Chia đều' : 'Tùy chỉnh'}
              </button>
            ))}
          </div>
        </div>

        {/* ── PARTICIPANTS ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              THÀNH VIÊN THAM GIA
            </p>
          </div>

          {participants.map((p, idx) => {
            const isMe = p.userId === authUser?.id;
            const displayName = isMe ? 'Bạn' : p.username;
            const shareAmount = splitMode === 'EQUAL' ? (p.included ? equalShare : 0) : (p.amount || 0);

            return (
              <div
                key={p.userId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: idx < participants.length - 1 ? '1px solid var(--border)' : 'none',
                  backgroundColor: isMe ? '#F0FDF4' : 'var(--surface)',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  backgroundColor: isMe ? 'var(--primary)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, overflow: 'hidden',
                }}>
                  <img
                    src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.username}&background=${isMe ? '10B981' : 'E5E7EB'}&color=${isMe ? 'fff' : '374151'}&bold=true&size=80`}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: 'var(--text-primary)' }}>{displayName}</p>
                  {isMe && <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>Người trả tiền</p>}
                </div>

                {/* EQUAL: amount + toggle */}
                {splitMode === 'EQUAL' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600,
                      color: p.included ? 'var(--text-primary)' : 'var(--text-secondary)',
                      minWidth: 80, textAlign: 'right',
                    }}>
                      {shareAmount.toLocaleString('vi-VN')}đ
                    </span>
                    {!isMe && (
                      <button
                        onClick={() => toggleParticipant(p.userId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        {p.included
                          ? <ToggleRight size={32} color="var(--primary)" strokeWidth={1.5} />
                          : <ToggleLeft size={32} color="var(--border)" strokeWidth={1.5} />
                        }
                      </button>
                    )}
                  </div>
                ) : (
                  /* CUSTOM: editable */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.amount ? p.amount.toLocaleString('vi-VN') : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                        if (/^\d*$/.test(raw)) {
                          const val = Number(raw) || 0;
                          setParticipants(prev =>
                            prev.map(x => x.userId === p.userId ? { ...x, amount: val, included: val > 0 } : x)
                          );
                        }
                      }}
                      placeholder="0"
                      style={{
                        width: 100, textAlign: 'right',
                        border: `1px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 10, padding: '8px 10px',
                        fontWeight: 600, fontSize: 14,
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)', outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>đ</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom balance bar */}
          {splitMode === 'CUSTOM' && rawAmount > 0 && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: isBalanced ? '#F0FDF4' : '#FEF2F2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Đã phân bổ: {totalCustom.toLocaleString('vi-VN')}đ
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isBalanced ? 'var(--primary)' : '#EF4444' }}>
                {isBalanced ? '✓ Cân bằng' : `Còn: ${Math.abs(remaining).toLocaleString('vi-VN')}đ`}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            backgroundColor: '#FEF2F2', color: '#EF4444',
            fontWeight: 600, fontSize: 14,
            border: '1px solid #FECACA',
          }}>
            {error}
          </div>
        )}

        {/* ── SAVE BUTTON ── */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 14,
            backgroundColor: canSave ? 'var(--primary)' : 'var(--border)',
            color: canSave ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: 16,
            border: 'none', cursor: canSave ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            marginTop: 4,
          }}
        >
          {loading
            ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            : <><Check size={20} strokeWidth={2.5} /> Lưu Chi Tiêu</>
          }
        </button>
      </div>
    </div>
  );
};

export default AddExpense;
