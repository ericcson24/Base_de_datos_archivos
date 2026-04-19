import React, { useEffect, useRef, useState, useCallback } from 'react';
import Guacamole from 'guacamole-common-js';
import { useLanguage } from '../../context/LanguageContext';
import './RDPViewer.css';

const RDPViewer = ({ connectionId, token, onClose }) => {
    const { t } = useLanguage();
    const elementRef = useRef(null);
    const clientRef = useRef(null);
    const keyboardRef = useRef(null);
    const cleanupRef = useRef(null);
    const [display, setDisplay] = useState(null);
    const [connectionState, setConnectionState] = useState('IDLE');
    const [errorMsg, setErrorMsg] = useState('');
    const [pingMs, setPingMs] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [frameCount, setFrameCount] = useState(0);

    // Credentials modal state
    const [showCredentials, setShowCredentials] = useState(true);
    const [rdpUsername, setRdpUsername] = useState('');
    const [rdpPassword, setRdpPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Fallback credentials modal for when guacd asks mid-connection
    const [pendingRequired, setPendingRequired] = useState(null);
    const [fallbackPassword, setFallbackPassword] = useState('');
    const wasConnectedRef = useRef(false);

    // Start the actual Guacamole connection after user submits credentials
    const startConnection = useCallback(() => {
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

        setShowCredentials(false);
        setConnectionState('CONNECTING');

        console.log('RDPViewer - Initializing connection:', { connectionId, rdpUsername });

        // Create tunnel - use the current browser host/protocol
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        const tunnelUrl = `${protocol}//${host}/api/rdp`;
        // Use the actual container size so the RDP session fills the view 1:1
        const ctr = elementRef.current;
        const screenW = (ctr && ctr.clientWidth > 0) ? ctr.clientWidth : window.innerWidth;
        const screenH = (ctr && ctr.clientHeight > 0) ? ctr.clientHeight : (window.innerHeight - 50);
        const dpi = 96;
        const connectData = `token=${encodeURIComponent(token)}&id=${connectionId}&rdpUser=${encodeURIComponent(rdpUsername)}&rdpPass=${encodeURIComponent(rdpPassword)}&width=${screenW}&height=${screenH}&dpi=${dpi}`;
        
        console.log('RDPViewer - Tunnel URL:', tunnelUrl, '| connect data (credentials masked)');
        
        const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
        
        const guacClient = new Guacamole.Client(tunnel);
        clientRef.current = guacClient;

        // Track sync frames for ping calculation
        let syncCounter = 0;

        // Error handler
        guacClient.onerror = (error) => {
            console.error('Guacamole error:', error);
            // Guacamole.Status has .code and .message
            const code = error?.code ?? '';
            const msg = error?.message || '';
            let displayMsg = msg || 'Unknown error';
            // Map common Guacamole status codes to user-friendly messages
            const msgLower = (msg || '').toLowerCase();
            const isAuthError = msgLower.includes('authentication') || msgLower.includes('credentials') || msgLower.includes('logon') || msgLower.includes('login');
            if (code === 0x0203 || code === 515 || code === 769 || code === 0x0301 || isAuthError) {
                displayMsg = t('rdp.authFailed') || 'Authentication failed \u2014 check your username and password';
            } else if (code === 0x0200 || code === 512) {
                displayMsg = t('rdp.serverError') || 'Server error \u2014 could not connect';
            } else if (code === 0x0308 || code === 776) {
                displayMsg = t('rdp.upstreamError') || 'Remote desktop server unreachable';
            } else if (msg) {
                displayMsg = msg;
            }
            console.error('RDP Error -', 'code:', code, 'message:', msg, 'display:', displayMsg);
            setConnectionState('ERROR');
            setErrorMsg(displayMsg);
        };

        // Handle 'required' instruction — guacd needs credentials interactively (fallback)
        guacClient.onrequired = (params) => {
            console.warn('Guacamole requires params:', params);
            if (params && params.includes('password')) {
                // Show a smaller inline modal for password re-entry
                setPendingRequired({ params, client: guacClient });
            }
        };

        // Sync handler — track ping/latency and frame count
        guacClient.onsync = (timestamp) => {
            syncCounter++;
            const now = Date.now();
            const rtt = Math.abs(now - timestamp);
            if (syncCounter % 5 === 0) {
                setPingMs(rtt > 5000 ? null : rtt);
            }
            setLastSync(now);
            setFrameCount(syncCounter);
        };

        // State change handler
        guacClient.onstatechange = (state) => {
            switch (state) {
                case 0: setConnectionState('IDLE'); break;
                case 1: setConnectionState('CONNECTING'); break;
                case 2: setConnectionState('WAITING'); break;
                case 3: 
                    wasConnectedRef.current = true;
                    setConnectionState('CONNECTED');
                    setTimeout(() => {
                        const displayEl = elementRef.current?.querySelector('div');
                        if (displayEl) displayEl.focus();
                    }, 200);
                    break;
                case 4: setConnectionState('DISCONNECTING'); break;
                case 5:
                    setConnectionState(prev => {
                        // Don't overwrite ERROR with DISCONNECTED
                        if (prev === 'ERROR') return 'ERROR';
                        return 'DISCONNECTED';
                    });
                    // If we never connected, show an error
                    if (!wasConnectedRef.current) {
                        setErrorMsg(prev => prev || (t('rdp.connectionFailed') || 'Connection failed \u2014 could not establish remote desktop session'));
                        setConnectionState(prev => {
                            if (prev === 'ERROR') return 'ERROR';
                            return 'ERROR';
                        });
                    }
                    break;
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

        displayElement.tabIndex = 0;
        displayElement.style.outline = 'none';

        // Connect
        guacClient.connect(connectData);

        // ========== MOUSE ==========
        const mouse = new Guacamole.Mouse(displayElement);

        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
            // Scale coordinates to match the remote desktop resolution
            const scale = guacDisplay.getScale() || 1;
            mouseState.x = mouseState.x / scale;
            mouseState.y = mouseState.y / scale;
            if (mouseState.left || mouseState.right || mouseState.middle) {
                displayElement.focus();
            }
            guacClient.sendMouseState(mouseState);
        };

        let touch = null;
        if (Guacamole.Mouse.Touchscreen) {
            touch = new Guacamole.Mouse.Touchscreen(displayElement);
            touch.onmousedown = touch.onmouseup = touch.onmousemove = (mouseState) => {
                const scale = guacDisplay.getScale() || 1;
                mouseState.x = mouseState.x / scale;
                mouseState.y = mouseState.y / scale;
                guacClient.sendMouseState(mouseState);
            };
        }

        // ========== KEYBOARD ==========
        const keyboard = new Guacamole.Keyboard(document);
        keyboardRef.current = keyboard;

        keyboard.onkeydown = (keysym) => {
            guacClient.sendKeyEvent(1, keysym);
            return false;
        };
        keyboard.onkeyup = (keysym) => {
            guacClient.sendKeyEvent(0, keysym);
            return false;
        };

        displayElement.focus();

        // Store cleanup function
        cleanupRef.current = () => {
            keyboard.onkeydown = null;
            keyboard.onkeyup = null;
            keyboardRef.current = null;
            mouse.onmousedown = null;
            mouse.onmouseup = null;
            mouse.onmousemove = null;
            if (touch) {
                touch.onmousedown = null;
                touch.onmouseup = null;
                touch.onmousemove = null;
            }
            guacClient.disconnect();
            clientRef.current = null;
            if (containerEl) containerEl.innerHTML = '';
        };
    }, [token, connectionId, rdpUsername, rdpPassword]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cleanupRef.current) cleanupRef.current();
        };
    }, []);

    // Handler for fallback password submission (when guacd asks mid-connection)
    const handleFallbackPasswordSubmit = useCallback(() => {
        if (!pendingRequired) return;
        const { client } = pendingRequired;
        const stream = client.createArgumentValueStream('text/plain', 'password');
        stream.onack = () => {};
        stream.sendBlob(btoa(fallbackPassword));
        stream.sendEnd();
        setPendingRequired(null);
        setFallbackPassword('');
    }, [pendingRequired, fallbackPassword]);

    // Handle credentials form submission
    const handleCredentialsSubmit = (e) => {
        e.preventDefault();
        startConnection();
    };

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

    // Ping "alive" indicator — detect stale connection
    const [isStale, setIsStale] = useState(false);
    useEffect(() => {
        if (connectionState !== 'CONNECTED') return;
        const staleCheck = setInterval(() => {
            if (lastSync && Date.now() - lastSync > 5000) {
                setIsStale(true);
            } else {
                setIsStale(false);
            }
        }, 1000);
        return () => clearInterval(staleCheck);
    }, [connectionState, lastSync]);

    const sendCtrlAltDel = useCallback(() => {
        const c = clientRef.current;
        if (!c) return;
        // Send Ctrl+Alt+Del sequence
        // 0xFFE3 (Ctrl), 0xFFE9 (Alt), 0xFFFF (Delete)
        c.sendKeyEvent(1, 0xFFE3);
        c.sendKeyEvent(1, 0xFFE9);
        c.sendKeyEvent(1, 0xFFFF);
        c.sendKeyEvent(0, 0xFFFF);
        c.sendKeyEvent(0, 0xFFE9);
        c.sendKeyEvent(0, 0xFFE3);
    }, []);

    // Format ping display
    const getPingDisplay = () => {
        if (connectionState !== 'CONNECTED') return null;
        if (isStale) return { text: 'STALE', color: '#f44336', icon: '🔴' };
        if (pingMs === null) return { text: '...', color: '#ff9800', icon: '🟡' };
        if (pingMs < 50) return { text: `${pingMs}ms`, color: '#4caf50', icon: '🟢' };
        if (pingMs < 150) return { text: `${pingMs}ms`, color: '#8bc34a', icon: '🟢' };
        if (pingMs < 300) return { text: `${pingMs}ms`, color: '#ff9800', icon: '🟡' };
        return { text: `${pingMs}ms`, color: '#f44336', icon: '🔴' };
    };

    const pingInfo = getPingDisplay();

    return (
        <div className="rdp-viewer-container">
            {/* ===== Credentials Modal ===== */}
            {showCredentials && (
                <div className="rdp-credentials-overlay">
                    <form className="rdp-credentials-modal glassmorphism" onSubmit={handleCredentialsSubmit}>
                        <div className="rdp-credentials-header">
                            <div className="rdp-credentials-icon">🖥️</div>
                            <h2>{t('rdp.connectTitle') || 'Remote Desktop Connection'}</h2>
                            <p className="rdp-credentials-subtitle">
                                {t('rdp.enterCredentials') || 'Enter your Windows credentials to connect'}
                            </p>
                        </div>

                        <div className="rdp-credentials-body">
                            <div className="rdp-input-group">
                                <label htmlFor="rdp-username">
                                    <span className="rdp-input-icon">👤</span>
                                    {t('rdp.username') || 'Username'}
                                </label>
                                <input
                                    id="rdp-username"
                                    type="text"
                                    value={rdpUsername}
                                    onChange={(e) => setRdpUsername(e.target.value)}
                                    placeholder={t('rdp.usernamePlaceholder') || 'e.g. Administrator'}
                                    autoFocus
                                    autoComplete="username"
                                    spellCheck={false}
                                />
                            </div>

                            <div className="rdp-input-group">
                                <label htmlFor="rdp-password">
                                    <span className="rdp-input-icon">🔒</span>
                                    {t('rdp.password') || 'Password'}
                                </label>
                                <div className="rdp-password-wrapper">
                                    <input
                                        id="rdp-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={rdpPassword}
                                        onChange={(e) => setRdpPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="rdp-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rdp-credentials-footer">
                            <button type="button" className="rdp-btn" onClick={onClose}>
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" className="rdp-btn primary">
                                🖥️ {t('rdp.connect') || 'Connect'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ===== Fallback password modal (when guacd requests mid-connection) ===== */}
            {pendingRequired && (
                <div className="rdp-credentials-overlay">
                    <div className="rdp-credentials-modal glassmorphism rdp-credentials-compact">
                        <div className="rdp-credentials-header">
                            <div className="rdp-credentials-icon">🔐</div>
                            <h2>{t('rdp.passwordRequired') || 'Password Required'}</h2>
                            <p className="rdp-credentials-subtitle">
                                {t('rdp.serverRequestsPassword') || 'The remote server is requesting your password'}
                            </p>
                        </div>
                        <div className="rdp-credentials-body">
                            <div className="rdp-input-group">
                                <label htmlFor="rdp-fallback-password">
                                    <span className="rdp-input-icon">🔒</span>
                                    {t('rdp.password') || 'Password'}
                                </label>
                                <input
                                    id="rdp-fallback-password"
                                    type="password"
                                    value={fallbackPassword}
                                    onChange={(e) => setFallbackPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleFallbackPasswordSubmit(); }}
                                />
                            </div>
                        </div>
                        <div className="rdp-credentials-footer">
                            <button className="rdp-btn" onClick={() => {
                                setPendingRequired(null);
                                setConnectionState('ERROR');
                                setErrorMsg(t('rdp.passwordRequired') || 'Password required but not provided');
                            }}>
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button className="rdp-btn primary" onClick={handleFallbackPasswordSubmit}>
                                🔓 {t('rdp.authenticate') || 'Authenticate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="rdp-toolbar glassmorphism" onMouseDown={(e) => e.stopPropagation()}>
                <div className="rdp-status">
                    <span className={`status-dot ${connectionState.toLowerCase()}`}></span>
                    <span className="rdp-status-text">{connectionState}</span>
                    {pingInfo && (
                        <span className="rdp-ping" style={{ color: pingInfo.color }}>
                            {pingInfo.icon} {pingInfo.text}
                        </span>
                    )}
                    {connectionState === 'CONNECTED' && (
                        <span className="rdp-frames">
                            📊 {frameCount} frames
                        </span>
                    )}
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
            <div 
                className={`rdp-display${connectionState === 'CONNECTED' ? ' cursor-hidden' : ''}`} 
                ref={elementRef}
                onClick={() => {
                    const displayEl = elementRef.current?.querySelector('div');
                    if (displayEl) displayEl.focus();
                }}
            ></div>

            {/* Loading Overlay */}
            {(connectionState === 'CONNECTING' || connectionState === 'WAITING') && !showCredentials ? (
                <div className="rdp-overlay">
                    <div className="spinner"></div>
                    <p>{t('rdp.connecting')}</p>
                </div>
            ) : null}

            {/* Error Overlay */}
            {(connectionState === 'ERROR' || (connectionState === 'DISCONNECTED' && errorMsg)) && (
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
