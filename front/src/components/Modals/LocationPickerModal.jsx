import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPickerModal.css';
import { useLanguage } from '../../context/LanguageContext';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const LocationPickerModal = ({ isOpen, onClose, onSelect, initialLocation }) => {
  const { t } = useLanguage();
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
      // Default to Madrid if no location
      if (!position) {
          setPosition({ lat: 40.416775, lng: -3.703790 }); 
      }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
      const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
      setPosition(newPos);
      setSearchResults([]); // Clear results to show map
  };

  const handleConfirm = async () => {
      if (position) {
          // Try to get address from coordinates
          try {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
              const data = await response.json();
              // Prefer display_name, fallback to coords
              onSelect(data.display_name || `${position.lat}, ${position.lng}`);
          } catch (e) {
              onSelect(`${position.lat}, ${position.lng}`);
          }
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="location-picker-backdrop">
      <div className="location-picker-modal">
        <div className="picker-header">
            <h3>{t('calendar.selectLocation')}</h3>
            <button onClick={onClose} className="close-modal" style={{border:'none', background:'none', fontSize:'1.5rem', cursor:'pointer'}}>&times;</button>
        </div>
        
        <div className="picker-search">
            <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('calendar.searchLocationPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? '...' : '🔍'}
            </button>
        </div>

        {searchResults.length > 0 && (
            <ul className="search-results">
                {searchResults.map((result) => (
                    <li key={result.place_id} onClick={() => handleSelectResult(result)}>
                        {result.display_name}
                    </li>
                ))}
            </ul>
        )}

        <div className="map-container">
            <MapContainer center={position || [40.416, -3.703]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
        </div>

        <div className="picker-footer">
            <button className="btn-cancel" onClick={onClose}>{t('calendar.cancel')}</button>
            <button className="btn-confirm" onClick={handleConfirm}>{t('calendar.confirmLocation')}</button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
