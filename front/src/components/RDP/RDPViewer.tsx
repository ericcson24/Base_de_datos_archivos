'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiMonitor, FiUser, FiLock, FiEye, FiEyeOff, FiShield, FiUnlock, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import './RDPViewer.css';

type RDPViewerProps = {
    connectionId: string | number | null;
    token: string | null;
    onClose: () => void;
};

const RDPViewer = ({ connectionId, token, onClose }: RDPViewerProps) => {
    const { t } = useLanguage();
    const elementRef = useRef<HTMLDivElement | null>(null);
    const clientRef = useRef<any>(null);
    const keyboardRef = useRef<any>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const [display, setDisplay] = useState<any>(null);
    const [connectionState, setConnectionState] = useState('IDLE');
    const [errorMsg, setErrorMsg] = useState('');
    const [pingMs, setPingMs] = useState<number | null>(null);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [frameCount, setFrameCount] = useState(0);

    const [showCredentials, setShowCredentials] = useState(true);
    const [rdpUsername, setRdpUsername] = useState('');
    const [rdpPassword, setRdpPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [pendingRequired, setPendingRequired] = useState<any>(null);
    const [fallbackPassword, setFallbackPassword] = useState('');
    const wasConnectedRef = useRef(false);

    const startConnection = useCallback(async () => {
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

        const Guacamole = (await import('guacamole-common-js')).default as any;

        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        const tunnelUrl = `${protocol}//${host}/api/rdp`;
        const ctr = elementRef.current;
        const screenW = (ctr && ctr.clientWidth > 0) ? ctr.clientWidth : window.innerWidth;
        const screenH = (ctr && ctr.clientHeight > 0) ? ctr.clientHeight : (window.innerHeight - 50);
        const dpi = 96;
        const connectData = `token=${encodeURIComponent(token)}&id=${connectionId}&rdpUser=${encodeURIComponent(rdpUsername)}&rdpPass=${encodeURIComponent(rdpPassword)}&width=${screenW}&height=${screenH}&dpi=${dpi}`;

        console.log('RDPViewer - Tunnel URL:', tunnelUrl, '| connect data (credentials masked)');

        const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);

        const guacClient = new Guacamole.Client(tunnel);
        clientRef.current = guacClient;

        let syncCounter = 0;

        guacClient.onerror = (error: any) => {
            console.error('Guacamole error:', error);
            const code = error?.code ?? '';
            const msg = error?.message || '';
            let displayMsg = msg || 'Unknown error';
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

        guacClient.onrequired = (params: any) => {
            console.warn('Guacamole requires params:', params);
            if (params && params.includes('password')) {
                setPendingRequired({ params, client: guacClient });
            }
        };

        guacClient.onsync = (timestamp: number) => {
            syncCounter++;
            const now = Date.now();
            const rtt = Math.abs(now - timestamp);
            if (syncCounter % 5 === 0) {
                setPingMs(rtt > 5000 ? null : rtt);
            }
            setLastSync(now);
            setFrameCount(syncCounter);
        };

        guacClient.onstatechange = (state: number) => {
            switch (state) {
                case 0: setConnectionState('IDLE'); break;
                case 1: setConnectionState('CONNECTING'); break;
                case 2: setConnectionState('WAITING'); break;
                case 3:
                    wasConnectedRef.current = true;
                    setConnectionState('CONNECTED');
                    setTimeout(() => {
                        const displayEl = elementRef.current?.querySelector('div') as HTMLElement | null;
                        if (displayEl) displayEl.focus();
                    }, 200);
                    break;
                case 4: setConnectionState('DISCONNECTING'); break;
                case 5:
                    setConnectionState(prev => {
                        if (prev === 'ERROR') return 'ERROR';
                        return 'DISCONNECTED';
                    });
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

        const guacDisplay = guacClient.getDisplay();
        setDisplay(guacDisplay);

        const displayElement = guacDisplay.getElement();
        const containerEl = elementRef.current;
        containerEl.innerHTML = '';
        containerEl.appendChild(displayElement);

        displayElement.tabIndex = 0;
        displayElement.style.outline = 'none';

        guacClient.connect(connectData);

        const mouse = new Guacamole.Mouse(displayElement);

        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState: any) => {
            const scale = guacDisplay.getScale() || 1;
            mouseState.x = mouseState.x / scale;
            mouseState.y = mouseState.y / scale;
            if (mouseState.left || mouseState.right || mouseState.middle) {
                displayElement.focus();
            }
            guacClient.sendMouseState(mouseState);
        };

        let touch: any = null;
        if (Guacamole.Mouse.Touchscreen) {
            touch = new Guacamole.Mouse.Touchscreen(displayElement);
            touch.onmousedown = touch.onmouseup = touch.onmousemove = (mouseState: any) => {
                const scale = guacDisplay.getScale() || 1;
                mouseState.x = mouseState.x / scale;
                mouseState.y = mouseState.y / scale;
                guacClient.sendMouseState(mouseState);
            };
        }

        const keyboard = new Guacamole.Keyboard(document);
        keyboardRef.current = keyboard;

        keyboard.onkeydown = (keysym: number) => {
            guacClient.sendKeyEvent(1, keysym);
            return false;
        };
        keyboard.onkeyup = (keysym: number) => {
            guacClient.sendKeyEvent(0, keysym);
            return false;
        };

        displayElement.focus();

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
    }, [token, connectionId, rdpUsername, rdpPassword, t]);

    useEffect(() => {
        return () => {
            if (cleanupRef.current) cleanupRef.current();
        };
    }, []);

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

    const handleCredentialsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startConnection();
    };

    useEffect(() => {
        if (!display || !elementRef.current) return;

        const resize = () => {
            const container = elementRef.current;
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;

            const defaultWidth = display.getWidth();
            const defaultHeight = display.getHeight();

            if (defaultWidth === 0 || defaultHeight === 0) return;

            const scaleX = w / defaultWidth;
            const scaleY = h / defaultHeight;
            const minScale = Math.min(scaleX, scaleY);

            display.scale(minScale);
        };

        window.addEventListener('resize', resize);
        let attempts = 0;
        const interval = setInterval(() => {
             if (display.getWidth() > 0) {
                 resize();
                 clearInterval(interval);
             } else if (++attempts > 100) {
                 clearInterval(interval);
             }
        }, 100);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, [display]);

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
        c.sendKeyEvent(1, 0xFFE3);
        c.sendKeyEvent(1, 0xFFE9);
        c.sendKeyEvent(1, 0xFFFF);
        c.sendKeyEvent(0, 0xFFFF);
        c.sendKeyEvent(0, 0xFFE9);
        c.sendKeyEvent(0, 0xFFE3);
    }, []);

    const getPingDisplay = () => {
        if (connectionState !== 'CONNECTED') return null;
        if (isStale) return { text: 'STALE', color: '#f44336', icon: '[Red]' };
        if (pingMs === null) return { text: '...', color: '#ff9800', icon: '[Yellow]' };
        if (pingMs < 50) return { text: `${pingMs}ms`, color: '#4caf50', icon: '[Green]' };
        if (pingMs < 150) return { text: `${pingMs}ms`, color: '#8bc34a', icon: '[Green]' };
        if (pingMs < 300) return { text: `${pingMs}ms`, color: '#ff9800', icon: '[Yellow]' };
        return { text: `${pingMs}ms`, color: '#f44336', icon: '[Red]' };
    };

    const pingInfo = getPingDisplay();

    return (
        <div className="rdp-viewer-container">

            {showCredentials && (
                <div className="rdp-credentials-overlay">
                    <form className="rdp-credentials-modal glassmorphism" onSubmit={handleCredentialsSubmit}>
                        <div className="rdp-credentials-header">
                            <div className="rdp-credentials-icon"><FiMonitor /></div>
                            <h2>{t('rdp.connectTitle') || 'Remote Desktop Connection'}</h2>
                            <p className="rdp-credentials-subtitle">
                                {t('rdp.enterCredentials') || 'Enter your Windows credentials to connect'}
                            </p>
                        </div>

                        <div className="rdp-credentials-body">
                            <div className="rdp-input-group">
                                <label htmlFor="rdp-username">
                                    <span className="rdp-input-icon"><FiUser /></span>
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
                                    <span className="rdp-input-icon"><FiLock /></span>
                                    {t('rdp.password') || 'Password'}
                                </label>
                                <div className="rdp-password-wrapper">
                                    <input
                                        id="rdp-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={rdpPassword}
                                        onChange={(e) => setRdpPassword(e.target.value)}
                                        placeholder="********"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="rdp-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rdp-credentials-footer">
                            <button type="button" className="rdp-btn" onClick={onClose}>
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" className="rdp-btn primary">
                                <FiMonitor style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t('rdp.connect') || 'Connect'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {pendingRequired && (
                <div className="rdp-credentials-overlay">
                    <div className="rdp-credentials-modal glassmorphism rdp-credentials-compact">
                        <div className="rdp-credentials-header">
                            <div className="rdp-credentials-icon"><FiShield /></div>
                            <h2>{t('rdp.passwordRequired') || 'Password Required'}</h2>
                            <p className="rdp-credentials-subtitle">
                                {t('rdp.serverRequestsPassword') || 'The remote server is requesting your password'}
                            </p>
                        </div>
                        <div className="rdp-credentials-body">
                            <div className="rdp-input-group">
                                <label htmlFor="rdp-fallback-password">
                                    <span className="rdp-input-icon"><FiLock /></span>
                                    {t('rdp.password') || 'Password'}
                                </label>
                                <input
                                    id="rdp-fallback-password"
                                    type="password"
                                    value={fallbackPassword}
                                    onChange={(e) => setFallbackPassword(e.target.value)}
                                    placeholder="********"
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
                                <FiUnlock style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t('rdp.authenticate') || 'Authenticate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <FiBarChart2 style={{ verticalAlign: 'middle', marginRight: 4 }} /> {frameCount} frames
                        </span>
                    )}
                </div>
                <div className="rdp-actions">
                    <button onClick={sendCtrlAltDel} className="rdp-btn" title={t('rdp.sendCtrlAltDel')}>
                        ⌨ CAD
                    </button>
                    <button onClick={onClose} className="rdp-btn danger" title={t('rdp.disconnect')}>
                        x
                    </button>
                </div>
            </div>

            <div
                className={`rdp-display${connectionState === 'CONNECTED' ? ' cursor-hidden' : ''}`}
                ref={elementRef}
                onClick={() => {
                    const displayEl = elementRef.current?.querySelector('div') as HTMLElement | null;
                    if (displayEl) displayEl.focus();
                }}
            ></div>

            {(connectionState === 'CONNECTING' || connectionState === 'WAITING') && !showCredentials ? (
                <div className="rdp-overlay">
                    <div className="spinner"></div>
                    <p>{t('rdp.connecting')}</p>
                </div>
            ) : null}

            {(connectionState === 'ERROR' || (connectionState === 'DISCONNECTED' && errorMsg)) && (
                <div className="rdp-overlay error">
                    <div className="error-icon"><FiAlertTriangle /></div>
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
