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

  // Data States
  const [systemData, setSystemData] = useState({});
  const [serverInfo, setServerInfo] = useState({});
  const [connections, setConnections] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // UI States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    loadInitialData();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // API Calls
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

  const handleDeleteUser = (userId) => {
    // Deprecated in favor of confirmDeleteUser
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
        showAlert('success', t('admin.deletionScheduled'));
        loadUsers();
      } else {
        showAlert('error', data.message);
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
          className={`admin-nav-item ${activeTab === 'rdp' ? 'active' : ''}`}
          onClick={() => setActiveTab('rdp')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span>{t('common.remoteDesktop')}</span>
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

    return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">{t('admin.userManagement')}</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddUserModal(true)}>
          + {t('admin.addUser')}
        </button>
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
            <th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {activeUsers.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td><span className="status-badge">{u.role}</span></td>
              <td>
                <span className={`status-badge ${u.is_locked ? 'error' : 'success'}`}>
                  {u.is_locked ? t('admin.locked') : t('admin.active')}
                </span>
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
          ))}
        </tbody>
      </table>
    </div>
  );
  };

  const renderSystem = () => (
    <div className="admin-grid">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('admin.serverInfo')}</h2>
        </div>
        <div className="admin-info-list">
          <p><strong>{t('admin.hostname')}:</strong> {serverInfo.hostname}</p>
          <p><strong>{t('admin.platform')}:</strong> {serverInfo.platform}</p>
          <p><strong>{t('admin.nodeVersion')}:</strong> {serverInfo.node_version}</p>
          <p><strong>{t('admin.memory')}:</strong> {systemData.server_stats?.memory_usage}</p>
          <p><strong>{t('admin.cpuUsage')}:</strong> {systemData.server_stats?.cpu_usage}</p>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('admin.systemDiagnostics')}</h2>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={runDiagnostics}>
          {t('admin.runDiagnostics')}
        </button>
        {diagnostics.length > 0 && (
          <div className="admin-diagnostics-results" style={{ marginTop: '16px' }}>
            {diagnostics.map((d, i) => (
              <div key={i} className="admin-log-entry">
                <span className={`status-badge ${d.status === 'ok' ? 'success' : 'error'}`}>{d.status}</span>
                <span style={{ marginLeft: '8px' }}>{d.name}: {d.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
            {activeTab === 'rdp' && t('admin.rdpAdmin')}
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
        {activeTab === 'rdp' && <RDPManager />}
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
    </div>
  );
};

export default AdminPanel;
