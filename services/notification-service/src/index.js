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

// Initialize Database Table
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
        // Ensure metadata column exists (migration for existing tables)
        await db.query(`
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
        `);
        console.log('✅ Notifications table verified/created');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};

initDb();

// Authentication Middleware
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

// Redis Client
const redisClient = createClient({ url: process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:6379` : 'redis://redis:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

// Socket.io Setup
const io = new Server(server, {
    path: '/socket.io',
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
  // Join user room for targeted notifications if client sends event
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
  });
});

// Subscribe to Redis events
const subscriber = redisClient.duplicate();
subscriber.connect().then(() => {
    subscriber.subscribe('notifications', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Notification Received (Redis):', data.title);
            
            // 1. Save to Database
            let savedNotification = data;
            if (data.userId) { 
                try {
                    const result = await db.query(
                        `INSERT INTO notifications (user_id, title, message, type, link, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         RETURNING *`,
                        [data.userId, data.title, data.message, data.type || 'info', data.link || null, data.metadata || {}] // Cast metadata to jsonb handled by pg driver usually or stringify
                    );
                    savedNotification = result.rows[0];
                } catch (dbErr) {
                    console.error('Error saving notification to DB:', dbErr);
                }
            }

            // 2. Emit to Socket (Broadcast for now until room logic strict)
            io.emit('notification', savedNotification);

        } catch (err) {
            console.error('Error processing redis message:', err);
        }
    });
});

// REST API Routes

// POST /create - Create a notification (internal service-to-service)
app.post('/create', async (req, res) => {
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

        // Emit via socket to the specific user room and broadcast
        io.to(`user:${userId}`).emit('notification', savedNotification);

        res.json({ success: true, notification: savedNotification });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// GET / - Get notifications for current user
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

// PUT /:id/read - Mark as read
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

// Mark all as read
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
