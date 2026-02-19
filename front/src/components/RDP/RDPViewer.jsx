import React, { useEffect, useRef, useState, useCallback } from 'react';
import Guacamole from 'guacamole-common-js';
import { useLanguage } from '../../context/LanguageContext';
import './RDPViewer.css';

const RDPViewer = ({ connectionId, token, onClose }) => {
    const { t } = useLanguage();
    const elementRef = useRef(null);
    const clientRef = useRef(null);
    const keyboardRef = useRef(null);
    const [display, setDisplay] = useState(null);
    const [connectionState, setConnectionState] = useState('CONNECTING');
    const [errorMsg, setErrorMsg] = useState('');
    const [pingMs, setPingMs] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [frameCount, setFrameCount] = useState(0);

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
        // For local development, use localhost. For remote access, use current host.
        let host = window.location.host;
        let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // If accessing from public domain (proyectonube.xyz), but we're in dev mode,
        // redirect to localhost. Otherwise, use the current location.
        if (host.includes('proyectonube.xyz') || host.includes('ngrok') || host.includes('tunnel')) {
            // For public domains, try to connect to localhost first (in case dev server is running)
            // Otherwise fall back to the public domain
            host = 'localhost:8080';
            protocol = 'ws:'; // Use plain WS for localhost
        }
        
        // Build tunnel URL WITHOUT query params — they'll be added by tunnel.connect()
        // WebSocketTunnel.connect(data) does: new WebSocket(tunnelURL + "?" + data, "guacamole")
        const tunnelUrl = `${protocol}//${host}/api/rdp`;
        const connectData = `token=${encodeURIComponent(token)}&id=${connectionId}`;
        
        console.log('RDPViewer - Tunnel URL:', tunnelUrl, '| connect data:', connectData);
        
        const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
        
        const guacClient = new Guacamole.Client(tunnel);
        clientRef.current = guacClient;

        // Track sync frames for ping calculation
        let syncCounter = 0;

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

        // Sync handler — track ping/latency and frame count
        guacClient.onsync = (timestamp) => {
            syncCounter++;
            const now = Date.now();
            // Calculate rough ping based on server timestamp vs local time
            const rtt = Math.abs(now - timestamp);
            // Only update ping every 5 syncs to avoid UI flicker
            if (syncCounter % 5 === 0) {
                setPingMs(rtt > 5000 ? null : rtt); // ignore absurd values
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
                    setConnectionState('CONNECTED');
                    // Auto-focus the display element when connected
                    setTimeout(() => {
                        const displayEl = elementRef.current?.querySelector('div');
                        if (displayEl) {
                            displayEl.focus();
                        }
                    }, 200);
                    break;
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

        // Make the display element focusable for keyboard input
        displayElement.tabIndex = 0;
        displayElement.style.outline = 'none'; // Remove focus outline

        // Connect — pass query params here so URL is clean (tunnelURL + "?" + data)
        guacClient.connect(connectData);

        // ========== MOUSE ==========
        // Create mouse handler on the display element
        const mouse = new Guacamole.Mouse(displayElement);

        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
            // When user clicks/interacts, ensure focus for keyboard
            if (mouseState.left || mouseState.right || mouseState.middle) {
                displayElement.focus();
            }
            guacClient.sendMouseState(mouseState);
        };

        // Touch support for mobile/tablet
        let touch = null;
        if (Guacamole.Mouse.Touchscreen) {
            touch = new Guacamole.Mouse.Touchscreen(displayElement);
            touch.onmousedown = touch.onmouseup = touch.onmousemove = (mouseState) => {
                guacClient.sendMouseState(mouseState);
            };
        }

        // ========== KEYBOARD ==========
        // Attach keyboard to DOCUMENT for reliable key capture in fullscreen mode.
        // The RDPViewer takes over the entire viewport, so there's no conflict
        // with other input elements.
        const keyboard = new Guacamole.Keyboard(document);
        keyboardRef.current = keyboard;

        keyboard.onkeydown = (keysym) => {
            guacClient.sendKeyEvent(1, keysym);
            return false; // Prevent browser default for captured keys
        };
        keyboard.onkeyup = (keysym) => {
            guacClient.sendKeyEvent(0, keysym);
            return false;
        };

        // Focus the display element so user sees it's interactive
        displayElement.focus();

        // Cleanup
        return () => {
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
                    // Re-focus display element on click for keyboard capture
                    const displayEl = elementRef.current?.querySelector('div');
                    if (displayEl) displayEl.focus();
                }}
            ></div>

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
