import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import NotificationCenter from '../Common/NotificationCenter';
import SettingsModal from '../Modals/SettingsModal';
import RDPViewer from '../RDP/RDPViewer';
import { FiArrowLeft, FiLayout, FiCalendar, FiSettings, FiLogOut, FiMonitor, FiWifi } from 'react-icons/fi';
import './RemotePage.css';
import './RemotePageDesktop.css';
import './RemotePageMobile.css';

const RemotePage = ({ user, onLogout, onGoBack, onGoToPanel, onGoToCalendar, onThemeToggle, isDarkMode }) => {
    const { t } = useLanguage();
    const [connections, setConnections] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeConnectionId, setActiveConnectionId] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = user?.token || getAuthToken();
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
        // Use token from user object, fallback to localStorage
        const token = user?.token || getAuthToken();
        console.log('handleConnectionClick - token from user:', token);
        console.log('handleConnectionClick - connectionId:', connectionId);
        setActiveConnectionId(connectionId);
    };

    const initializeDefault = async () => {
        try {
            const token = user?.token || getAuthToken();
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

    if (activeConnectionId) {
        return (
            <div className="remote-viewer-fullscreen">
                <div className="remote-viewer-header">
                    <button className="remote-back-btn" onClick={() => {
                        setActiveConnectionId(null);

                    }}>
                        ← {t('common.back')}
                    </button>
                    <h2>{t('rdp.connectTitle')}</h2>
                </div>
                <div className="remote-viewer-content">
                    <RDPViewer 
                        connectionId={activeConnectionId} 
                        token={user?.token || getAuthToken()} 
                        onClose={() => {
                            setActiveConnectionId(null);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="remote-page">
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>
            <div className={`remote-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="remote-sidebar-header">
                    <div className="remote-sidebar-title-row">
                        <FiMonitor className="remote-sidebar-title-icon" />
                        <h2>{t('rdp.remoteDesktop')}</h2>
                    </div>
                </div>

                <div className="remote-sidebar-content">
                    <div className="remote-sidebar-section">
                        <div className="remote-info-card">
                            <FiWifi className="remote-info-icon" />
                            <p>{t('rdp.selectConnectionDesc')}</p>
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="sidebar-btn" onClick={onGoBack}>
                        <FiArrowLeft className="sidebar-btn-icon" /> {t('common.back')}
                    </button>
                    <button className="sidebar-btn" onClick={onGoToPanel}>
                        <FiLayout className="sidebar-btn-icon" /> {t('calendar.panel')}
                    </button>
                    <button className="sidebar-btn" onClick={onGoToCalendar}>
                        <FiCalendar className="sidebar-btn-icon" /> {t('userPanel.calendar')}
                    </button>
                    <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
                        <FiSettings className="sidebar-btn-icon" /> {t('common.settings')}
                    </button>
                    <button className="sidebar-btn sidebar-btn-logout" onClick={onLogout}>
                        <FiLogOut className="sidebar-btn-icon" /> {t('common.logout')}
                    </button>
                </div>
            </div>

            <div className="remote-main">
                <div className="remote-header">
                    <div className="remote-header-content">
                        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
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
