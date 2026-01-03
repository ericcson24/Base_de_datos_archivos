require('dotenv').config();
const express = require('express');
const http = require('http');
const GuacamoleLite = require('guacamole-lite');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5008;
const GUACD_HOST = process.env.GUACD_HOST || 'guacd';
const GUACD_PORT = process.env.GUACD_PORT || 4822;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Guacamole tunnel configuration
const guacOptions = {
    crypt: {
        cypher: 'AES-256-CBC',
        key: 'MySuperSecretKeyForParams123456' // In prod, use env var
    },
    log: {
        level: 'verbose'
    }
};

const { dbAsync, initDb } = require('./database/db');

// Initialize DB
initDb();

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
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Allow all users to read settings
        // if (decoded.role !== 'admin') {
        //     return res.status(403).json({ error: 'Admin access required' });
        // }

        const settings = await dbAsync.all('SELECT key, value FROM rdp_settings');
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // Generate server_id if not exists
        if (!settingsMap.server_id) {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            await dbAsync.run('INSERT INTO rdp_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', ['server_id', newId, newId]);
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
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { lan_only, maintenance_mode } = req.body;
        
        if (lan_only !== undefined) {
            await dbAsync.run('INSERT INTO rdp_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', ['lan_only', String(lan_only), String(lan_only)]);
        }
        
        if (maintenance_mode !== undefined) {
            await dbAsync.run('INSERT INTO rdp_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', ['maintenance_mode', String(maintenance_mode), String(maintenance_mode)]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/connections/stop-all', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Enable maintenance mode to prevent new connections
        await dbAsync.run('INSERT INTO rdp_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', ['maintenance_mode', 'true', 'true']);
        
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
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Allow all authenticated users to list connections
        // if (decoded.role !== 'admin') {
        //     return res.status(403).json({ error: 'Admin access required' });
        // }

        const connections = await dbAsync.all('SELECT id, name, hostname, port, username, protocol, created_at FROM rdp_connections ORDER BY name ASC');
        res.json(connections);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/connections', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, hostname, port, username, password, protocol } = req.body;
        
        if (!name || !hostname) {
            return res.status(400).json({ error: 'Name and Hostname are required' });
        }

        await dbAsync.run(
            'INSERT INTO rdp_connections (name, hostname, port, username, password, protocol) VALUES (?, ?, ?, ?, ?, ?)',
            [name, hostname, port || 3389, username, password, protocol || 'rdp']
        );

        res.json({ success: true });
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
        const decoded = jwt.verify(token, JWT_SECRET);
        
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

const clientConnectionCallback = async (request, client, path) => {
    // Check settings first
    try {
        const settingsRows = await dbAsync.all('SELECT key, value FROM rdp_settings');
        const settings = settingsRows.reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});
        
        if (settings.maintenance_mode === 'true') {
            console.error('Connection rejected: Maintenance mode is on');
            return false;
        }
        
        if (settings.lan_only === 'true') {
            let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
            // If multiple IPs in x-forwarded-for, take the first one
            if (ip && ip.includes(',')) {
                ip = ip.split(',')[0].trim();
            }
            
            if (!isPrivateIP(ip)) {
                 console.error(`Connection rejected: LAN only mode. IP: ${ip}`);
                 return false;
            }
        }
    } catch (err) {
        console.error('Error checking settings in callback:', err);
        // Fail safe? Or allow? Let's allow if DB fails but log it, or fail safe.
        // Better to fail safe for security.
        return false;
    }

    // The path will be something like /?token=...
    // Or we can extract from query params if guacamole-lite supports it easily, 
    // but usually it expects encrypted token in path.
    // However, we can override the connection settings here.
    
    // Parse query string manually since request is a raw http request
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const connectionId = url.searchParams.get('id'); // ID of the connection to connect to

    if (!token) {
        console.error('No token provided');
        return false; // Deny
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`User ${decoded.username} connecting to RDP...`);
        
        if (!connectionId) {
             console.error('No connection ID provided');
             return false;
        }

        // Fetch connection details from DB
        const connection = await dbAsync.get('SELECT * FROM rdp_connections WHERE id = ?', [connectionId]);
        
        if (!connection) {
            console.error(`Connection ID ${connectionId} not found`);
            return false;
        }

        const connectionSettings = {
            type: connection.protocol || 'rdp',
            settings: {
                host: connection.hostname,
                port: connection.port || 3389,
                username: connection.username,
                password: connection.password,
                security: 'any',
                'ignore-cert': true,
                resize: 'display-update',
            }
        };

        // Return the settings to establish connection
        return connectionSettings;

    } catch (error) {
        console.error('Invalid token or error fetching connection:', error.message);
        return false;
    }
};

// Initialize Guacamole Lite
const guacServer = new GuacamoleLite(
    { server }, 
    { host: GUACD_HOST, port: GUACD_PORT }, 
    { 
        crypt: guacOptions.crypt,
        clientConnectionCallback 
    }
);

app.get('/', (req, res) => {
    res.send('RDP Service Running');
});

// Endpoint to generate a token for a specific connection (simulated)
app.post('/connect', (req, res) => {
    // Validate user auth (middleware should be here)
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({error: 'No auth'});
    
    // ... verify authHeader ...

    const { host, port, username, password } = req.body;
    
    // Create a token that includes the RDP settings
    // In production, DO NOT send password in JWT. Store in DB and send ID.
    const rdpSettings = {
        type: 'rdp',
        settings: {
            host,
            port: port || 3389,
            username,
            password,
            security: 'any',
            'ignore-cert': true,
            resize: 'display-update'
        }
    };

    // Sign a short-lived token specifically for the websocket connection
    const token = jwt.sign({ 
        username: 'user', // get from real auth
        rdpSettings 
    }, JWT_SECRET, { expiresIn: '1m' });

    res.json({ success: true, token });
});

server.listen(PORT, () => {
    console.log(`RDP Service listening on port ${PORT}`);
});
