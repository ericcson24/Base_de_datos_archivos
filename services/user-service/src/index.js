require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('./database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

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
      'SELECT id, username, avatar_url AS "avatarUrl" FROM users WHERE username LIKE ? AND username != ? LIMIT 10',
      [`%${q}%`, req.user.username]
    );

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NOTIFICATIONS (INBOX) ENDPOINTS ---

// 1. Get my notifications
app.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await dbAsync.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// 2. Create notification (Internal/Admin)
app.post('/notifications', authenticate, async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await dbAsync.run(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type || 'info', link || '']
    );

    res.json({ success: true, message: 'Notification created' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
});

// 3. Mark as read
app.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    await dbAsync.run(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false });
  }
});

// 4. Mark ALL as read
app.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await dbAsync.run(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false });
  }
});

// --- GROUP MANAGEMENT ENDPOINTS ---

// 1. List all groups (Admin/Boss only ideally, but open for now)
app.get('/groups', authenticate, async (req, res) => {
  try {
    const groups = await dbAsync.all('SELECT * FROM groups ORDER BY name ASC');
    
    // Get member count for each group
    for (let group of groups) {
      const count = await dbAsync.get('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [group.id]);
      group.memberCount = count ? count.count : 0;
    }

    res.json({ success: true, groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ success: false, message: 'Error fetching groups' });
  }
});

// 2. Create a new group
app.post('/groups', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    // Check if group exists
    const existing = await dbAsync.get('SELECT id FROM groups WHERE name = ?', [name]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Group name already exists' });
    }

    await dbAsync.run(
      'INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );

    res.json({ success: true, message: 'Group created successfully' });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, message: 'Error creating group' });
  }
});

// 3. Delete a group
app.delete('/groups/:id', authenticate, async (req, res) => {
  try {
    const groupId = req.params.id;
    // First remove members
    await dbAsync.run('DELETE FROM group_members WHERE group_id = ?', [groupId]);
    // Then remove group
    await dbAsync.run('DELETE FROM groups WHERE id = ?', [groupId]);
    
    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ success: false, message: 'Error deleting group' });
  }
});

// 4. Get members of a group
app.get('/groups/:id/members', authenticate, async (req, res) => {
  try {
    const groupId = req.params.id;
    const members = await dbAsync.all(`
      SELECT u.id, u.username, u.avatar_url, u.role 
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `, [groupId]);

    res.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ success: false, message: 'Error fetching members' });
  }
});

// 5. Add member to group
app.post('/groups/:id/members', authenticate, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

    // Check user role
    const user = await dbAsync.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (user && user.role === 'guest') {
      return res.status(403).json({ success: false, message: 'Los usuarios invitados no pueden ser añadidos a grupos' });
    }

    // Check if already in group
    const existing = await dbAsync.get(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'User already in group' });
    }

    await dbAsync.run(
      'INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)',
      [groupId, userId, new Date().toISOString()]
    );

    res.json({ success: true, message: 'Member added' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ success: false, message: 'Error adding member' });
  }
});

// 6. Remove member from group
app.delete('/groups/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    await dbAsync.run(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'Error removing member' });
  }
});

// 7. List all users (for selection)
app.get('/users', authenticate, async (req, res) => {
  try {
    const users = await dbAsync.all('SELECT id, username, role, avatar_url FROM users ORDER BY username ASC');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
