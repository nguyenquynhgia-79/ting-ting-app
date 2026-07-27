import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, MoreVertical, Plus, Receipt, 
  CreditCard, Info, Clock, QrCode, Users, Copy, Check, Trash2, Camera, Loader2, X, Edit, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { uploadFile } from '../services/upload.service';
import { QRCodeSVG } from 'qrcode.react';
import TransferOwnershipModal from '../components/TransferOwnershipModal';
import { useDialog } from '../contexts/DialogContext';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const dialog = useDialog();
  
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'LEDGER'>('EXPENSES');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberIdentifier, setAddMemberIdentifier] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (!addMemberIdentifier.trim() || addMemberIdentifier.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/users/search?q=${addMemberIdentifier.trim()}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [addMemberIdentifier]);
  
  const handleCopyCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchGroupData = async () => {
    try {
      const [groupRes, expensesRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/expenses/group/${id}`)
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
    } catch (err) {
      console.error("Error fetching group details", err);
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.on('EXPENSE_UPDATED', (data) => {
      if (data.groupId === id) {
        console.log('Expense updated real-time:', data);
        fetchGroupData();
      }
    });

    socket.on('GROUP_UPDATED', (data) => {
      if (data.groupId === id) {
        console.log('Group info updated real-time:', data);
        if (data.type === 'DELETE') {
          dialog.alert('Nhóm này đã bị xóa bởi chủ nhóm.');
          navigate('/groups');
        } else {
          fetchGroupData();
        }
      }
    });

    return () => {
      socket.off('EXPENSE_UPDATED');
      socket.off('GROUP_UPDATED');
    };
  }, [socket, id]);

  const handleDeleteExpense = async (expenseId: string) => {
    const isConfirmed = await dialog.confirm("Bạn có chắc muốn xóa khoản chi này? Mọi chia sẻ sẽ được hoàn tác.");
    if (!isConfirmed) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      // Refresh data
      fetchGroupData();
    } catch (err: any) {
      console.error("Error deleting group", err);
      dialog.alert({ message: err?.response?.data?.message || "Xóa nhóm thất bại", type: 'error' });
    }
  };

  const handleRemindCreator = async (expenseId: string) => {
    const isConfirmed = await dialog.confirm("Bạn muốn gửi thông báo nhắc nhở người tạo kiểm tra lại khoản chi này?");
    if (!isConfirmed) return;
    try {
      await api.post(`/expenses/${expenseId}/remind`);
      dialog.alert({ message: "Đã gửi yêu cầu xem xét lại chi tiêu cho người tạo!", type: 'success' });
    } catch (err: any) {
      console.error("Error reminding creator", err);
      dialog.alert({ message: err?.response?.data?.message || "Gửi yêu cầu thất bại", type: 'error' });
    }
  };

  const handleDeleteGroup = async () => {
    // Check balance first
    const unsettled = group?.members?.filter((m: any) => Math.abs(Number(m.balance)) > 0.01) || [];
    if (unsettled.length > 0) {
      dialog.alert({ message: `Không thể xóa nhóm!\n\nVẫn còn ${unsettled.length} thành viên chưa tất toán nợ:\n${unsettled.map((m: any) => `• ${m.user?.username}: ${Number(m.balance).toLocaleString()}đ`).join('\n')}\n\nVui lòng giải quyết tất cả khoản nợ trước khi xóa nhóm.`, type: 'error' });
      return;
    }
    const isConfirmed = await dialog.confirm("Tất cả khoản nợ đã tất toán.\nBạn có chắc muốn XÓA NHÓM này không?\nNhóm sẽ bị lưu trữ và biến mất khỏi danh sách.");
    if (!isConfirmed) return;
    try {
      await api.delete(`/groups/${id}`);
      navigate('/groups');
    } catch (err: any) {
      dialog.alert({ message: err.response?.data?.message || "Xóa nhóm thất bại", type: 'error' });
    }
  };

  const handleLeaveGroup = async () => {
    // Check own balance first (client-side guard)
    const myMemberNow = group?.members?.find((m: any) => m.user_id === authUser?.id);
    const myBalNow = Number(myMemberNow?.balance || 0);

    if (Math.abs(myBalNow) > 0.01) {
      if (myBalNow < 0) {
        dialog.alert({ message: `Bạn chưa thể rời nhóm!\n\nBạn đang nợ nhóm ${Math.abs(myBalNow).toLocaleString()}đ.\nVui lòng thanh toán khoản nợ trước khi rời nhóm.`, type: 'error' });
      } else {
        dialog.alert({ message: `Bạn chưa thể rời nhóm!\n\nNhóm đang nợ bạn ${Math.abs(myBalNow).toLocaleString()}đ.\nVui lòng thu hồi khoản tiền trước khi rời nhóm.`, type: 'error' });
      }
      return;
    }

    // If creator and other members exist → show transfer modal for leaving
    const otherMembers = group?.members?.filter((m: any) => m.user_id !== authUser?.id) || [];
    if (group?.created_by === authUser?.id && otherMembers.length > 0) {
      setShowMenu(false);
      setTransferMode('LEAVE');
      return;
    }

    // Last member / normal member — confirm then leave
    const isLastMember = group?.members?.length <= 1;
    const confirmMsg = isLastMember
      ? 'Bạn là thành viên cuối cùng. Rời đi sẽ giải tán nhóm này. Bạn có chắc không?'
      : 'Bạn có chắc muốn rời khỏi nhóm này?\nLịch sử chi tiêu của bạn vẫn được lưu lại.';
    
    const isConfirmed = await dialog.confirm(confirmMsg);
    if (!isConfirmed) return;

    try {
      await api.delete(`/groups/${id}/leave`);
      navigate('/groups');
    } catch (err: any) {
      dialog.alert({ message: err.response?.data?.message || 'Rời nhóm thất bại', type: 'error' });
    }
  };

  const handleTransferSuccess = async () => {
    const mode = transferMode;
    setTransferMode(null);

    if (mode === 'LEAVE') {
      try {
        await api.delete(`/groups/${id}/leave`);
        navigate('/groups');
      } catch (err: any) {
        dialog.alert({ message: err.response?.data?.message || 'Rời nhóm thất bại sau khi chuyển quyền', type: 'error' });
      }
    } else {
      // Just fetch group data again if it's only a transfer
      fetchGroupData();
    }
  };

  const handleAddMemberSubmit = async (identifierToAdd?: string) => {
    const target = identifierToAdd || addMemberIdentifier;
    if (!target.trim()) return;
    setIsAddingMember(true);
    try {
      await api.post(`/groups/${id}/members/add`, { identifier: target.trim() });
      setAddMemberIdentifier('');
      setSearchResults([]);
      setShowAddMember(false);
      fetchGroupData();
      dialog.alert({ message: 'Thêm thành viên thành công!', type: 'success' });
    } catch (err: any) {
      dialog.alert({ message: err?.response?.data?.message || 'Thêm thành viên thất bại', type: 'error' });
    } finally {
      setIsAddingMember(false);
    }
  };


  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !group?.id) return;
    const file = e.target.files[0];
    setCoverPreview(URL.createObjectURL(file));
    setCoverUploading(true);
    try {
      const publicUrl = await uploadFile({ type: 'group_cover', file, groupId: group.id });
      await api.patch(`/groups/${group.id}/cover`, { coverUrl: publicUrl });
      setGroup((prev: any) => ({ ...prev, qr_code_url: publicUrl }));
    } catch (err) {
      console.error('Cover upload failed', err);
      dialog.alert({ message: 'Upload ảnh bìa thất bại', type: 'error' });
      setCoverPreview('');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    const isConfirmed = await dialog.confirm('Bạn có chắc muốn xóa ảnh bìa?');
    if (!isConfirmed) return;
    
    setCoverUploading(true);
    try {
      await api.patch(`/groups/${group.id}/cover`, { coverUrl: null });
      setGroup((prev: any) => ({ ...prev, qr_code_url: null }));
    } catch (err) {
      console.error('Remove cover failed', err);
      dialog.alert({ message: 'Xóa ảnh bìa thất bại', type: 'error' });
    } finally {
      setCoverUploading(false);
    }
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--background)' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );
  
  if (!group) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--background)', padding: 24, textAlign: 'center' }}>
      <Info size={48} color="var(--text-secondary)" style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Không tìm thấy nhóm</h2>
      <button onClick={() => navigate('/groups')} style={{ marginTop: 24, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none' }}>Quay lại danh sách</button>
    </div>
  );

  const myMember = group.members.find((m: any) => m.user_id === authUser?.id);
  const myBalance = Number(myMember?.balance || 0);

  const totalGroupSpending = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const mySpent = expenses
    .filter(exp => exp.payer_id === authUser?.id)
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: 'var(--background)', 
      color: 'var(--text-primary)',
      position: 'relative'
    }}>
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(16, 185, 129, 0.08)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <button 
          onClick={() => navigate('/groups')}
          style={{ 
            width: 38, height: 38, borderRadius: '12px', 
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            cursor: 'pointer'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        
        <h2 style={{ 
          fontSize: 18, fontWeight: 800, margin: 0, 
          color: 'var(--text-primary)', letterSpacing: '-0.5px' 
        }}>{group.name}</h2>

        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            style={{ 
              width: 38, height: 38, borderRadius: '12px', 
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
              cursor: 'pointer'
            }}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <>
              <div 
                onClick={() => setShowMenu(false)}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} 
              />
              <div style={{ 
                position: 'absolute', top: '120%', right: 0, 
                backgroundColor: '#fff', borderRadius: 16, 
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                minWidth: 180, zIndex: 1001, padding: '8px',
                border: '1px solid var(--border)',
                animation: 'slideUp 0.2s ease'
              }}>
                <button 
                  onClick={() => { setShowMenu(false); setShowQR(true); }}
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', borderRadius: 12, cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}
                >
                  <QrCode size={18} /> Mã QR nhóm
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 8px' }} />
                
                {group.created_by === authUser?.id ? (
                  // CREATOR MENU
                  <>
                    {/* Transfer Ownership – shown when other members exist */}
                    {group.members?.filter((m: any) => m.user_id !== authUser?.id).length > 0 && (
                      <>
                        <button
                          onClick={() => { setShowMenu(false); setTransferMode('TRANSFER'); }}
                          style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', borderRadius: 12, cursor: 'pointer', color: '#F59E0B', fontWeight: 600 }}
                        >
                          <span style={{ fontSize: 16 }}>👑</span>
                          Chuyển nhóm trưởng
                        </button>
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 8px' }} />
                      </>
                    )}

                    {/* Leave Group (creator) */}
                    {(() => {
                      const myMemberNow = group.members?.find((m: any) => m.user_id === authUser?.id);
                      const myBalNow = Number(myMemberNow?.balance || 0);
                      const canLeave = Math.abs(myBalNow) <= 0.01;
                      const isLastMember = group.members?.filter((m: any) => m.user_id !== authUser?.id).length === 0;
                      return (
                        <button
                          onClick={() => { setShowMenu(false); handleLeaveGroup(); }}
                          title={!canLeave ? `Số dư của bạn: ${myBalNow.toLocaleString()}đ` : ''}
                          style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', borderRadius: 12, cursor: 'pointer', color: canLeave ? '#ef4444' : '#9CA3AF', fontWeight: 600 }}
                        >
                          <X size={18} />
                          {isLastMember ? 'Giải tán nhóm' : 'Rời nhóm'}
                          {!canLeave && <span style={{ fontSize: 11, marginLeft: 'auto', color: '#F59E0B' }}>⚠️ {myBalNow > 0 ? 'chưa thu' : 'còn nợ'}</span>}
                        </button>
                      );
                    })()}

                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 8px' }} />

                    {/* Delete Group */}
                    {(() => {
                      const unsettled = group.members?.filter((m: any) => Math.abs(Number(m.balance)) > 0.01) || [];
                      const canDelete = unsettled.length === 0;
                      return (
                        <button
                          onClick={() => { setShowMenu(false); handleDeleteGroup(); }}
                          title={!canDelete ? `Còn ${unsettled.length} thành viên chưa tất toán` : ''}
                          style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', borderRadius: 12, cursor: 'pointer', color: canDelete ? '#ef4444' : '#9CA3AF', fontWeight: 600 }}
                        >
                          <Trash2 size={18} />
                          Xóa nhóm
                          {!canDelete && <span style={{ fontSize: 11, marginLeft: 'auto', color: '#F59E0B' }}>⚠️ còn nợ</span>}
                        </button>
                      );
                    })()}
                  </>
                ) : (
                  // MEMBER: LEAVE GROUP button
                  (() => {
                    const myMemberNow = group.members?.find((m: any) => m.user_id === authUser?.id);
                    const myBalNow = Number(myMemberNow?.balance || 0);
                    const canLeave = Math.abs(myBalNow) <= 0.01;
                    return (
                      <button 
                        onClick={() => { setShowMenu(false); handleLeaveGroup(); }}
                        title={!canLeave ? `Số dư của bạn: ${myBalNow.toLocaleString()}đ` : ''}
                        style={{ 
                          width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 10, 
                          border: 'none', background: 'none', borderRadius: 12, cursor: 'pointer', 
                          color: canLeave ? '#ef4444' : '#9CA3AF', fontWeight: 600 
                        }}
                      >
                        <X size={18} /> 
                        Rời nhóm
                        {!canLeave && <span style={{ fontSize: 11, marginLeft: 'auto', color: '#F59E0B' }}>⚠️ {myBalNow > 0 ? 'chưa thu' : 'còn nợ'}</span>}
                      </button>
                    );
                  })()
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {/* Group Cover Hero Section */}
        <div style={{ position: 'relative', width: '100%', height: 180, backgroundColor: 'var(--primary-light)' }}>
          { (group.qr_code_url || coverPreview) ? (
            <img 
              src={coverPreview || group.qr_code_url} 
              alt="Group Cover" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', opacity: 0.5 }}>
              <Users size={64} strokeWidth={1} />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)', zIndex: 1 }} />
          
          {group.created_by === authUser?.id && (
            <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2, display: 'flex', gap: 8 }}>
              {group.qr_code_url && !coverPreview && (
                <button 
                  onClick={handleRemoveCover}
                  disabled={coverUploading}
                  style={{ 
                    width: 36, height: 36, borderRadius: 10, 
                    backgroundColor: 'rgba(239, 68, 68, 0.9)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: 'white', border: 'none', cursor: coverUploading ? 'default' : 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <input type="file" id="cover-upload" hidden accept="image/*" onChange={handleCoverChange} disabled={coverUploading} />
              <label 
                htmlFor="cover-upload"
                style={{ 
                  width: 36, height: 36, borderRadius: 10, 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  color: 'var(--primary)', cursor: coverUploading ? 'default' : 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {coverUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </label>
            </div>
          )}
          
          {/* Group Name Overlay */}
          <div style={{ position: 'absolute', bottom: 16, left: 20, zIndex: 2 }}>
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{group.name}</h1>
          </div>
        </div>

        {/* Balance Summary Card */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ 
            backgroundColor: '#fff',
            borderRadius: 24, padding: '24px', 
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Số dư trong nhóm</p>
            <h3 style={{ 
              fontSize: 32, fontWeight: 800, margin: 0,
              color: myBalance >= 0 ? 'var(--positive)' : 'var(--negative)'
            }}>
              {myBalance > 0 ? '+' : ''}{myBalance.toLocaleString()}đ
            </h3>
            
            <div style={{ 
              marginTop: 16, 
              padding: '6px 12px', 
              borderRadius: 12, 
              backgroundColor: myBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: myBalance >= 0 ? 'var(--positive)' : 'var(--negative)',
              fontSize: 12, fontWeight: 700
            }}>
              {myBalance > 0 ? 'Bạn được nhận' : myBalance < 0 ? 'Bạn đang nợ' : 'Bạn đã hòa vốn'}
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 24 }}>
              <button 
                onClick={() => navigate(`/groups/${id}/settle`)}
                style={{ 
                  flex: 1, backgroundColor: 'var(--primary)', color: '#fff', 
                  padding: '14px', borderRadius: 16,
                  fontWeight: 700, fontSize: 15, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={18} />
                Thanh toán
              </button>
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div style={{ 
          margin: '24px 20px 20px', padding: 4, borderRadius: 16,
          backgroundColor: '#E5E7EB',
          display: 'flex'
        }}>
          <button 
            onClick={() => setActiveTab('EXPENSES')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              backgroundColor: activeTab === 'EXPENSES' ? '#fff' : 'transparent',
              color: activeTab === 'EXPENSES' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', transition: 'all 0.2s ease',
              boxShadow: activeTab === 'EXPENSES' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Hoạt động
          </button>
          <button 
            onClick={() => setActiveTab('LEDGER')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              backgroundColor: activeTab === 'LEDGER' ? '#fff' : 'transparent',
              color: activeTab === 'LEDGER' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', transition: 'all 0.2s ease',
              boxShadow: activeTab === 'LEDGER' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Sổ cái
          </button>
        </div>

        {/* Content List */}
        {/* Group Summary Card */}
        <div style={{
          margin: '0 16px 20px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
          borderRadius: '24px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 12px 24px -8px rgba(16, 185, 129, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Decorative Circles */}
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(30px)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Tổng chi tiêu nhóm</p>
              <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
                {totalGroupSpending.toLocaleString('vi-VN')}đ
              </h2>
            </div>
            <div 
              onClick={() => setShowQR(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                padding: '10px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <QrCode size={24} />
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.1)',
            padding: '16px',
            borderRadius: '18px',
            marginBottom: '20px'
          }}>
            <div>
              <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Bạn đã chi</p>
              <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {mySpent.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '12px' }}>
              <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{myBalance >= 0 ? 'Bạn sẽ nhận' : 'Bạn cần trả'}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: myBalance >= 0 ? '#34D399' : '#F87171' }}>
                {Math.abs(myBalance).toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(255, 255, 255, 0.15)', 
              padding: '6px 12px', 
              borderRadius: '20px',
              fontSize: '13px'
            }}>
              <Users size={14} />
              <span>{group.members.length} thành viên</span>
            </div>
            <div 
              onClick={() => setShowAddMember(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'rgba(255, 255, 255, 0.25)', 
                padding: '6px 12px', 
                borderRadius: '20px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Plus size={14} />
              <span>Thêm</span>
            </div>
            <div 
              onClick={handleCopyCode}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'rgba(255, 255, 255, 0.15)', 
                padding: '6px 12px', 
                borderRadius: '20px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Copy size={14} />
              <span>{group.invite_code}</span>
              {copied && <Check size={14} style={{ color: '#34D399' }} />}
            </div>
          </div>
        </div>

        {/* QR Code Modal Overlay */}
        {showQR && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '20px'
            }}
            onClick={() => setShowQR(false)}
          >
            <div 
              style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '32px',
                textAlign: 'center',
                maxWidth: '90%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Mã QR Nhóm</h3>
              <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>Quét để tham gia nhóm <br/><strong>{group.name}</strong></p>
              
              <div style={{
                background: '#F9FAFB',
                padding: '16px',
                borderRadius: '20px',
                marginBottom: '24px'
              }}>
                <QRCodeSVG 
                  value={group.invite_code || ""} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: '#ECFDF5',
                  padding: '12px',
                  borderRadius: '16px',
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: '18px',
                  letterSpacing: '2px'
                }}>
                  {group.invite_code}
                </div>
                <button 
                  onClick={() => setShowQR(false)}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal Overlay */}
        {showAddMember && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '20px'
            }}
            onClick={() => setShowAddMember(false)}
          >
            <div 
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '360px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Thêm thành viên</h3>
                <button onClick={() => setShowAddMember(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Nhập Username hoặc Email của người bạn muốn thêm vào nhóm này.
              </p>
              
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập, email hoặc SĐT..."
                  value={addMemberIdentifier}
                  onChange={(e) => setAddMemberIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                
                {isSearching && (
                  <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                    <Loader2 size={16} className="animate-spin" color="var(--text-secondary)" />
                  </div>
                )}
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
                    backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 10
                  }}>
                    {searchResults.map(user => (
                      <div 
                        key={user.id}
                        onClick={() => handleAddMemberSubmit(user.username)}
                        style={{
                          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                          borderBottom: '1px solid var(--border)', cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={`https://ui-avatars.com/api/?name=${user.username}&background=E5E7EB&color=374151&bold=true&size=64`} alt={user.username} style={{ width: '100%', height: '100%' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                            {user.email && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</p>}
                            {user.phone_number && (
                              <>
                                <span style={{ fontSize: 10, color: 'var(--border)' }}>•</span>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{user.phone_number}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <button style={{ 
                            background: 'none', border: 'none', padding: '4px 12px', borderRadius: 20, 
                            backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
                            fontWeight: 700, fontSize: 12, cursor: 'pointer' 
                          }}>
                            Thêm
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleAddMemberSubmit()}
                disabled={isAddingMember || !addMemberIdentifier.trim()}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: (isAddingMember || !addMemberIdentifier.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isAddingMember || !addMemberIdentifier.trim()) ? 0.7 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isAddingMember && <Loader2 size={16} className="animate-spin" />}
                Thêm vào nhóm
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          {activeTab === 'EXPENSES' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {expenses.map((exp) => (
                <div 
                  key={exp.id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 16, 
                    padding: '16px', borderRadius: 20, 
                    backgroundColor: '#fff',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div 
                    onClick={() => setSelectedExpense(exp)}
                    style={{ 
                      width: 48, height: 48, borderRadius: 14, 
                      backgroundColor: exp.proof_url ? 'var(--primary-light)' : 'var(--background)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: exp.proof_url ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: exp.proof_url ? 'pointer' : 'default',
                      overflow: 'hidden'
                    }}
                  >
                    {exp.proof_url ? (
                      <img src={exp.proof_url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Receipt size={24} />
                    )}
                  </div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedExpense(exp)}>
                    <h4 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>{exp.description || 'Chi phí'}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {exp.payer.username === authUser?.username ? 'Bạn' : exp.payer.username}
                      </span> trả {Number(exp.amount).toLocaleString()}đ
                      {exp.proof_url && <Camera size={14} style={{ color: 'var(--primary)', opacity: 0.7 }} />}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <p style={{ 
                      fontWeight: 700, fontSize: 15, margin: '0 0 4px',
                      color: exp.payer_id === authUser?.id ? 'var(--positive)' : 'var(--negative)'
                    }}>
                      {exp.payer_id === authUser?.id ? '+' : '-'}{Number(exp.amount / group.members.length).toLocaleString()}đ
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {new Date(exp.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                      {exp.payer_id === authUser?.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/expenses/${exp.id}/edit`); }}
                            style={{ background: '#F3F4F6', border: 'none', padding: '6px', borderRadius: 8, cursor: 'pointer', color: 'var(--primary)' }}
                            title="Sửa chi phí"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id); }}
                            style={{ background: '#FEF2F2', border: 'none', padding: '6px', borderRadius: 8, cursor: 'pointer', color: '#EF4444' }}
                            title="Xóa chi phí"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemindCreator(exp.id); }}
                          style={{ background: '#FFF7ED', border: 'none', padding: '6px', borderRadius: 8, cursor: 'pointer', color: '#F59E0B' }}
                          title="Yêu cầu xem xét lại"
                        >
                          <AlertCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#fff', borderRadius: 24, border: '1px dashed var(--border)' }}>
                  <Clock size={48} color="var(--border)" style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có hoạt động nào</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.members.map((member: any) => (
                <div key={member.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  border: '1px solid #F3F4F6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6'
                    }}>
                      <img 
                        src={member.user.avatar_url || `https://ui-avatars.com/api/?name=${member.user.full_name || member.user.username}&background=10B981&color=fff&bold=true`} 
                        alt="Avt" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>
                        {member.user_id === authUser?.id ? 'Bạn' : (member.user.full_name || member.user.username)}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                        {member.role === 'ADMIN' ? 'Trưởng nhóm' : 'Thành viên'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      fontWeight: 700, 
                      margin: 0, 
                      color: Number(member.balance) >= 0 ? '#10B981' : '#EF4444' 
                    }}>
                      {Number(member.balance) > 0 ? '+' : ''}
                      {Number(member.balance).toLocaleString('vi-VN')}đ
                    </p>
                    <p style={{ 
                      fontSize: '11px', 
                      fontWeight: 600,
                      color: '#9CA3AF', 
                      margin: 0,
                      textTransform: 'uppercase'
                    }}>
                      {Number(member.balance) > 0 ? 'Được nhận' : Number(member.balance) < 0 ? 'Phải trả' : 'Đã xong'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense Proof Modal */}
      {selectedExpense && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100,
            padding: '20px'
          }}
          onClick={() => setSelectedExpense(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: 'white',
              borderRadius: '32px',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{selectedExpense.description}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 15, color: 'var(--primary)', fontWeight: 700 }}>{Number(selectedExpense.amount).toLocaleString()}đ</p>
                </div>
              <button 
                onClick={() => setSelectedExpense(null)}
                style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--background)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ maxHeight: '65vh', overflowY: 'auto', backgroundColor: '#fff' }}>
              {selectedExpense.proof_url && (
                <div style={{ padding: '16px 24px 8px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hình ảnh minh họa</p>
                  <img 
                    src={selectedExpense.proof_url} 
                    alt="Proof" 
                    style={{ width: '100%', borderRadius: '16px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  />
                </div>
              )}

              <div style={{ padding: '16px 24px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết chia tiền</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedExpense.splits.map((split: any) => {
                    // Check if user is still a member of the group
                    const isStillMember = group.members.some((m: any) => m.user_id === split.user_id);
                    return (
                      <div key={split.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isStillMember ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {split.user.avatar_url ? (
                            <img 
                              src={split.user.avatar_url} 
                              alt={split.user.username} 
                              style={{ width: 32, height: 32, borderRadius: '10px', objectFit: 'cover', filter: isStillMember ? 'none' : 'grayscale(100%)' }} 
                            />
                          ) : (
                            <div style={{ 
                              width: 32, height: 32, borderRadius: '10px', 
                              backgroundColor: isStillMember ? 'var(--primary-light)' : '#E5E7EB',
                              color: isStillMember ? 'var(--primary)' : '#9CA3AF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700
                            }}>
                              {split.user.username[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{ 
                            fontSize: 15, 
                            fontWeight: split.user_id === selectedExpense.payer_id ? 700 : 500,
                            color: isStillMember 
                              ? (split.user_id === selectedExpense.payer_id ? 'var(--primary)' : 'var(--text-primary)')
                              : '#9CA3AF'
                          }}>
                            {split.user.username === authUser?.username ? 'Bạn' : split.user.username}
                            {split.user_id === selectedExpense.payer_id && <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>(Người trả)</span>}
                            {!isStillMember && <span style={{ fontSize: 11, marginLeft: 6, fontStyle: 'italic' }}>(Đã rời nhóm)</span>}
                          </span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: isStillMember ? 'var(--text-primary)' : '#9CA3AF' }}>
                          {Number(split.amount_owed).toLocaleString()}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 20px', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Được trả bởi <strong>{selectedExpense.payer.username}</strong> vào {new Date(selectedExpense.created_at).toLocaleString('vi-VN')}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedExpense.payer_id === authUser?.id ? (
                  <>
                    <button 
                      onClick={() => navigate(`/expenses/${selectedExpense.id}/edit`)}
                      style={{ 
                        padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
                        border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        fontSize: 13, fontWeight: 700
                      }}
                    >
                      <Edit size={14} />
                      Chỉnh sửa
                    </button>
                    <button 
                      onClick={() => handleDeleteExpense(selectedExpense.id)}
                      style={{ 
                        padding: '8px 16px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#EF4444', 
                        border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        fontSize: 13, fontWeight: 700
                      }}
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleRemindCreator(selectedExpense.id)}
                    style={{ 
                      padding: '8px 16px', borderRadius: '10px', backgroundColor: '#FFF7ED', color: '#F59E0B', 
                      border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700
                    }}
                  >
                    <AlertCircle size={14} />
                    Xem xét lại
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Expense Button */}
      <button 
        onClick={() => navigate('/add-expense', { state: { groupId: group.id } })}
        style={{ 
          position: 'fixed', bottom: 32, right: 24, 
          height: 56, padding: '0 24px', borderRadius: 28,
          backgroundColor: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)', zIndex: 110,
          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15
        }}
      >
        <Plus size={24} />
        Thêm khoản chi
      </button>

      {/* Transfer Ownership Modal */}
      {transferMode && group && (
        <TransferOwnershipModal
          groupId={group.id}
          groupName={group.name}
          members={group.members.filter((m: any) => m.user_id !== authUser?.id)}
          onSuccess={handleTransferSuccess}
          onClose={() => setTransferMode(null)}
          isLeaving={transferMode === 'LEAVE'}
        />
      )}
    </div>
  );
};

export default GroupDetails;

