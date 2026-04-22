import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
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

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter the map
const RecenterMap = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || map.getZoom(), { duration: 0.8 });
    }
  }, [position, zoom, map]);
  return null;
};

const LocationMarker = ({ position, setPosition, addressLabel }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={position} icon={customIcon}>
      {addressLabel && (
        <Popup className="custom-popup">
          <span>{addressLabel}</span>
        </Popup>
      )}
    </Marker>
  ) : null;
};

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const LocationPickerModal = ({ isOpen, onClose, onSelect, initialLocation }) => {
  const { t } = useLanguage();
  const [position, setPosition] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedQuery = useDebounce(searchQuery, 400);

  // Detect dark mode reactively
  const [isDark, setIsDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Initialize position
  useEffect(() => {
    if (isOpen) {
      // Try to parse initialLocation as coords
      if (initialLocation && typeof initialLocation === 'string') {
        const coordMatch = initialLocation.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          const pos = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
          setPosition(pos);
          setFlyTarget(pos);
          setFlyZoom(15);
          setSelectedAddress(initialLocation);
          return;
        }
        // If it's a text address, set it as the search and selected
        setSearchQuery(initialLocation);
        setSelectedAddress(initialLocation);
      }
      // Default to Madrid
      if (!position) {
        const defaultPos = { lat: 40.416775, lng: -3.703790 };
        setPosition(defaultPos);
        setFlyTarget(defaultPos);
        setFlyZoom(13);
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reverse geocode when user clicks on map
  useEffect(() => {
    if (!position) return;
    const reverseGeocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'es,en' } }
        );
        const data = await res.json();
        if (data.display_name) {
          // Build a short, clean address
          const addr = data.address || {};
          const parts = [];
          if (addr.road) parts.push(addr.road + (addr.house_number ? ` ${addr.house_number}` : ''));
          if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
          if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
          if (addr.state) parts.push(addr.state);
          if (addr.country) parts.push(addr.country);
          
          const shortAddr = parts.length > 0 ? parts.join(', ') : data.display_name;
          setAddressLabel(shortAddr);
          setSelectedAddress(shortAddr);
        }
      } catch (e) {
        setAddressLabel(`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
        setSelectedAddress(`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
      }
    };
    reverseGeocode();
  }, [position]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query) => {
    if (!query || query.length < 3) return;
    setIsSearching(true);
    try {
      // Bias the search around the current map center if we have one, so that
      // small POIs close to the user appear higher up in the results.
      let viewbox = '';
      let bounded = '';
      if (position && typeof position.lat === 'number' && typeof position.lng === 'number') {
        const dLat = 0.7;  // ~70 km radius bias, but NOT bounded so we still get far results
        const dLng = 1.0;
        const left = position.lng - dLng;
        const right = position.lng + dLng;
        const top = position.lat + dLat;
        const bottom = position.lat - dLat;
        viewbox = `&viewbox=${left},${top},${right},${bottom}`;
        bounded = ''; // keep results global, only bias
      }
      const lang = (navigator.language || 'es,en').split(',')[0] + ',es,en';
      // First pass: rich search with bias and more results
      const primary = fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&addressdetails=1&namedetails=1&extratags=1&accept-language=${encodeURIComponent(lang)}${viewbox}${bounded}`,
        { headers: { 'Accept': 'application/json' } }
      ).then(r => r.ok ? r.json() : []);
      // Second pass (Photon by Komoot): much better for POIs/businesses. Soft fallback.
      const photon = fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12&lang=${encodeURIComponent((navigator.language || 'es').split('-')[0])}${position ? `&lat=${position.lat}&lon=${position.lng}&location_bias_scale=0.3` : ''}`
      ).then(r => r.ok ? r.json() : null).then(gj => {
        if (!gj || !Array.isArray(gj.features)) return [];
        return gj.features.map(f => {
          const p = f.properties || {};
          const [lon, lat] = f.geometry?.coordinates || [];
          return {
            place_id: `ph_${p.osm_type || ''}_${p.osm_id || ''}`,
            lat: String(lat),
            lon: String(lon),
            type: p.osm_value || p.type || '',
            class: p.osm_key || '',
            name: p.name || '',
            display_name: [p.name, p.street, p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(', '),
            address: {
              road: p.street,
              house_number: p.housenumber,
              neighbourhood: p.district,
              city: p.city || p.town || p.village,
              state: p.state,
              country: p.country
            }
          };
        });
      }).catch(() => []);

      const [primaryRes, photonRes] = await Promise.all([primary, photon]);

      // Merge, de-dupe by name+lat/lng rounded; prefer Nominatim order, then fill with Photon
      const seen = new Set();
      const merged = [];
      const key = (r) => {
        const lat = Number(r.lat).toFixed(3);
        const lon = Number(r.lon).toFixed(3);
        return `${(r.name || r.display_name || '').toLowerCase().slice(0, 40)}|${lat}|${lon}`;
      };
      for (const r of [...(primaryRes || []), ...(photonRes || [])]) {
        const k = key(r);
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(r);
        if (merged.length >= 15) break;
      }
      setSearchResults(merged);
      setShowResults(merged.length > 0);
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getResultIcon = (result) => {
    const type = result.type || '';
    const cls = result.class || '';
    if (cls === 'amenity' || cls === 'shop') return '🏪';
    if (cls === 'building' || type === 'house') return '🏠';
    if (type === 'city' || type === 'town') return '🏙️';
    if (type === 'village' || type === 'hamlet') return '🏘️';
    if (cls === 'highway' || type === 'road' || type === 'street') return '🛣️';
    if (cls === 'tourism' || cls === 'leisure') return '🏖️';
    if (cls === 'office') return '🏢';
    if (cls === 'aeroway') return '✈️';
    if (type === 'restaurant' || type === 'cafe') return '🍽️';
    if (type === 'hospital' || type === 'clinic') return '🏥';
    if (type === 'school' || type === 'university') return '🎓';
    return '📍';
  };

  const getShortName = (result) => {
    const addr = result.address || {};
    const name = result.name || addr.road || '';
    const secondary = [];
    if (addr.road && result.name && result.name !== addr.road) secondary.push(addr.road);
    if (addr.city || addr.town || addr.village) secondary.push(addr.city || addr.town || addr.village);
    if (addr.country) secondary.push(addr.country);
    return { name, secondary: secondary.join(', ') };
  };

  const handleSelectResult = (result) => {
    const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setPosition(newPos);
    setFlyTarget(newPos);
    setFlyZoom(result.type === 'city' || result.type === 'town' ? 13 : 17);
    
    const { name, secondary } = getShortName(result);
    const fullAddr = name + (secondary ? `, ${secondary}` : '');
    setAddressLabel(fullAddr);
    setSelectedAddress(fullAddr);
    setSearchQuery(fullAddr);
    setShowResults(false);
  };

  const handleConfirm = () => {
    if (selectedAddress) {
      onSelect(selectedAddress);
    } else if (position) {
      onSelect(`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
    }
    onClose();
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          setFlyTarget(newPos);
          setFlyZoom(16);
        },
        () => { /* user denied or error */ }
      );
    }
  };

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSelectedAddress('');
    setAddressLabel('');
    if (inputRef.current) inputRef.current.focus();
  }, []);

  if (!isOpen) return null;

  // Tile layers
  const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileUrl = isDark ? darkTile : lightTile;
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  return (
    <div className="location-picker-backdrop" onClick={onClose}>
      <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="picker-header">
          <div className="picker-header-left">
            <span className="picker-icon">📍</span>
            <h3>{t('calendar.selectLocation')}</h3>
          </div>
          <button onClick={onClose} className="close-modal-btn" aria-label="Close">&times;</button>
        </div>

        {/* Search Bar */}
        <div className="picker-search-wrapper" ref={searchRef}>
          <div className="picker-search">
            <span className="search-icon">🔍</span>
            <input 
              ref={inputRef}
              type="text" 
              value={searchQuery} 
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 3) setShowResults(true);
              }}
              placeholder={t('calendar.searchLocationPlaceholder') || 'Buscar dirección, establecimiento, ciudad...'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  performSearch(searchQuery);
                  setShowResults(true);
                }
                if (e.key === 'Escape') setShowResults(false);
              }}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              autoFocus
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={handleReset} aria-label="Clear">✕</button>
            )}
            {isSearching && <div className="search-spinner" />}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((result) => {
                const { name, secondary } = getShortName(result);
                return (
                  <li key={result.place_id} onClick={() => handleSelectResult(result)}>
                    <span className="result-icon">{getResultIcon(result)}</span>
                    <div className="result-text">
                      <span className="result-name">{name}</span>
                      {secondary && <span className="result-secondary">{secondary}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected Address Banner */}
        {selectedAddress && (
          <div className="selected-address-banner">
            <span className="banner-pin">📌</span>
            <span className="banner-text">{selectedAddress}</span>
          </div>
        )}

        {/* Map */}
        <div className="map-container">
          <MapContainer 
            center={position || [40.416, -3.703]} 
            zoom={13} 
            className="map-view"
            zoomControl={false}
          >
            <TileLayer key={isDark ? 'dark' : 'light'} url={tileUrl} attribution={attribution} />
            <LocationMarker position={position} setPosition={setPosition} addressLabel={addressLabel} />
            {flyTarget && <RecenterMap position={flyTarget} zoom={flyZoom} />}
          </MapContainer>

          {/* Map overlay buttons */}
          <div className="map-overlay-controls">
            <button 
              className="map-overlay-btn" 
              onClick={handleUseMyLocation} 
              title={t('calendar.myLocation') || 'Mi ubicación'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="picker-footer">
          <button className="btn-cancel" onClick={onClose}>{t('calendar.cancel') || 'Cancelar'}</button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={!position}
          >
            {t('calendar.confirmLocation') || 'Confirmar Ubicación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
