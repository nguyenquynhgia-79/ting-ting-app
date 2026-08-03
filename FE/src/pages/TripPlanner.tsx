import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripService } from '../services/trip.service';
import { Loader2, ChevronLeft } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { LocationPicker } from '../components/LocationPicker';

export const TripPlanner: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationLat, setDestinationLat] = useState<number | undefined>(undefined);
  const [destinationLng, setDestinationLng] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'AI' | 'MANUAL' | null>(null);

  // AI Preferences
  const [numPeople, setNumPeople] = useState(4);
  const [budget, setBudget] = useState(2000000);
  const [preferencesList, setPreferencesList] = useState<string[]>(['Ẩm thực địa phương']);
  const [transportMode, setTransportMode] = useState<string>('Xe máy');
  const [radius, setRadius] = useState<number>(5);

  const PREFERENCE_OPTIONS = [
    { id: 'Ẩm thực địa phương', icon: '🍜', label: 'Ẩm thực địa phương' },
    { id: 'Cà phê view đẹp', icon: '☕', label: 'Cà phê view đẹp' },
    { id: 'Thiên nhiên/Trekking', icon: '🌿', label: 'Thiên nhiên/Trekking' },
    { id: 'Mua sắm', icon: '🛍️', label: 'Mua sắm' },
    { id: 'Văn hóa/Lịch sử', icon: '🏛️', label: 'Văn hóa/Lịch sử' },
    { id: 'Về đêm/Bar', icon: '🌙', label: 'Về đêm/Bar' },
  ];
  const TRANSPORT_OPTIONS = [
    { id: 'Đi bộ', icon: '🚶' },
    { id: 'Xe máy', icon: '🛵' },
    { id: 'Grab/Taxi', icon: '🚗' },
  ];
  const RADIUS_OPTIONS = [2, 5, 10, 20];

  const handleCreateTrip = async () => {
    if (!name || !destination || !startDate || !endDate || !mode) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const tripData = {
        group_id: groupId,
        name,
        destination,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        start_date: startDate,
        end_date: endDate,
        mode,
        ...(mode === 'AI' ? {
          preference: {
            num_people: numPeople,
            budget_per_person: budget,
            travel_style: transportMode,
            preferences: preferencesList.join(', '),
            radius_km: radius,
          },
        } : {}),
      };
      const trip = await tripService.createTrip(tripData);
      if (mode === 'AI') await tripService.generateAIPlan(trip.id);
      navigate(`/groups/${groupId}/trips/${trip.id}`);
    } catch (error) {
      console.error(error);
      alert('Không thể tạo chuyến đi. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!name || !destination || !startDate || !endDate) {
        alert('Vui lòng điền đủ thông tin cơ bản'); return;
      }
      if (!mode) { alert('Vui lòng chọn cách lên kế hoạch'); return; }
      if (mode === 'MANUAL') { handleCreateTrip(); } else { setStep(2); }
    } else {
      if (preferencesList.length === 0) { alert('Vui lòng chọn ít nhất 1 sở thích!'); return; }
      handleCreateTrip();
    }
  };

  const togglePreference = (id: string) => {
    setPreferencesList(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="tp-page">
      {/* Header — follows design guideline 5.1 */}
      <div className="tp-header">
        <button
          className="tp-back-btn"
          onClick={() => { if (step === 2) setStep(1); else navigate(-1); }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="tp-header-title">
          {step === 1 ? 'Lên kế hoạch (Bước 1)' : 'Sở thích của nhóm'}
        </h1>
        <div style={{ width: 32 }} />{/* Spacer để title canh giữa */}
      </div>

      {/* Content */}
      <div className="tp-content">

        {/* =================== STEP 1 =================== */}
        {step === 1 && (
          <>
            {/* Form Card */}
            <div className="tp-card">
              <div className="tp-field">
                <label>Tên chuyến đi</label>
                <input
                  type="text"
                  className="tp-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Du lịch Đà Lạt tháng 8"
                />
              </div>

              <div className="tp-date-grid">
                <div className="tp-field">
                  <label>Ngày đi</label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="dd/mm/yyyy"
                  />
                </div>
                <div className="tp-field">
                  <label>Ngày về</label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="dd/mm/yyyy"
                    minDate={startDate || undefined}
                  />
                </div>
              </div>

              <div className="tp-field">
                <label>Địa điểm tập kết</label>
                <LocationPicker
                  value={{ name: destination, lat: destinationLat, lng: destinationLng }}
                  onChange={(loc: any) => {
                    const fullDest = loc.address && loc.address !== loc.name && !loc.name.includes('Vị trí hiện tại') 
                      ? `${loc.name} - ${loc.address}`
                      : loc.name;
                    setDestination(fullDest);
                    setDestinationLat(loc.lat);
                    setDestinationLng(loc.lng);
                  }}
                  placeholder="Khách sạn Mộng Mơ, Đà Lạt"
                />
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <p className="tp-section-label">Chọn cách lên kế hoạch</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                  className={`tp-mode-card${mode === 'AI' ? ' selected' : ''}`}
                  onClick={() => setMode('AI')}
                >
                  <div className="tp-mode-icon ai-icon">✨</div>
                  <div className="tp-mode-text">
                    <div className="tp-mode-title">AI Tự Động</div>
                    <div className="tp-mode-desc">Nhập sở thích, AI lên kế hoạch cho bạn</div>
                  </div>
                  <div className={`tp-radio${mode === 'AI' ? ' selected' : ''}`}>
                    {mode === 'AI' && <div className="tp-radio-dot" />}
                  </div>
                </button>

                <button
                  className={`tp-mode-card${mode === 'MANUAL' ? ' selected' : ''}`}
                  onClick={() => setMode('MANUAL')}
                >
                  <div className="tp-mode-icon manual-icon">✏️</div>
                  <div className="tp-mode-text">
                    <div className="tp-mode-title">Tự Lên Kế Hoạch</div>
                    <div className="tp-mode-desc">Tự tay thêm từng địa điểm theo ý bạn</div>
                  </div>
                  <div className={`tp-radio${mode === 'MANUAL' ? ' selected' : ''}`}>
                    {mode === 'MANUAL' && <div className="tp-radio-dot" />}
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* =================== STEP 2 =================== */}
        {step === 2 && (
          <>
            {/* Thông tin nhóm */}
            <div className="tp-card">
              <p className="tp-section-label">Thông tin nhóm</p>
              <div className="tp-counter-row">
                <span>Số người tham gia</span>
                <div className="tp-counter-controls">
                  <button className="tp-counter-btn" onClick={() => setNumPeople(Math.max(1, numPeople - 1))}>−</button>
                  <span className="tp-counter-num">{numPeople}</span>
                  <button className="tp-counter-btn" onClick={() => setNumPeople(numPeople + 1)}>+</button>
                </div>
              </div>
              <div className="tp-budget-row">
                <span>Ngân sách mỗi người</span>
                <div className="tp-budget-input-wrap">
                  <input
                    type="number"
                    className="tp-budget-input"
                    value={budget}
                    onChange={e => setBudget(Number(e.target.value))}
                    step={100000}
                  />
                  <span className="tp-budget-currency">đ</span>
                </div>
              </div>
            </div>

            {/* Sở thích */}
            <div className="tp-card">
              <p className="tp-section-label">Sở thích</p>
              <p className="tp-sublabel">Các hoạt động yêu thích</p>
              <div className="tp-pref-grid">
                {PREFERENCE_OPTIONS.map(pref => (
                  <button
                    key={pref.id}
                    className={`tp-pref-chip${preferencesList.includes(pref.id) ? ' selected' : ''}`}
                    onClick={() => togglePreference(pref.id)}
                  >
                    <span>{pref.icon}</span>
                    <span>{pref.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Phong cách di chuyển */}
            <div className="tp-card">
              <p className="tp-section-label">Phong cách di chuyển</p>
              <div className="tp-transport-grid">
                {TRANSPORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    className={`tp-transport-btn${transportMode === opt.id ? ' selected' : ''}`}
                    onClick={() => setTransportMode(opt.id)}
                  >
                    <span className="tp-t-icon">{opt.icon}</span>
                    <span className="tp-t-label">{opt.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bán kính */}
            <div className="tp-card">
              <p className="tp-section-label">Bán kính di chuyển</p>
              <div className="tp-radius-group">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    className={`tp-radius-btn${radius === r ? ' selected' : ''}`}
                    onClick={() => setRadius(r)}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom */}
      <div className="tp-sticky-bottom">
        <button
          className="tp-primary-btn"
          onClick={nextStep}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Đang thiết kế...</>
          ) : step === 2 ? (
            <><span>✨</span> AI Lên Kế Hoạch</>
          ) : (
            <span>Tiếp theo →</span>
          )}
        </button>
        {step === 2 && !loading && (
          <p className="tp-hint">Khoảng 10-15 giây</p>
        )}
      </div>
    </div>
  );
};
