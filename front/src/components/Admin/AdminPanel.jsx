import React, { useState, useEffect } from 'react';
import SettingsModal from '../Modals/SettingsModal';
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal';
import RDPManager from './RDPManager';
import GroupManager from './GroupManager';
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
        showAlert('success', 'Usuario creado correctamente');
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', 'Error al crear usuario');
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
        showAlert('success', 'Eliminación programada');
        loadUsers();
      } else {
        showAlert('error', data.message);
      }
    } catch (e) {
      showAlert('error', 'Error de conexión');
    } finally {
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleCancelDelete = async (userId) => {
    try {
      const res = await fetchWithAuth(`/admin/api/users/${userId}/cancel-deletion`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', 'Eliminación cancelada');
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
    if (diff <= 0) return 'Procesando...';
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
        showAlert('success', 'Usuario actualizado correctamente');
      } else {
        showAlert('error', data.message || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('error', 'Error de conexión al actualizar usuario');
    }
  };

  const handleLockUser = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await fetchWithAuth(`/admin/api/users/${userId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ locked: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        loadUsers();
        showAlert('success', `Usuario ${newStatus ? 'bloqueado' : 'desbloqueado'} correctamente`);
      } else {
        showAlert('error', data.message || 'Error al cambiar estado del usuario');
      }
    } catch (error) {
      console.error('Error locking user:', error);
      showAlert('error', 'Error de conexión');
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
        <span></span> AdminPanel
      </div>
      <nav className="admin-nav">
        <button 
          className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span></span> Dashboard
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'rdp' ? 'active' : ''}`}
          onClick={() => setActiveTab('rdp')}
        >
          <span></span> RDP Manager
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span></span> Usuarios
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <span></span> Grupos
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <span></span> Sistema
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <span></span> Logs
        </button>
      </nav>
      <div className="admin-sidebar-footer">
        <button className="admin-nav-item" onClick={() => setShowSettingsModal(true)}>
          <span></span> Configuración
        </button>
        <button className="admin-nav-item" onClick={onBackToFolders}>
          <span></span> Mis Archivos
        </button>
        <button className="admin-nav-item logout-btn" onClick={onLogout}>
          <span></span> Cerrar Sesión
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="admin-grid">
      <div className="admin-card">
        <div className="stat-value">{systemData.active_users || 0}</div>
        <div className="stat-label">Usuarios Activos</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">{connections.active_connections || 0}</div>
        <div className="stat-label">Conexiones RDP</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">{systemData.status === 'online' ? '' : ''}</div>
        <div className="stat-label">Estado del Sistema</div>
      </div>
      <div className="admin-card">
        <div className="stat-value">{inboxMessages.filter(m => !m.is_read).length}</div>
        <div className="stat-label">Notificaciones</div>
      </div>
    </div>
  );

  const renderUsers = () => {
    const activeUsers = users.filter(u => !u.deletion_scheduled_at);
    const pendingUsers = users.filter(u => u.deletion_scheduled_at);

    return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Gestión de Usuarios</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddUserModal(true)}>
          + Nuevo Usuario
        </button>
      </div>

      {pendingUsers.length > 0 && (
        <div className="pending-deletions-section">
          <h3 className="section-subtitle" style={{ color: '#ff4d4f', marginTop: '1rem', marginBottom: '1rem' }}>
            ⚠️ Eliminaciones Pendientes
          </h3>
          <table className="admin-table" style={{ border: '1px solid #ff4d4f', marginBottom: '2rem' }}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tiempo Restante</th>
                <th>Acciones</th>
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
                      Cancelar Eliminación
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-subtitle" style={{ marginBottom: '1rem' }}>Usuarios Activos</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {activeUsers.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td><span className="status-badge">{u.role}</span></td>
              <td>
                <span className={`status-badge ${u.is_locked ? 'error' : 'success'}`}>
                  {u.is_locked ? 'Bloqueado' : 'Activo'}
                </span>
              </td>
              <td>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => openEditModal(u)} style={{ marginRight: '5px' }}>
                  Editar
                </button>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => handleLockUser(u.id, u.is_locked)} style={{ marginRight: '5px' }}>
                  {u.is_locked ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button className="admin-btn admin-btn-secondary admin-btn-small" onClick={() => confirmDeleteUser(u)}>
                  Eliminar
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
          <h2 className="admin-card-title">Información del Servidor</h2>
        </div>
        <div className="admin-info-list">
          <p><strong>Hostname:</strong> {serverInfo.hostname}</p>
          <p><strong>Plataforma:</strong> {serverInfo.platform}</p>
          <p><strong>Node Version:</strong> {serverInfo.node_version}</p>
          <p><strong>Memoria:</strong> {systemData.server_stats?.memory_usage}</p>
          <p><strong>CPU:</strong> {systemData.server_stats?.cpu_usage}</p>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Diagnósticos</h2>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => {}}>
          Ejecutar Diagnóstico
        </button>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Logs del Sistema</h2>
        <button className="admin-btn admin-btn-secondary" onClick={loadLogs}>Actualizar</button>
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
            {activeTab === 'dashboard' && 'Panel de Control'}
            {activeTab === 'rdp' && 'Gestor RDP'}
            {activeTab === 'users' && 'Usuarios'}
            {activeTab === 'groups' && 'Gestión de Grupos'}
            {activeTab === 'system' && 'Sistema'}
            {activeTab === 'logs' && 'Registros'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <NotificationCenter />
            <div className="admin-user-profile">
              <span>Hola, {user.username}</span>
            </div>
          </div>
        </header>

        {alert.show && (
          <div className={`admin-alert admin-alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'rdp' && <RDPManager />}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'groups' && <GroupManager />}
        {activeTab === 'system' && renderSystem()}
        {activeTab === 'logs' && renderLogs()}
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
              <h3>Nuevo Usuario</h3>
              <button className="admin-modal-close" onClick={() => setShowAddUserModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleCreateUser}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Usuario</label>
                  <input 
                    className="admin-input"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Contraseña</label>
                  <input 
                    className="admin-input"
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Rol</label>
                  <select 
                    className="admin-input"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user">Usuario</option>
                    <option value="boss">Jefe</option>
                    <option value="admin">Administrador</option>
                    <option value="guest">Invitado (Sin Grupos)</option>
                  </select>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary">Crear Usuario</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="admin-modal" onClick={() => setShowEditUserModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Editar Usuario: {editingUser.username}</h3>
              <button className="admin-modal-close" onClick={() => setShowEditUserModal(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleUpdateUser}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Nueva Contraseña (Opcional)</label>
                  <input 
                    className="admin-input"
                    type="password"
                    value={editingUser.password}
                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                    placeholder="Dejar en blanco para mantener"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Rol</label>
                  <select 
                    className="admin-input"
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="user">Usuario</option>
                    <option value="boss">Jefe</option>
                    <option value="admin">Administrador</option>
                    <option value="guest">Invitado (Sin Grupos)</option>
                  </select>
                </div>
                <button type="submit" className="admin-btn admin-btn-primary">Guardar Cambios</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
