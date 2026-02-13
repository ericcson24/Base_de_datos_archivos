import React, { useState, useEffect, useRef } from 'react';
import './ShareModal.css';
import { getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const ShareModal = ({ isOpen, onClose, onShare, item }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      // Skip search if user just selected a suggestion
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (username.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const results = data.users || [];
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } else {
          console.warn('API search failed');
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [username]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      await onShare(item, username);
      setUsername('');
      onClose();
    } catch (err) {
      setError(err.message || t('share.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (user) => {
    justSelectedRef.current = true;
    setUsername(user.username);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glassmorphism-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-full">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold m-0">{t('share.title', { name: item?.name })}</h3>
            <p className="text-sm text-gray-400 mt-1">Comparte este archivo con otros usuarios</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group relative" ref={wrapperRef}>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              {t('share.targetUser')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('share.placeholder')}
                autoFocus
                className="glassmorphism-input pl-10"
                autoComplete="off"
              />
              {searching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-list">
                {suggestions.map((user) => (
                  <div 
                    key={user.id} 
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(user)}
                  >
                    <img 
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                      alt={user.username} 
                      className="suggestion-avatar"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-name">{user.username}</span>
                      {user.email && <span className="suggestion-email">{user.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-message flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="modal-buttons mt-6">
            <button type="button" onClick={onClose} className="cancel-btn">
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="confirm-btn flex items-center gap-2"
              disabled={loading || !username.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                  {t('share.sharing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {t('share.share')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
