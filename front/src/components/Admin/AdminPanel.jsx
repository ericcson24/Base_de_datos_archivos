import React, { useState, useEffect } from 'react';
import SettingsModal from '../Modals/SettingsModal';
import { useLanguage } from '../../context/LanguageContext';
import './AdminPanel.css';

const AdminPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode }) => {
  const { t } = useLanguage();
  // Estados para los datos del sistema
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [systemData, setSystemData] = useState({});
  const [serverInfo, setServerInfo] = useState({});
  const [connections, setConnections] = useState({});
  const [realtimeData, setRealtimeData] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para configuración de seguridad
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Estados para los modales
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserLogsModal, setShowUserLogsModal] = useState(false);
  const [showPasswordInfoModal, setShowPasswordInfoModal] = useState(false);

  // Estados para formularios
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [changePassword, setChangePassword] = useState({ username: '', newPassword: '', confirmPassword: '' });
  const [selectedUser, setSelectedUser] = useState('');
  const [userLogs, setUserLogs] = useState([]);
  const [passwordInfo, setPasswordInfo] = useState({});

  // Estados para alertas
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [modalAlert, setModalAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    // Cargar datos iniciales
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadSystemStatus(),
          loadServerInfo(),
          loadConnections(),
          loadUsers(),
          loadLogs(),
          loadSecuritySettings(),
          loadInbox()
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Función principal para refrescar todos los datos
  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSystemStatus(),
        loadServerInfo(),
        loadConnections(),
        loadUsers(),
        loadLogs(),
        loadSecuritySettings(),
        loadInbox()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuración de seguridad
  const loadSecuritySettings = async () => {
    try {
      const response = await fetch('/admin/api/security-settings');
      const data = await response.json();
      if (data.success) {
        setRecoveryEmail(data.recoveryEmail || '');
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  // Guardar configuración de seguridad
  const saveSecuritySettings = async (e) => {
    e.preventDefault();
    setIsSavingEmail(true);
    try {
      const response = await fetch('/admin/api/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryEmail })
      });
      const data = await response.json();
      if (data.success) {
        showAlert('success', 'Correo de recuperación guardado correctamente');
      } else {
        showAlert('error', data.message || 'Error al guardar');
      }
    } catch (error) {
      showAlert('error', 'Error de conexión');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Estado para buzón de entrada
  const [inboxMessages, setInboxMessages] = useState([]);

  // Cargar buzón de entrada
  const loadInbox = async () => {
    try {
      const response = await fetch('/admin/api/inbox');
      const data = await response.json();
      if (data.success) {
        setInboxMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
    }
  };

  // Marcar mensaje como leído
  const markAsRead = async (id) => {
    try {
      const response = await fetch(`/admin/api/inbox/${id}/read`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        loadInbox(); // Recargar para actualizar estado
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Eliminar mensaje
  const deleteMessage = async (id) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    try {
      const response = await fetch(`/admin/api/inbox/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        loadInbox();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Cargar estado del sistema
  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/admin/api/status');
      const data = await response.json();
      
      if (data.success) {
        setSystemData(data);
      } else {
        showAlert('error', 'Error cargando estado del sistema');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión al cargar estado');
    }
  };

  // Cargar información del servidor
  const loadServerInfo = async () => {
    try {
      const response = await fetch('/admin/api/server/info');
      const data = await response.json();
      
      if (data.success) {
        setServerInfo(data.server_info);
      } else {
        console.error('Error cargando información del servidor');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Cargar información de conexiones
  const loadConnections = async () => {
    try {
      const response = await fetch('/admin/api/server/connections');
      const data = await response.json();
      
      if (data.success) {
        setConnections(data.connections);
      } else {
        console.error('Error cargando conexiones');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      const response = await fetch('/admin/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        showAlert('error', 'Error cargando usuarios');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión al cargar usuarios');
    }
  };

  // Cargar logs
  const loadLogs = async () => {
    try {
      const response = await fetch('/admin/api/logs');
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      } else {
        showAlert('error', 'Error cargando logs');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión al cargar logs');
    }
  };

  // Añadir usuario
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.password) {
      setModalAlert({ show: true, type: 'error', message: 'Todos los campos son obligatorios' });
      return;
    }

    try {
      const response = await fetch('/admin/api/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (data.success) {
        setModalAlert({ show: true, type: 'success', message: data.message });
        setTimeout(() => {
          setShowAddUserModal(false);
          loadUsers();
          setNewUser({ username: '', password: '', role: 'user' });
          hideModalAlert();
        }, 1500);
      } else {
        setModalAlert({ show: true, type: 'error', message: data.message });
      }
    } catch (error) {
      console.error('Error:', error);
      setModalAlert({ show: true, type: 'error', message: 'Error de conexión' });
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!changePassword.newPassword || !changePassword.confirmPassword) {
      setModalAlert({ show: true, type: 'error', message: 'Todos los campos son obligatorios' });
      return;
    }

    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setModalAlert({ show: true, type: 'error', message: 'Las contraseñas no coinciden' });
      return;
    }

    if (changePassword.newPassword.length < 6) {
      setModalAlert({ show: true, type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    try {
      const response = await fetch('/admin/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: changePassword.username, 
          new_password: changePassword.newPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        setModalAlert({ show: true, type: 'success', message: data.message });
        setTimeout(() => {
          setShowChangePasswordModal(false);
          loadUsers();
          setChangePassword({ username: '', newPassword: '', confirmPassword: '' });
          hideModalAlert();
        }, 1500);
      } else {
        setModalAlert({ show: true, type: 'error', message: data.message });
      }
    } catch (error) {
      console.error('Error:', error);
      setModalAlert({ show: true, type: 'error', message: 'Error de conexión' });
    }
  };

  // Desbloquear usuario
  const unlockUser = async (username) => {
    if (!window.confirm(`¿Estás seguro de que quieres desbloquear al usuario "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch('/admin/api/users/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.success) {
        showAlert('success', data.message);
        loadUsers();
      } else {
        showAlert('error', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión');
    }
  };

  // Desbloquear todos los usuarios
  const unlockAllUsers = async () => {
    if (!window.confirm('¿Estás seguro de que quieres desbloquear TODOS los usuarios?')) {
      return;
    }

    try {
      const response = await fetch('/admin/api/users/unlock-all', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        showAlert('success', data.message);
        loadUsers();
      } else {
        showAlert('error', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión');
    }
  };

  // Eliminar usuario
  const deleteUser = async (username) => {
    if (!window.confirm(`¿Estás seguro de que quieres ELIMINAR al usuario "${username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch('/admin/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.success) {
        showAlert('success', data.message);
        loadUsers();
      } else {
        showAlert('error', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Error de conexión');
    }
  };

  // Mostrar logs de usuario
  const showUserLogs = async (username) => {
    setSelectedUser(username);
    setShowUserLogsModal(true);
    setUserLogs([]);

    try {
      const response = await fetch(`/admin/api/users/${username}/logs`);
      const data = await response.json();

      if (data.success) {
        setUserLogs(data.logs);
      } else {
        setUserLogs([{ message: `Error cargando logs: ${data.message}` }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setUserLogs([{ message: 'Error de conexión al cargar logs' }]);
    }
  };

  // Mostrar información de contraseña
  const showUserPassword = async (username) => {
    setSelectedUser(username);
    setShowPasswordInfoModal(true);
    setPasswordInfo({});

    try {
      const response = await fetch(`/admin/api/users/${username}/password-info`);
      const data = await response.json();

      if (data.success) {
        setPasswordInfo(data.password_info);
      } else {
        setPasswordInfo({ error: `Error cargando información: ${data.message}` });
      }
    } catch (error) {
      console.error('Error:', error);
      setPasswordInfo({ error: 'Error de conexión al cargar información' });
    }
  };

  // Ejecutar diagnósticos
  const runDiagnostics = async () => {
    setDiagnostics([{ test: 'Ejecutando diagnósticos...', message: 'Por favor espera...', success: null }]);

    try {
      const response = await fetch('/admin/api/diagnostics/run', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setDiagnostics(data.results);
      } else {
        setDiagnostics([{ test: 'Error', message: 'Error ejecutando diagnósticos', success: false }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setDiagnostics([{ test: 'Error', message: 'Error de conexión al ejecutar diagnósticos', success: false }]);
    }
  };

  // Función para mostrar alertas
  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 5000);
  };

  // Función para limpiar alertas del modal
  const hideModalAlert = () => {
    setModalAlert({ show: false, type: '', message: '' });
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <span>🛠️</span>
            <span>{t('admin.title')}</span>
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn admin-btn-secondary" onClick={refreshData}>
              🔄 {t('admin.refresh')}
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={() => setShowSettingsModal(true)}>
              ⚙️
            </button>
            <button className="admin-btn admin-btn-primary" onClick={onBackToFolders}>
              ← {t('admin.back')}
            </button>
          </div>
        </div>
      </header>

      {/* Alert */}
      {alert.show && (
        <div className={`admin-alert admin-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Contenido principal */}
      <div className="admin-container">
        {/* Estadísticas del sistema */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">📊 {t('admin.systemStatus')}</h2>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.total_users || 0}</span>
                <div className="admin-stat-label">{t('admin.totalUsers')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.active_users || 0}</span>
                <div className="admin-stat-label">{t('admin.activeUsers')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.locked_users || 0}</span>
                <div className="admin-stat-label">{t('admin.lockedUsers')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.status === 'online' ? '🟢' : '🔴'}</span>
                <div className="admin-stat-label">{t('admin.systemStatus')}</div>
              </div>
              {/* Estadísticas adicionales del servidor */}
              {systemData.server_stats && (
                <>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.cpu_usage}</span>
                    <div className="admin-stat-label">{t('admin.cpuUsage')}</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.memory_usage}</span>
                    <div className="admin-stat-label">{t('admin.memory')} ({systemData.server_stats.memory_used_gb}GB/{systemData.server_stats.memory_total_gb}GB)</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.disk_usage}</span>
                    <div className="admin-stat-label">{t('admin.disk')} ({systemData.server_stats.disk_free_gb}GB {t('admin.free')})</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">↑{systemData.server_stats.bytes_sent_mb}MB ↓{systemData.server_stats.bytes_recv_mb}MB</span>
                    <div className="admin-stat-label">{t('admin.network')}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Información del Servidor */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🖥️ {t('admin.serverInfo')}</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadServerInfo}>
              🔄 {t('admin.refresh')}
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.hostname || 'N/A'}</span>
                <div className="admin-stat-label">{t('admin.hostname')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.platform || 'N/A'}</span>
                <div className="admin-stat-label">{t('admin.platform')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.node_version || 'N/A'}</span>
                <div className="admin-stat-label">{t('admin.nodeVersion')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.environment?.PORT || 'N/A'}</span>
                <div className="admin-stat-label">{t('admin.port')}</div>
              </div>
              {serverInfo.process_info && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{serverInfo.process_info.pid}</span>
                  <div className="admin-stat-label">{t('admin.pid')}</div>
                </div>
              )}
              {serverInfo.network_interfaces && serverInfo.network_interfaces.length > 0 && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{serverInfo.network_interfaces.length}</span>
                  <div className="admin-stat-label">{t('admin.networkInterfaces')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuración de Seguridad */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🛡️ Configuración de Seguridad</h2>
          </div>
          <div className="admin-card-content">
            <form onSubmit={saveSecuritySettings} className="security-form" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo de Recuperación (Admin)</label>
                <input 
                  type="email" 
                  value={recoveryEmail} 
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  className="admin-input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
                <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Este correo se usará para enviar alertas de bloqueo y solicitudes de restablecimiento. Se guarda encriptado.
                </small>
              </div>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={isSavingEmail}>
                {isSavingEmail ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </form>
          </div>
        </div>

        {/* Buzón de Admin */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">📬 Buzón de Admin</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadInbox}>
              🔄 Actualizar
            </button>
          </div>
          <div className="admin-card-content">
            {inboxMessages.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay notificaciones nuevas</p>
            ) : (
              <div className="admin-inbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {inboxMessages.map((msg) => (
                  <div key={msg.id} className={`admin-inbox-item ${msg.is_read ? 'read' : 'unread'}`} 
                       style={{ 
                         padding: '1rem', 
                         border: '1px solid var(--border-color)', 
                         borderRadius: '8px',
                         backgroundColor: msg.is_read ? 'transparent' : 'rgba(var(--primary-rgb), 0.05)',
                         borderLeft: msg.is_read ? '1px solid var(--border-color)' : '4px solid var(--primary-color)'
                       }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.1em' }}>{msg.subject}</strong>
                      <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {!msg.is_read && (
                        <button onClick={() => markAsRead(msg.id)} className="admin-btn admin-btn-small admin-btn-secondary">
                          Marcar como leído
                        </button>
                      )}
                      <button onClick={() => deleteMessage(msg.id)} className="admin-btn admin-btn-small admin-btn-danger">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conexiones y Tráfico */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🌐 {t('admin.connections')}</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadConnections}>
              🔄 {t('admin.refresh')}
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.active_connections || 0}</span>
                <div className="admin-stat-label">{t('admin.activeConnections')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.total_requests_today || 0}</span>
                <div className="admin-stat-label">{t('admin.requestsToday')}</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.requests_per_minute || 0}</span>
                <div className="admin-stat-label">{t('admin.requestsPerMin')}</div>
              </div>
              {connections.top_ips && connections.top_ips.length > 0 && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{connections.top_ips[0]?.ip || 'N/A'}</span>
                  <div className="admin-stat-label">{t('admin.mostActiveIp')}</div>
                </div>
              )}
            </div>
            
            {/* Códigos de respuesta */}
            {connections.response_codes && (
              <div className="admin-response-codes">
                <h4>{t('admin.responseCodes')}</h4>
                <div className="admin-stats-grid">
                  {Object.entries(connections.response_codes).map(([code, count]) => (
                    <div key={code} className="admin-stat-card">
                      <span className="admin-stat-number">{count}</span>
                      <div className="admin-stat-label">HTTP {code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gestión de usuarios */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">👥 {t('admin.userManagement')}</h2>
            <div className="admin-btn-group">
              <button className="admin-btn admin-btn-primary" onClick={() => {
                setShowAddUserModal(true);
                hideModalAlert();
              }}>
                ➕ {t('admin.addUser')}
              </button>
              <button className="admin-btn admin-btn-success" onClick={unlockAllUsers}>
                🔓 {t('admin.unlockAll')}
              </button>
            </div>
          </div>
          <div className="admin-card-content">
            <div className="admin-table-container">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>{t('admin.user')}</th>
                    <th>{t('admin.role')}</th>
                    <th>{t('admin.status')}</th>
                    <th>{t('admin.lastAccess')}</th>
                    <th>{t('admin.failedAttempts')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.role === 'admin' ? `👑 ${t('admin.adminRole')}` : `👤 ${t('admin.userRole')}`}</td>
                      <td>
                        <span className={`admin-user-status ${user.is_locked ? 'admin-status-locked' : 'admin-status-active'}`}>
                          {user.is_locked ? `🔒 ${t('admin.locked')} (${user.time_remaining})` : `🔓 ${t('admin.active')}`}
                        </span>
                      </td>
                      <td>{user.last_login ? new Date(user.last_login).toLocaleString() : t('admin.never')}</td>
                      <td>{user.failed_attempts}</td>
                      <td>
                        <div className="admin-btn-group">
                          {user.is_locked && (
                            <button className="admin-btn admin-btn-success admin-btn-small" onClick={() => unlockUser(user.username)}>
                              🔓 {t('admin.unlock')}
                            </button>
                          )}
                          <button className="admin-btn admin-btn-primary admin-btn-small" onClick={() => {
                            setChangePassword({ username: user.username, newPassword: '', confirmPassword: '' });
                            setShowChangePasswordModal(true);
                            hideModalAlert();
                          }}>
                            🔑 {t('admin.changePassword')}
                          </button>
                          <button className="admin-btn admin-btn-info admin-btn-small" onClick={() => showUserLogs(user.username)}>
                            📋 {t('admin.viewLogs')}
                          </button>
                          <button className="admin-btn admin-btn-warning admin-btn-small" onClick={() => showUserPassword(user.username)}>
                            👁️ {t('admin.viewPasswordInfo')}
                          </button>
                          {user.username !== 'administrador' && (
                            <button className="admin-btn admin-btn-danger admin-btn-small" onClick={() => deleteUser(user.username)}>
                              🗑️ {t('admin.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Logs del sistema */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">📝 {t('admin.systemLogs')}</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadLogs}>
              🔄 {t('admin.reloadLogs')}
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-logs-container">
              {logs.length === 0 ? (
                <p>{t('admin.noLogs')}</p>
              ) : (
                <>
                  <div className="admin-logs-list">
                    {logs.slice(0, 100).map((log, index) => (
                      <div key={index} className="admin-log-entry">
                        <span className="admin-log-timestamp">[{log.timestamp || 'N/A'}]</span>
                        <span className={`admin-log-message admin-log-${log.level || 'info'}`}>
                          {log.message || log.raw || log}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="admin-logs-footer">
                    <strong>{t('admin.totalLogs')}:</strong> {logs.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Diagnósticos */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🔍 {t('admin.systemDiagnostics')}</h2>
            <button className="admin-btn admin-btn-primary" onClick={runDiagnostics}>
              🧪 {t('admin.runDiagnostics')}
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-diagnostics-container">
              {diagnostics.length === 0 ? (
                <p>{t('admin.runDiagnosticsPrompt')}</p>
              ) : (
                diagnostics.map((result, index) => (
                  <div key={index} className="admin-diagnostic-item">
                    <h4>{result.success === null ? '⏳' : result.success ? '✅' : '❌'} {result.test}</h4>
                    <p>{result.message}</p>
                    {result.details && (
                      <pre className="admin-diagnostic-details">{result.details}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
        />
      )}
      
      {/* Modal para añadir usuario */}
      {showAddUserModal && (
        <div className="admin-modal" onClick={() => setShowAddUserModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>➕ {t('admin.addUser')}</h3>
              <button className="admin-modal-close" onClick={() => setShowAddUserModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              {modalAlert.show && (
                <div className={`admin-alert admin-alert-${modalAlert.type}`}>
                  {modalAlert.message}
                </div>
              )}
              <form onSubmit={handleAddUser}>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.username')}:</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.password')}:</label>
                  <input
                    type="password"
                    className="admin-form-control"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.role')}:</label>
                  <select
                    className="admin-form-control"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">{t('admin.userRole')}</option>
                    <option value="admin">{t('admin.adminRole')}</option>
                  </select>
                </div>
                <div className="admin-btn-group">
                  <button type="submit" className="admin-btn admin-btn-primary">
                    ✅ {t('admin.createUser')}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddUserModal(false)}>
                    ❌ {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar contraseña */}
      {showChangePasswordModal && (
        <div className="admin-modal" onClick={() => setShowChangePasswordModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>🔑 Cambiar Contraseña de Usuario</h3>
              <button className="admin-modal-close" onClick={() => setShowChangePasswordModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              {modalAlert.show && (
                <div className={`admin-alert admin-alert-${modalAlert.type}`}>
                  {modalAlert.message}
                </div>
              )}
              <form onSubmit={handleChangePassword}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Usuario:</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={changePassword.username}
                    readOnly
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Nueva Contraseña:</label>
                  <input
                    type="password"
                    className="admin-form-control"
                    value={changePassword.newPassword}
                    onChange={(e) => setChangePassword({ ...changePassword, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Confirmar Nueva Contraseña:</label>
                  <input
                    type="password"
                    className="admin-form-control"
                    value={changePassword.confirmPassword}
                    onChange={(e) => setChangePassword({ ...changePassword, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-btn-group">
                  <button type="submit" className="admin-btn admin-btn-primary">
                    ✅ {t('admin.changePassword')}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowChangePasswordModal(false)}>
                    ❌ {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para logs de usuario */}
      {showUserLogsModal && (
        <div className="admin-modal" onClick={() => setShowUserLogsModal(false)}>
          <div className="admin-modal-content admin-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>📋 {t('admin.userLogsTitle', { user: selectedUser })}</h3>
              <button className="admin-modal-close" onClick={() => setShowUserLogsModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-logs-container">
                {userLogs.length === 0 ? (
                  <p>{t('admin.noUserLogs')}</p>
                ) : (
                  <div className="admin-logs-list">
                    {userLogs.map((log, index) => (
                      <div key={index} className="admin-log-entry">
                        <span className="admin-log-timestamp">[{log.timestamp || 'N/A'}]</span>
                        <span className="admin-log-message">
                          {log.message || log.raw || log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para información de contraseña */}
      {showPasswordInfoModal && (
        <div className="admin-modal" onClick={() => setShowPasswordInfoModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>👁️ {t('admin.passwordInfoTitle', { user: selectedUser })}</h3>
              <button className="admin-modal-close" onClick={() => setShowPasswordInfoModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              {passwordInfo.error ? (
                <p>{passwordInfo.error}</p>
              ) : (
                <div className="admin-password-info">
                  <h5>📊 {t('admin.accountDetails')}:</h5>
                  <p><strong>{t('admin.user')}:</strong> {passwordInfo.username}</p>
                  <p><strong>{t('admin.hasPassword')}:</strong> {passwordInfo.has_password ? `✅ ${t('common.yes')}` : `❌ ${t('common.no')}`}</p>
                  <p><strong>{t('admin.passwordMethod')}:</strong> {passwordInfo.password_method}</p>
                  <p><strong>{t('admin.accountCreated')}:</strong> {passwordInfo.created}</p>
                  <p><strong>{t('admin.lastAccess')}:</strong> {passwordInfo.last_login}</p>
                  {passwordInfo.password_hint && (
                    <div className="admin-password-hint">
                      <small><strong>{t('admin.note')}:</strong> {passwordInfo.password_hint}</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;