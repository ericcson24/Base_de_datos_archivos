import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode }) => {
  // Estados para los datos del sistema
  const [systemData, setSystemData] = useState({});
  const [serverInfo, setServerInfo] = useState({});
  const [connections, setConnections] = useState({});
  const [realtimeData, setRealtimeData] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

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
          loadLogs()
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
        loadLogs()
      ]);
    } finally {
      setLoading(false);
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
          <p>Cargando panel de administración...</p>
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
            <span>Panel de Administración</span>
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn admin-btn-secondary" onClick={refreshData}>
              🔄 Actualizar
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={onThemeToggle}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button className="admin-btn admin-btn-primary" onClick={onBackToFolders}>
              ← Volver
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
            <h2 className="admin-card-title">📊 Estado del Sistema</h2>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.total_users || 0}</span>
                <div className="admin-stat-label">Usuarios Totales</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.active_users || 0}</span>
                <div className="admin-stat-label">Usuarios Activos</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.locked_users || 0}</span>
                <div className="admin-stat-label">Usuarios Bloqueados</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{systemData.status === 'online' ? '🟢' : '🔴'}</span>
                <div className="admin-stat-label">Estado del Sistema</div>
              </div>
              {/* Estadísticas adicionales del servidor */}
              {systemData.server_stats && (
                <>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.cpu_usage}</span>
                    <div className="admin-stat-label">Uso de CPU</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.memory_usage}</span>
                    <div className="admin-stat-label">Memoria ({systemData.server_stats.memory_used_gb}GB/{systemData.server_stats.memory_total_gb}GB)</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">{systemData.server_stats.disk_usage}</span>
                    <div className="admin-stat-label">Disco ({systemData.server_stats.disk_free_gb}GB libres)</div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-number">↑{systemData.server_stats.bytes_sent_mb}MB ↓{systemData.server_stats.bytes_recv_mb}MB</span>
                    <div className="admin-stat-label">Red (Subida/Bajada)</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Información del Servidor */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🖥️ Información del Servidor</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadServerInfo}>
              🔄 Actualizar
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.hostname || 'N/A'}</span>
                <div className="admin-stat-label">Hostname</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.platform || 'N/A'}</span>
                <div className="admin-stat-label">Plataforma</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.node_version || 'N/A'}</span>
                <div className="admin-stat-label">Node.js</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{serverInfo.environment?.PORT || 'N/A'}</span>
                <div className="admin-stat-label">Puerto</div>
              </div>
              {serverInfo.process_info && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{serverInfo.process_info.pid}</span>
                  <div className="admin-stat-label">PID del Proceso</div>
                </div>
              )}
              {serverInfo.network_interfaces && serverInfo.network_interfaces.length > 0 && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{serverInfo.network_interfaces.length}</span>
                  <div className="admin-stat-label">Interfaces de Red</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conexiones y Tráfico */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🌐 Conexiones y Tráfico</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadConnections}>
              🔄 Actualizar
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.active_connections || 0}</span>
                <div className="admin-stat-label">Conexiones Activas</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.total_requests_today || 0}</span>
                <div className="admin-stat-label">Requests Hoy</div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{connections.requests_per_minute || 0}</span>
                <div className="admin-stat-label">Requests/min</div>
              </div>
              {connections.top_ips && connections.top_ips.length > 0 && (
                <div className="admin-stat-card">
                  <span className="admin-stat-number">{connections.top_ips[0]?.ip || 'N/A'}</span>
                  <div className="admin-stat-label">IP más Activa</div>
                </div>
              )}
            </div>
            
            {/* Códigos de respuesta */}
            {connections.response_codes && (
              <div className="admin-response-codes">
                <h4>Códigos de Respuesta</h4>
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
            <h2 className="admin-card-title">👥 Gestión de Usuarios</h2>
            <div className="admin-btn-group">
              <button className="admin-btn admin-btn-primary" onClick={() => {
                setShowAddUserModal(true);
                hideModalAlert();
              }}>
                ➕ Añadir Usuario
              </button>
              <button className="admin-btn admin-btn-success" onClick={unlockAllUsers}>
                🔓 Desbloquear Todos
              </button>
            </div>
          </div>
          <div className="admin-card-content">
            <div className="admin-table-container">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último Acceso</th>
                    <th>Intentos Fallidos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}</td>
                      <td>
                        <span className={`admin-user-status ${user.is_locked ? 'admin-status-locked' : 'admin-status-active'}`}>
                          {user.is_locked ? `🔒 Bloqueado (${user.time_remaining})` : '🔓 Activo'}
                        </span>
                      </td>
                      <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Nunca'}</td>
                      <td>{user.failed_attempts}</td>
                      <td>
                        <div className="admin-btn-group">
                          {user.is_locked && (
                            <button className="admin-btn admin-btn-success admin-btn-small" onClick={() => unlockUser(user.username)}>
                              🔓 Desbloquear
                            </button>
                          )}
                          <button className="admin-btn admin-btn-primary admin-btn-small" onClick={() => {
                            setChangePassword({ username: user.username, newPassword: '', confirmPassword: '' });
                            setShowChangePasswordModal(true);
                            hideModalAlert();
                          }}>
                            🔑 Cambiar Contraseña
                          </button>
                          <button className="admin-btn admin-btn-info admin-btn-small" onClick={() => showUserLogs(user.username)}>
                            📋 Ver Logs
                          </button>
                          <button className="admin-btn admin-btn-warning admin-btn-small" onClick={() => showUserPassword(user.username)}>
                            👁️ Ver Info Contraseña
                          </button>
                          {user.username !== 'administrador' && (
                            <button className="admin-btn admin-btn-danger admin-btn-small" onClick={() => deleteUser(user.username)}>
                              🗑️ Eliminar
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
            <h2 className="admin-card-title">📝 Logs del Sistema</h2>
            <button className="admin-btn admin-btn-secondary" onClick={loadLogs}>
              🔄 Recargar Logs
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-logs-container">
              {logs.length === 0 ? (
                <p>No hay logs disponibles</p>
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
                    <strong>Total de logs:</strong> {logs.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Diagnósticos */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">🔍 Diagnósticos del Sistema</h2>
            <button className="admin-btn admin-btn-primary" onClick={runDiagnostics}>
              🧪 Ejecutar Diagnósticos
            </button>
          </div>
          <div className="admin-card-content">
            <div className="admin-diagnostics-container">
              {diagnostics.length === 0 ? (
                <p>Haz clic en "Ejecutar Diagnósticos" para verificar el estado del sistema.</p>
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

      {/* Modal para añadir usuario */}
      {showAddUserModal && (
        <div className="admin-modal" onClick={() => setShowAddUserModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>➕ Añadir Nuevo Usuario</h3>
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
                  <label className="admin-form-label">Nombre de Usuario:</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Contraseña:</label>
                  <input
                    type="password"
                    className="admin-form-control"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Rol:</label>
                  <select
                    className="admin-form-control"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="admin-btn-group">
                  <button type="submit" className="admin-btn admin-btn-primary">
                    ✅ Crear Usuario
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddUserModal(false)}>
                    ❌ Cancelar
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
                    ✅ Cambiar Contraseña
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowChangePasswordModal(false)}>
                    ❌ Cancelar
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
              <h3>📋 Logs de Usuario: {selectedUser}</h3>
              <button className="admin-modal-close" onClick={() => setShowUserLogsModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-logs-container">
                {userLogs.length === 0 ? (
                  <p>No hay logs disponibles para este usuario</p>
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
              <h3>👁️ Información de Contraseña: {selectedUser}</h3>
              <button className="admin-modal-close" onClick={() => setShowPasswordInfoModal(false)}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              {passwordInfo.error ? (
                <p>{passwordInfo.error}</p>
              ) : (
                <div className="admin-password-info">
                  <h5>📊 Detalles de la cuenta:</h5>
                  <p><strong>Usuario:</strong> {passwordInfo.username}</p>
                  <p><strong>Tiene contraseña:</strong> {passwordInfo.has_password ? '✅ Sí' : '❌ No'}</p>
                  <p><strong>Método de contraseña:</strong> {passwordInfo.password_method}</p>
                  <p><strong>Cuenta creada:</strong> {passwordInfo.created}</p>
                  <p><strong>Último acceso:</strong> {passwordInfo.last_login}</p>
                  {passwordInfo.password_hint && (
                    <div className="admin-password-hint">
                      <small><strong>Nota:</strong> {passwordInfo.password_hint}</small>
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