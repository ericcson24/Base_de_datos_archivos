require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Redis Client
const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Subscribe to Redis events
const subscriber = redisClient.duplicate();
subscriber.connect().then(() => {
    subscriber.subscribe('notifications', (message) => {
        console.log('Received notification:', message);
        io.emit('notification', JSON.parse(message));
    });
});

app.get('/', (req, res) => {
  res.send('Notification Service is running');
});

server.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
