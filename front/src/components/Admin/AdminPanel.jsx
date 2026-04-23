import React, { useState, useEffect } from 'react';
import SettingsModal from '../Modals/SettingsModal';
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal';
import GroupManager from './GroupManager';
import RDPManager from './RDPManager';
import NotificationCenter from '../Common/NotificationCenter';
import { useLanguage } from '../../context/LanguageContext';
import './AdminPanel.css';

const AdminPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [systemData, setSystemData] = useState({});
  const [serverInfo, setServerInfo] = useState({});
  const [connections, setConnections] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [securityData, setSecurityData] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityFilter, setSecurityFilter] = useState('security');
  const [securityLoading, setSecurityLoading] = useState(false);

  // Roadmap Access States
  const [roadmapAccessUsers, setRoadmapAccessUsers] = useState([]);
  const [roadmapAccessLoading, setRoadmapAccessLoading] = useState(false);
  const [windowsUsers, setWindowsUsers] = useState([]);
  const [windowsLinks, setWindowsLinks] = useState([]);
  const [windowsLoading, setWindowsLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ cloud_username: '', windows_username: '', sync_desktop: true, sync_documents: true, sync_downloads: true });
  const [showAutoCreateModal, setShowAutoCreateModal] = useState(false);
  const [autoCreateData, setAutoCreateData] = useState({ selectedUsers: [], defaultPassword: '', defaultRole: 'user', autoLink: true });
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => {
    loadInitialData();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'system') {
      loadServerInfo();
      loadSystemStatus();
      const sysTimer = setInterval(() => {
        loadServerInfo();
        loadSystemStatus();
      }, 5000);
      return () => clearInterval(sysTimer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'security') {
      loadSecurityOverview();
      loadSecurityLogs();
    }
    if (activeTab === 'roadmap') {
      loadRoadmapAccess();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'windows' || activeTab === 'users') {
      loadWindowsUsers();
      loadWindowsLinks();
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSystemStatus(),
        loadServerInfo(),
        loadConnections(),
        loadUsers(),
        loadLogs(),
        loadInbox()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  };

  const loadSystemStatus = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/status');
      const data = await res.json();
      if (data.success) setSystemData(data);
    } catch (e) { console.error(e); }
  };

  const loadServerInfo = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/server/info');
      const data = await res.json();
      if (data.success) setServerInfo(data.server_info);
    } catch (e) { console.error(e); }
  };

  const loadConnections = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/server/connections');
      const data = await res.json();
      if (data.success) setConnections(data.connections);
    } catch (e) { console.error(e); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/users');
      const data = await res.json();
      if (data.success) setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) { console.error(e); }
  };

  const loadLogs = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
      setLogs([]);
    }
  };

  const loadInbox = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/inbox');
      const data = await res.json();
      if (data.success) setInboxMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { console.error(e); }
  };

  const loadSecurityOverview = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/security/overview');
      const data = await res.json();
      if (data.success) setSecurityData(data);
    } catch (e) { console.error(e); }
  };

  const loadSecurityLogs = async (filter) => {
    setSecurityLoading(true);
    try {
      const f = filter || securityFilter;
      const res = await fetchWithAuth(`/admin/api/security/logs?filter=${f}&limit=100`);
      const data = await res.json();
      if (data.success) setSecurityLogs(data.logs || []);
    } catch (e) { console.error(e); }
    setSecurityLoading(false);
  };

  const handleUnblockIP = async (ip) => {
    try {
      const res = await fetchWithAuth(`/admin/api/security/rate-limits/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || t('admin.security.ipUnblocked'));
        loadSecurityOverview();
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', t('common.networkError'));
    }
  };

  const handleClearAllRateLimits = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/security/rate-limits', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || t('admin.security.allRateLimitsCleared'));
        loadSecurityOverview();
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', t('common.networkError'));
    }
  };

  const handleUnlockAccount = async (userId) => {
    try {
      const res = await fetchWithAuth(`/admin/api/security/unlock-account/${userId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || t('admin.security.accountUnlocked'));
        loadSecurityOverview();
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', t('common.networkError'));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/admin/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddUserModal(false);
        setNewUser({ username: '', password: '', role: 'user' });
        loadUsers();
        showAlert('success', t('admin.userCreated'));
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', t('admin.errorCreatingUser'));
    }
  };

  const loadWindowsUsers = async () => {
    setWindowsLoading(true);
    try {
      const res = await fetchWithAuth('/api/windows/users');
      const data = await res.json();
      if (data.success) setWindowsUsers(data.users || []);
    } catch (e) { console.error('Error loading Windows users:', e); }
    setWindowsLoading(false);
  };

  const loadWindowsLinks = async () => {
    try {
      const res = await fetchWithAuth('/api/windows/links');
      const data = await res.json();
      if (data.success) setWindowsLinks(data.links || []);
    } catch (e) { console.error('Error loading Windows links:', e); }
  };

  const handleLinkUsers = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/windows/link', {
        method: 'POST',
        body: JSON.stringify(linkData)
      });
      const data = await res.json();
      if (data.success) {
        setShowLinkModal(false);
        setLinkData({ cloud_username: '', windows_username: '', sync_desktop: true, sync_documents: true, sync_downloads: true });
        loadWindowsLinks();
        loadWindowsUsers();
        showAlert('success', t('admin.windows.linked_msg'));
      } else {
        showAlert('error', data.message);
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
  };

  const handleUnlink = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/windows/link/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadWindowsLinks();
        loadWindowsUsers();
        loadUsers();
        showAlert('success', t('admin.windows.unlinked'));
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
  };

  const handleQuickLink = async (cloudUsername, windowsUsername) => {
    try {
      const res = await fetchWithAuth('/api/windows/link', {
        method: 'POST',
        body: JSON.stringify({ cloud_username: cloudUsername, windows_username: windowsUsername, sync_desktop: true, sync_documents: true, sync_downloads: true })
      });
      const data = await res.json();
      if (data.success) {
        loadWindowsLinks();
        loadWindowsUsers();
        loadUsers();
        showAlert('success', `${cloudUsername} vinculado a Windows (${windowsUsername})`);
      } else {
        showAlert('error', data.message);
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
  };

  const handleSyncUser = async (id) => {
    setSyncingId(id);
    try {
      const res = await fetchWithAuth(`/api/windows/sync/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        loadWindowsLinks();
        showAlert('success', data.message);
      } else {
        showAlert('error', data.message);
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
    setSyncingId(null);
  };

  const handleSyncAll = async () => {
    setSyncingId('all');
    try {
      const res = await fetchWithAuth('/api/windows/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        loadWindowsLinks();
        showAlert('success', data.message);
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
    setSyncingId(null);
  };

  const handleAutoCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/windows/auto-create', {
        method: 'POST',
        body: JSON.stringify({
          users: autoCreateData.selectedUsers,
          defaultPassword: autoCreateData.defaultPassword,
          defaultRole: autoCreateData.defaultRole,
          autoLink: autoCreateData.autoLink
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAutoCreateModal(false);
        setAutoCreateData({ selectedUsers: [], defaultPassword: '', defaultRole: 'user', autoLink: true });
        loadWindowsUsers();
        loadWindowsLinks();
        loadUsers();
        showAlert('success', data.message);
      } else {
        showAlert('error', data.message);
      }
    } catch (e) { showAlert('error', t('common.networkError')); }
  };

  const handleToggleSyncSetting = async (linkId, field, value) => {
    try {
      const res = await fetchWithAuth(`/api/windows/link/${linkId}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (data.success) loadWindowsLinks();
    } catch (e) { console.error(e); }
  };

  const toggleAutoCreateUser = (username) => {
    setAutoCreateData(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(username)
        ? prev.selectedUsers.filter(u => u !== username)
        : [...prev.selectedUsers, username]
    }));
  };

  const handleDeleteUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) confirmDeleteUser(user);
  };

  const confirmDeleteUser = (user) => {
    setDeleteModal({ isOpen: true, user });
  };

  const handleScheduleDelete = async () => {
    if (!deleteModal.user) return;
    try {
      const res = await fetchWithAuth(`/admin/api/users/${deleteModal.user.id}/schedule-deletion`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', t('admin.deletionScheduled') || 'Eliminación programada. Puedes cancelarla durante los próximos 5 minutos.');
        loadUsers();
      } else {
        showAlert('error', data.message || t('common.error'));
      }
    } catch (e) {
      showAlert('error', t('common.networkError'));
    } finally {
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleCancelDelete = async (userId) => {
    try {
      const res = await fetchWithAuth(`/admin/api/users/${userId}/cancel-deletion`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', t('admin.deletionCancelled'));
        loadUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getRemainingTime = (scheduledTime) => {
    if (!scheduledTime) return '';
    const end = new Date(scheduledTime).getTime();
    const diff = end - currentTime;
    if (diff <= 0) return t('common.processing');
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user, password: '' });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        role: editingUser.role
      };
      if (editingUser.password) {
        payload.password = editingUser.password;
      }

      const res = await fetchWithAuth(`/admin/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowEditUserModal(false);
        setEditingUser(null);
        loadUsers();
        showAlert('success', t('admin.userUpdated'));
      } else {
        showAlert('error', data.message || t('admin.errorUpdatingUser'));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('error', t('common.networkError'));
    }
  };

  const handleLockUser = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await fetchWithAuth(`/admin/api/users/${userId}/lock`, {
        method: 'PUT',
        body: JSON.stringify({ locked: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        loadUsers();
        showAlert('success', newStatus ? t('admin.userLocked') : t('admin.userUnlocked'));
      } else {
        showAlert('error', data.message || t('admin.errorLockingUser'));
      }
    } catch (error) {
      console.error('Error locking user:', error);
      showAlert('error', t('common.networkError'));
    }
  };

  const runDiagnostics = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/diagnostics');
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data.diagnostics || []);
        showAlert('success', t('admin.diagnosticsComplete'));
      } else {
        showAlert('error', data.message || t('admin.diagnosticsError'));
      }
    } catch (e) {
      showAlert('error', t('admin.diagnosticsError'));
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  // Roadmap Access Management
  const loadRoadmapAccess = async () => {
    setRoadmapAccessLoading(true);
    try {
      const res = await fetchWithAuth('/api/roadmap/admin/access');
      if (res.ok) {
        const data = await res.json();
        setRoadmapAccessUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading roadmap access: HTTP', res.status);
        setRoadmapAccessUsers([]);
      }
    } catch (error) {
      console.error('Error loading roadmap access:', error);
      setRoadmapAccessUsers([]);
    } finally {
      setRoadmapAccessLoading(false);
    }
  };

  const updateRoadmapAccess = async (userId, accessLevel, canCreateProjects) => {
    try {
      const res = await fetchWithAuth(`/api/roadmap/admin/access/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ access_level: accessLevel, can_create_projects: canCreateProjects })
      });
      if (res.ok) {
        showAlert('success', 'Acceso de Roadmap actualizado');
        loadRoadmapAccess();
      } else {
        const err = await res.json();
        showAlert('error', err.error || 'Error al actualizar acceso');
      }
    } catch (error) {
      showAlert('error', 'Error al actualizar acceso');
    }
  };

  const grantAllAccess = async (level) => {
    try {
      const usersToUpdate = roadmapAccessUsers.filter(u => u.role !== 'admin').map(u => ({
        user_id: u.id,
        access_level: level,
        can_create_projects: level === 'manager' || level === 'admin'
      }));
      const res = await fetchWithAuth('/api/roadmap/admin/access/bulk', {
        method: 'PUT',
        body: JSON.stringify({ users: usersToUpdate })
      });
      if (res.ok) {
        showAlert('success', `Acceso "${level}" otorgado a todos los usuarios`);
        loadRoadmapAccess();
      } else {
        const err = await res.json();
        showAlert('error', err.error || 'Error al actualizar accesos masivos');
      }
    } catch (error) {
      showAlert('error', 'Error al actualizar accesos masivos');
    }
  };

  const renderRoadmapAccess = () => {
    const accessLevels = [
      { value: 'none', label: 'Sin acceso', color: '#6b7280' },
      { value: 'viewer', label: 'Visor', color: '#f59e0b' },
      { value: 'member', label: 'Miembro', color: '#3b82f6' },
      { value: 'manager', label: 'Manager', color: '#8b5cf6' },
      { value: 'admin', label: 'Admin', color: '#22c55e' }
    ];

    return (
      <div className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gestión de Acceso al Roadmap</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="admin-btn admin-btn-outline" onClick={() => grantAllAccess('member')}>
              Todos → Miembro
            </button>
            <button className="admin-btn admin-btn-outline" onClick={() => grantAllAccess('viewer')}>
              Todos → Visor
            </button>
            <button className="admin-btn admin-btn-outline" onClick={() => grantAllAccess('none')} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
              Revocar todos
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Controla quién puede acceder al módulo de Roadmap y qué puede hacer cada usuario. Los administradores siempre tienen acceso completo.
        </p>

        {roadmapAccessLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol del Sistema</th>
                  <th>Acceso Roadmap</th>
                  <th>Puede Crear Proyectos</th>
                  <th>Otorgado por</th>
                </tr>
              </thead>
              <tbody>
                {roadmapAccessUsers.map(u => {
                  const isAdmin = u.role === 'admin';
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.email || '—'}</td>
                      <td>
                        <span className={`admin-role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {isAdmin ? (
                          <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>Admin (completo)</span>
                        ) : (
                          <select
                            value={u.access_level || 'none'}
                            onChange={(e) => updateRoadmapAccess(u.id, e.target.value, u.can_create_projects)}
                            className="admin-select-sm"
                            style={{ minWidth: '120px' }}
                          >
                            {accessLevels.map(l => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {isAdmin ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Si</span>
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!u.can_create_projects}
                              onChange={(e) => updateRoadmapAccess(u.id, u.access_level || 'member', e.target.checked)}
                              style={{ accentColor: '#3b82f6' }}
                            />
                          </label>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {u.granted_by_username || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary, #f3f4f6)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <strong>Niveles de acceso:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.2rem', lineHeight: '1.6' }}>
            <li><strong>Sin acceso:</strong> No puede ver ni acceder al Roadmap</li>
            <li><strong>Visor:</strong> Solo puede ver proyectos generales (lectura)</li>
            <li><strong>Miembro:</strong> Puede ver y crear/editar tareas en proyectos asignados</li>
            <li><strong>Manager:</strong> Puede crear proyectos generales y gestionar miembros</li>
            <li><strong>Admin:</strong> Acceso completo al Roadmap</li>
          </ul>
        </div>
      </div>
    );
  };

  // Render Helpers
  const renderSidebar = () => (
    <div className="admin-sidebar">
      <div className="admin-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        {t('admin.title')}
      </div>
      <nav className="admin-nav">
        <button 
          className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>{t('admin.dashboard')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>{t('admin.users')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>{t('admin.groups')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>{t('admin.system')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>{t('admin.logs')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>{t('admin.security.title')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'rdp' ? 'active' : ''}`}
          onClick={() => setActiveTab('rdp')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span>{t('common.remoteDesktop')}</span>
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('roadmap')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          <span>Roadmap</span>
          className={`admin-nav-item ${activeTab === 'windows' ? 'active' : ''}`}
          onClick={() => setActiveTab('windows')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 7h20"/><path d="M9 21V7"/></svg>
          <span>{t('admin.windows.title')}</span>
        </button>
      </nav>
      <div className="admin-sidebar-footer">
        <button className="admin-nav-item" onClick={() => setShowSettingsModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>{t('common.settings')}</span>
        </button>
        <button className="admin-nav-item" onClick={onBackToFolders}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>{t('userPanel.myFiles')}</span>
        </button>
        <button className="admin-nav-item logout-btn" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (activeTab === 'dashboard') {
      const dashTimer = setInterval(() => {
        loadSystemStatus();
        loadConnections();
      }, 10000);
      return () => clearInterval(dashTimer);
    }
  }, [activeTab]);

  const renderDashboard = () => (
    <div className="admin-grid">
      <div className="admin-card">
        <div className="stat-value">{systemData.active_users || 0}</div>
        <div className="stat-label">{t('admin.activeUsers')}</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">{connections.active_connections || 0}</div>
        <div className="stat-label">{t('admin.rdpConnections')}</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">
          {systemData.status === 'online' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          )}
        </div>
        <div className="stat-label">{t('admin.systemStatus')}</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">{inboxMessages.filter(m => !m.is_read).length}</div>
        <div className="stat-label">{t('admin.notifications')}</div>
      </div>
    </div>
  );

  const renderUsers = () => {
    const activeUsers = users.filter(u => !u.deletion_scheduled_at);
    const pendingUsers = users.filter(u => u.deletion_scheduled_at);
    const linkedWinUsernames = new Set(windowsLinks.map(l => l.windows_username));

    return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">{t('admin.userManagement')}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {windowsUsers.filter(wu => !linkedWinUsernames.has(wu.username)).length > 0 && (
            <button className="admin-btn admin-btn-secondary" onClick={() => {
              setAutoCreateData({ selectedUsers: [], defaultPassword: '', defaultRole: 'user', autoLink: true });
              setShowAutoCreateModal(true);
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 7h20"/><path d="M9 21V7"/></svg>
              {t('admin.windows.autoCreate') || 'Auto-crear desde Windows'}
            </button>
          )}
          <button className="admin-btn admin-btn-primary" onClick={() => setShowAddUserModal(true)}>
            + {t('admin.addUser')}
          </button>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="pending-deletions-section">
          <h3 className="section-subtitle" style={{ color: '#ff4d4f', marginTop: '1rem', marginBottom: '1rem' }}>
            <svg style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {t('admin.pendingDeletions')}
          </h3>
          <table className="admin-table" style={{ border: '1px solid #ff4d4f', marginBottom: '2rem' }}>
            <thead>
              <tr>
                <th>{t('admin.user')}</th>
                <th>{t('admin.timeRemaining')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map(u => (
                <tr key={u.id} style={{ backgroundColor: 'rgba(255, 77, 79, 0.1)' }}>
                  <td style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                    {getRemainingTime(u.deletion_scheduled_at)}
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleCancelDelete(u.id)}>
                      {t('admin.cancelDeletion')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-subtitle" style={{ marginBottom: '1rem' }}>{t('admin.activeUsers')}</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('admin.user')}</th>
            <th>{t('admin.role')}</th>
            <th>{t('admin.status')}</th>
            <th>Windows</th>
            <th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {activeUsers.map(u => {
            const winLink = windowsLinks.find(l => l.cloud_username === u.username);
            const matchingWinUser = windowsUsers.find(wu => wu.username.toLowerCase() === u.username.toLowerCase());
            return (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td><span className="status-badge">{u.role}</span></td>
              <td>
                <span className={`status-badge ${u.is_locked ? 'error' : 'success'}`}>
                  {u.is_locked ? t('admin.locked') : t('admin.active')}
                </span>
              </td>
              <td>
                {winLink ? (
                  <span className="status-badge success" title={`Vinculado a ${winLink.windows_username}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    onClick={() => handleSyncUser(winLink.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    {winLink.windows_username}
                  </span>
                ) : matchingWinUser ? (
                  <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleQuickLink(u.username, matchingWinUser.username)} title="Vincular automáticamente">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    {t('admin.windows.linkAccount') || 'Vincular'}
                  </button>
                ) : (
                  <span style={{ opacity: 0.4, fontSize: '0.85rem' }}>—</span>
                )}
              </td>
              <td>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => openEditModal(u)} style={{ marginRight: '5px' }}>
                  {t('common.edit')}
                </button>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleLockUser(u.id, u.is_locked)} style={{ marginRight: '5px' }}>
                  {u.is_locked ? t('admin.unlock') : t('admin.lock')}
                </button>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => confirmDeleteUser(u)}>
                  {t('common.delete')}
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const ProgressBar = ({ percent, color = '#4caf50' }) => (
    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary, #e0e0e0)', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
      <div style={{ width: `${Math.min(percent || 0, 100)}%`, height: '100%', background: (percent || 0) > 90 ? '#ff3b30' : (percent || 0) > 70 ? '#ff9500' : color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
    </div>
  );

  const renderSystem = () => {
    const info = serverInfo || {};
    const stats = systemData?.server_stats || {};
    const net = info.network || stats.network || {};
    const lastUpdated = info.last_updated || stats.last_updated;

    return (
    <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
            CPU
          </h2>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{info.cpu_percent ?? stats.cpu_percent ?? '—'}%</span>
        </div>
        <ProgressBar percent={info.cpu_percent ?? stats.cpu_percent} color="#007aff" />
        <div className="admin-info-list" style={{ marginTop: '12px' }}>
          <p><strong>{t('admin.cpuUsage')}:</strong> {info.cpu_model || stats.cpu_model || '—'}</p>
          <p><strong>Cores:</strong> {info.cpu_count || stats.cpu_count || '—'}</p>
        </div>
      </div>

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>
            {t('admin.memory')}
          </h2>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{info.memory_percent ?? stats.memory_percent ?? '—'}%</span>
        </div>
        <ProgressBar percent={info.memory_percent ?? stats.memory_percent} color="#34c759" />
        <div className="admin-info-list" style={{ marginTop: '12px' }}>
          <p><strong>Total:</strong> {info.memory_total_gb ?? stats.memory_total_gb ?? '—'} GB</p>
          <p><strong>En uso:</strong> {info.memory_used_gb ?? stats.memory_used_gb ?? '—'} GB</p>
          <p><strong>{t('admin.free')}:</strong> {info.memory_free_gb ?? stats.memory_free_gb ?? '—'} GB</p>
        </div>
      </div>

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            {t('admin.disk')}
          </h2>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{info.disk_percent ?? stats.disk_percent ?? '—'}%</span>
        </div>
        <ProgressBar percent={info.disk_percent ?? stats.disk_percent} color="#ff9500" />
        <div className="admin-info-list" style={{ marginTop: '12px' }}>
          <p><strong>Total:</strong> {info.disk_total_gb ?? stats.disk_total_gb ?? '—'} GB</p>
          <p><strong>En uso:</strong> {info.disk_used_gb ?? stats.disk_used_gb ?? '—'} GB</p>
          <p><strong>{t('admin.free')}:</strong> {info.disk_free_gb ?? stats.disk_free_gb ?? '—'} GB</p>
        </div>
      </div>

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {t('admin.network')}
          </h2>
        </div>
        <div className="admin-info-list">
          <p><strong>↓ Descarga:</strong> {formatBytes(net.rx_sec || 0)}/s</p>
          <p><strong>↑ Subida:</strong> {formatBytes(net.tx_sec || 0)}/s</p>
          <p><strong>↓ Total RX:</strong> {formatBytes(net.rx_total || 0)}</p>
          <p><strong>↑ Total TX:</strong> {formatBytes(net.tx_total || 0)}</p>
          {net.iface && <p><strong>Interfaz:</strong> {net.iface}</p>}
        </div>
      </div>

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            {t('admin.serverInfo')}
          </h2>
        </div>
        <div className="admin-info-list">
          <p><strong>{t('admin.hostname')}:</strong> {info.hostname || stats.hostname || '—'}</p>
          <p><strong>{t('admin.platform')}:</strong> {info.platform || stats.platform || '—'} ({info.arch || stats.arch || '—'})</p>
          <p><strong>{t('admin.nodeVersion')}:</strong> {info.node_version || '—'}</p>
          <p><strong>{t('admin.pid')}:</strong> {info.pid || '—'}</p>
          <p><strong>Uptime (Sistema):</strong> {formatUptime(info.uptime_seconds ?? stats.uptime_seconds)}</p>
          <p><strong>Uptime (Proceso):</strong> {formatUptime(info.process_uptime_seconds)}</p>
        </div>
      </div>

      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            {t('admin.systemDiagnostics')}
          </h2>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
              {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button className="admin-btn admin-btn-primary" onClick={runDiagnostics} style={{ marginBottom: '12px' }}>
          {t('admin.runDiagnostics')}
        </button>
        {diagnostics.length > 0 && (
          <div className="admin-diagnostics-results">
            {diagnostics.map((d, i) => (
              <div key={i} className="admin-log-entry">
                <span className={`status-badge ${d.status === 'ok' ? 'success' : d.status === 'warning' ? 'warning' : 'error'}`}>{d.status}</span>
                <span style={{ marginLeft: '8px' }}>{d.name}: {d.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  };

  const renderLogs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">{t('admin.systemLogs')}</h2>
        <button className="admin-btn admin-btn-secondary" onClick={loadLogs}>{t('admin.refresh')}</button>
      </div>
      <div className="admin-logs-list">
        {Array.isArray(logs) && logs.length > 0 ? (
          logs.map((log, i) => (
            <div key={i} className="admin-log-entry">
              <span className="admin-log-timestamp">[{log.timestamp || '—'}]</span>
              {log.username && <span className="admin-log-user">{log.username}</span>}
              {log.action && <span className="admin-log-action">{log.action}</span>}
              <span className="admin-log-message">{log.details || log.message || String(log)}</span>
            </div>
          ))
        ) : (
          <div className="admin-log-entry" style={{ opacity: 0.6, fontStyle: 'italic' }}>
            {t('admin.noLogs') || 'No logs available'}
          </div>
        )}
      </div>
    </div>
  );

  const getActionBadgeClass = (action) => {
    if (action === 'LOGIN') return 'success';
    if (action === 'LOGIN_FAILED') return 'error';
    if (action?.includes('LOCK') || action?.includes('RATE_LIMIT')) return 'warning';
    if (action?.includes('UNLOCK') || action?.includes('CLEAR')) return 'info';
    return '';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch { return ts; }
  };

  const renderSecurity = () => {
    const stats = securityData?.stats || {};
    const rateLimits = securityData?.rateLimits?.rateLimits || [];
    const blockedAccounts = securityData?.blockedAccounts || [];
    const recentFailures = securityData?.recentFailures || [];

    return (
      <div className="security-panel">
        
        <div className="admin-grid security-stats-grid">
          <div className="admin-card security-stat-card">
            <div className="security-stat-icon success">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="security-stat-content">
              <div className="stat-value">{stats.logins_24h || 0}</div>
              <div className="stat-label">{t('admin.security.logins24h')}</div>
            </div>
          </div>
          <div className="admin-card security-stat-card">
            <div className="security-stat-icon error">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div className="security-stat-content">
              <div className="stat-value">{stats.failures_24h || 0}</div>
              <div className="stat-label">{t('admin.security.failures24h')}</div>
            </div>
          </div>
          <div className="admin-card security-stat-card">
            <div className="security-stat-icon warning">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="security-stat-content">
              <div className="stat-value">{securityData?.rateLimits?.blockedCount || 0}</div>
              <div className="stat-label">{t('admin.security.blockedIPs')}</div>
            </div>
          </div>
          <div className="admin-card security-stat-card">
            <div className="security-stat-icon error">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="security-stat-content">
              <div className="stat-value">{securityData?.lockedAccounts || 0}</div>
              <div className="stat-label">{t('admin.security.lockedAccounts')}</div>
            </div>
          </div>
        </div>

        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              {t('admin.security.rateLimits')}
            </h2>
            {rateLimits.length > 0 && (
              <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={handleClearAllRateLimits}>
                {t('admin.security.clearAll')}
              </button>
            )}
          </div>
          {rateLimits.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>IP</th>
                  <th>{t('admin.security.attempts')}</th>
                  <th>{t('admin.status')}</th>
                  <th>{t('admin.security.expiresIn')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rateLimits.map((rl, i) => (
                  <tr key={i}>
                    <td><code>{rl.ip}</code></td>
                    <td>{rl.attempts}/{rl.maxAttempts}</td>
                    <td>
                      <span className={`status-badge ${rl.isBlocked ? 'error' : 'warning'}`}>
                        {rl.isBlocked ? t('admin.security.blocked') : t('admin.security.limited')}
                      </span>
                    </td>
                    <td>{Math.ceil(rl.remainingSeconds / 60)} min</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleUnblockIP(rl.ip)}>
                        {t('admin.security.unblock')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="security-empty-message">{t('admin.security.noRateLimits')}</p>
          )}
        </div>

        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {t('admin.security.blockedAccountsTitle')}
            </h2>
          </div>
          {blockedAccounts.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.user')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('admin.security.failedAttempts')}</th>
                  <th>{t('admin.status')}</th>
                  <th>{t('admin.security.lockExpires')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {blockedAccounts.map((acc, i) => (
                  <tr key={i}>
                    <td><strong>{acc.username}</strong></td>
                    <td><span className="status-badge">{acc.role}</span></td>
                    <td>{acc.failed_attempts}</td>
                    <td>
                      <span className={`status-badge ${acc.is_locked ? 'error' : 'warning'}`}>
                        {acc.is_locked ? t('admin.locked') : t('admin.security.atRisk')}
                      </span>
                    </td>
                    <td>{acc.lockout_until ? formatTimestamp(acc.lockout_until) : '—'}</td>
                    <td>
                      {acc.is_locked && (
                        <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleUnlockAccount(acc.id)}>
                          {t('admin.unlock')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="security-empty-message">{t('admin.security.noBlockedAccounts')}</p>
          )}
        </div>

        
        {recentFailures.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {t('admin.security.recentFailures')}
              </h2>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.user')}</th>
                  <th>{t('admin.security.failedAttempts')}</th>
                  <th>{t('admin.security.lastAttempt')}</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((f, i) => (
                  <tr key={i}>
                    <td><strong>{f.username}</strong></td>
                    <td><span className="status-badge error">{f.attempt_count}</span></td>
                    <td>{formatTimestamp(f.last_attempt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {t('admin.security.auditLog')}
            </h2>
            <div className="security-log-controls">
              <select 
                className="admin-input security-filter-select"
                value={securityFilter}
                onChange={(e) => {
                  setSecurityFilter(e.target.value);
                  loadSecurityLogs(e.target.value);
                }}
              >
                <option value="security">{t('admin.security.filterSecurity')}</option>
                <option value="logins">{t('admin.security.filterLogins')}</option>
                <option value="failures">{t('admin.security.filterFailures')}</option>
                <option value="all">{t('admin.security.filterAll')}</option>
              </select>
              <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => { loadSecurityOverview(); loadSecurityLogs(); }}>
                {t('admin.refresh')}
              </button>
            </div>
          </div>
          <div className="admin-logs-list security-logs-list">
            {securityLoading ? (
              <div className="security-empty-message">{t('common.loading')}</div>
            ) : securityLogs.length > 0 ? (
              securityLogs.map((log, i) => (
                <div key={i} className="admin-log-entry security-log-entry">
                  <span className="admin-log-timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span className={`status-badge ${getActionBadgeClass(log.action)}`}>{log.action}</span>
                  {log.username && <span className="admin-log-user">{log.username}</span>}
                  <span className="admin-log-message">{log.details}</span>
                  {log.ip_address && <span className="security-log-ip">{log.ip_address}</span>}
                </div>
              ))
            ) : (
              <div className="security-empty-message">{t('admin.noLogs')}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWindows = () => {
    const linkedWinUsernames = new Set(windowsLinks.map(l => l.windows_username));
    const linkedCloudUsernames = new Set(windowsLinks.map(l => l.cloud_username));
    const unlinkedWinUsers = windowsUsers.filter(u => !linkedWinUsernames.has(u.username));
    const availableCloudUsers = users.filter(u => !linkedCloudUsernames.has(u.username));

    return (
      <div className="windows-panel">
        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 7h20"/><path d="M9 21V7"/></svg>
              {t('admin.windows.detectedUsers')}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={loadWindowsUsers}>
                {t('admin.refresh')}
              </button>
              {unlinkedWinUsers.length > 0 && (
                <button className="admin-btn admin-btn-primary admin-btn-small" onClick={() => {
                  setAutoCreateData({ selectedUsers: [], defaultPassword: '', defaultRole: 'user', autoLink: true });
                  setShowAutoCreateModal(true);
                }}>
                  {t('admin.windows.autoCreate')}
                </button>
              )}
            </div>
          </div>
          {windowsLoading ? (
            <p style={{ opacity: 0.6, padding: '12px' }}>{t('common.loading')}</p>
          ) : windowsUsers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.windows.windowsUser')}</th>
                  <th>{t('admin.windows.desktop')}</th>
                  <th>{t('admin.windows.documents')}</th>
                  <th>{t('admin.windows.downloads')}</th>
                  <th>{t('admin.status')}</th>
                </tr>
              </thead>
              <tbody>
                {windowsUsers.map(wu => (
                  <tr key={wu.username}>
                    <td><strong>{wu.username}</strong></td>
                    <td>{wu.hasDesktop ? `✓ (${wu.folders.find(f => f.type === 'desktop')?.count || 0})` : '—'}</td>
                    <td>{wu.hasDocuments ? `✓ (${wu.folders.find(f => f.type === 'documents')?.count || 0})` : '—'}</td>
                    <td>{wu.hasDownloads ? `✓ (${wu.folders.find(f => f.type === 'downloads')?.count || 0})` : '—'}</td>
                    <td>
                      {linkedWinUsernames.has(wu.username) ? (
                        <span className="status-badge success">{t('admin.windows.linked')}</span>
                      ) : (
                        <span className="status-badge warning">{t('admin.windows.notLinked')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ opacity: 0.6, padding: '12px', fontStyle: 'italic' }}>{t('admin.windows.noUsersDetected')}</p>
          )}
        </div>

        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              {t('admin.windows.linkedAccounts')}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="admin-btn admin-btn-primary admin-btn-small" onClick={() => {
                setLinkData({ cloud_username: '', windows_username: '', sync_desktop: true, sync_documents: true, sync_downloads: true });
                setShowLinkModal(true);
              }}>
                + {t('admin.windows.linkAccount')}
              </button>
              {windowsLinks.length > 0 && (
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={handleSyncAll} disabled={syncingId === 'all'}>
                  {syncingId === 'all' ? t('admin.windows.syncing') : t('admin.windows.syncAll')}
                </button>
              )}
            </div>
          </div>
          {windowsLinks.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.windows.cloudUser')}</th>
                  <th>{t('admin.windows.windowsUser')}</th>
                  <th>{t('admin.windows.desktop')}</th>
                  <th>{t('admin.windows.documents')}</th>
                  <th>{t('admin.windows.downloads')}</th>
                  <th>{t('admin.windows.lastSync')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {windowsLinks.map(link => (
                  <tr key={link.id}>
                    <td><strong>{link.cloud_username}</strong></td>
                    <td>{link.windows_username}</td>
                    <td>
                      <label className="win-toggle">
                        <input type="checkbox" checked={link.sync_desktop} onChange={e => handleToggleSyncSetting(link.id, 'sync_desktop', e.target.checked)} />
                        <span className="win-toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <label className="win-toggle">
                        <input type="checkbox" checked={link.sync_documents} onChange={e => handleToggleSyncSetting(link.id, 'sync_documents', e.target.checked)} />
                        <span className="win-toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <label className="win-toggle">
                        <input type="checkbox" checked={link.sync_downloads} onChange={e => handleToggleSyncSetting(link.id, 'sync_downloads', e.target.checked)} />
                        <span className="win-toggle-slider"></span>
                      </label>
                    </td>
                    <td style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      {link.last_sync ? new Date(link.last_sync).toLocaleString() : '—'}
                    </td>
                    <td>
                      <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleSyncUser(link.id)} disabled={syncingId === link.id} style={{ marginRight: '5px' }}>
                        {syncingId === link.id ? '...' : t('admin.windows.sync')}
                      </button>
                      <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleUnlink(link.id)}>
                        {t('admin.windows.unlink')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ opacity: 0.6, padding: '12px', fontStyle: 'italic' }}>{t('admin.windows.noLinks')}</p>
          )}
        </div>

        
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '8px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              {t('admin.windows.howItWorks')}
            </h2>
          </div>
          <div className="admin-info-list" style={{ padding: '8px 12px' }}>
            <p>* {t('admin.windows.help1')}</p>
            <p>* {t('admin.windows.help2')}</p>
            <p>* {t('admin.windows.help3')}</p>
            <p>* {t('admin.windows.help4')}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      {renderSidebar()}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-title">
            {activeTab === 'dashboard' && t('admin.dashboard')}
            {activeTab === 'users' && t('admin.users')}
            {activeTab === 'groups' && t('admin.groups')}
            {activeTab === 'system' && t('admin.system')}
            {activeTab === 'logs' && t('admin.logs')}
            {activeTab === 'security' && t('admin.security.title')}
            {activeTab === 'rdp' && t('admin.rdpAdmin')}
            {activeTab === 'roadmap' && 'Roadmap'}
            {activeTab === 'windows' && t('admin.windows.title')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <NotificationCenter />
            <div className="admin-user-profile">
              <span>{t('admin.greeting', { name: user.username })}</span>
            </div>
          </div>
        </header>

        {alert.show && (
          <div className={`admin-alert admin-alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'groups' && <GroupManager />}
        {activeTab === 'system' && renderSystem()}
        {activeTab === 'logs' && renderLogs()}
        {activeTab === 'security' && renderSecurity()}
        {activeTab === 'rdp' && <RDPManager />}
        {activeTab === 'roadmap' && renderRoadmapAccess()}
        {activeTab === 'windows' && renderWindows()}
      </main>

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
        />
      )}

      {deleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          userName={deleteModal.user?.username}
          onClose={() => setDeleteModal({ isOpen: false, user: null })}
          onConfirm={handleScheduleDelete}
        />
      )}

      {showAddUserModal && (
        <div className="admin-modal" onClick={() => setShowAddUserModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{t('admin.newUser')}</h3>
              <button className="admin-modal-close" onClick={() => setShowAddUserModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleCreateUser}>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.username')}</label>
                  <input 
                    className="admin-input"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.password')}</label>
                  <input 
                    className="admin-input"
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.role')}</label>
                  <select 
                    className="admin-input"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user">{t('admin.roleUser')}</option>
                    <option value="boss">{t('admin.roleBoss')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                    <option value="guest">{t('admin.roleGuest')}</option>
                  </select>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary">{t('admin.createUser')}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="admin-modal" onClick={() => setShowEditUserModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{t('admin.editUser')}: {editingUser.username}</h3>
              <button className="admin-modal-close" onClick={() => setShowEditUserModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleUpdateUser}>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.newPassword')}</label>
                  <input 
                    className="admin-input"
                    type="password"
                    value={editingUser.password}
                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                    placeholder={t('admin.leaveBlankToKeep')}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.role')}</label>
                  <select 
                    className="admin-input"
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="user">{t('admin.roleUser')}</option>
                    <option value="boss">{t('admin.roleBoss')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                    <option value="guest">{t('admin.roleGuest')}</option>
                  </select>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary">{t('common.save')}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      
      {showLinkModal && (
        <div className="admin-modal" onClick={() => setShowLinkModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{t('admin.windows.linkAccount')}</h3>
              <button className="admin-modal-close" onClick={() => setShowLinkModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleLinkUsers}>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.windows.cloudUser')}</label>
                  <select className="admin-input" value={linkData.cloud_username} onChange={e => setLinkData({...linkData, cloud_username: e.target.value})} required>
                    <option value="">{t('admin.windows.selectUser')}</option>
                    {users.filter(u => !windowsLinks.some(l => l.cloud_username === u.username)).map(u => (
                      <option key={u.id} value={u.username}>{u.username} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.windows.windowsUser')}</label>
                  <select className="admin-input" value={linkData.windows_username} onChange={e => setLinkData({...linkData, windows_username: e.target.value})} required>
                    <option value="">{t('admin.windows.selectUser')}</option>
                    {windowsUsers.filter(u => !windowsLinks.some(l => l.windows_username === u.username)).map(u => (
                      <option key={u.username} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.windows.syncFolders')}</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={linkData.sync_desktop} onChange={e => setLinkData({...linkData, sync_desktop: e.target.checked})} />
                      {t('admin.windows.desktop')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={linkData.sync_documents} onChange={e => setLinkData({...linkData, sync_documents: e.target.checked})} />
                      {t('admin.windows.documents')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={linkData.sync_downloads} onChange={e => setLinkData({...linkData, sync_downloads: e.target.checked})} />
                      {t('admin.windows.downloads')}
                    </label>
                  </div>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary">{t('admin.windows.linkAccount')}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      
      {showAutoCreateModal && (
        <div className="admin-modal" onClick={() => setShowAutoCreateModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="admin-modal-header">
              <h3>{t('admin.windows.autoCreate')}</h3>
              <button className="admin-modal-close" onClick={() => setShowAutoCreateModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleAutoCreate}>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.windows.selectUsersToCreate')}</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: '8px', padding: '8px' }}>
                    {windowsUsers.filter(u => !windowsLinks.some(l => l.windows_username === u.username)).map(wu => {
                      const cloudExists = users.some(u => u.username === wu.username);
                      return (
                        <label key={wu.username} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', cursor: 'pointer', opacity: cloudExists ? 0.5 : 1 }}>
                          <input 
                            type="checkbox" 
                            checked={autoCreateData.selectedUsers.includes(wu.username)}
                            onChange={() => toggleAutoCreateUser(wu.username)}
                            disabled={cloudExists}
                          />
                          <span style={{ fontWeight: 500 }}>{wu.username}</span>
                          {cloudExists && <span className="status-badge" style={{ fontSize: '0.7rem' }}>{t('admin.windows.alreadyExists')}</span>}
                          <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: 'auto' }}>
                            {wu.folders.reduce((s, f) => s + f.count, 0)} {t('admin.windows.files')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.windows.defaultPassword')}</label>
                  <input className="admin-input" type="password" value={autoCreateData.defaultPassword} onChange={e => setAutoCreateData({...autoCreateData, defaultPassword: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.role')}</label>
                  <select className="admin-input" value={autoCreateData.defaultRole} onChange={e => setAutoCreateData({...autoCreateData, defaultRole: e.target.value})}>
                    <option value="user">{t('admin.roleUser')}</option>
                    <option value="boss">{t('admin.roleBoss')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autoCreateData.autoLink} onChange={e => setAutoCreateData({...autoCreateData, autoLink: e.target.checked})} />
                    {t('admin.windows.autoLinkAfterCreate')}
                  </label>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={autoCreateData.selectedUsers.length === 0}>
                  {t('admin.windows.createSelected')} ({autoCreateData.selectedUsers.length})
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
