import React, { useEffect, useRef, useState, useCallback } from 'react';
import Guacamole from 'guacamole-common-js';
import { useLanguage } from '../../context/LanguageContext';
import './RDPViewer.css';

const RDPViewer = ({ connectionToken, connectionId, onClose }) => {
    const { t } = useLanguage();
    const elementRef = useRef(null);
    const [client, setClient] = useState(null);
    const [display, setDisplay] = useState(null);
    const [connectionState, setConnectionState] = useState('CONNECTING'); // CONNECTING, CONNECTED, DISCONNECTED, ERROR
    const [errorMsg, setErrorMsg] = useState('');
    const [scale, setScale] = useState(1);

    // Connect to Guacamole
    useEffect(() => {
        if (!connectionToken || !connectionId || !elementRef.current) return;

        // Create tunnel
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const tunnelUrl = `${protocol}//${host}/api/rdp/?token=${encodeURIComponent(connectionToken)}&id=${connectionId}`; 
        
        const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
        
        const guacClient = new Guacamole.Client(tunnel);
        setClient(guacClient);

        // Error handler
        guacClient.onerror = (error) => {
            console.error('Guacamole error:', error);
            setConnectionState('ERROR');
            setErrorMsg(error.message || 'Unknown error');
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
            }
        };

        // Get display
        const guacDisplay = guacClient.getDisplay();
        setDisplay(guacDisplay);
        
        // Add display to DOM
        const displayElement = guacDisplay.getElement();
        elementRef.current.innerHTML = '';
        elementRef.current.appendChild(displayElement);

        // Connect
        guacClient.connect();

        // Mouse & Keyboard
        const mouse = new Guacamole.Mouse(displayElement);
        const keyboard = new Guacamole.Keyboard(document);

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
            guacClient.disconnect();
            if (elementRef.current) {
                elementRef.current.innerHTML = '';
            }
        };
    }, [connectionToken]);

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
            setScale(minScale);
        };

        window.addEventListener('resize', resize);
        // Initial resize after connection
        const interval = setInterval(() => {
             if (display.getWidth() > 0) {
                 resize();
                 clearInterval(interval);
             }
        }, 100);

        return () => window.removeEventListener('resize', resize);
    }, [display, connectionState]);

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
            <div className="rdp-display" ref={elementRef}></div>

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
                    <p>{t('rdp.error')}</p>
                    <small>{errorMsg}</small>
                    <button onClick={onClose}>{t('common.close')}</button>
                </div>
            )}
        </div>
    );
};

export default RDPViewer;
