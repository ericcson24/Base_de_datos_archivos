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
      if (data.success) setUsers(data.users);
    } catch (e) { console.error(e); }
  };

  const loadLogs = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/logs');
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (e) { console.error(e); }
  };

  const loadInbox = async () => {
    try {
      const res = await fetchWithAuth('/admin/api/inbox');
      const data = await res.json();
      if (data.success) setInboxMessages(data.messages);
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
        ⚡ {t('admin.title')}
      </div>
      <nav className="admin-nav">
        <button 
          className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 {t('admin.dashboard')}
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 {t('admin.users')}
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          📁 {t('admin.groups')}
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ {t('admin.system')}
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 {t('admin.logs')}
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'rdp' ? 'active' : ''}`}
          onClick={() => setActiveTab('rdp')}
        >
          🖥️ {t('common.remoteDesktop')}
        </button>
      </nav>
      <div className="admin-sidebar-footer">
        <button className="admin-nav-item" onClick={() => setShowSettingsModal(true)}>
          ⚙️ {t('common.settings')}
        </button>
        <button className="admin-nav-item" onClick={onBackToFolders}>
          📂 {t('userPanel.myFiles')}
        </button>
        <button className="admin-nav-item logout-btn" onClick={onLogout}>
          🚪 {t('common.logout')}
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
        <div className="stat-value">{systemData.status === 'online' ? '✅' : '❌'}</div>
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
            ⚠️ {t('admin.pendingDeletions')}
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
        {logs.map((log, i) => (
          <div key={i} className="admin-log-entry">
            <span className="admin-log-timestamp">[{log.timestamp}]</span>
            <span className="admin-log-message">{log.message || log}</span>
          </div>
        ))}
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
