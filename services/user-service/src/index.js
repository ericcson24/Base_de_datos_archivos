require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { dbAsync } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Middleware de autenticación simple
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
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = userData;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
};

app.get('/', (req, res) => {
  res.send('User Service is running');
});

app.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    // Search for users excluding the current user
    const users = await dbAsync.all(
      "SELECT id, username, avatar_url AS avatarUrl FROM users WHERE username LIKE ? AND username != ? LIMIT 10",
      [`%${q}%`, req.user.username]
    );

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
