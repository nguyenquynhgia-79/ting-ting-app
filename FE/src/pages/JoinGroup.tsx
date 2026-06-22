import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, QrCode, Hash, Loader2, CheckCircle, ArrowRight, ScanLine, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

// ─── QR Scanner ───────────────────────────────────────────────────────────────
const QRScanner = ({ onDetected }: { onDetected: (code: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [cameraError, setCameraError] = useState('');
  const [ready, setReady] = useState(false);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const jsQR = (await import('jsqr')).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) { onDetected(code.data.trim()); return; }
        } catch { /* jsQR fallback */ }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDetected]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch {
        setCameraError('Không thể truy cập camera. Vui lòng cấp quyền và thử lại.');
      }
    };
    start();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [tick]);

  if (cameraError) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <QrCode size={24} color="#EF4444" />
        </div>
        <p style={{ color: '#EF4444', fontWeight: 600, fontSize: 14 }}>{cameraError}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' }}>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Overlay */}
      {ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', width: '62%', aspectRatio: '1', zIndex: 1 }}>
            {/* Corner brackets */}
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
            ].map((style, i) => (
              <div key={i} style={{
                position: 'absolute', width: 24, height: 24,
                borderStyle: 'solid', borderColor: '#10B981', borderWidth: 0,
                ...style,
              }} />
            ))}
            {/* Scan line */}
            <div style={{
              position: 'absolute', left: 4, right: 4, height: 2,
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px 2px rgba(16,185,129,0.5)',
              animation: 'scanLine 2s ease-in-out infinite',
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const JoinGroup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'code' | 'qr'>(
    (location.state?.tab as 'code' | 'qr') || 'code'
  );
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [scanningFile, setScanningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJoin = async (inviteCode: string) => {
    const trimmed = inviteCode.trim().toLowerCase();
    if (!trimmed) { setError('Vui lòng nhập mã nhóm'); return; }
    if (loading || success) return;

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/groups/join', { inviteCode: trimmed });
      setSuccess(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Mã không hợp lệ hoặc đã xảy ra lỗi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQRDetected = useCallback((raw: string) => {
    setCode(raw);
    setTab('code');
    handleJoin(raw);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningFile(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setError('Không thể xử lý ảnh');
            setScanningFile(false);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const jsQR = (await import('jsqr')).default;
            const decoded = jsQR(imageData.data, imageData.width, imageData.height);

            if (decoded?.data) {
              handleQRDetected(decoded.data.trim());
            } else {
              setError('Không tìm thấy mã QR trong ảnh này. Vui lòng thử ảnh khác.');
            }
          } catch (err) {
            console.error('QR Decode error:', err);
            setError('Lỗi khi đọc mã QR. Vui lòng thử lại.');
          }
          setScanningFile(false);
        };
        img.onerror = () => {
          setError('Không thể tải ảnh. Vui lòng thử lại.');
          setScanningFile(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Đã xảy ra lỗi khi chọn file.');
      setScanningFile(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--background)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'var(--text-primary)',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: -8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Tham gia nhóm
          </h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── SUCCESS ── */}
          {success ? (
            <div style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: '40px 20px', textAlign: 'center',
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                backgroundColor: '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={48} color="var(--primary)" strokeWidth={1.5} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Tham gia thành công!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                  Bạn đã gia nhập nhóm mới
                </p>
              </div>
              <button
                onClick={() => navigate('/groups')}
                style={{
                  marginTop: 8,
                  padding: '14px 32px',
                  borderRadius: 14,
                  backgroundColor: 'var(--primary)',
                  color: '#fff', fontWeight: 600, fontSize: 16,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                Xem danh sách nhóm <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <>
              {/* ── TAB SWITCHER ── */}
              <div style={{
                display: 'flex',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 4,
              }}>
                {([
                  { key: 'code', label: 'Nhập mã', icon: <Hash size={16} /> },
                  { key: 'qr', label: 'Quét QR', icon: <ScanLine size={16} /> },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); setError(''); }}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px',
                      borderRadius: 10,
                      backgroundColor: tab === t.key ? 'var(--primary)' : 'transparent',
                      fontWeight: 600, fontSize: 14,
                      color: tab === t.key ? '#fff' : 'var(--text-secondary)',
                      border: 'none', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: NHẬP MÃ ── */}
              {tab === 'code' && (
                <>
                  {/* Info card */}
                  <div style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 16, border: '1px solid var(--border)',
                    padding: '20px 16px', textAlign: 'center',
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      backgroundColor: '#F0FDF4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <Hash size={28} color="var(--primary)" />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Nhập mã mời nhóm
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
                      Hỏi trưởng nhóm để lấy mã 8 ký tự
                    </p>
                  </div>

                  {/* Code input */}
                  <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
                    <input
                      type="text"
                      value={code}
                      onChange={e => { setCode(e.target.value.toLowerCase()); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleJoin(code)}

                      maxLength={8}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: `1.5px solid ${error ? '#FECACA' : code.length === 8 ? 'var(--primary)' : 'var(--border)'}`,
                        fontSize: 20, fontWeight: 700,
                        letterSpacing: '6px', textAlign: 'center',
                        color: 'var(--text-primary)',
                        outline: 'none', backgroundColor: 'var(--background)',
                        boxSizing: 'border-box', transition: 'border-color 0.2s',
                      }}
                    />
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                      {code.length}/8 ký tự
                    </p>
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

                  {/* Submit */}
                  <button
                    onClick={() => handleJoin(code)}
                    disabled={loading || code.length === 0}
                    style={{
                      width: '100%', padding: '16px',
                      borderRadius: 14,
                      backgroundColor: code.length > 0 && !loading ? 'var(--primary)' : 'var(--border)',
                      color: code.length > 0 && !loading ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 16, border: 'none',
                      cursor: code.length > 0 && !loading ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    {loading
                      ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý...</>
                      : <>Tham gia nhóm <ArrowRight size={18} /></>
                    }
                  </button>
                </>
              )}

              {/* ── TAB: QUÉT QR ── */}
              {tab === 'qr' && (
                <>
                  <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', padding: 12 }}>
                    <QRScanner onDetected={handleQRDetected} />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={scanningFile}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 12,
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      cursor: scanningFile ? 'default' : 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    }}
                  >
                    {scanningFile ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                    {scanningFile ? 'Đang quét ảnh...' : 'Chọn ảnh từ thư viện'}
                  </button>

                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: 12, border: '1px solid var(--border)',
                  }}>
                    <ScanLine size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      Hướng camera vào mã QR hoặc tải ảnh từ thư viện để quét
                    </p>
                  </div>

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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default JoinGroup;
