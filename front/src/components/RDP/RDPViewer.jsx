import React, { useEffect, useRef, useState } from 'react';
import Guacamole from 'guacamole-common-js';
import { useLanguage } from '../../context/LanguageContext';
import './RDPViewer.css';

const RDPViewer = ({ connectionId, token, onClose }) => {
    const { t } = useLanguage();
    const elementRef = useRef(null);
    const [client, setClient] = useState(null);
    const [display, setDisplay] = useState(null);
    const [connectionState, setConnectionState] = useState('CONNECTING');
    const [errorMsg, setErrorMsg] = useState('');

    // Connect to Guacamole
    useEffect(() => {
        if (!token || !connectionId || !elementRef.current) {
            console.warn('RDPViewer - Missing required params:', {
                hasToken: !!token,
                hasConnectionId: !!connectionId,
                hasElementRef: !!elementRef.current
            });
            if (!token) {
                setConnectionState('ERROR');
                setErrorMsg('No authentication token provided');
            }
            return;
        }

        console.log('RDPViewer - Initializing connection:', { connectionId });

        // Create tunnel - custom WebSocket implementation
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Build tunnel URL WITHOUT query params — they'll be added by tunnel.connect()
        // WebSocketTunnel.connect(data) does: new WebSocket(tunnelURL + "?" + data, "guacamole")
        const tunnelUrl = `${protocol}//${host}/api/rdp`;
        const connectData = `token=${encodeURIComponent(token)}&id=${connectionId}`;
        
        console.log('RDPViewer - Tunnel URL:', tunnelUrl, '| connect data:', connectData);
        
        const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
        
        const guacClient = new Guacamole.Client(tunnel);
        setClient(guacClient);

        // Error handler
        guacClient.onerror = (error) => {
            console.error('Guacamole error:', error);
            setConnectionState('ERROR');
            setErrorMsg(error.message || 'Unknown error');
        };

        // Handle 'required' instruction — guacd needs credentials interactively
        guacClient.onrequired = (params) => {
            console.warn('Guacamole requires params:', params);
            // If password is required, prompt the user
            if (params && params.includes('password')) {
                const pwd = window.prompt(t('rdp.enterPassword') || 'Enter password for RDP connection:');
                if (pwd !== null) {
                    // Send password via argv stream
                    const stream = guacClient.createArgumentValueStream('text/plain', 'password');
                    stream.onack = () => {}; // ack handler
                    stream.sendBlob(btoa(pwd));
                    stream.sendEnd();
                } else {
                    // User cancelled
                    setConnectionState('ERROR');
                    setErrorMsg(t('rdp.passwordRequired') || 'Password required but not provided');
                }
            }
        };

        // State change handler
        guacClient.onstatechange = (state) => {
            switch (state) {
                case 0: setConnectionState('IDLE'); break;
                case 1: setConnectionState('CONNECTING'); break;
                case 2: setConnectionState('WAITING'); break;
                case 3: setConnectionState('CONNECTED'); break;
                case 4: setConnectionState('DISCONNECTING'); break;
                case 5: setConnectionState('DISCONNECTED'); break;
                default: break;
            }
        };

        // Get display
        const guacDisplay = guacClient.getDisplay();
        setDisplay(guacDisplay);
        
        // Add display to DOM
        const displayElement = guacDisplay.getElement();
        const containerEl = elementRef.current;
        containerEl.innerHTML = '';
        containerEl.appendChild(displayElement);

        // Connect — pass query params here so URL is clean (tunnelURL + "?" + data)
        guacClient.connect(connectData);

        // Mouse & Keyboard - attach keyboard to display element instead of document
        // to avoid capturing keystrokes from toolbar buttons
        const mouse = new Guacamole.Mouse(displayElement);
        displayElement.tabIndex = 0; // Make focusable for keyboard capture
        const keyboard = new Guacamole.Keyboard(displayElement);

        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
            guacClient.sendMouseState(mouseState);
        };

        keyboard.onkeydown = (keysym) => {
            guacClient.sendKeyEvent(1, keysym);
        };
        keyboard.onkeyup = (keysym) => {
            guacClient.sendKeyEvent(0, keysym);
        };

        // Cleanup
        return () => {
            keyboard.onkeydown = null;
            keyboard.onkeyup = null;
            mouse.onmousedown = null;
            mouse.onmouseup = null;
            mouse.onmousemove = null;
            guacClient.disconnect();
            if (containerEl) {
                containerEl.innerHTML = '';
            }
        };
    }, [token, connectionId]);

    // Fit to screen
    useEffect(() => {
        if (!display || !elementRef.current) return;
        
        const resize = () => {
            const container = elementRef.current;
            const w = container.clientWidth;
            const h = container.clientHeight;
            
            // Calculate scale to fit
            const defaultWidth = display.getWidth();
            const defaultHeight = display.getHeight();
            
            if (defaultWidth === 0 || defaultHeight === 0) return;

            const scaleX = w / defaultWidth;
            const scaleY = h / defaultHeight;
            const minScale = Math.min(scaleX, scaleY);
            
            display.scale(minScale);
        };

        window.addEventListener('resize', resize);
        // Initial resize after connection — with max attempts guard
        let attempts = 0;
        const interval = setInterval(() => {
             if (display.getWidth() > 0) {
                 resize();
                 clearInterval(interval);
             } else if (++attempts > 100) {
                 clearInterval(interval); // Stop after 10s to prevent infinite polling
             }
        }, 100);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, [display]); // Only re-run when display changes, not on every state change

    const sendCtrlAltDel = () => {
        if (!client) return;
        // Send Ctrl+Alt+Del sequence
        // 0xFFE3 (Ctrl), 0xFFE9 (Alt), 0xFFFF (Delete)
        // Press
        client.sendKeyEvent(1, 0xFFE3);
        client.sendKeyEvent(1, 0xFFE9);
        client.sendKeyEvent(1, 0xFFFF);
        // Release
        client.sendKeyEvent(0, 0xFFFF);
        client.sendKeyEvent(0, 0xFFE9);
        client.sendKeyEvent(0, 0xFFE3);
    };

    return (
        <div className="rdp-viewer-container">
            {/* Toolbar */}
            <div className="rdp-toolbar glassmorphism">
                <div className="rdp-status">
                    <span className={`status-dot ${connectionState.toLowerCase()}`}></span>
                    {connectionState}
                </div>
                <div className="rdp-actions">
                    <button onClick={sendCtrlAltDel} className="rdp-btn" title={t('rdp.sendCtrlAltDel')}>
                        ⌨ CAD
                    </button>
                    <button onClick={onClose} className="rdp-btn danger" title={t('rdp.disconnect')}>
                        ✕
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className={`rdp-display${connectionState === 'CONNECTED' ? ' cursor-hidden' : ''}`} ref={elementRef}></div>

            {/* Loading Overlay */}
            {connectionState === 'CONNECTING' || connectionState === 'WAITING' ? (
                <div className="rdp-overlay">
                    <div className="spinner"></div>
                    <p>{t('rdp.connecting')}</p>
                </div>
            ) : null}

            {/* Error Overlay */}
            {connectionState === 'ERROR' && (
                <div className="rdp-overlay error">
                    <div className="error-icon">⚠️</div>
                    <h3>{t('rdp.error')}</h3>
                    <p>{errorMsg || t('rdp.unknownError') || 'Unknown error'}</p>
                    <button onClick={onClose} className="rdp-btn">
                        {t('common.close')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default RDPViewer;
