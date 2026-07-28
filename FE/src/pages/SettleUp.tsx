import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, ArrowRight, User, Loader2, Wallet, Bell, CheckCircle, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useDialog } from '../contexts/DialogContext';

const SettleUp = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const dialog = useDialog();
  
  const [debts, setDebts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showPending, setShowPending] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [debtsRes, groupRes, paymentsRes] = await Promise.all([
        api.get(`/payments/group/${groupId}/debts`),
        api.get(`/groups/${groupId}`),
        api.get(`/payments/group/${groupId}/history`)
      ]);
      setDebts(debtsRes.data);
      setGroupName(groupRes.data.name);
      setMembers(groupRes.data.members || []);
      setPayments(paymentsRes.data);
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const handleSettle = async () => {
    if (!selectedDebt || !amount) return;
    const isConfirmed = await dialog.confirm(`Bạn có chắc chắn muốn xác nhận đã chuyển khoản ${parseFloat(amount).toLocaleString('vi-VN')}đ cho ${selectedDebt.to_account_name || selectedDebt.to_name}?`);
    if (!isConfirmed) return;
    
    setSubmitting(true);
    try {
      await api.post('/payments', {
        group_id: groupId,
        payee_id: selectedDebt.to,
        amount: parseFloat(amount)
      });
      // Tải lại dữ liệu thay vì quay về trang trước
      await fetchData();
      setSelectedDebt(null);
      setAmount('');
    } catch (err) {
      console.error("Error settling debt", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    const isConfirmed = await dialog.confirm("Bạn xác nhận ĐÃ NHẬN ĐƯỢC tiền cho giao dịch này? Hành động này không thể hoàn tác.");
    if (!isConfirmed) return;
    try {
      await api.patch(`/payments/${paymentId}/confirm`);
      fetchData();
    } catch (err) {
      console.error("Error confirming payment", err);
      dialog.alert({ message: "Xác nhận thất bại", type: 'error' });
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const isConfirmed = await dialog.confirm("Bạn CHƯA NHẬN ĐƯỢC tiền và muốn TỪ CHỐI giao dịch này?");
    if (!isConfirmed) return;
    try {
      await api.patch(`/payments/${paymentId}/reject`);
      fetchData();
    } catch (err) {
      console.error("Error rejecting payment", err);
      dialog.alert({ message: "Từ chối thất bại", type: 'error' });
    }
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', height: '100vh' }}>
      <Loader2 className="animate-spin" color="#10B981" size={40} />
    </div>
  );

  const myDebts = debts.filter(d => d.from === authUser?.id);
  const totalOwed = myDebts.reduce((acc, d) => acc + d.amount, 0);

  const pendingIncoming = payments.filter(p => p.payee_id === authUser?.id && p.status === 'PENDING');

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#F9FAFB',
      color: '#111827',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 20px', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #F3F4F6',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#F3F4F6', border: 'none',
              color: '#111827', cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
            {authUser?.avatar_url ? (
              <img src={authUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <User size={20} />
              </div>
            )}
          </div>
        </div>
        
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#047857' }}>Sổ cái & Thanh toán</h2>
        
        <button 
          onClick={() => setShowPending(!showPending)}
          style={{ border: 'none', background: 'none', color: '#10B981', cursor: 'pointer', position: 'relative' }}
        >
          <Bell size={24} />
          {pendingIncoming.length > 0 && (
            <div style={{
              position: 'absolute', top: -2, right: -2, width: 10, height: 10,
              backgroundColor: '#EF4444', borderRadius: '50%', border: '2px solid #fff'
            }} />
          )}
        </button>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Summary Card */}
        <div style={{ 
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: '24px',
          marginBottom: 24,
          border: '1px solid #F3F4F6',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Tổng số dư</p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#10B981', margin: 0, letterSpacing: '-1px' }}>
            {totalOwed > 0 ? '-' : ''}{totalOwed.toLocaleString()}đ
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8, fontWeight: 500 }}>
            {totalOwed > 0 ? 'Tổng tiền bạn cần trả trong nhóm' : 'Bạn đã thanh toán hết'}
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            CÁC KHOẢN CHƯA THANH TOÁN
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4B5563', marginBottom: 16 }}>
            Nhóm: {groupName}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {myDebts.map((debt, index) => {
              const isSelected = selectedDebt === debt;
              const hasPending = payments.some(p => p.payer_id === authUser?.id && p.payee_id === debt.to && p.status === 'PENDING');
              
              return (
                <div 
                  key={index} 
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderRadius: 24,
                    padding: '20px',
                    border: isSelected ? '2px solid #10B981' : '1px solid #F3F4F6',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.2s',
                    opacity: hasPending ? 0.8 : 1
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ backgroundColor: '#F3F4F6', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Bạn</div>
                      <ArrowRight size={16} color="#9CA3AF" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <User size={18} color="#6B7280" />
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{debt.to_name}</span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#EF4444' }}>
                      {debt.amount.toLocaleString()}đ
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {hasPending ? (
                      <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
                        ⏳ Đang chờ người nhận xác nhận...
                      </span>
                    ) : <span />}
                    <button 
                      onClick={() => {
                        setSelectedDebt(debt);
                        setAmount(debt.amount.toString());
                      }}
                      disabled={hasPending}
                      style={{ 
                        padding: '8px 24px', borderRadius: 12, 
                        border: hasPending ? '1px solid #E5E7EB' : '1px solid #10B981',
                        backgroundColor: hasPending ? '#F3F4F6' : (isSelected ? '#10B981' : 'transparent'),
                        color: hasPending ? '#9CA3AF' : (isSelected ? 'white' : '#10B981'),
                        fontSize: 14, fontWeight: 700, 
                        cursor: hasPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {hasPending ? 'Chờ xác nhận' : (isSelected ? 'Đang chọn' : 'Trả tiền')}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {myDebts.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: 24, 
                border: '1px dashed #E5E7EB' 
              }}>
                <div style={{ 
                  width: 56, height: 56, borderRadius: '50%', backgroundColor: '#ECFDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981',
                  margin: '0 auto 16px'
                }}>
                  <Check size={28} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: '#111827' }}>Tuyệt vời!</h3>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Bạn không có khoản nợ nào cần trả.</p>
              </div>
            )}
          </div>
        </div>

        {selectedDebt && (
          <div className="animate-in" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              XÁC NHẬN SỐ TIỀN TRẢ
            </p>
            
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: 24, 
              padding: '24px', 
              textAlign: 'center', 
              border: '1px solid #F3F4F6' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ 
                    fontSize: 36, fontWeight: 800, border: 'none', outline: 'none', 
                    width: 'auto', minWidth: '120px', textAlign: 'center', backgroundColor: 'transparent',
                    color: '#10B981', letterSpacing: '-1px'
                  }}
                />
                <span style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>đ</span>
              </div>
            </div>

            {selectedDebt.to_bank_name && selectedDebt.to_account_number && (
              <div style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: 24, 
                padding: '24px', 
                border: '1px solid #F3F4F6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#4B5563', margin: 0, width: '100%', textAlign: 'center' }}>
                  Thông tin chuyển khoản
                </p>
                <img 
                  src={`https://img.vietqr.io/image/${selectedDebt.to_bank_name}-${selectedDebt.to_account_number}-compact2.png?amount=${amount}&addInfo=Thanh toan nhom ${groupName}&accountName=${selectedDebt.to_account_name || selectedDebt.to_name}`} 
                  alt="VietQR" 
                  style={{ width: '200px', height: '200px', objectFit: 'contain', borderRadius: 12, border: '1px solid #E5E7EB' }}
                />
                <div style={{ width: '100%', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Ngân hàng:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedDebt.to_bank_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Số tài khoản:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedDebt.to_account_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Chủ tài khoản:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedDebt.to_account_name || selectedDebt.to_name}</span>
                  </div>
                </div>
              </div>
            )}
            {!selectedDebt.to_bank_name && (
              <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: 12, border: '1px solid #FDE68A' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#92400E', textAlign: 'center' }}>
                  Thành viên này chưa thiết lập thông tin ngân hàng. Vui lòng liên hệ trực tiếp để thanh toán.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDebt && (
        <div style={{ 
          padding: '20px 20px 32px 20px', 
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F3F4F6'
        }}>
          <button 
            onClick={handleSettle}
            disabled={submitting || !amount}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: 16, 
              fontSize: 16, 
              fontWeight: 700,
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 12,
              cursor: submitting ? 'default' : 'pointer',
              opacity: (submitting || !amount) ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Wallet size={20} />
                Xác nhận đã trả tiền
              </>
            )}
          </button>
        </div>
      )}
      {/* Pending Approvals Modal */}
      {showPending && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Chờ bạn xác nhận</h3>
              <button onClick={() => setShowPending(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={24} />
              </button>
            </div>
            
            {pendingIncoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 12px', color: '#10B981', opacity: 0.5 }} />
                <p>Không có giao dịch nào chờ xác nhận</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingIncoming.map(p => (
                  <div key={p.id} style={{ 
                    backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16,
                    border: '1px solid #E5E7EB'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Người trả</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                          {members.find(m => m.user.id === p.payer_id)?.user.name || 'Người dùng'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Số tiền</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#10B981' }}>
                          {p.amount.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleConfirmPayment(p.id)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8,
                          backgroundColor: '#10B981', color: 'white', fontWeight: 600,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        <Check size={18} /> Đã nhận
                      </button>
                      <button 
                        onClick={() => handleRejectPayment(p.id)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8,
                          backgroundColor: '#EF4444', color: 'white', fontWeight: 600,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        <X size={18} /> Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SettleUp;

