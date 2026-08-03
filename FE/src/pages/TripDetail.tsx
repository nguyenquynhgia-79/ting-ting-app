import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Trip } from '../types/trip';
import { tripService } from '../services/trip.service';
import { PlaceSearchModal } from '../components/PlaceSearchModal';
import { Loader2, ArrowLeft, Share2, MoreVertical, Map, Star, Plus, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const TripDetail: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupplementing, setIsSupplementing] = useState(false);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);


  const loadTrip = async () => {
    try {
      const data = await tripService.getTrip(tripId!);
      setTrip(data);
    } catch (error) {
      console.error(error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlace = async (place: any) => {
    try {
      const newStop = await tripService.addStop(tripId!, {
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        google_place_id: place.google_place_id,
        photo_url: place.photo_url,
        source: 'MANUAL',
      });
      setTrip((prev) => prev ? { ...prev, stops: [...(prev.stops || []), newStop] } : prev);
      setIsSearchOpen(false);
    } catch (error) {
      console.error(error);
      alert('Không thể thêm địa điểm');
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa địa điểm này khỏi lịch trình?')) return;
    try {
      await tripService.deleteStop(tripId!, stopId);
      setTrip((prev) => prev ? { ...prev, stops: prev.stops?.filter(s => s.id !== stopId) } : prev);
    } catch (error) {
      console.error(error);
      alert('Không thể xóa địa điểm');
    }
  };

  const handleAISupplement = async () => {
    if (!authUser?.subscription || authUser.subscription.plan !== 'PREMIUM') {
      alert('Chức năng này cần gói Premium. Vui lòng nâng cấp để sử dụng AI.');
      return;
    }
    
    setIsSupplementing(true);
    try {
      const data = await tripService.generateAISupplement(tripId!);
      // Cập nhật lại lịch trình với các điểm đến mới
      setTrip((prev) => prev ? { ...prev, stops: data } : prev);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi dùng AI gợi ý');
    } finally {
      setIsSupplementing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) return null;

  // Group stops by inferred day based on time drops
  const groupedDays: { dayNum: number; date: string; stops: typeof trip.stops }[] = [];
  
  if (trip?.stops && trip.stops.length > 0) {
    let currentDayNum = 1;
    let lastTime = -1;
    let currentDayStops: typeof trip.stops = [];
    
    // Base date
    const tripStartDate = new Date(trip.start_date);

    trip.stops.forEach((stop) => {
      // Parse time to minutes for comparison
      let timeMinutes = -1;
      if (stop.scheduled_time) {
        const [h, m] = stop.scheduled_time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          timeMinutes = h * 60 + m;
        }
      }
      
      // If time goes backward, it's a new day!
      if (lastTime !== -1 && timeMinutes !== -1 && timeMinutes < lastTime) {
        // Push previous day
        const currentDate = new Date(tripStartDate);
        currentDate.setDate(tripStartDate.getDate() + (currentDayNum - 1));
        groupedDays.push({ dayNum: currentDayNum, date: currentDate.toLocaleDateString('vi-VN'), stops: currentDayStops });
        
        currentDayNum++;
        currentDayStops = [];
      }
      
      currentDayStops.push(stop);
      if (timeMinutes !== -1) {
        lastTime = timeMinutes;
      }
    });
    
    // Push last day
    if (currentDayStops.length > 0) {
      const currentDate = new Date(tripStartDate);
      currentDate.setDate(tripStartDate.getDate() + (currentDayNum - 1));
      groupedDays.push({ dayNum: currentDayNum, date: currentDate.toLocaleDateString('vi-VN'), stops: currentDayStops });
    }
  } else {
    groupedDays.push({ dayNum: 1, date: new Date(trip?.start_date || new Date()).toLocaleDateString('vi-VN'), stops: [] });
  }

  return (
    <div className="td-container">
      {/* Cover Header */}
      <div className="td-cover">
        <img src="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1000&auto=format&fit=crop" alt="Cover" />
        <div className="td-cover-overlay"></div>
        
        {/* Top actions */}
        <div className="td-top-actions">
          <button onClick={() => navigate(-1)} className="td-icon-btn">
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="td-icon-btn"><Share2 size={18} /></button>
            <button className="td-icon-btn"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Title area */}
        <div className="td-cover-info">
          <h1 className="td-title"><Map size={24} /> {trip?.name}</h1>
          <p className="td-dates" style={{ marginTop: 8 }}>{new Date(trip?.start_date || new Date()).toLocaleDateString('vi-VN')} - {new Date(trip?.end_date || new Date()).toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      <div className="td-content">
        {/* Destination Address */}
        <div className="td-destination-block" style={{ marginBottom: 16, padding: '12px 16px', background: '#F3F4F6', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <MapPin size={18} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>ĐIỂM TẬP KẾT</div>
            <div style={{ fontSize: 14, color: '#111827', fontWeight: 600, lineHeight: 1.4 }}>{trip?.destination}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="td-actions">
          <button onClick={() => setIsSearchOpen(true)} className="td-btn-outline">
            <Plus size={18} /> Thêm địa điểm
          </button>
          <button
            onClick={handleAISupplement}
            disabled={isSupplementing}
            className="td-btn-filled"
          >
            {isSupplementing ? <Loader2 size={18} className="animate-spin" /> : <span>✨</span>} 
            AI Bổ Sung
          </button>
        </div>

        {/* Timeline */}
        <div className="td-timeline">
          <div className="td-timeline-line"></div>

          {groupedDays.map((dayGroup, dayIndex) => (
            <div key={dayGroup.dayNum} style={{ marginBottom: 40 }}>
              <div className="td-day-header">
                <div className="td-day-dot"></div>
                <h2 className="td-day-text">NGÀY {dayGroup.dayNum} — {dayGroup.date}</h2>
              </div>
              
              <div className="td-stops">
                {(dayGroup.stops || []).map((stop, index) => {
                  const tripIndex = trip?.stops?.findIndex(s => s.id === stop.id) ?? -1;
                  const prevStop = tripIndex > 0 && trip?.stops ? trip.stops[tripIndex - 1] : null;
                  
                  let distanceStr = '';
                  let hasDistance = false;
                  
                  if (prevStop && prevStop.lat && prevStop.lng && stop.lat && stop.lng) {
                    const d = calculateDistance(prevStop.lat, prevStop.lng, stop.lat, stop.lng);
                    distanceStr = d < 0.05 ? 'Gần điểm trước' : (d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`);
                    hasDistance = true;
                  } else if (tripIndex === 0 && trip?.destination_lat && trip?.destination_lng && stop.lat && stop.lng) {
                    const d = calculateDistance(trip.destination_lat, trip.destination_lng, stop.lat, stop.lng);
                    distanceStr = d < 0.05 ? 'Tại điểm tập kết' : (d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`);
                    hasDistance = true;
                  } else if (!trip?.destination_lat || !trip?.destination_lng) {
                    // For legacy trips without a saved destination coordinate
                    if (tripIndex === 0) {
                      distanceStr = 'Chưa lưu tọa độ gốc';
                      hasDistance = true;
                    }
                  }

                  return (
                  <div key={stop.id} className="td-stop-item">
                    <div className={`td-stop-dot ${dayIndex === 0 && index === 0 ? 'active' : ''}`}></div>
                    
                    <div className="td-stop-card">
                      <button onClick={() => handleDeleteStop(stop.id)} className="td-stop-delete" onMouseOver={(e) => (e.currentTarget.style.opacity = '1')} onMouseOut={(e) => (e.currentTarget.style.opacity = '')}>
                        <MoreVertical size={18} />
                      </button>

                      <div className="td-stop-tags">
                        <span className="td-tag-time">{stop.scheduled_time || '09:00'}</span>
                        <span className={`td-tag-source ${stop.source === 'AI' ? 'ai' : ''}`}>
                          {stop.source === 'AI' ? '✨ AI' : '✏️ Thủ công'}
                        </span>
                      </div>

                      <h3 className="td-stop-name">{stop.name}</h3>
                      
                      <div className="td-stop-meta">
                        <span>{stop.type || (stop.rating && stop.rating > 4.5 ? '☕ Cà phê' : '🍜 Ẩm thực')}</span>
                        <span>•</span>
                        <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center' }}><Star size={12} fill="currentColor" style={{ marginRight: 2 }} /> {typeof stop.rating === 'number' ? stop.rating.toFixed(1) : (stop.rating || '4.5')}</span>
                        {hasDistance && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center' }} title="Khoảng cách từ địa điểm trước"><MapPin size={12} style={{ marginRight: 2 }} /> {distanceStr}</span>
                          </>
                        )}
                      </div>

                      <div className="td-stop-body">
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <p className="td-stop-desc">
                            {stop.description || stop.address || 'Không có mô tả chi tiết cho địa điểm này.'}
                          </p>
                          <button className="td-stop-map">
                            Mở Maps <Map size={14} />
                          </button>
                        </div>
                        
                        {stop.photo_url && (
                          <img src={stop.photo_url} alt={stop.name} className="td-stop-img" />
                        )}
                      </div>
                    </div>

                    {index < (dayGroup.stops || []).length - 1 && (
                      <div className="td-mini-add-slot">
                        <button className="td-mini-add-btn"><Plus size={14} strokeWidth={3} /></button>
                      </div>
                    )}
                  </div>
                  );
                })}

                {(dayGroup.stops || []).length === 0 && (
                  <div className="td-empty">
                    Chưa có địa điểm nào trong lịch trình ngày này.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="td-sticky-footer">
        <button className="td-publish-btn">
          <Share2 size={20} /> Xuất bản lịch trình cho cả nhóm
        </button>
      </div>

      <PlaceSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleAddPlace}
        tripLat={trip.destination_lat || undefined}
        tripLng={trip.destination_lng || undefined}
        radiusKm={trip.preference?.radius_km || 10}
      />
    </div>
  );
};
