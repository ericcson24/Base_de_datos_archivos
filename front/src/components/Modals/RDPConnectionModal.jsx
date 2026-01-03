import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import './RDPConnectionModal.css';

const RDPConnectionModal = ({ onClose, onConnect }) => {
    const { t } = useLanguage();
    const [connections, setConnections] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
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
        fetchData();
    }, []);

    return (
        <div className="modal-overlay">
            <div className="modal-content glassmorphism-modal rdp-modal-content">
                <h3>{t('rdp.connectTitle') || 'Connect to Remote Desktop'}</h3>
                
                {loading ? (
                    <div className="loading-spinner">{t('common.loading')}</div>
                ) : (
                    <div className="rdp-selection-container">
                        <div className="server-info-box">
                            <div className="info-row">
                                <strong>Server ID:</strong> 
                                <code className="server-id">{settings.server_id || 'N/A'}</code>
                            </div>
                            {settings.lan_only === 'true' && (
                                <div className="status-badge lan-only">
                                    🔒 LAN Only Mode
                                </div>
                            )}
                            {settings.maintenance_mode === 'true' && (
                                <div className="status-badge maintenance">
                                    🛑 Maintenance Mode
                                </div>
                            )}
                        </div>

                        <div className="connections-list-wrapper">
                            <h4>Available Connections</h4>
                            <div className="connections-list">
                                {connections.length === 0 ? (
                                    <p className="no-data">No connections available.</p>
                                ) : (
                                    connections.map(conn => (
                                        <div key={conn.id} className="connection-item" onClick={() => onConnect(conn.id)}>
                                            <div className="conn-icon">🖥️</div>
                                            <div className="conn-details">
                                                <span className="conn-name">{conn.name}</span>
                                                <span className="conn-host">{conn.hostname}</span>
                                            </div>
                                            <button className="connect-btn-small">Connect</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="modal-actions">
                    <button onClick={onClose} className="cancel-btn">{t('common.close')}</button>
                </div>
            </div>
        </div>
    );
};

export default RDPConnectionModal;
