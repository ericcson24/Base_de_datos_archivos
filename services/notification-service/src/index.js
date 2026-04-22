require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const initDb = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            );
        `);
        await db.query(`
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
        `);
        console.log('✅ Notifications table verified/created');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};

initDb();

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;
  
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  
    if (!token) {
      token = req.query.token;
    }
  
    if (token) {
      try {
        const userData = jwt.verify(token, JWT_SECRET);
        req.user = userData;
        next();
      } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
      }
    } else {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }
};

const redisClient = createClient({ url: process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:6379` : 'redis://redis:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

const io = new Server(server, {
    path: '/socket.io',
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake?.auth?.token
      || (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '')
      || socket.handshake?.query?.token;
    if (!token) return next(new Error('No auth token'));
    const userData = jwt.verify(token, JWT_SECRET);
    socket.user = userData;
    next();
  } catch (e) {
    next(new Error('Invalid auth token'));
  }
});

io.on('connection', (socket) => {
  if (socket.user && socket.user.id) {
    socket.join(`user:${socket.user.id}`);
  }
  socket.on('join', (userId) => {
    if (socket.user && String(socket.user.id) === String(userId)) {
      socket.join(`user:${userId}`);
    } else {
      console.warn(`[SOCKET] Blocked join attempt: user ${socket.user?.id} tried to join user:${userId}`);
    }
  });
});

const subscriber = redisClient.duplicate();
subscriber.connect().then(() => {
    subscriber.subscribe('notifications', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Notification Received (Redis):', data.title, '| userId:', data.userId);
            
            const userId = parseInt(data.userId, 10);
            if (isNaN(userId)) {
                console.error('❌ Invalid userId in Redis notification:', data.userId);
                return;
            }

            let savedNotification = data;
            try {
                const result = await db.query(
                    `INSERT INTO notifications (user_id, title, message, type, link, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [userId, data.title || '', data.message || '', data.type || 'info', data.link || null, JSON.stringify(data.metadata || {})]
                );
                savedNotification = result.rows[0];
            } catch (dbErr) {
                console.error('Error saving notification to DB:', dbErr);
            }

            io.to(`user:${userId}`).emit('notification', savedNotification);
            console.log(`[Export] Notification emitted to user:${userId}`);

        } catch (err) {
            console.error('Error processing redis message:', err);
        }
    });
});


const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || JWT_SECRET;
const requireInternal = (req, res, next) => {
    const token = req.headers['x-internal-token'] || '';
    if (token && token === INTERNAL_API_TOKEN) return next();
    return res.status(403).json({ success: false, message: 'Forbidden (internal endpoint)' });
};

app.post('/create', requireInternal, async (req, res) => {
    try {
        const { userId, title, message, type, link, metadata } = req.body;
        if (!userId || !title) {
            return res.status(400).json({ success: false, message: 'userId and title are required' });
        }

        const result = await db.query(
            `INSERT INTO notifications (user_id, title, message, type, link, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, title, message || '', type || 'info', link || null, JSON.stringify(metadata || {})]
        );

        const savedNotification = result.rows[0];

        io.to(`user:${userId}`).emit('notification', savedNotification);

        res.json({ success: true, notification: savedNotification });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );
        res.json({
            success: true,
            notifications: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/:id/read', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2`,
            [notificationId, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get('/health', (req, res) => {
  res.send('Notification Service is healthy');
});

server.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
