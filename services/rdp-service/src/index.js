require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5008;
const GUACD_HOST = process.env.GUACD_HOST || 'guacd';
const GUACD_PORT = parseInt(process.env.GUACD_PORT, 10) || 4822;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const RDP_SERVER_HOST = process.env.RDP_SERVER_HOST || 'host.docker.internal';
const RDP_SERVER_PORT = parseInt(process.env.RDP_SERVER_PORT, 10) || 3389;

// Encryption key for connection tokens (derived from JWT_SECRET)
const ENCRYPTION_KEY = crypto.createHash('sha256').update(JWT_SECRET).digest();
const IV_LENGTH = 16;

const encryptToken = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return Buffer.from(JSON.stringify({ iv: iv.toString('hex'), value: encrypted })).toString('base64');
};

const decryptToken = (encryptedBase64) => {
    const { iv, value } = JSON.parse(Buffer.from(encryptedBase64, 'base64').toString('utf8'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(value, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const { dbAsync, initDb } = require('./database/db');

// Initialize DB and start server
(async () => {
    try {
        await initDb();
        console.log('Database initialized successfully');
        
        server.listen(PORT, () => {
            console.log(`RDP Service listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
})();

// Helper to verify token (JWT primary, Base64 legacy fallback)
const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    try {
        // Try JWT first (secure auth system)
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        // No fallback - reject invalid tokens
        throw new Error('Token inválido o expirado');
    }
};

// Helper to check if IP is private
const isPrivateIP = (ip) => {
    // Handle IPv6 mapped IPv4
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    
    if (ip === '::1' || ip === '127.0.0.1') return true;
    
    const parts = ip.split('.');
    if (parts.length !== 4) return false; 
    
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    if (first === 10) return true;
    if (first === 192 && second === 168) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    return false;
};

// API Routes for managing connections
app.get('/settings', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('RDP /settings Auth Header:', authHeader); // Debug log

        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        // Allow all users to read settings
        // if (decoded.role !== 'admin') {
        //     return res.status(403).json({ error: 'Admin access required' });
        // }

        const settings = await dbAsync.all('SELECT setting_key, setting_value FROM rdp_settings');
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.setting_key] = curr.setting_value;
            return acc;
        }, {});

        // Generate server_id if not exists
        if (!settingsMap.server_id) {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            await dbAsync.run('INSERT INTO rdp_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?', ['server_id', newId, newId]);
            settingsMap.server_id = newId;
        }

        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/settings', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { lan_only, maintenance_mode } = req.body;
        
        if (lan_only !== undefined) {
            await dbAsync.run('INSERT INTO rdp_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?', ['lan_only', String(lan_only), String(lan_only)]);
        }
        
        if (maintenance_mode !== undefined) {
            await dbAsync.run('INSERT INTO rdp_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?', ['maintenance_mode', String(maintenance_mode), String(maintenance_mode)]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/initialize-default', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        // Ensure only one connection exists - the System Default
        const existing = await dbAsync.get('SELECT * FROM rdp_connections LIMIT 1');
        
        if (existing) {
            return res.json({ success: true, connection: existing });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token); // To get user ID

        // Create Default
        // Using dynamically configured RDP server from environment variables
        const defaultConn = {
            name: 'System Desktop',
            hostname: RDP_SERVER_HOST,
            port: RDP_SERVER_PORT,
            username: 'eric2',
            password: '',
            protocol: 'rdp',
            security: 'any',
            virtual_ip: '10.10.10.2'
        };

        const randomServerId = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await dbAsync.run(
            'INSERT INTO rdp_connections (user_id, server_id, name, hostname, port, username, password, protocol, virtual_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [decoded.id || 1, randomServerId, defaultConn.name, defaultConn.hostname, defaultConn.port, defaultConn.username, defaultConn.password, defaultConn.protocol, defaultConn.virtual_ip]
        );

        res.json({ success: true, connection: { ...defaultConn, id: result.lastID } });

    } catch (error) {
        console.error('Error initializing default:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/connections/stop-all', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Enable maintenance mode to prevent new connections
        await dbAsync.run('INSERT INTO rdp_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?', ['maintenance_mode', 'true', 'true']);
        
        // In a real scenario with GuacamoleLite, we might need to restart the process 
        // or track sockets to close them. For now, we just set maintenance mode.
        // If we had access to the websocket server, we could iterate clients and close them.
        // Since GuacamoleLite attaches to 'server', we can try to close all clients on the wss if accessible,
        // but GuacamoleLite encapsulates it.
        
        // However, we can force a process exit to kill all connections (Docker will restart it)
        // This is a crude but effective "Stop All" for this architecture.
        // setTimeout(() => process.exit(0), 100); 
        
        // Better: Just return success and let the maintenance mode block new ones. 
        // The user can manually restart if they really need to kill *current* ones immediately,
        // or we can implement a socket tracker.
        
        res.json({ success: true, message: 'Maintenance mode enabled. New connections blocked.' });
    } catch (error) {
        console.error('Error stopping connections:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/connections', async (req, res) => {
    try {
        // Verify token
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        const connections = await dbAsync.all('SELECT id, name, hostname, port, username, protocol, virtual_ip, created_at FROM rdp_connections ORDER BY name ASC');
        res.json(connections);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Generate encrypted token for a connection
app.get('/connections/:id/token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        const connectionId = req.params.id;
        const connection = await dbAsync.get('SELECT * FROM rdp_connections WHERE id = ?', [connectionId]);
        
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Create the full connection payload with all settings
        const payload = {
            connection: {
                type: connection.protocol || 'rdp',
                settings: {
                    hostname: connection.hostname || RDP_SERVER_HOST,
                    port: connection.port || RDP_SERVER_PORT,
                    username: connection.username || '',
                    password: connection.password || '',
                    security: 'nla',
                    'ignore-cert': true,
                    'enable-drive': true,
                    'drive-path': '/shared',
                    'create-drive-path': true
                }
            }
        };

        // Encrypt the token with full connection details
        const encryptedToken = encryptToken(JSON.stringify(payload));
        
        res.json({ token: encryptedToken, connectionId });
    } catch (error) {
        console.error('Error generating connection token:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/connections', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, hostname, port, username, password, protocol } = req.body;
        
        if (!hostname) {
            return res.status(400).json({ error: 'Hostname/IP is required' });
        }

        // Auto-assign Virtual IP (Mock logic: 10.10.10.x)
        // Find the highest IP currently assigned
        const lastIpRow = await dbAsync.get('SELECT virtual_ip FROM rdp_connections WHERE virtual_ip LIKE \'10.10.10.%\' ORDER BY CAST(SPLIT_PART(virtual_ip, \'.\', 4) AS INTEGER) DESC LIMIT 1');
        let nextOctet = 2;
        if (lastIpRow && lastIpRow.virtual_ip) {
            const parts = lastIpRow.virtual_ip.split('.');
            nextOctet = parseInt(parts[3]) + 1;
        }
        const virtual_ip = `10.10.10.${nextOctet}`;
        const randomServerId = Math.floor(100000 + Math.random() * 900000).toString();

        // We store the REAL hostname for connection, but assign a virtual_ip for display
        await dbAsync.run(
            'INSERT INTO rdp_connections (user_id, server_id, name, hostname, port, username, password, protocol, virtual_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [decoded.id || 1, randomServerId, name, hostname, port || 3389, username, password, protocol || 'rdp', virtual_ip]
        );

        res.json({ success: true, virtual_ip });
    } catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/connections/:id', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        await dbAsync.run('DELETE FROM rdp_connections WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper to format Guacamole protocol instruction (top-level)
const formatGuacInstruction = (opcode, args) => {
    let output = `${opcode.length}.${opcode}`;
    args.forEach(arg => {
        const str = String(arg);
        output += `,${str.length}.${str}`;
    });
    output += ';';
    return output;
};

// Initialize WebSocket server for Guacamole connections
const wss = new WebSocket.Server({ 
    server, 
    path: '/api/rdp',
    verifyClient: (info, cb) => {
        try {
            // Extract token from URL params - reject early if missing/invalid
            const urlString = info.req.headers['x-original-uri'] || info.req.url || '';
            const url = new URL(urlString, `http://${info.req.headers.host || 'localhost'}`);
            const token = url.searchParams.get('token');
            if (!token) {
                console.log('WS VerifyClient: No token, rejecting');
                cb(false, 401, 'No token provided');
                return;
            }
            verifyToken(token);
            console.log('WS VerifyClient: Token valid, accepting');
            cb(true);
        } catch (e) {
            console.log('WS VerifyClient: Invalid token, rejecting:', e.message);
            cb(false, 401, 'Invalid token');
        }
    },
    handleProtocols: (protocols, req) => {
        console.log('WS Protocol Negotiation:', protocols);
        // ws@8.x passes protocols as a Set, use .has() instead of .includes()
        if (protocols.has('guacamole')) {
            return 'guacamole';
        }
        // Fallback: pick first available protocol
        const first = protocols.values().next().value;
        return first || 'guacamole';
    }
});

wss.on('connection', async (ws, request) => {
    console.log('===== WebSocket Connection Established =====');
    console.log('Selected Protocol:', ws.protocol);
    
    // CRITICAL: Send tunnel UUID as the very first message.
    // guacamole-common-js WebSocketTunnel expects the first instruction to be
    // an internal data opcode (empty string '') with a UUID. Without this,
    // the tunnel never transitions from CONNECTING to OPEN state.
    const tunnelUUID = crypto.randomUUID();
    // Format: 0. (empty opcode, length=0) , (separator) 36.UUID (element) ; (terminator)
    const uuidInstruction = `0.,${tunnelUUID.length}.${tunnelUUID};`;
    console.log('Sending tunnel UUID:', tunnelUUID, '| instruction:', uuidInstruction);
    ws.send(uuidInstruction);
    
    // Debug validation
    if (!request) {
        console.error('CRITICAL: WebSocket connection request object is undefined/null');
        // Try to access upgradeReq if it exists (legacy ws)
        if (ws.upgradeReq) {
            console.log('Using legacy ws.upgradeReq');
            request = ws.upgradeReq;
        } else {
            console.error('Cannot proceed without request object');
            ws.close(1011, 'Internal Server Error');
            return;
        }
    }

    try {
        console.log('Request Headers available:', request.headers ? Object.keys(request.headers) : 'none');
        
        // Parse query parameters - handle nginx proxy
        // nginx may not pass request.url, so try to get it from headers
        let urlString = request.url || '';
        
        // If request.url is missing or root, try X-Original-URI header
        // This is critical when behind Nginx with proxy_pass
        if (request.headers) {
            const originalUri = request.headers['x-original-uri'] || request.headers['X-Original-URI'];
            if (originalUri) {
                console.log('Using X-Original-URI from headers:', originalUri);
                urlString = originalUri;
            }
        }
        
        console.log('Final Request URL to parse:', urlString);
        
        // Construct full URL for parsing params 
        // We use a dummy base if host header is missing
        const hostHeader = request.headers ? request.headers.host : 'localhost';
        const url = new URL(urlString, `http://${hostHeader}`);
        
        const token = url.searchParams.get('token');
        let connectionIdRaw = url.searchParams.get('id');
        
        // Sanitize connection ID (remove trailing ?undefined or garbage)
        let connectionId = null;
        if (connectionIdRaw) {
            connectionId = parseInt(connectionIdRaw, 10);
        }

        console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
        console.log('Connection ID Raw:', connectionIdRaw);
        console.log('Connection ID Parsed:', connectionId);
        
        if (!token || !connectionId || isNaN(connectionId)) {
            console.error('Missing or invalid token/connection ID');
            ws.close(1008, 'Missing required parameters');
            return;
        }
        
        // Verify token
        const decoded = verifyToken(token);
        console.log(`User ${decoded.username} connecting to RDP...`);
        
        // Check settings
        const settingsRows = await dbAsync.all('SELECT setting_key, setting_value FROM rdp_settings');
        const settings = settingsRows.reduce((acc, curr) => { 
            acc[curr.setting_key] = curr.setting_value; 
            return acc; 
        }, {});
        
        if (settings.maintenance_mode === 'true') {
            console.error('Connection rejected: Maintenance mode');
            ws.close(1008, 'Maintenance mode enabled');
            return;
        }

        // Enforce LAN-only mode
        if (settings.lan_only === 'true') {
            const clientIp = request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
            if (!isPrivateIP(clientIp)) {
                console.error(`Connection rejected: LAN-only mode, client IP: ${clientIp}`);
                ws.close(1008, 'LAN-only mode: external connections not allowed');
                return;
            }
        }
        
        // Get connection details
        const connection = await dbAsync.get('SELECT * FROM rdp_connections WHERE id = ?', [connectionId]);
        
        if (!connection) {
            console.error(`Connection ID ${connectionId} not found`);
            ws.close(1008, 'Connection not found');
            return;
        }
        
        console.log('Connecting to:', connection.hostname, ':', connection.port);
        
        // Pre-check: verify the RDP target is reachable before engaging guacd.
        // This gives users a clear error instead of the cryptic "wrong security type".
        // COMMENTED OUT: Skip pre-check to allow guacd to handle connection errors directly
        /*
        await new Promise((resolve, reject) => {
            const probe = new net.Socket();
            probe.setTimeout(5000);
            probe.connect(parseInt(connection.port) || 3389, connection.hostname, () => {
                probe.destroy();
                resolve();
            });
            probe.on('error', (err) => {
                probe.destroy();
                reject(new Error(`Cannot reach RDP server at ${connection.hostname}:${connection.port} — ${err.message}`));
            });
            probe.on('timeout', () => {
                probe.destroy();
                reject(new Error(`RDP server at ${connection.hostname}:${connection.port} is not responding (timeout)`));
            });
        });
        console.log('Pre-check: RDP target is reachable');
        */
        
        // Connect to guacd
        const guacdSocket = new net.Socket();
        guacdSocket.setTimeout(15000); // 15s timeout for unresponsive guacd
        guacdSocket.connect(GUACD_PORT, GUACD_HOST);
        
        let guacdBuffer = '';
        let handshakeComplete = false;
        let nextStreamIndex = 0; // Counter for argv stream indices
        
        // Parse all elements from a Guacamole instruction string
        const parseGuacElements = (instruction) => {
            const elements = [];
            let buf = instruction;
            while (buf.length > 0) {
                const dot = buf.indexOf('.');
                if (dot === -1) break;
                const len = parseInt(buf.substring(0, dot));
                if (isNaN(len)) break;
                const val = buf.substring(dot + 1, dot + 1 + len);
                elements.push(val);
                let next = dot + 1 + len;
                if (next < buf.length && (buf[next] === ',' || buf[next] === ';')) next++;
                buf = buf.substring(next);
            }
            return elements;
        };

        // Helper to format Guacamole protocol instruction
        const formatGuac = (opcode, args) => {
            let output = `${opcode.length}.${opcode}`;
            args.forEach(arg => {
                const str = String(arg);
                output += `,${str.length}.${str}`;
            });
            output += ';';
            return output;
        };
        
        // Handle guacd connection
        guacdSocket.on('connect', () => {
            console.log('Connected to guacd');
            
            // Step 1: Send handshake - select protocol
            const protocol = connection.protocol || 'rdp';
            const handshake = formatGuac('select', [protocol]);
            console.log('Sending select:', handshake);
            guacdSocket.write(handshake);
        });
        
        guacdSocket.on('data', (data) => {
            guacdBuffer += data.toString('latin1');
            
            // Guard against unbounded buffer growth
            if (guacdBuffer.length > 10 * 1024 * 1024) {
                console.error('Guacd buffer exceeded 10MB, closing connection');
                guacdSocket.destroy();
                ws.close(1011, 'Protocol error');
                return;
            }
            
            // Process complete Guacamole instructions
            while (guacdBuffer.length > 0) {
                let instructionStr = null;
                let isInstructionComplete = false;
                
                try {
                    let elementStart = 0;
                    while (elementStart < guacdBuffer.length) {
                        const lenEnd = guacdBuffer.indexOf('.', elementStart);
                        if (lenEnd === -1) break;
                        
                        const length = parseInt(guacdBuffer.substring(elementStart, lenEnd));
                        if (isNaN(length)) break;
                        
                        const contentStart = lenEnd + 1;
                        if (contentStart + length > guacdBuffer.length) break;
                        
                        const delimiterIdx = contentStart + length;
                        if (delimiterIdx >= guacdBuffer.length) break;
                        
                        const delimiter = guacdBuffer[delimiterIdx];
                        elementStart = delimiterIdx + 1;
                        
                        if (delimiter === ';') {
                            instructionStr = guacdBuffer.substring(0, elementStart);
                            guacdBuffer = guacdBuffer.substring(elementStart);
                            isInstructionComplete = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing guacd protocol:', e);
                    break;
                }
                
                if (!isInstructionComplete) break;
                
                // Parse opcode
                const elements = parseGuacElements(instructionStr);
                const opcode = elements[0] || '';
                
                // Only log important opcodes, skip high-frequency ones (img, blob, end, sync, cursor, mouse)
                const silentOpcodes = ['img', 'blob', 'end', 'sync', 'cursor', 'mouse', 'nop', 'rect', 'copy', 'cfill', 'size', 'move', 'shade', 'dispose', 'png', 'audio'];
                if (!silentOpcodes.includes(opcode)) {
                    console.log('Guacd opcode:', opcode, '| elements count:', elements.length);
                }
                
                if (opcode === 'args' && !handshakeComplete) {
                    handshakeComplete = true;
                    
                    // elements[0] = 'args'
                    // elements[1] = version (e.g. 'VERSION_1_5_0')
                    // elements[2..] = arg names for the selected protocol
                    const version = elements[1] || '';
                    const argNames = elements.slice(2);
                    
                    console.log('Guacd version:', version);
                    console.log('Guacd wants args:', argNames.length, 'names:', argNames.slice(0, 10), '...');
                    
                    // Build config map for all known RDP args
                    const config = {
                        'hostname': connection.hostname || RDP_SERVER_HOST,
                        'port': String(connection.port || RDP_SERVER_PORT),
                        'domain': connection.domain || '',
                        'username': connection.username || '',
                        'password': connection.password || '',
                        'security': connection.security || 'any',
                        'ignore-cert': 'true',
                        'enable-wallpaper': 'false',
                        'enable-theming': 'false',
                        'enable-font-smoothing': 'true',
                        'enable-full-window-drag': 'false',
                        'enable-desktop-composition': 'false',
                        'enable-menu-animations': 'false',
                        'disable-bitmap-caching': 'false',
                        'disable-offscreen-caching': 'false',
                        'color-depth': '32',
                        'width': '1024',
                        'height': '768',
                        'dpi': '96',
                        'resize-method': 'display-update',
                        'enable-drive': 'true',
                        'drive-name': 'Shared',
                        'drive-path': '/shared',
                        'create-drive-path': 'true',
                        'enable-audio': 'true',
                        'enable-printing': 'false',
                        'server-layout': '',
                        'timezone': '',
                        'console': '',
                        'initial-program': '',
                        'client-name': 'RDP-Web',
                        'console-audio': '',
                        'disable-audio': '',
                        'enable-audio-input': '',
                        'gateway-hostname': '',
                        'gateway-port': '',
                        'gateway-domain': '',
                        'gateway-username': '',
                        'gateway-password': '',
                        'load-balance-info': '',
                        'remote-app': '',
                        'remote-app-dir': '',
                        'remote-app-args': '',
                        'preconnection-id': '',
                        'preconnection-blob': '',
                        'recording-path': '',
                        'recording-name': '',
                        'sftp-hostname': '',
                        'sftp-port': '',
                        'sftp-username': '',
                        'sftp-password': '',
                        'sftp-private-key': '',
                        'sftp-directory': '',
                        'sftp-passphrase': '',
                        'sftp-root-directory': '',
                        'sftp-server-alive-interval': '',
                        'wol-send-packet': '',
                        'wol-mac-addr': '',
                        'wol-broadcast-addr': '',
                        'wol-udp-port': '',
                        'wol-wait-time': '',
                        'force-lossless': '',
                        'normalize-clipboard': '',
                        'disable-copy': '',
                        'disable-paste': '',
                    };
                    
                    // Map values in the EXACT order guacd requested
                    const values = argNames.map(name => config[name] || '');
                    
                    console.log(`Responding with ${values.length} values for ${argNames.length} args`);
                    
                    // Send: size, audio, video, image, timezone, then connect
                    // Per Guacamole protocol spec: connect's first arg is the version,
                    // followed by one value per arg name from the 'args' instruction
                    const sizeInstr = formatGuac('size', ['1024', '768', '96']);
                    const audioInstr = formatGuac('audio', ['audio/L8', 'audio/L16']);
                    const videoInstr = formatGuac('video', []);
                    const imageInstr = formatGuac('image', ['image/png', 'image/jpeg', 'image/webp']);
                    const timezoneInstr = formatGuac('timezone', ['America/New_York']);
                    const connectInstr = formatGuac('connect', [version, ...values]);
                    
                    const fullHandshake = sizeInstr + audioInstr + videoInstr + imageInstr + timezoneInstr + connectInstr;
                    console.log('Sending handshake response (length:', fullHandshake.length, ')');
                    console.log('Connect instruction has', values.length + 1, 'args (version +', values.length, 'values)');
                    console.log('First 200 chars of handshake:', fullHandshake.substring(0, 200));
                    guacdSocket.write(fullHandshake);
                } else if (opcode === 'required') {
                    // guacd is asking for additional credentials (e.g. password for NLA).
                    // If we have the value stored, respond with an argv stream automatically.
                    // Otherwise, forward to the browser for interactive input.
                    const requiredParams = elements.slice(1);
                    console.log('Guacd requires:', requiredParams);
                    
                    let handled = false;
                    for (const param of requiredParams) {
                        const value = param === 'password' ? (connection.password || '')
                                    : param === 'username' ? (connection.username || '')
                                    : param === 'domain' ? (connection.domain || '')
                                    : null;
                        
                        if (value !== null && value !== '') {
                            // Respond with argv stream: open stream, send blob, end stream
                            const streamIdx = String(nextStreamIndex++);
                            const argvInstr = formatGuac('argv', [streamIdx, 'text/plain', param]);
                            // Base64-encode the value for the blob instruction
                            const b64Value = Buffer.from(value).toString('base64');
                            const blobInstr = formatGuac('blob', [streamIdx, b64Value]);
                            const endInstr = formatGuac('end', [streamIdx]);
                            console.log(`Auto-responding to required '${param}' via argv stream ${streamIdx}`);
                            guacdSocket.write(argvInstr + blobInstr + endInstr);
                            handled = true;
                        }
                    }
                    
                    if (!handled) {
                        // Forward to browser — it needs to prompt the user
                        console.log('Forwarding required instruction to browser (no stored credentials)');
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(instructionStr);
                        }
                    }
                } else {
                    // Forward all other instructions to WebSocket client
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(instructionStr);
                    }
                }
            }
        });
        
        guacdSocket.on('timeout', () => {
            console.error('Guacd connection timed out');
            guacdSocket.destroy();
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1011, 'Connection to desktop timed out');
            }
        });

        guacdSocket.on('error', (error) => {
            console.error('Guacd socket error:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1011, 'Guacd connection error');
            }
        });
        
        guacdSocket.on('close', () => {
            console.log('Guacd connection closed');
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        
        // Handle WebSocket messages (from browser)
        ws.on('message', (message) => {
            const msgStr = message.toString('utf8');
            
            // Check for internal tunnel messages (opcode = empty string '')
            // Format: "0.,...;" where first element length is 0 (empty opcode)
            if (msgStr.startsWith('0.')) {
                // Parse the internal message to check if it's a ping
                // Format: 0.,4.ping,13.1234567890123;
                const parts = msgStr.match(/^0\.,4\.ping,(.+);$/);
                if (parts) {
                    // Respond with the same ping back to keep the tunnel alive
                    console.log('Tunnel ping received, responding');
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(msgStr);
                    }
                    return; // Don't forward internal messages to guacd
                }
                // Other internal messages (like nop) - don't forward
                console.log('Internal tunnel message (not forwarded):', msgStr.substring(0, 50));
                return;
            }
            
            // Forward real Guacamole instructions to guacd
            if (guacdSocket.writable) {
                // Log key and mouse events (first 5 of each) for debugging
                if (!ws._inputLogCount) ws._inputLogCount = { key: 0, mouse: 0 };
                const opMatch = msgStr.match(/^\d+\.(\w+),/);
                const op = opMatch ? opMatch[1] : '';
                if (op === 'key' && ws._inputLogCount.key < 5) {
                    console.log('Browser→guacd key event:', msgStr.substring(0, 60));
                    ws._inputLogCount.key++;
                } else if (op === 'mouse' && ws._inputLogCount.mouse < 3) {
                    console.log('Browser→guacd mouse event:', msgStr.substring(0, 80));
                    ws._inputLogCount.mouse++;
                }
                guacdSocket.write(message.toString('latin1'));
            }
        });
        
        ws.on('close', () => {
            console.log('WebSocket closed');
            guacdSocket.end();
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            guacdSocket.end();
        });
        
    } catch (error) {
        console.error('Error setting up connection:', error);
        // Send a Guacamole error instruction so the frontend can show a clear message
        // Format: error opcode with message and status code 519 (UPSTREAM_ERROR)
        if (ws.readyState === WebSocket.OPEN) {
            const errMsg = error.message || 'Connection failed';
            const errInstruction = `5.error,${errMsg.length}.${errMsg},3.519;`;
            ws.send(errInstruction);
        }
        ws.close(1011, error.message);
    }
});

console.log('WebSocket server initialized for RDP connections');

app.get('/', (req, res) => {
    res.send('RDP Service Running');
});

// Remove the old server.listen at the bottom since we moved it inside the async function
// server.listen(PORT, () => {
//     console.log(`RDP Service listening on port ${PORT}`);
// });
