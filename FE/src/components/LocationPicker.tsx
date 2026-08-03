import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, Loader2, ChevronRight, Navigation } from 'lucide-react';
import api from '../services/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Configure Mapbox Token — set VITE_MAPBOX_ACCESS_TOKEN in your .env file
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface LocationResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id?: string;
}

interface LocationPickerProps {
  value: {
    name: string;
    lat?: number;
    lng?: number;
  };
  onChange: (location: { name: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm địa điểm...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  // Search logic
  useEffect(() => {
    if (showMap) return; // Don't search if map is already showing
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ keyword: debouncedQuery });
    api.get(`/trips/places/search?${params}`)
      .then(res => setResults(res.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, showMap]);

  // Close modal on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (value.name) setQuery(value.name);
    }
  }, [open]);

  // Initialize and update Mapbox
  useEffect(() => {
    if (!showMap || !selected || !mapContainer.current) return;

    // Guard: skip map if no token configured
    if (!mapboxgl.accessToken) {
      console.warn('[LocationPicker] VITE_MAPBOX_ACCESS_TOKEN is not set. Map disabled.');
      return;
    }

    if (!mapRef.current) {
      try {
        // Initialize Map
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [selected.lng, selected.lat],
          zoom: 15
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // Add marker
        const marker = new mapboxgl.Marker({ draggable: true, color: '#10b981' })
          .setLngLat([selected.lng, selected.lat])
          .addTo(map);

        // Handle marker drag
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          reverseGeocode(lngLat.lng, lngLat.lat);
        });

        // Handle map click
        map.on('click', (e) => {
          marker.setLngLat(e.lngLat);
          reverseGeocode(e.lngLat.lng, e.lngLat.lat);
        });
        
        // Ensure map renders correctly by resizing after load
        map.on('load', () => {
          map.resize();
        });

        mapRef.current = map;
        markerRef.current = marker;
      } catch (err) {
        console.error('[LocationPicker] Failed to initialize Mapbox map:', err);
      }
    } else {
      // Just fly to new location if map already exists
      mapRef.current.flyTo({ center: [selected.lng, selected.lat], zoom: 15 });
      if (markerRef.current) {
        markerRef.current.setLngLat([selected.lng, selected.lat]);
      }
    }

    return () => {
      // Cleanup map on unmount if modal closes completely
      if (!showMap && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap, selected]);

  // Reverse Geocode
  const reverseGeocode = async (lng: number, lat: number) => {
    setLoading(true);
    try {
      const token = mapboxgl.accessToken;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=vi`;
      const res = await fetch(url);
      const data = await res.json();
      
      const feature = data.features?.[0];
      if (feature) {
        setSelected({
          name: feature.text || feature.place_name,
          address: feature.place_name,
          lat,
          lng
        });
      }
    } catch (e) {
      console.error('Reverse geocode error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (place: LocationResult) => {
    setSelected(place);
    setShowMap(true);
    setQuery(place.name);
    setResults([]);
  };

  const handleConfirm = () => {
    if (selected) {
      // Return selected to parent
      // Note: we can optionally append address to name in the parent (TripPlanner) as you did.
      // But passing the whole selected object is best. We'll simulate what onChange expects.
      // Wait, onChange expects {name, lat, lng}. We'll pass the full address string back via name, or just let TripPlanner handle it.
      // To match the previous logic where loc.address exists, we can pass it as any.
      (onChange as any)({ name: selected.name, address: selected.address, lat: selected.lat, lng: selected.lng });
    }
    setOpen(false);
    setShowMap(false);
    setQuery('');
    setSelected(null);
  };

  const handleClear = () => {
    setSelected(null);
    setShowMap(false);
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openInGoogleMaps = () => {
    if (selected) {
      const url = `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}&query_place_id=${selected.google_place_id || ''}`;
      window.open(url, '_blank');
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Trigger reverse geocoding to get real name immediately
        setSelected({ name: 'Vị trí hiện tại', address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
        setShowMap(true); // show map, the map useEffect will render the pin, but we should reverse geocode first
        reverseGeocode(lng, lat);
      },
      () => {
        setLoading(false);
        alert('Không thể lấy vị trí của bạn. Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt.');
      }
    );
  };

  const displayText = value.name || '';

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        className="tp-location-trigger"
        onClick={() => setOpen(true)}
      >
        <div className="tp-location-icon">
          <MapPin size={18} />
        </div>
        <span className={displayText ? 'tp-location-value' : 'tp-location-placeholder'}>
          {displayText || placeholder}
        </span>
        {value.lat && (
          <span className="tp-location-badge">📍</span>
        )}
        <ChevronRight size={16} className="tp-location-arrow" />
      </button>

      {/* Full-screen Modal */}
      {open && (
        <div className="lp-overlay">
          <div className="lp-modal" ref={modalRef}>
            {/* Modal Header */}
            <div className="lp-header">
              <button type="button" className="lp-close-btn" onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
              <h3 className="lp-title">Chọn địa điểm tập kết</h3>
              <div style={{ width: 36 }} />
            </div>

            {/* Search Bar */}
            {!showMap && (
              <>
                <div className="lp-search-wrap">
                  <Search size={18} className="lp-search-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="lp-search-input"
                    placeholder="Nhập tên địa điểm..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button type="button" onClick={handleClear} className="lp-search-clear">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Current Location Button */}
                <button type="button" className="lp-gps-btn" onClick={useCurrentLocation}>
                  <Navigation size={16} />
                  <span>Sử dụng vị trí hiện tại</span>
                </button>
                
                {/* Open Map Button */}
                <button type="button" className="lp-gps-btn" style={{ marginTop: 8 }} onClick={() => {
                  if (!selected) {
                    // Default to Da Nang if nothing is selected
                    setSelected({ name: 'Chọn vị trí...', address: 'Kéo ghim để chọn', lat: 16.0544, lng: 108.2022 });
                  }
                  setShowMap(true);
                }}>
                  <MapPin size={16} />
                  <span>Chọn trên bản đồ</span>
                </button>

                {/* Loading */}
                {loading && (
                  <div className="lp-loading">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Đang tìm kiếm...</span>
                  </div>
                )}

                {/* Results List */}
                {!loading && results.length > 0 && (
                  <div className="lp-results">
                    {results.map((res, i) => (
                      <button
                        key={res.google_place_id || i}
                        type="button"
                        className="lp-result-item"
                        onClick={() => handleSelect(res)}
                      >
                        <div className="lp-result-pin">
                          <MapPin size={16} />
                        </div>
                        <div className="lp-result-text">
                          <div className="lp-result-name">{res.name}</div>
                          <div className="lp-result-addr">{res.address}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Empty state */}
                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="lp-empty">
                    <MapPin size={32} />
                    <p>Không tìm thấy địa điểm phù hợp</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Thử từ khóa khác</p>
                  </div>
                )}
              </>
            )}

            {/* Map View */}
            {showMap && selected && (
              <div className="lp-map-section" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Selected info */}
                <div className="lp-selected-info">
                  <div className="lp-selected-pin">
                    <MapPin size={20} />
                  </div>
                  <div className="lp-selected-text">
                    <div className="lp-selected-name">{selected.name}</div>
                    <div className="lp-selected-addr">{selected.address}</div>
                    {selected.lat && (
                      <div className="lp-coords">
                        {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                        <button
                          onClick={openInGoogleMaps}
                          style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 11, textDecoration: 'underline', padding: 0 }}
                          title="Mở trong Google Maps"
                        >
                          Mở Google Maps
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Mapbox Map */}
                <div className="lp-map-frame" style={{ flex: 1, position: 'relative', minHeight: 300 }}>
                  <div 
                    ref={mapContainer} 
                    style={{ width: '100%', height: '100%', minHeight: 300, borderRadius: 12, overflow: 'hidden' }}
                  />
                  {loading && (
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <Loader2 size={14} className="animate-spin" /> Đang cập nhật...
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#4b5563', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    💡 <b>Mẹo:</b> Bạn có thể kéo thả ghim 📍 hoặc click vào bản đồ để đổi vị trí!
                  </div>
                </div>

                {/* Confirm */}
                <div className="lp-footer" style={{ marginTop: 16 }}>
                  <button type="button" className="lp-back-btn" onClick={handleClear}>
                    ← Chọn lại
                  </button>
                  <button type="button" className="lp-confirm-btn" onClick={handleConfirm}>
                    ✓ Xác nhận vị trí
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
