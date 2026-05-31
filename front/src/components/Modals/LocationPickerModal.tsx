'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiSearch } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';
import './LocationPickerModal.css';
import { useLanguage } from '../../context/LanguageContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RecenterMap = ({ position, zoom }: { position: any; zoom: any }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || map.getZoom(), { duration: 0.8 });
    }
  }, [position, zoom, map]);
  return null;
};

const LocationMarker = ({ position, setPosition, addressLabel }: { position: any; setPosition: (p: any) => void; addressLabel: string }) => {
  useMapEvents({
    click(e: any) {
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

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}

const LocationPickerModal = ({ isOpen, onClose, onSelect, initialLocation }: LocationPickerModalProps) => {
  const { t } = useLanguage();
  const [position, setPosition] = useState<any>(null);
  const [flyTarget, setFlyTarget] = useState<any>(null);
  const [flyZoom, setFlyZoom] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<any>(null);
  const inputRef = useRef<any>(null);

  const debouncedQuery = useDebounce(searchQuery, 400);

  const [isDark, setIsDark] = useState(typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
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
        setSearchQuery(initialLocation);
        setSelectedAddress(initialLocation);
      }
      if (!position) {
        const defaultPos = { lat: 40.416775, lng: -3.703790 };
        setPosition(defaultPos);
        setFlyTarget(defaultPos);
        setFlyZoom(13);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

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

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query: string) => {
    if (!query || query.length < 3) return;
    setIsSearching(true);
    try {
      let viewbox = '';
      let bounded = '';
      if (position && typeof position.lat === 'number' && typeof position.lng === 'number') {
        const dLat = 0.7;
        const dLng = 1.0;
        const left = position.lng - dLng;
        const right = position.lng + dLng;
        const top = position.lat + dLat;
        const bottom = position.lat - dLat;
        viewbox = `&viewbox=${left},${top},${right},${bottom}`;
        bounded = '';
      }
      const lang = (navigator.language || 'es,en').split(',')[0] + ',es,en';
      const primary = fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&addressdetails=1&namedetails=1&extratags=1&accept-language=${encodeURIComponent(lang)}${viewbox}${bounded}`,
        { headers: { 'Accept': 'application/json' } }
      ).then(r => r.ok ? r.json() : []);
      const photon = fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12&lang=${encodeURIComponent((navigator.language || 'es').split('-')[0])}${position ? `&lat=${position.lat}&lon=${position.lng}&location_bias_scale=0.3` : ''}`
      ).then(r => r.ok ? r.json() : null).then((gj: any) => {
        if (!gj || !Array.isArray(gj.features)) return [];
        return gj.features.map((f: any) => {
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

      const seen = new Set();
      const merged: any[] = [];
      const key = (r: any) => {
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

  const getResultIcon = (result: any) => {
    const type = result.type || '';
    const cls = result.class || '';
    if (cls === 'amenity' || cls === 'shop') return '[Shop]';
    if (cls === 'building' || type === 'house') return '[Home]';
    if (type === 'city' || type === 'town') return '[City]';
    if (type === 'village' || type === 'hamlet') return '[Town]';
    if (cls === 'highway' || type === 'road' || type === 'street') return '🛣️';
    if (cls === 'tourism' || cls === 'leisure') return '[Tourism]';
    if (cls === 'office') return '[Office]';
    if (cls === 'aeroway') return '[Plane]';
    if (type === 'restaurant' || type === 'cafe') return '[Restaurant]';
    if (type === 'hospital' || type === 'clinic') return '[Hospital]';
    if (type === 'school' || type === 'university') return '[School]';
    return '[Location]';
  };

  const getShortName = (result: any) => {
    const addr = result.address || {};
    const name = result.name || addr.road || '';
    const secondary = [];
    if (addr.road && result.name && result.name !== addr.road) secondary.push(addr.road);
    if (addr.city || addr.town || addr.village) secondary.push(addr.city || addr.town || addr.village);
    if (addr.country) secondary.push(addr.country);
    return { name, secondary: secondary.join(', ') };
  };

  const handleSelectResult = (result: any) => {
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
        () => {  }
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

  const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileUrl = isDark ? darkTile : lightTile;
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  return (
    <div className="location-picker-backdrop" onClick={onClose}>
      <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>


        <div className="picker-header">
          <div className="picker-header-left">
            <span className="picker-icon">[Location]</span>
            <h3>{t('calendar.selectLocation')}</h3>
          </div>
          <button onClick={onClose} className="close-modal-btn" aria-label="Close">&times;</button>
        </div>


        <div className="picker-search-wrapper" ref={searchRef}>
          <div className="picker-search">
            <span className="search-icon"><FiSearch /></span>
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
              <button className="search-clear-btn" onClick={handleReset} aria-label="Clear">x</button>
            )}
            {isSearching && <div className="search-spinner" />}
          </div>


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


        {selectedAddress && (
          <div className="selected-address-banner">
            <span className="banner-pin">[Pin]</span>
            <span className="banner-text">{selectedAddress}</span>
          </div>
        )}


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
