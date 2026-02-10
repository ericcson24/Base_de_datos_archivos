import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import NotificationCenter from '../Common/NotificationCenter';
import SettingsModal from '../Modals/SettingsModal';
import RDPViewer from '../RDP/RDPViewer';
import './RemotePage.css';
import './RemotePageDesktop.css';
import './RemotePageMobile.css';

const RemotePage = ({ user, onLogout, onGoBack, onGoToPanel, onGoToCalendar, onThemeToggle, isDarkMode }) => {
    const { t } = useLanguage();
    const [connections, setConnections] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeConnectionId, setActiveConnectionId] = useState(null);
    const [activeConnectionToken, setActiveConnectionToken] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const [connRes, setRes] = await Promise.all([
                fetch('/api/rdp/connections', { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                }),
                fetch('/api/rdp/settings', { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                })
            ]);

            if (connRes.ok) {
                const connData = await connRes.json();
                setConnections(connData);
            }
            if (setRes.ok) {
                const setData = await setRes.json();
                setSettings(setData);
            }
        } catch (error) {
            console.error('Error fetching RDP data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectionClick = async (connectionId) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`/api/rdp/connections/${connectionId}/token`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setActiveConnectionId(connectionId);
                setActiveConnectionToken(data.token);
            } else {
                console.error('Error getting connection token');
            }
        } catch (error) {
            console.error('Error getting connection token:', error);
        }
    };

    const initializeDefault = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/rdp/initialize-default', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                fetchData();
            }
        } catch (e) {
            console.error('Error initializing default connection:', e);
        }
    };

    if (activeConnectionId && activeConnectionToken) {
        return (
            <div className="remote-viewer-fullscreen">
                <div className="remote-viewer-header">
                    <button className="remote-back-btn" onClick={() => {
                        setActiveConnectionId(null);
                        setActiveConnectionToken(null);
                    }}>
                        ← {t('common.back')}
                    </button>
                    <h2>{t('rdp.connectTitle')}</h2>
                </div>
                <div className="remote-viewer-content">
                    <RDPViewer 
                        connectionId={activeConnectionId} 
                        connectionToken={activeConnectionToken} 
                        onClose={() => {
                            setActiveConnectionId(null);
                            setActiveConnectionToken(null);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="remote-page">
            <div className="remote-sidebar">
                <div className="remote-sidebar-header">
                    <h2>🖥️ {t('rdp.remoteDesktop')}</h2>
                    <p className="remote-sidebar-subtitle">{t('rdp.description')}</p>
                </div>

                <div className="remote-sidebar-content">
                    <div className="remote-sidebar-section">
                        <div className="remote-info-card">
                            <div className="info-icon">ℹ️</div>
                            <p>{t('rdp.selectConnectionDesc')}</p>
                        </div>
                    </div>
                </div>

                <div className="remote-sidebar-footer">
                    <button className="sidebar-btn" onClick={onGoBack}>
                        {t('common.back')}
                    </button>
                    <div className="sidebar-footer-actions">
                        <button className="sidebar-btn sidebar-btn-action" onClick={onGoToPanel}>
                            📁 {t('calendar.panel')}
                        </button>
                        <button className="sidebar-btn sidebar-btn-action" onClick={onGoToCalendar}>
                            📅 {t('userPanel.calendar')}
                        </button>
                    </div>
                    <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
                        {t('common.settings')}
                    </button>
                    <button className="sidebar-btn" onClick={onLogout}>
                        {t('common.logout')}
                    </button>
                </div>
            </div>

            <div className="remote-main">
                <div className="remote-header">
                    <div className="remote-header-content">
                        <h1>{t('rdp.selectConnection')}</h1>
                    </div>
                    <div className="remote-header-actions">
                        <NotificationCenter />
                    </div>
                </div>

                <div className="remote-content">
                    {loading ? (
                        <div className="remote-loading">
                            <div className="spinner"></div>
                            <p>{t('common.loading')}</p>
                        </div>
                    ) : (
                        <>
                            {settings.server_id && (
                                <div className="remote-status-bar">
                                    <div className="status-item">
                                        <span className="status-label">Server ID:</span>
                                        <span className="status-value">{settings.server_id}</span>
                                    </div>
                                    {settings.maintenance_mode === 'true' && (
                                        <div className="status-badge maintenance">
                                            🛑 {t('rdp.maintenanceMode')}
                                        </div>
                                    )}
                                    {settings.lan_only === 'true' && (
                                        <div className="status-badge lan">
                                            🔒 {t('rdp.lanOnly')}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="remote-connections-grid">
                                {connections.length === 0 ? (
                                    <div className="remote-empty-state">
                                        <div className="empty-icon">🔌</div>
                                        <h3>{t('rdp.noConnections')}</h3>
                                        <p>{t('rdp.noConnectionsDesc')}</p>
                                        <button 
                                            className="remote-btn-primary" 
                                            onClick={initializeDefault}
                                        >
                                            {t('rdp.initializeDefault')}
                                        </button>
                                    </div>
                                ) : (
                                    connections.map(conn => (
                                        <div 
                                            key={conn.id} 
                                            className="remote-connection-card"
                                        >
                                            <div className="connection-icon">🖥️</div>
                                            <div className="connection-info">
                                                <h3>{conn.name}</h3>
                                                <p className="connection-host">{conn.hostname || 'localhost'}</p>
                                                {conn.description && (
                                                    <p className="connection-desc">{conn.description}</p>
                                                )}
                                            </div>
                                            <button 
                                                className="connection-btn"
                                                onClick={() => handleConnectionClick(conn.id)}
                                            >
                                                {t('rdp.connect')}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
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
        </div>
    );
};

export default RemotePage;
