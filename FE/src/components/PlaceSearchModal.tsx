import React, { useState } from 'react';
import { Search, MapPin, Star, X, Loader2 } from 'lucide-react';
import { tripService } from '../services/trip.service';

interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  google_place_id: string;
  photo_url?: string;
}

interface PlaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (place: Place) => void;
  tripLat?: number;
  tripLng?: number;
  radiusKm?: number;
}

export const PlaceSearchModal: React.FC<PlaceSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  tripLat,
  tripLng,
  radiusKm
}) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const places = await tripService.searchPlaces(keyword, tripLat, tripLng, radiusKm);
      setResults(places);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sm-overlay">
      <div className="sm-modal">
        {/* Header */}
        <div className="sm-header">
          <h3 className="sm-title">Tìm địa điểm</h3>
          <button onClick={onClose} className="sm-close"><X size={24} /></button>
        </div>

        {/* Search Input & Filters */}
        <div className="sm-search-box">
          <form onSubmit={handleSearch} className="sm-input-wrap">
            <Search className="sm-icon-left" size={20} />
            <input 
              type="text" 
              placeholder="Tìm tên quán, địa điểm..."
              className="sm-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
            {loading && <div className="sm-loader"><Loader2 size={18} className="animate-spin" /></div>}
          </form>
          {error && <p style={{ color: 'var(--negative)', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
          
          <div className="sm-chips">
            <button className="sm-chip active">Tất cả</button>
            <button className="sm-chip">☕ Cà phê</button>
            <button className="sm-chip">🍜 Quán ăn</button>
            <button className="sm-chip">🌿 Thiên nhiên</button>
          </div>
        </div>

        {/* Results List */}
        <div className="sm-results">
          {results.length === 0 && !loading && !error && (
            <div className="sm-empty">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p>Tìm kiếm địa điểm cho chuyến đi của bạn</p>
            </div>
          )}

          <div>
            {results.map((place, idx) => (
              <div key={place.google_place_id || idx} className="sm-item">
                <div className="sm-item-img">
                  {idx < 2 && <div className="sm-item-badge">🔥 Phổ biến</div>}
                  {place.photo_url ? (
                    <img src={place.photo_url} alt={place.name} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <MapPin size={24} />
                    </div>
                  )}
                </div>
                
                <div className="sm-item-info">
                  <h4 className="sm-item-name">{place.name}</h4>
                  <div className="sm-item-meta">
                    <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Star size={11} fill="currentColor" /> {place.rating || '4.5'}
                    </span>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span>230 đánh giá</span>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}><MapPin size={11} style={{ color: 'var(--primary)', marginRight: 2 }} /> 0.8km</span>
                  </div>
                  <p className="sm-item-address">{place.address}</p>
                </div>

                <button onClick={() => onSelect(place)} className="sm-item-btn">
                  Chọn
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
