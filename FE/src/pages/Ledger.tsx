import { useState, useEffect } from 'react';
import { Bell, User, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../contexts/DialogContext';

const Ledger = () => {
  const [summary, setSummary] = useState({ total_balance: 0, total_lent: 0, total_borrowed: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dialog = useDialog();
  
  const { user: authUser } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [meRes, paymentRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/payments')
      ]);
      setSummary(meRes.data.summary);
      setPayments(paymentRes.data);
    } catch (err) {
      console.error("Error fetching ledger data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authUser]);

  const handleConfirmPayment = async (paymentId: string, amount: number, payerName: string) => {
    const isConfirmed = await dialog.confirm(`Bạn xác nhận ĐÃ NHẬN ĐƯỢC ${amount.toLocaleString('vi-VN')}đ từ ${payerName}?\nHành động này không thể hoàn tác.`);
    if (!isConfirmed) return;
    try {
      await api.patch(`/payments/${paymentId}/confirm`);
      fetchData();
    } catch (error) {
      dialog.alert({ message: 'Không thể xác nhận thanh toán. Vui lòng thử lại sau.', type: 'error' });
    }
  };

  const handleRejectPayment = async (paymentId: string, amount: number, payerName: string) => {
    const isConfirmed = await dialog.confirm(`Bạn CHƯA NHẬN ĐƯỢC tiền từ ${payerName} và muốn TỪ CHỐI giao dịch ${amount.toLocaleString('vi-VN')}đ này?`);
    if (!isConfirmed) return;
    try {
      await api.patch(`/payments/${paymentId}/reject`);
      fetchData();
    } catch (error) {
      dialog.alert({ message: 'Không thể từ chối thanh toán. Vui lòng thử lại sau.', type: 'error' });
    }
  };

  // Filter only pending payments
  const pendingPayments = payments.filter(p => p.status === 'PENDING');

  // Group by group name
  const paymentsByGroup = pendingPayments.reduce((acc: any, payment: any) => {
    const groupName = payment.group?.name || 'Chưa phân nhóm';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(payment);
    return acc;
  }, {});

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: 'var(--background)', 
      color: 'var(--text-primary)',
      overflow: 'hidden' 
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
        <div 
          onClick={() => navigate('/profile')}
          style={{ 
            width: 40, height: 40, borderRadius: '12px', overflow: 'hidden', 
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {authUser?.avatar_url ? (
            <img src={authUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <img src={`https://ui-avatars.com/api/?name=${authUser?.full_name || authUser?.username || 'User'}&background=10B981&color=fff`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        <h2 style={{ 
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--primary)',
          whiteSpace: 'nowrap'
        }}>
          Sổ cái & Thanh toán
        </h2>

        <button style={{ 
          width: 40, height: 40, borderRadius: '12px', 
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
        }}>
          <Bell size={20} fill="var(--primary)" fillOpacity={0.1} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 20px 100px 20px' }}>
        {/* Summary Overview */}
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          padding: '32px 24px', 
          borderRadius: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
          marginTop: 16,
          marginBottom: 32,
          textAlign: 'left'
        }}>
          <p style={{ 
            fontSize: 13, 
            fontWeight: 700, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            marginBottom: 8,
            margin: 0
          }}>
            Tổng số dư
          </p>
          <h1 style={{ 
            fontSize: 52, 
            fontWeight: 800, 
            margin: '4px 0 8px 0', 
            letterSpacing: '-2px',
            color: summary.total_balance >= 0 ? 'var(--primary)' : 'var(--negative)',
            lineHeight: 1
          }}>
            {Math.abs(summary.total_balance).toLocaleString()}đ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, margin: 0, opacity: 0.8 }}>
            {summary.total_balance >= 0 ? 'Tổng tiền người khác nợ bạn' : 'Tổng tiền bạn nợ người khác'}
          </p>
        </div>

        {/* Pending Payments Section */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ 
            fontSize: 13, 
            fontWeight: 700, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            margin: '0 0 16px 0' 
          }}>
            Các khoản chưa thanh toán
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Đang tải...</div>
          ) : Object.keys(paymentsByGroup).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Không có khoản thanh toán nào.
            </div>
          ) : (
            Object.entries(paymentsByGroup).map(([groupName, groupPayments]: [string, any]) => (
              <div key={groupName} style={{ marginBottom: 20 }}>
                <h5 style={{ 
                  fontSize: 15, 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  margin: '0 0 12px 0' 
                }}>
                  Nhóm: {groupName}
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {groupPayments.map((payment: any) => {
                    const isOwedToMe = payment.payee_id === authUser?.id;
                    const otherUser = isOwedToMe ? payment.payer : payment.payee;

                    return (
                      <div key={payment.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '16px 20px', 
                        borderRadius: 24, 
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        marginBottom: 4
                      }}>
                        {/* Participants */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {isOwedToMe ? (
                            <>
                              <div style={{ 
                                width: 38, height: 38, borderRadius: '50%', backgroundColor: '#f3f4f6', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                border: '1px solid var(--border)'
                              }}>
                                <User size={20} color="var(--text-muted)" />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 16 }}>{otherUser.full_name || otherUser.username}</span>
                              <ArrowRight size={16} color="var(--text-muted)" />
                              <span style={{ 
                                fontSize: 12, fontWeight: 700, color: 'var(--primary)', 
                                backgroundColor: 'var(--primary-light)', padding: '4px 12px', 
                                borderRadius: 100 
                              }}>
                                Bạn
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ 
                                fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', 
                                backgroundColor: '#f3f4f6', padding: '4px 12px', 
                                borderRadius: 100 
                              }}>
                                Bạn
                              </span>
                              <ArrowRight size={16} color="var(--text-muted)" />
                              <div style={{ 
                                width: 38, height: 38, borderRadius: '50%', backgroundColor: '#f3f4f6', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                border: '1px solid var(--border)'
                              }}>
                                <User size={20} color="var(--text-muted)" />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 16 }}>{otherUser.full_name || otherUser.username}</span>
                            </>
                          )}
                        </div>

                        {/* Amount and Action */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                          <span style={{ 
                            fontWeight: 800, 
                            fontSize: 18, 
                            color: isOwedToMe ? 'var(--primary)' : 'var(--negative)',
                            letterSpacing: '-0.5px'
                          }}>
                            {payment.amount.toLocaleString()}đ
                          </span>
                          
                          {isOwedToMe ? (
                            <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                              <button 
                                onClick={() => handleConfirmPayment(payment.id, payment.amount, otherUser.username)}
                                style={{
                                  padding: '8px 20px',
                                  borderRadius: 12,
                                  backgroundColor: 'var(--primary)',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: 14,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ✓ Đã nhận
                              </button>
                              <button 
                                onClick={() => handleRejectPayment(payment.id, payment.amount, otherUser.username)}
                                style={{
                                  padding: '8px 20px',
                                  borderRadius: 12,
                                  backgroundColor: '#FEF2F2',
                                  color: '#EF4444',
                                  fontWeight: 700,
                                  fontSize: 14,
                                  border: '1px solid #FECACA',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ✕ Từ chối
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                navigate(`/groups/${payment.group_id}/settle`);
                              }}
                              style={{
                                padding: '8px 20px',
                                borderRadius: 12,
                                backgroundColor: 'var(--surface)',
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: 14,
                                border: '1px solid var(--primary)',
                                cursor: 'pointer'
                              }}
                            >
                              Trả tiền
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Ledger;

