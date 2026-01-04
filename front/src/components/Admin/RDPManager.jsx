import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getAuthToken } from '../../utils/fileUtils';
import RDPViewer from '../RDP/RDPViewer';
import './RDPManager.css';

const RDPManager = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [connections, setConnections] = useState([]);
    const [settings, setSettings] = useState({ lan_only: 'false', server_id: '', maintenance_mode: 'false' });
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeConnection, setActiveConnection] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        hostname: '',
        port: 3389,
        username: '',
        password: '',
        protocol: 'rdp'
    });

    const fetchSettings = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchConnections = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/connections', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setConnections(data);
            } else {
                throw new Error(t('rdp.fetchError'));
            }
        } catch (error) {
            console.error(error);
            addToast(t('common.error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
        fetchSettings();
    }, []);

    const updateSetting = async (key, value) => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [key]: value })
            });
            if (response.ok) {
                setSettings(prev => ({ ...prev, [key]: String(value) }));
                addToast(t('common.success'), 'success');
            }
        } catch (error) {
            addToast(t('common.error'), 'error');
        }
    };

    const stopAllConnections = async () => {
        if (!window.confirm(t('rdp.stopAllConfirm'))) return;
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/connections/stop-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                addToast(t('rdp.stopAllSuccess'), 'success');
                fetchSettings();
            }
        } catch (error) {
            addToast(t('common.error'), 'error');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                addToast(t('common.success'), 'success');
                setShowAddModal(false);
                setFormData({
                    name: '',
                    hostname: '',
                    port: 3389,
                    username: '',
                    password: '',
                    protocol: 'rdp'
                });
                fetchConnections();
            } else {
                throw new Error(t('rdp.createError'));
            }
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.deleteConfirm'))) return;
        
        try {
            const token = getAuthToken();
            const response = await fetch(`/api/rdp/connections/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                addToast(t('common.success'), 'success');
                fetchConnections();
            }
        } catch (error) {
            addToast(t('common.error'), 'error');
        }
    };

    const handleConnect = (connection) => {
        setActiveConnection(connection);
    };

    const handleDownloadRdp = (conn) => {
        const content = `full address:s:${conn.hostname}:${conn.port}
username:s:${conn.username || ''}
prompt for credentials:i:1
administrative session:i:1
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
winposstr:s:0,3,0,0,800,600
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
url:s:
`;
        const blob = new Blob([content], { type: 'application/x-rdp' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conn.name.replace(/\s+/g, '_')}.rdp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="rdp-manager-container">
            <div className="rdp-header">
                <h2>{t('rdp.managerTitle') || 'Remote Connections'}</h2>
                <button className="rdp-add-btn" onClick={() => setShowAddModal(true)}>
                    + {t('common.create')}
                </button>
            </div>

            {/* Global Access Info */}
            <div className="rdp-info-box glassmorphism" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(76, 175, 80, 0.1)', borderLeft: '4px solid #4caf50' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>🌍 {t('rdp.globalAccess')}</h4>
                <p style={{ margin: '0', fontSize: '0.9em' }}>{t('rdp.globalAccessDesc')}</p>
            </div>

            {/* Settings Panel (Hidden by default or simplified) */}
            {/* <div className="rdp-settings-panel glassmorphism" ... > ... </div> */}
            
            <h3 style={{ marginTop: '30px' }}>{t('rdp.savedConnections') || 'Saved Connections'}</h3>

            {loading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : (
                <div className="rdp-grid">
                    {connections.length === 0 ? (
                        <p className="no-connections">{t('rdp.noConnections') || 'No connections configured'}</p>
                    ) : (
                        connections.map(conn => (
                            <div key={conn.id} className="rdp-card glassmorphism">
                                <div className="rdp-card-header">
                                    <h3>{conn.name}</h3>
                                    <span className="protocol-badge">{conn.protocol}</span>
                                </div>
                                <div className="rdp-card-body">
                                    <p><strong>IP:</strong> {conn.virtual_ip || conn.hostname}</p>
                                    <p><strong>User:</strong> {conn.username || '-'}</p>
                                </div>
                                <div className="rdp-card-actions">
                                    <button 
                                        className="connect-btn"
                                        onClick={() => handleConnect(conn)}
                                        title={t('rdp.connectWeb') || 'Connect via Web'}
                                    >
                                        🌐 Connect
                                    </button>
                                    <button 
                                        className="connect-btn secondary"
                                        onClick={() => handleDownloadRdp(conn)}
                                        title={t('rdp.downloadRdp') || 'Download .rdp file'}
                                        style={{ background: 'var(--admin-secondary-color)', marginLeft: '5px' }}
                                    >
                                        ⬇️ RDP
                                    </button>
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDelete(conn.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content glassmorphism-modal">
                        <h3>{t('rdp.addDevice') || 'Add Device to Network'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t('rdp.name') || 'Device Name'}</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    required 
                                    className="glassmorphism-input"
                                    placeholder="e.g. My Laptop"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('rdp.hostname') || 'Device IP (Local)'}</label>
                                    <input 
                                        type="text" 
                                        name="hostname" 
                                        value={formData.hostname} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="glassmorphism-input"
                                        placeholder="e.g. 192.168.1.50"
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('rdp.port') || 'RDP Port'}</label>
                                    <input 
                                        type="number" 
                                        name="port" 
                                        value={formData.port} 
                                        onChange={handleInputChange} 
                                        className="glassmorphism-input"
                                        placeholder="3389"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('rdp.username') || 'Windows Username'}</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={handleInputChange} 
                                    className="glassmorphism-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('rdp.password') || 'Windows Password'}</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleInputChange} 
                                    className="glassmorphism-input"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="primary">
                                    {t('rdp.createDevice') || 'Create Device'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RDP Viewer Overlay */}
            {activeConnection && (
                <RDPViewer 
                    connectionToken={getAuthToken()}
                    connectionId={activeConnection.id}
                    onClose={() => setActiveConnection(null)}
                />
            )}
        </div>
    );
};

export default RDPManager;
