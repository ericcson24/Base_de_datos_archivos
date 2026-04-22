require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');
const os = require('os');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');

function getServerLanIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'host.docker.internal';
}

const app = express();
const PORT = process.env.PORT || 5008;
const GUACD_HOST = process.env.GUACD_HOST || 'guacd';
const GUACD_PORT = parseInt(process.env.GUACD_PORT, 10) || 4822;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const RDP_SERVER_HOST = process.env.RDP_SERVER_HOST || 'host.docker.internal';
const RDP_SERVER_PORT = parseInt(process.env.RDP_SERVER_PORT, 10) || 3389;

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

const verifyToken = (token) => {
    if (!token) throw new Error('No token provided');
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        throw new Error('Token inválido o expirado');
    }
};

const isPrivateIP = (ip) => {
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

app.get('/settings', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('RDP /settings Auth Header:', authHeader);

        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        

        const settings = await dbAsync.all('SELECT setting_key, setting_value FROM rdp_settings');
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.setting_key] = curr.setting_value;
            return acc;
        }, {});

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

app.get('/server-info', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        const token = authHeader.split(' ')[1];
        verifyToken(token);
        
        const hostname = os.hostname();
        const lanIP = getServerLanIP();
        res.json({ hostname, lanIP, rdpHost: RDP_SERVER_HOST });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/initialize-default', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const existing = await dbAsync.get('SELECT * FROM rdp_connections LIMIT 1');
        
        if (existing) {
            return res.json({ success: true, connection: existing });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const defaultConn = {
            name: 'Este Servidor',
            hostname: 'host.docker.internal',
            port: RDP_SERVER_PORT,
            username: '',
            password: '',
            protocol: 'rdp',
            security: 'nla',
            virtual_ip: '10.10.10.2',
            is_default: true
        };

        const randomServerId = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await dbAsync.run(
            'INSERT INTO rdp_connections (user_id, server_id, name, hostname, port, username, password, protocol, security, virtual_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [decoded.id || 1, randomServerId, defaultConn.name, defaultConn.hostname, defaultConn.port, defaultConn.username, defaultConn.password, defaultConn.protocol, defaultConn.security, defaultConn.virtual_ip]
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

        await dbAsync.run('INSERT INTO rdp_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?', ['maintenance_mode', 'true', 'true']);
        
        
        
        
        res.json({ success: true, message: 'Maintenance mode enabled. New connections blocked.' });
    } catch (error) {
        console.error('Error stopping connections:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/connections', async (req, res) => {
    try {
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

        const { name, hostname, port, username, password, protocol, security } = req.body;
        
        if (!hostname) {
            return res.status(400).json({ error: 'Hostname/IP is required' });
        }

        const lastIpRow = await dbAsync.get('SELECT virtual_ip FROM rdp_connections WHERE virtual_ip LIKE \'10.10.10.%\' ORDER BY CAST(SPLIT_PART(virtual_ip, \'.\', 4) AS INTEGER) DESC LIMIT 1');
        let nextOctet = 2;
        if (lastIpRow && lastIpRow.virtual_ip) {
            const parts = lastIpRow.virtual_ip.split('.');
            nextOctet = parseInt(parts[3]) + 1;
        }
        const virtual_ip = `10.10.10.${nextOctet}`;
        const randomServerId = Math.floor(100000 + Math.random() * 900000).toString();

        await dbAsync.run(
            'INSERT INTO rdp_connections (user_id, server_id, name, hostname, port, username, password, protocol, security, virtual_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [decoded.id || 1, randomServerId, name, hostname, port || 3389, username, password, protocol || 'rdp', security || 'nla', virtual_ip]
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

        const conn = await dbAsync.get('SELECT id, hostname FROM rdp_connections WHERE id = ?', [req.params.id]);
        if (conn && conn.hostname === 'host.docker.internal') {
            return res.status(403).json({ error: 'Cannot delete the default server connection' });
        }
        await dbAsync.run('DELETE FROM rdp_connections WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ error: error.message });
    }
});

const formatGuacInstruction = (opcode, args) => {
    let output = `${opcode.length}.${opcode}`;
    args.forEach(arg => {
        const str = String(arg);
        output += `,${str.length}.${str}`;
    });
    output += ';';
    return output;
};

const wss = new WebSocket.Server({ 
    server, 
    path: '/api/rdp',
    verifyClient: (info, cb) => {
        try {
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
        if (protocols.has('guacamole')) {
            return 'guacamole';
        }
        const first = protocols.values().next().value;
        return first || 'guacamole';
    }
});

wss.on('connection', async (ws, request) => {
    console.log('===== WebSocket Connection Established =====');
    console.log('Selected Protocol:', ws.protocol);
    
    const tunnelUUID = crypto.randomUUID();
    const uuidInstruction = `0.,${tunnelUUID.length}.${tunnelUUID};`;
    console.log('Sending tunnel UUID:', tunnelUUID, '| instruction:', uuidInstruction);
    ws.send(uuidInstruction);
    
    if (!request) {
        console.error('CRITICAL: WebSocket connection request object is undefined/null');
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
        
        let urlString = request.url || '';
        
        if (request.headers) {
            const originalUri = request.headers['x-original-uri'] || request.headers['X-Original-URI'];
            if (originalUri) {
                console.log('Using X-Original-URI from headers:', originalUri);
                urlString = originalUri;
            }
        }
        
        console.log('Final Request URL to parse:', urlString);
        
        const hostHeader = request.headers ? request.headers.host : 'localhost';
        const url = new URL(urlString, `http://${hostHeader}`);
        
        const token = url.searchParams.get('token');
        let connectionIdRaw = url.searchParams.get('id');
        
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
        
        const decoded = verifyToken(token);
        console.log(`User ${decoded.username} connecting to RDP...`);
        
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

        if (settings.lan_only === 'true') {
            const clientIp = request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
            if (!isPrivateIP(clientIp)) {
                console.error(`Connection rejected: LAN-only mode, client IP: ${clientIp}`);
                ws.close(1008, 'LAN-only mode: external connections not allowed');
                return;
            }
        }
        
        const connection = await dbAsync.get('SELECT * FROM rdp_connections WHERE id = ?', [connectionId]);
        
        if (!connection) {
            console.error(`Connection ID ${connectionId} not found`);
            ws.close(1008, 'Connection not found');
            return;
        }

        const rdpUser = url.searchParams.get('rdpUser');
        const rdpPass = url.searchParams.get('rdpPass');
        if (rdpUser !== null && rdpUser !== '') {
            connection.username = rdpUser;
            console.log('Using username from frontend modal:', rdpUser);
        }
        if (rdpPass !== null && rdpPass !== '') {
            connection.password = rdpPass;
            console.log('Using password from frontend modal (provided)');
        }

        const clientWidth = parseInt(url.searchParams.get('width'), 10) || 1920;
        const clientHeight = parseInt(url.searchParams.get('height'), 10) || 1080;
        const clientDpi = parseInt(url.searchParams.get('dpi'), 10) || 96;
        console.log(`Client screen: ${clientWidth}x${clientHeight} @ ${clientDpi} DPI`);
        
        console.log('Connecting to:', connection.hostname, ':', connection.port, '| user:', connection.username || '(empty)');
        
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
        
        const guacdSocket = new net.Socket();
        guacdSocket.setTimeout(15000);
        guacdSocket.connect(GUACD_PORT, GUACD_HOST);
        
        let guacdBuffer = '';
        let handshakeComplete = false;
        let nextStreamIndex = 0;
        
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

        const formatGuac = (opcode, args) => {
            let output = `${opcode.length}.${opcode}`;
            args.forEach(arg => {
                const str = String(arg);
                output += `,${str.length}.${str}`;
            });
            output += ';';
            return output;
        };
        
        guacdSocket.on('connect', () => {
            console.log('Connected to guacd');
            
            const protocol = connection.protocol || 'rdp';
            const handshake = formatGuac('select', [protocol]);
            console.log('Sending select:', handshake);
            guacdSocket.write(handshake);
        });
        
        guacdSocket.on('data', (data) => {
            guacdBuffer += data.toString('latin1');
            
            if (guacdBuffer.length > 10 * 1024 * 1024) {
                console.error('Guacd buffer exceeded 10MB, closing connection');
                guacdSocket.destroy();
                ws.close(1011, 'Protocol error');
                return;
            }
            
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
                
                const elements = parseGuacElements(instructionStr);
                const opcode = elements[0] || '';
                
                const silentOpcodes = ['img', 'blob', 'end', 'sync', 'cursor', 'mouse', 'nop', 'rect', 'copy', 'cfill', 'size', 'move', 'shade', 'dispose', 'png', 'audio'];
                if (!silentOpcodes.includes(opcode)) {
                    console.log('Guacd opcode:', opcode, '| elements count:', elements.length);
                }

                if (opcode === 'error') {
                    const errMsg = elements[1] || 'Unknown guacd error';
                    const errCode = elements[2] || '';
                    console.error('*** GUACD ERROR:', errMsg, '| code:', errCode);
                    
                    const errLower = errMsg.toLowerCase();
                    const isAuthFailure = errLower.includes('authentication') || errLower.includes('credentials') || errLower.includes('logon') || errLower.includes('login') || errCode === '769' || errCode === '0x0301';
                    if (isAuthFailure) {
                        const authErrInstr = formatGuac('error', ['Authentication failure (invalid credentials?)', '515']);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(authErrInstr);
                        }
                        continue;
                    }
                }
                
                if (opcode === 'args' && !handshakeComplete) {
                    handshakeComplete = true;
                    
                    const version = elements[1] || '';
                    const argNames = elements.slice(2);
                    
                    console.log('Guacd version:', version);
                    console.log('Guacd wants args:', argNames.length, 'names:', argNames.slice(0, 10), '...');
                    
                    const config = {
                        'hostname': connection.hostname || RDP_SERVER_HOST,
                        'port': String(connection.port || RDP_SERVER_PORT),
                        'domain': connection.domain || '',
                        'username': connection.username || '',
                        'password': connection.password || '',
                        'security': connection.security || 'nla',
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
                        'width': String(clientWidth),
                        'height': String(clientHeight),
                        'dpi': String(clientDpi),
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
                    
                    const values = argNames.map(name => config[name] || '');
                    
                    console.log(`Responding with ${values.length} values for ${argNames.length} args`);
                    const usernameIdx = argNames.indexOf('username');
                    const passwordIdx = argNames.indexOf('password');
                    console.log(`Credentials in handshake -> username[${usernameIdx}]: "${values[usernameIdx] || '(empty)'}" | password[${passwordIdx}]: ${values[passwordIdx] ? '(set, ' + values[passwordIdx].length + ' chars)' : '(empty)'}`);
                    
                    const sizeInstr = formatGuac('size', [String(clientWidth), String(clientHeight), String(clientDpi)]);
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
                    const requiredParams = elements.slice(1);
                    console.log('Guacd requires:', requiredParams);
                    
                    let handled = false;
                    for (const param of requiredParams) {
                        const value = param === 'password' ? (connection.password || '')
                                    : param === 'username' ? (connection.username || '')
                                    : param === 'domain' ? (connection.domain || '')
                                    : null;
                        
                        if (value !== null && value !== '') {
                            const streamIdx = String(nextStreamIndex++);
                            const argvInstr = formatGuac('argv', [streamIdx, 'text/plain', param]);
                            const b64Value = Buffer.from(value).toString('base64');
                            const blobInstr = formatGuac('blob', [streamIdx, b64Value]);
                            const endInstr = formatGuac('end', [streamIdx]);
                            console.log(`Auto-responding to required '${param}' via argv stream ${streamIdx}`);
                            guacdSocket.write(argvInstr + blobInstr + endInstr);
                            handled = true;
                        }
                    }
                    
                    if (!handled) {
                        console.log('Forwarding required instruction to browser (no stored credentials)');
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(instructionStr);
                        }
                    }
                } else {
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
        
        ws.on('message', (message) => {
            const msgStr = message.toString('utf8');
            
            if (msgStr.startsWith('0.')) {
                const parts = msgStr.match(/^0\.,4\.ping,(.+);$/);
                if (parts) {
                    console.log('Tunnel ping received, responding');
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(msgStr);
                    }
                    return;
                }
                console.log('Internal tunnel message (not forwarded):', msgStr.substring(0, 50));
                return;
            }
            
            if (guacdSocket.writable) {
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

