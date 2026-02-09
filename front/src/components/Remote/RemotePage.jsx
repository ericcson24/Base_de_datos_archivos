import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import RDPViewer from '../RDP/RDPViewer';
import './RemotePage.css';

const RemotePage = ({ onGoBack }) => {
    const { t } = useLanguage();
    const [connections, setConnections] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeConnectionId, setActiveConnectionId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const [connRes, setRes] = await Promise.all([
                fetch('/api/rdp/connections', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/rdp/settings', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (connRes.ok) setConnections(await connRes.json());
            if (setRes.ok) setSettings(await setRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const initializeDefault = async () => {
        try {
            const token = getAuthToken();
            await fetch('/api/rdp/initialize-default', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    if (activeConnectionId) {
        return (
            <div className="remote-page-viewer">
                <div className="remote-viewer-header">
                     <button className="back-btn" onClick={() => setActiveConnectionId(null)}>← {t('common.back')}</button>
                     <h2>{t('rdp.connectTitle')}</h2>
                </div>
                <div className="remote-viewer-container">
                    <RDPViewer 
                        connectionId={activeConnectionId} 
                        connectionToken={getAuthToken()} 
                        onClose={() => setActiveConnectionId(null)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="remote-page-container">
            <div className="remote-page-header">
                <h1>{t('rdp.connectTitle') || 'Remote Desktop'}</h1>
                <p>Select a connection to start working remotely</p>
                <button className="back-to-files-btn" onClick={onGoBack}>
                    Go to Files
                </button>
            </div>

            {loading ? (
                <div className="loading-spinner">{t('common.loading')}</div>
            ) : (
                <div className="remote-content">
                    <div className="server-status-bar">
                        <div className="status-item">
                            <span className="label">Server ID:</span>
                            <span className="value code">{settings.server_id || 'N/A'}</span>
                        </div>
                        {settings.maintenance_mode === 'true' && (
                            <div className="status-badge maintenance">🛑 Maintenance Mode</div>
                        )}
                        {settings.lan_only === 'true' && (
                            <div className="status-badge">🔒 LAN Only</div>
                        )}
                    </div>

                    <div className="connections-grid">
                        {connections.length === 0 ? (
                            <div className="empty-connections">
                                <div className="empty-icon">🔌</div>
                                <h3>No connections found</h3>
                                <p>There are no remote connections configured yet.</p>
                                <button className="primary-btn" onClick={initializeDefault}>
                                    Initialize Default Connection
                                </button>
                            </div>
                        ) : (
                            connections.map(conn => (
                                <div key={conn.id} className="connection-card" onClick={() => setActiveConnectionId(conn.id)}>
                                    <div className="card-icon">🖥️</div>
                                    <div className="card-info">
                                        <h3>{conn.name}</h3>
                                        <p>{conn.hostname}</p>
                                    </div>
                                    <button className="connect-btn">Connect</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemotePage;
