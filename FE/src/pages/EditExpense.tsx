import React, { useState, useEffect } from 'react';
import { Camera, Check, ChevronDown, Loader2, ToggleLeft, ToggleRight, ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { uploadFile } from '../services/upload.service';

const EditExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [participants, setParticipants] = useState<any[]>([]);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [error, setError] = useState('');

  const getRawAmount = () => {
    const clean = amount.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean || '0');
  };

  // 1. Fetch existing expense
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const res = await api.get(`/expenses`); // We might need a specific endpoint, or find it in list. 
        // Actually, let's assume we can get it via a filter or just use a dedicated GET /expenses/:id if available.
        // Wait, does the backend have GET /expenses/:id? Let's check routes.
        // If not, I should add it.
        const allExpensesRes = await api.get('/expenses');
        const expense = allExpensesRes.data.find((e: any) => e.id === id);
        
        if (!expense) {
          setError('Không tìm thấy khoản chi này');
          setLoading(false);
          return;
        }

        if (expense.payer_id !== authUser?.id) {
          setError('Bạn không có quyền chỉnh sửa khoản chi này');
          setLoading(false);
          return;
        }

        // Set basic fields
        setAmount(Number(expense.amount).toLocaleString('vi-VN'));
        setDescription(expense.description || '');
        setSplitMode(expense.split_type);
        setProofPreview(expense.proof_url || '');

        // Fetch group details to get ALL members
        const groupRes = await api.get(`/groups/${expense.group_id}`);
        setSelectedGroup(groupRes.data);

        // Build participants list from group members
        const groupMembers = groupRes.data.members;
        const mappedParticipants = groupMembers.map((m: any) => {
          const existingSplit = expense.splits.find((s: any) => s.user_id === m.user_id);
          return {
            userId: m.user_id,
            username: m.user?.full_name || m.user?.username || 'Member',
            avatarUrl: m.user?.avatar_url,
            included: !!existingSplit,
            amount: existingSplit ? Number(existingSplit.amount_owed) : 0,
          };
        });
        setParticipants(mappedParticipants);
      } catch (err: any) {
        console.error('Error fetching expense details', err);
        setError('Lỗi khi tải thông tin khoản chi');
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [id, authUser?.id]);

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
  const canSave = !!selectedGroup && rawAmount > 0 && !!description.trim() && isBalanced && !saving;

  const handleSave = async () => {
    setError('');
    if (!rawAmount || rawAmount <= 0) { setError('Vui lòng nhập số tiền hợp lệ'); return; }
    if (!description.trim()) { setError('Vui lòng nhập nội dung chi tiêu'); return; }
    if (splitMode === 'CUSTOM' && !isBalanced) {
      setError(`Còn thiếu ${Math.abs(remaining).toLocaleString('vi-VN')}đ chưa được phân bổ`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn cập nhật khoản chi này không?`)) {
      return;
    }

    setSaving(true);
    try {
      const splitData = includedParticipants.map(p => ({
        user_id: p.userId,
        amount_owed: splitMode === 'EQUAL' ? equalShare : p.amount,
      }));

      // 1. Upload proof image if NEW file selected
      let finalProofUrl = proofPreview;
      if (proofImage) {
        try {
          finalProofUrl = await uploadFile({
            type: 'expense_proof',
            file: proofImage,
            groupId: selectedGroup.id,
            expenseId: id!,
          });
        } catch (uploadErr) {
          console.error('Proof upload failed', uploadErr);
          alert('Lỗi upload ảnh hóa đơn!');
        }
      }

      // 2. Update Expense
      await api.patch(`/expenses/${id}`, {
        amount: rawAmount,
        description: description.trim(),
        split_type: splitMode,
        splits: splitData,
        proof_url: finalProofUrl,
      });

      navigate(`/groups/${selectedGroup.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) return;
    setSaving(true);
    try {
      await api.delete(`/expenses/${id}`);
      navigate(`/groups/${selectedGroup.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Xóa thất bại');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--background)' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={40} />
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', height: '100vh',
      backgroundColor: 'var(--background)', color: 'var(--text-primary)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: -8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Sửa Chi Tiêu
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDelete}
            style={{ padding: '8px', borderRadius: 10, color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 16px', borderRadius: 10,
              backgroundColor: canSave ? 'var(--primary)' : 'var(--border)',
              color: canSave ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 14, border: 'none', cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Lưu'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {error && (
           <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: '#FEF2F2', color: '#EF4444', fontWeight: 600, fontSize: 14, border: '1px solid #FECACA' }}>
             {error}
           </div>
        )}

        {/* ── AMOUNT CARD ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 16px' }}>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Nhóm: <strong>{selectedGroup?.name}</strong>
          </p>

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
              style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-primary)', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', letterSpacing: '-1px', maxWidth: 260 }}
            />
            <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-secondary)' }}>đ</span>
          </div>

          <input
            type="text"
            placeholder="Chi tiêu cho việc gì?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--background)', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
          />
        </div>

        {/* ── PROOF UPLOAD ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <input type="file" id="proof-upload" hidden accept="image/*" onChange={handleFileChange} />
          <label htmlFor="proof-upload" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Camera size={20} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>{proofPreview ? 'Thay đổi ảnh' : 'Thêm ảnh hóa đơn'}</p>
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
                style={{ flex: 1, padding: '10px', borderRadius: 10, backgroundColor: splitMode === mode ? 'var(--surface)' : 'transparent', fontWeight: splitMode === mode ? 600 : 500, fontSize: 14, color: splitMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: splitMode === mode ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}
              >
                {mode === 'EQUAL' ? 'Chia đều' : 'Tùy chỉnh'}
              </button>
            ))}
          </div>
        </div>

        {/* ── PARTICIPANTS ── */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>THÀNH VIÊN THAM GIA</p>
          </div>

          {participants.map((p, idx) => {
            const isMe = p.userId === authUser?.id;
            const displayName = isMe ? 'Bạn' : p.username;
            const shareAmount = splitMode === 'EQUAL' ? (p.included ? equalShare : 0) : (p.amount || 0);

            return (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < participants.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: isMe ? '#F0FDF4' : 'var(--surface)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: isMe ? 'var(--primary)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.username}&background=${isMe ? '10B981' : 'E5E7EB'}&color=${isMe ? 'fff' : '374151'}&bold=true&size=80`} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: 'var(--text-primary)' }}>{displayName}</p>
                  {isMe && <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>Người trả tiền</p>}
                </div>

                {splitMode === 'EQUAL' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: p.included ? 'var(--text-primary)' : 'var(--text-secondary)', minWidth: 80, textAlign: 'right' }}>{shareAmount.toLocaleString('vi-VN')}đ</span>
                    {!isMe && (
                      <button onClick={() => toggleParticipant(p.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        {p.included ? <ToggleRight size={32} color="var(--primary)" strokeWidth={1.5} /> : <ToggleLeft size={32} color="var(--border)" strokeWidth={1.5} />}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="text" inputMode="numeric" value={p.amount ? p.amount.toLocaleString('vi-VN') : ''} onChange={e => {
                        const raw = e.target.value.replace(/\./g, '').replace(/,/g, '');
                        if (/^\d*$/.test(raw)) {
                          const val = Number(raw) || 0;
                          setParticipants(prev => prev.map(x => x.userId === p.userId ? { ...x, amount: val, included: val > 0 } : x));
                        }
                      }}
                      placeholder="0"
                      style={{ width: 100, textAlign: 'right', border: `1px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, padding: '8px 10px', fontWeight: 600, fontSize: 14, backgroundColor: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>đ</span>
                  </div>
                )}
              </div>
            );
          })}

          {splitMode === 'CUSTOM' && rawAmount > 0 && (
            <div style={{ padding: '12px 16px', backgroundColor: isBalanced ? '#F0FDF4' : '#FEF2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đã phân bổ: {totalCustom.toLocaleString('vi-VN')}đ</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isBalanced ? 'var(--primary)' : '#EF4444' }}>{isBalanced ? '✓ Cân bằng' : `Còn: ${Math.abs(remaining).toLocaleString('vi-VN')}đ`}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{ width: '100%', padding: '16px', borderRadius: 14, backgroundColor: canSave ? 'var(--primary)' : 'var(--border)', color: canSave ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: 16, border: 'none', cursor: canSave ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', marginTop: 4 }}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} strokeWidth={2.5} /> Cập nhật chi tiêu</>}
        </button>
      </div>
    </div>
  );
};

export default EditExpense;
