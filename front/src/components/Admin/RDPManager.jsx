import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getAuthToken } from '../../utils/fileUtils';
import RDPViewer from '../RDP/RDPViewer';
import './RDPManager.css';

const RDPManager = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [settings, setSettings] = useState({ lan_only: 'false', server_id: '', maintenance_mode: 'false' });
    const [loading, setLoading] = useState(true);
    const [activeConnection, setActiveConnection] = useState(null);
    const [defaultConnection, setDefaultConnection] = useState(null);

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

    const initializeDefault = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/initialize-default', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDefaultConnection(data.connection);
            }
        } catch (error) {
            console.error("Failed to init", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        initializeDefault();
    }, []);

    const toggleService = async (newState) => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ maintenance_mode: String(!newState) }) 
            });
            if (response.ok) {
                setSettings(prev => ({ ...prev, maintenance_mode: String(!newState) }));
                addToast(newState ? t('rdp.serviceStarted') || 'Service Started' : t('rdp.serviceStopped') || 'Service Stopped', 'success');
            }
        } catch (error) {
            addToast(t('common.error'), 'error');
        }
    };

    const handleRestart = async () => {
        if (!window.confirm(t('rdp.restartConfirm') || 'Restart RDP Service? This will disconnect active users.')) return;
        try {
            const token = getAuthToken();
            await fetch('/api/rdp/connections/stop-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Re-enable
            await fetch('/api/rdp/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ maintenance_mode: 'false' }) 
            });
            
            addToast(t('rdp.restartSuccess') || 'Service Restarted', 'success');
            fetchSettings();
        } catch (error) {
            addToast(t('common.error'), 'error');
        }
    };

    const handleConnect = () => {
        if (!defaultConnection) return;
        setActiveConnection(defaultConnection);
    };

    const handleDownloadRdp = () => {
         if (!defaultConnection) return;
         const conn = defaultConnection;
         
         const content = `full address:s:${conn.hostname}:${conn.port}
username:s:${conn.username || ''}
prompt for credentials:i:1
administrative session:i:1
screen mode id:i:2
session bpp:i:32
`;
        const blob = new Blob([content], { type: 'application/x-rdp' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Private_Desktop.rdp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isRunning = settings.maintenance_mode !== 'true';

    return (
        <div className="rdp-manager-container">
            {activeConnection ? (
                <div className="rdp-viewer-wrapper">
                    <button className="back-btn" onClick={() => setActiveConnection(null)}>← {t('common.back')}</button>
                    <RDPViewer 
                        connectionId={activeConnection.id} 
                        token={getAuthToken()}
                        onClose={() => setActiveConnection(null)}
                    />
                </div>
            ) : (
                <>
                    <div className="rdp-header">
                        <h2>{t('rdp.managerTitle') || 'Private Desktop Manager'}</h2>
                    </div>

                    <div className="rdp-dashboard-grid">
                        {/* Status Card */}
                        <div className={`rdp-status-card glassmorphism ${isRunning ? 'status-active' : 'status-stopped'}`}>
                            <div className="status-indicator-large">
                                <div className="indicator-dot"></div>
                                <span className="status-text">{isRunning ? (t('rdp.running') || 'RUNNING') : (t('rdp.stopped') || 'STOPPED')}</span>
                            </div>
                            <div className="status-actions">
                                <button 
                                    className={`action-btn ${isRunning ? 'btn-stop' : 'btn-start'}`}
                                    onClick={() => toggleService(!isRunning)}
                                >
                                    {isRunning ? (t('rdp.stop') || 'STOP') : (t('rdp.start') || 'START')}
                                </button>
                                <button 
                                    className="action-btn btn-restart"
                                    onClick={handleRestart}
                                    disabled={!isRunning}
                                >
                                    ↺ {t('rdp.restart') || 'RESTART'}
                                </button>
                            </div>
                        </div>

                        {/* Connection Card */}
                        <div className="rdp-connection-card glassmorphism">
                            <h3>{t('rdp.access') || 'Access Methods'}</h3>
                            {loading ? <p>{t('common.loading')}</p> : (
                                <div className="access-methods">
                                    <div className="method-row">
                                        <div className="method-info">
                                            <h4>{t('admin.webAccess')}</h4>
                                            <p>{t('admin.webAccessDesc')}</p>
                                        </div>
                                        <button 
                                            className="connect-btn primary"
                                            onClick={handleConnect}
                                            disabled={!isRunning}
                                        >
                                            🌐 {t('rdp.connect') || 'Connect'}
                                        </button>
                                    </div>
                                    <div className="method-row">
                                        <div className="method-info">
                                            <h4>{t('admin.nativeClient')}</h4>
                                            <p>{t('admin.nativeClientDesc')}</p>
                                        </div>
                                        <button 
                                            className="connect-btn secondary"
                                            onClick={handleDownloadRdp}
                                            disabled={!isRunning}
                                        >
                                            ⬇️ .RDP
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Info Card */}
                         <div className="rdp-info-card glassmorphism">
                            <h4>ℹ️ {t('common.info')}</h4>
                            <p><strong>{t('rdp.serverId')}:</strong> {settings.server_id}</p>
                            <p><strong>Host:</strong> {defaultConnection?.hostname || 'System'}</p>
                             <div className="setting-toggle-row small">
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.lan_only === 'true'}
                                        onChange={(e) => {
                                             const val = e.target.checked;
                                              fetch('/api/rdp/settings', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                                                 body: JSON.stringify({ lan_only: String(val) })
                                              }).then(() => {
                                                  setSettings(prev => ({...prev, lan_only: String(val)}));
                                              }).catch(() => {
                                                  setSettings(prev => ({...prev, lan_only: String(!val)}));
                                                  addToast(t('common.error'), 'error');
                                              });
                                        }}
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <span className="setting-label-small">{t('rdp.lanOnly') || 'LAN Only'}</span>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
};

export default RDPManager;
