import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ShareModal.css';
import { getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const ShareModal = ({ isOpen, onClose, onShare, onUnshareUser, item }) => {
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentShares, setCurrentShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [removingUser, setRemovingUser] = useState(null);
  const [newSharePermission, setNewSharePermission] = useState('edit');
  const [updatingPerm, setUpdatingPerm] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [mode, setMode] = useState('users'); // 'users' | 'group'
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const loadCurrentShares = useCallback(async () => {
    if (!item?.path) return;
    setLoadingShares(true);
    try {
      const response = await fetch(`/api/files/shares?path=${encodeURIComponent(item.path)}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentShares(data.shares || []);
      }
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setLoadingShares(false);
    }
  }, [item?.path]);

  useEffect(() => {
    if (isOpen && item) {
      loadCurrentShares();
      setSearchInput('');
      setSelectedUsers([]);
      setError('');
      setSuccessMsg('');
      setSuggestions([]);
      setNewSharePermission('edit');
      setMode('users');
      setSelectedGroupId('');
      // Fetch groups (best effort)
      (async () => {
        setLoadingGroups(true);
        try {
          const r = await fetch('/api/users/groups', {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
          });
          if (r.ok) {
            const d = await r.json();
            setGroups(d.groups || []);
          }
        } catch (e) { /* ignore */ }
        finally { setLoadingGroups(false); }
      })();
    }
  }, [isOpen, item, loadCurrentShares]);

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
    if (searchInput.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchInput)}`, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (response.ok) {
          const data = await response.json();
          const alreadyShared = currentShares.map(s => s.shared_with_username);
          const alreadySelected = selectedUsers.map(u => u.username);
          const filtered = (data.users || []).filter(u =>
            !alreadyShared.includes(u.username) && !alreadySelected.includes(u.username)
          );
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, currentShares, selectedUsers]);

  if (!isOpen) return null;

  const handleAddUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveSelected = (username) => {
    setSelectedUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && searchInput === '' && selectedUsers.length > 0) {
      setSelectedUsers(prev => prev.slice(0, -1));
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    let successCount = 0;
    let failCount = 0;

    for (const user of selectedUsers) {
      try {
        await onShare(item, user.username, newSharePermission);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    if (failCount > 0) {
      setError(t('share.someErrors', { count: failCount }));
    }
    if (successCount > 0) {
      setSuccessMsg(t('share.sharedSuccess', { count: successCount }));
    }

    setSelectedUsers([]);
    setLoading(false);
    loadCurrentShares();
  };

  const handleShareGroup = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const r = await fetch('/api/files/share-with-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          path: item.path,
          groupId: selectedGroupId,
          permission: newSharePermission
        })
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.message || 'Error');
      setSuccessMsg(t('share.groupShared', { added: data.added, updated: data.updated }) || `+${data.added} / ~${data.updated}`);
      setSelectedGroupId('');
      loadCurrentShares();
    } catch (err) {
      setError(err.message || t('share.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePermission = async (username, permission) => {
    setUpdatingPerm(username);
    try {
      const r = await fetch('/api/files/share/permission', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ path: item.path, username, permission })
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.message || 'Error');
      setCurrentShares(prev => prev.map(s =>
        s.shared_with_username === username ? { ...s, permission } : s
      ));
    } catch (err) {
      setError(err.message || t('share.error'));
    } finally {
      setUpdatingPerm(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm(t('share.confirmRevokeAll') || '¿Quitar el acceso a todos los usuarios?')) return;
    setRevokingAll(true);
    setError('');
    try {
      const r = await fetch('/api/files/unshare-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ path: item.path })
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.message || 'Error');
      setCurrentShares([]);
      setSuccessMsg(t('share.revokedAll', { count: data.removed }) || `${data.removed} accesos quitados`);
    } catch (err) {
      setError(err.message || t('share.error'));
    } finally {
      setRevokingAll(false);
    }
  };

  const handleRemoveShare = async (username) => {
    setRemovingUser(username);
    try {
      if (onUnshareUser) {
        await onUnshareUser(item, username);
      }
      setCurrentShares(prev => prev.filter(s => s.shared_with_username !== username));
    } catch (err) {
      setError(err.message || t('share.error'));
    } finally {
      setRemovingUser(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-icon">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="share-modal-title-group">
            <h3>{t('share.title', { name: item?.name })}</h3>
            <p className="share-modal-subtitle">{t('share.subtitle')}</p>
          </div>
          <button className="share-modal-close" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add people section */}
        <div className="share-add-section" ref={wrapperRef}>
          {/* Mode tabs */}
          <div className="share-mode-tabs" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              className={`share-mode-tab ${mode === 'users' ? 'active' : ''}`}
              onClick={() => setMode('users')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: mode === 'users' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                background: mode === 'users' ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: mode === 'users' ? '#60a5fa' : 'inherit',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {t('share.tabUsers') || 'Usuarios'}
            </button>
            <button
              type="button"
              className={`share-mode-tab ${mode === 'group' ? 'active' : ''}`}
              onClick={() => setMode('group')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: mode === 'group' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                background: mode === 'group' ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: mode === 'group' ? '#60a5fa' : 'inherit',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {t('share.tabGroup') || 'Grupo'}
            </button>
          </div>

          {/* Permission selector for new shares */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label className="share-input-label" style={{ margin: 0 }}>{t('share.permission') || 'Permiso'}:</label>
            <select
              value={newSharePermission}
              onChange={(e) => setNewSharePermission(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 13
              }}
            >
              <option value="edit">{t('share.permEdit') || 'Editor'}</option>
              <option value="read">{t('share.permRead') || 'Solo lectura'}</option>
            </select>
          </div>

          {mode === 'users' ? (
            <>
              <label className="share-input-label">{t('share.addPeople')}</label>
          <div className="share-chips-input" onClick={() => inputRef.current?.focus()}>
            {selectedUsers.map(user => (
              <span key={user.username} className="share-chip">
                <img
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=24`}
                  alt=""
                  className="share-chip-avatar"
                />
                {user.username}
                <button className="share-chip-remove" onClick={(e) => { e.stopPropagation(); handleRemoveSelected(user.username); }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedUsers.length === 0 ? t('share.placeholder') : ''}
              className="share-search-input"
              autoComplete="off"
              autoFocus
            />
            {searching && (
              <div className="share-search-spinner">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="share-suggestions-list">
              {suggestions.map((user) => (
                <div key={user.id} className="share-suggestion-item" onClick={() => handleAddUser(user)}>
                  <img
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=32`}
                    alt={user.username}
                    className="share-suggestion-avatar"
                  />
                  <div className="share-suggestion-info">
                    <span className="share-suggestion-name">{user.username}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              ))}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <button
              className="share-send-btn"
              onClick={handleShare}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                  {t('share.sharing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t('share.shareWith', { count: selectedUsers.length })}
                </>
              )}
            </button>
          )}
            </>
          ) : (
            <div className="share-group-section">
              <label className="share-input-label">{t('share.selectGroup') || 'Selecciona un grupo'}</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={loadingGroups || groups.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'inherit',
                  fontSize: 13,
                  marginBottom: 10
                }}
              >
                <option value="">
                  {loadingGroups
                    ? (t('share.loadingGroups') || 'Cargando...')
                    : (groups.length === 0 ? (t('share.noGroups') || 'No hay grupos') : (t('share.chooseGroup') || '— Elige un grupo —'))}
                </option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.memberCount ? `(${g.memberCount})` : ''}
                  </option>
                ))}
              </select>
              {selectedGroupId && (
                <button
                  className="share-send-btn"
                  onClick={handleShareGroup}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                      {t('share.sharing')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t('share.shareGroupBtn') || 'Compartir con grupo'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="share-message share-message-error">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {successMsg && (
          <div className="share-message share-message-success">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* Current access section */}
        <div className="share-access-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 className="share-access-title">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {t('share.peopleWithAccess')}
            </h4>
            {currentShares.length > 0 && (
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revokingAll}
                title={t('share.revokeAll') || 'Quitar a todos'}
                style={{
                  background: 'transparent',
                  color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {revokingAll ? '...' : (t('share.revokeAll') || 'Quitar a todos')}
              </button>
            )}
          </div>

          {loadingShares ? (
            <div className="share-loading">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : currentShares.length === 0 ? (
            <div className="share-empty">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p>{t('share.noShares')}</p>
            </div>
          ) : (
            <div className="share-users-list">
              {currentShares.map((share) => (
                <div key={share.shared_with_username} className="share-user-row">
                  <img
                    src={share.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(share.shared_with_username)}&background=random&size=36`}
                    alt={share.shared_with_username}
                    className="share-user-avatar"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback !== '1') {
                        e.currentTarget.dataset.fallback = '1';
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(share.shared_with_username)}&background=random&size=36`;
                      }
                    }}
                  />
                  <div className="share-user-info">
                    <span className="share-user-name">{share.shared_with_username}</span>
                    <span className="share-user-date">{t('share.sharedOn', { date: formatDate(share.created_at) })}</span>
                  </div>
                  <select
                    value={share.permission || 'edit'}
                    onChange={(e) => handleChangePermission(share.shared_with_username, e.target.value)}
                    disabled={updatingPerm === share.shared_with_username}
                    title={t('share.changePermission') || 'Cambiar permiso'}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'inherit',
                      fontSize: 12,
                      marginRight: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="edit">{t('share.permEdit') || 'Editor'}</option>
                    <option value="read">{t('share.permRead') || 'Solo lectura'}</option>
                  </select>
                  <button
                    className="share-remove-btn"
                    onClick={() => handleRemoveShare(share.shared_with_username)}
                    disabled={removingUser === share.shared_with_username}
                    title={t('share.removeAccess')}
                  >
                    {removingUser === share.shared_with_username ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-400 rounded-full border-t-transparent"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="share-modal-footer">
          <button className="share-done-btn" onClick={onClose}>
            {t('common.done') || t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
