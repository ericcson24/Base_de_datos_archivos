require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Client } = require('@microsoft/microsoft-graph-client');
const { dbAsync } = require('./database/db');
require('isomorphic-fetch');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
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

function getAuthenticatedClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

const tokenRefreshLocks = new Map();

async function withTokenRefreshLock(userId, fn) {
  const existing = tokenRefreshLocks.get(userId);
  if (existing) {
    return existing;
  }
  const promise = fn().finally(() => {
    tokenRefreshLocks.delete(userId);
  });
  tokenRefreshLocks.set(userId, promise);
  return promise;
}

async function refreshAccessToken(userId, refreshToken) {
  const clientId = process.env.MS_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[TOKEN] Cannot refresh: missing clientId, clientSecret, or refreshToken');
    return null;
  }

  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'user.read calendars.readwrite offline_access'
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('[TOKEN] Refresh failed:', data.error, data.error_description);
      if (data.error === 'invalid_grant') {
        await dbAsync.run('UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE id = ?', [userId]);
      }
      return null;
    }

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken;
    
    await dbAsync.run(
      'UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ? WHERE id = ?',
      [newAccessToken, newRefreshToken, userId]
    );

    console.log(`[TOKEN] Successfully refreshed access token for user ID ${userId}`);
    return newAccessToken;
  } catch (err) {
    console.error('[TOKEN] Refresh request failed:', err.message);
    return null;
  }
}

async function getValidAccessToken(user) {
  if (!user.microsoft_access_token) return null;

  try {
    const client = getAuthenticatedClient(user.microsoft_access_token);
    await client.api('/me').select('id').get();
    return user.microsoft_access_token;
  } catch (err) {
    if (err.statusCode === 401 || err.code === 'InvalidAuthenticationToken' || 
        (err.message && (err.message.includes('JWT is not well formed') || err.message.includes('Access token has expired') || err.message.includes('Lifetime validation failed')))) {
      console.log(`[TOKEN] Access token expired for user ID ${user.id}, attempting refresh...`);
      const newToken = await withTokenRefreshLock(user.id, () => refreshAccessToken(user.id, user.microsoft_refresh_token));
      return newToken;
    }
    console.warn('[TOKEN] Validation check failed with non-auth error:', err.message);
    return user.microsoft_access_token;
  }
}

const sendResponse = (res, status, data, notification = null) => {
  const response = { ...data };
  if (notification) {
    response.notification = notification;
  }
  res.status(status).json(response);
};

function convertToSpainTime(dateStr, isAllDay = false) {
  if (!dateStr) return null;
  if (isAllDay) return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
      return dateStr + 'Z';
  }
  return dateStr;
}

app.get('/status', authenticate, async (req, res) => {
  try {
    const user = await dbAsync.get(
      'SELECT microsoft_access_token, microsoft_email FROM users WHERE username = ?',
      [req.user.username]
    );
    if (!user) {
      return res.json({ success: true, linked: false, email: null });
    }
    res.json({
      success: true,
      linked: !!user.microsoft_access_token,
      email: user.microsoft_email || null
    });
  } catch (error) {
    console.error('Error in GET /status:', error);
    res.status(500).json({ success: false, linked: false, email: null });
  }
});

app.post('/sync', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get(
      'SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?',
      [username]
    );

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.microsoft_access_token) {
      return res.status(400).json({ success: false, error: 'Microsoft account not linked' });
    }

    const validToken = await getValidAccessToken(user);
    if (!validToken) {
      return res.status(401).json({ success: false, error: 'Could not obtain valid access token' });
    }

    const client = getAuthenticatedClient(validToken);

    const now = new Date();
    const startWindow = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
    const endWindow = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59).toISOString();

    let imported = 0;
    let updated = 0;

    const response = await client
      .api('/me/calendarView')
      .query({ startDateTime: startWindow, endDateTime: endWindow })
      .select('id,subject,bodyPreview,start,end,isAllDay,location,webLink,categories')
      .top(250)
      .get();

    const events = (response && response.value) || [];

    for (const ev of events) {
      const startTime = ev.start?.dateTime || null;
      const endTime = ev.end?.dateTime || null;
      const locationName = ev.location?.displayName || null;
      const categoriesJson = ev.categories ? JSON.stringify(ev.categories) : null;
      const isAllDay = ev.isAllDay ? 1 : 0;

      const existing = await dbAsync.get(
        'SELECT id FROM calendar_events WHERE microsoft_id = ?',
        [ev.id]
      );

      if (existing) {
        await dbAsync.run(
          `UPDATE calendar_events SET user_id = ?, subject = ?, body_preview = ?, start_time = ?, end_time = ?, is_all_day = ?, location = ?, web_link = ?, categories = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?`,
          [user.id, ev.subject || '', ev.bodyPreview || '', startTime, endTime, isAllDay, locationName, ev.webLink || null, categoriesJson, existing.id]
        );
        updated++;
      } else {
        await dbAsync.run(
          `INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, last_synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [ev.id, user.id, ev.subject || '', ev.bodyPreview || '', startTime, endTime, isAllDay, locationName, ev.webLink || null, categoriesJson]
        );
        imported++;
      }
    }

    console.log(`[SYNC] User ${username}: imported=${imported} updated=${updated} total=${events.length}`);
    res.json({ success: true, imported, updated, total: events.length });
  } catch (error) {
    console.error('Error in POST /sync:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Error syncing events' });
  }
});

function rowToEvent(row) {
  if (!row) return null;
  const toIso = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    return String(v);
  };
  let cats = [];
  if (row.categories) {
    try { cats = JSON.parse(row.categories); if (!Array.isArray(cats)) cats = []; }
    catch (e) { cats = []; }
  }
  return {
    id: row.id,
    microsoftId: row.microsoft_id,
    userId: row.user_id,
    ownerUsername: row.owner_username || null,
    title: row.subject || '',
    description: row.body_preview || '',
    start: toIso(row.start_time),
    end: toIso(row.end_time),
    allDay: !!row.is_all_day,
    location: row.location || '',
    webLink: row.web_link || null,
    categories: cats,
    assignedBy: row.assigned_by || null
  };
}

async function canViewUser(requester, targetUserId) {
  if (!targetUserId) return true;
  if (String(requester.id) === String(targetUserId)) return true;
  return requester.role === 'admin' || requester.role === 'boss';
}

app.get('/', authenticate, async (req, res) => {
  try {
    const { start, end, userId } = req.query;
    const username = req.user.username;
    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });

    let targetUserId = requester.id;
    if (userId) {
      if (!(await canViewUser(requester, userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      targetUserId = parseInt(userId);
    }

    const params = [targetUserId];
    let sql = `SELECT ce.*, u.username AS owner_username
               FROM calendar_events ce
               LEFT JOIN users u ON u.id = ce.user_id
               WHERE ce.user_id = ?`;
    if (start) { sql += ' AND (ce.end_time IS NULL OR ce.end_time >= ?)'; params.push(start); }
    if (end)   { sql += ' AND (ce.start_time IS NULL OR ce.start_time <= ?)'; params.push(end); }
    sql += ' ORDER BY ce.start_time ASC';

    const rows = await dbAsync.all(sql, params);
    res.json(rows.map(rowToEvent));
  } catch (error) {
    console.error('Error in GET /:', error);
    res.status(500).json({ error: 'Error loading events' });
  }
});

app.get('/categories', authenticate, async (req, res) => {
  try {
    const { userId } = req.query;
    const username = req.user.username;
    const requester = await dbAsync.get(
      'SELECT id, role, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?',
      [username]
    );
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });

    let target = requester;
    if (userId) {
      if (!(await canViewUser(requester, userId))) return res.status(403).json({ error: 'Forbidden' });
      target = await dbAsync.get(
        'SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?',
        [parseInt(userId)]
      );
      if (!target) return res.status(404).json({ error: 'User not found' });
    }

    const presetColors = {
      preset0: '#e74c3c', // Red
      preset1: '#f39c12', // Orange
      preset2: '#c19a6b', // Brown (Peach)
      preset3: '#f1c40f', // Yellow
      preset4: '#2ecc71', // Green
      preset5: '#1abc9c', // Teal
      preset6: '#808000', // Olive
      preset7: '#3498db', // Blue
      preset8: '#9b59b6', // Purple
      preset9: '#c0392b', // Cranberry
      preset10: '#708090', // Steel
      preset11: '#2f4f4f', // DarkSteel
      preset12: '#808080', // Gray
      preset13: '#404040', // DarkGray
      preset14: '#000000', // Black
      preset15: '#8b0000', // DarkRed
      preset16: '#d2691e', // DarkOrange
      preset17: '#5d4037', // DarkBrown
      preset18: '#b8860b', // DarkYellow
      preset19: '#006400', // DarkGreen
      preset20: '#008080', // DarkTeal
      preset21: '#556b2f', // DarkOlive
      preset22: '#00008b', // DarkBlue
      preset23: '#4b0082', // DarkPurple
      preset24: '#8b0a50'  // DarkCranberry
    };

    const graphCategories = new Map();
    if (target.microsoft_access_token) {
      try {
        const validToken = await getValidAccessToken(target);
        if (validToken) {
          const client = getAuthenticatedClient(validToken);
          const response = await client.api('/me/outlook/masterCategories').get();
          const items = (response && response.value) || [];
          for (const it of items) {
            if (it.displayName) {
              const key = (it.color || '').toLowerCase();
              graphCategories.set(it.displayName, {
                id: `cat-${it.displayName}`,
                name: it.displayName,
                color: key || 'preset8',
                hexColor: presetColors[key] || '#2563eb'
              });
            }
          }
        }
      } catch (e) {
        console.warn('[CATEGORIES] Could not fetch masterCategories:', e.message);
      }
    }

    const rows = await dbAsync.all(
      'SELECT categories FROM calendar_events WHERE user_id = ? AND categories IS NOT NULL',
      [target.id]
    );
    for (const r of rows) {
      try {
        const arr = JSON.parse(r.categories);
        if (Array.isArray(arr)) {
          for (const name of arr) {
            if (name && !graphCategories.has(name)) {
              let hash = 0;
              for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
              const c = (hash & 0x00ffffff).toString(16).toUpperCase().padStart(6, '0');
              graphCategories.set(name, {
                id: `cat-${name}`,
                name,
                color: 'preset8',
                hexColor: '#' + c
              });
            }
          }
        }
      } catch (e) {}
    }

    res.json(Array.from(graphCategories.values()));
  } catch (error) {
    console.error('Error in GET /categories:', error);
    res.status(500).json({ error: 'Error loading categories' });
  }
});

function normalizeEventPayload(body) {
  const p = body || {};
  return {
    subject: p.title !== undefined ? p.title : p.subject,
    bodyPreview: p.description !== undefined ? p.description : p.body,
    startTime: p.start !== undefined ? p.start : p.startTime,
    endTime: p.end !== undefined ? p.end : p.endTime,
    location: p.location,
    isAllDay: p.allDay !== undefined ? p.allDay : p.isAllDay,
    categories: p.categories
  };
}

async function pushEventToGraph(owner, payload, existingMsId) {
  try {
    const validToken = await getValidAccessToken(owner);
    if (!validToken) return null;
    const client = getAuthenticatedClient(validToken);
    const graphEvent = {};
    if (payload.subject !== undefined) graphEvent.subject = payload.subject || '';
    if (payload.bodyPreview !== undefined) graphEvent.body = { contentType: 'Text', content: payload.bodyPreview || '' };
    if (payload.isAllDay !== undefined) graphEvent.isAllDay = !!payload.isAllDay;
    if (payload.startTime) {
      graphEvent.start = payload.isAllDay
        ? { dateTime: `${String(payload.startTime).split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' }
        : { dateTime: payload.startTime, timeZone: 'UTC' };
    }
    if (payload.endTime) {
      graphEvent.end = payload.isAllDay
        ? { dateTime: `${String(payload.endTime).split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' }
        : { dateTime: payload.endTime, timeZone: 'UTC' };
    }
    if (payload.location !== undefined) graphEvent.location = { displayName: payload.location || '' };
    if (payload.categories !== undefined) graphEvent.categories = Array.isArray(payload.categories) ? payload.categories : [payload.categories];

    if (existingMsId) {
      await client.api(`/me/events/${existingMsId}`).patch(graphEvent);
      return existingMsId;
    }
    const created = await client.api('/me/events').post(graphEvent);
    return created && created.id ? created.id : null;
  } catch (e) {
    console.error('[OUTLOOK] Graph push failed:', e.message);
    return null;
  }
}

async function insertLocalEvent(targetUserId, payload, assignedBy) {
  const catsJson = payload.categories
    ? JSON.stringify(Array.isArray(payload.categories) ? payload.categories : [payload.categories])
    : null;
  const localMsId = `local_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const result = await dbAsync.run(
    `INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, categories, assigned_by, last_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      localMsId,
      targetUserId,
      payload.subject || '',
      payload.bodyPreview || '',
      payload.startTime || null,
      payload.endTime || null,
      payload.isAllDay ? 1 : 0,
      payload.location || null,
      catsJson,
      assignedBy || null
    ]
  );
  return { id: result.lastID, microsoftId: localMsId };
}

app.post('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const requester = await dbAsync.get(
      'SELECT id, role, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?',
      [username]
    );
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });

    const payload = normalizeEventPayload(req.body);
    if (!payload.subject) return res.status(400).json({ error: 'title required' });
    if (!payload.startTime) return res.status(400).json({ error: 'start required' });

    const local = await insertLocalEvent(requester.id, payload, null);

    let finalMsId = local.microsoftId;
    if (requester.microsoft_access_token) {
      const msId = await pushEventToGraph(requester, payload, null);
      if (msId) {
        finalMsId = msId;
        await dbAsync.run('UPDATE calendar_events SET microsoft_id = ? WHERE id = ?', [msId, local.id]);
      }
    }

    const row = await dbAsync.get(
      `SELECT ce.*, u.username AS owner_username FROM calendar_events ce LEFT JOIN users u ON u.id = ce.user_id WHERE ce.id = ?`,
      [local.id]
    );
    res.status(201).json({ success: true, event: rowToEvent(row) });
  } catch (error) {
    console.error('Error in POST /:', error);
    res.status(500).json({ error: 'Error creating event' });
  }
});

app.post('/assign-user', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (requester.role !== 'admin' && requester.role !== 'boss') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payload = normalizeEventPayload(req.body);
    const targetUserId = parseInt(req.body.targetUserId);
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
    if (!payload.subject) return res.status(400).json({ error: 'title required' });
    if (!payload.startTime) return res.status(400).json({ error: 'start required' });

    const target = await dbAsync.get(
      'SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?',
      [targetUserId]
    );
    if (!target) return res.status(404).json({ error: 'Target user not found' });

    const local = await insertLocalEvent(targetUserId, payload, username);

    if (target.microsoft_access_token) {
      const msId = await pushEventToGraph(target, payload, null);
      if (msId) {
        await dbAsync.run('UPDATE calendar_events SET microsoft_id = ? WHERE id = ?', [msId, local.id]);
      }
    }

    res.status(201).json({ success: true, eventId: local.id });
  } catch (error) {
    console.error('Error in POST /assign-user:', error);
    res.status(500).json({ error: 'Error assigning event' });
  }
});

app.post('/group', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (requester.role !== 'admin' && requester.role !== 'boss') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payload = normalizeEventPayload(req.body);
    const groupId = parseInt(req.body.groupId);
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    if (!payload.subject) return res.status(400).json({ error: 'title required' });
    if (!payload.startTime) return res.status(400).json({ error: 'start required' });

    let members = [];
    try {
      members = await dbAsync.all(
        `SELECT u.id, u.microsoft_access_token, u.microsoft_refresh_token
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ?`,
        [groupId]
      );
    } catch (e) {
      console.warn('[GROUP] group_members table missing:', e.message);
    }

    if (!members.length) return res.status(404).json({ error: 'Group has no members' });

    let success = 0, failed = 0;
    for (const member of members) {
      try {
        const local = await insertLocalEvent(member.id, payload, username);
        if (member.microsoft_access_token) {
          const msId = await pushEventToGraph(member, payload, null);
          if (msId) {
            await dbAsync.run('UPDATE calendar_events SET microsoft_id = ? WHERE id = ?', [msId, local.id]);
          }
        }
        success++;
      } catch (err) {
        console.error('[GROUP] Failed to assign to user', member.id, err.message);
        failed++;
      }
    }

    res.status(201).json({ success: true, results: { success, failed, total: members.length } });
  } catch (error) {
    console.error('Error in POST /group:', error);
    res.status(500).json({ error: 'Error creating group events' });
  }
});

async function findOwnedEvent(id, requester) {
  const isAdminOrBoss = requester.role === 'admin' || requester.role === 'boss';
  let event = null;
  if (!isNaN(id)) {
    try {
      event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, requester.id]);
    } catch (e) {}
  }
  if (!event) {
    event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, requester.id]);
  }
  if (!event && isAdminOrBoss) {
    if (!isNaN(id)) {
      try { event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [id]); } catch (e) {}
    }
    if (!event) event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
  }
  return event;
}

async function updateEventById(id, body, username, res) {
  const requester = await dbAsync.get(
    'SELECT id, role, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?',
    [username]
  );
  if (!requester) return res.status(401).json({ error: 'Unauthorized' });

  const event = await findOwnedEvent(id, requester);
  if (!event) return res.status(404).json({ error: 'Event not found or not owned' });

  const payload = normalizeEventPayload(body);
  const isLocalOnly = !event.microsoft_id || event.microsoft_id.startsWith('local_');
  const owner = event.user_id === requester.id
    ? requester
    : await dbAsync.get(
        'SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?',
        [event.user_id]
      );

  if (!isLocalOnly && owner && owner.microsoft_access_token) {
    await pushEventToGraph(owner, payload, event.microsoft_id);
  }

  const sets = [];
  const vals = [];
  if (payload.subject !== undefined) { sets.push('subject = ?'); vals.push(payload.subject || ''); }
  if (payload.bodyPreview !== undefined) { sets.push('body_preview = ?'); vals.push(payload.bodyPreview || ''); }
  if (payload.startTime !== undefined) { sets.push('start_time = ?'); vals.push(payload.startTime || null); }
  if (payload.endTime !== undefined) { sets.push('end_time = ?'); vals.push(payload.endTime || null); }
  if (payload.location !== undefined) { sets.push('location = ?'); vals.push(payload.location || null); }
  if (payload.isAllDay !== undefined) { sets.push('is_all_day = ?'); vals.push(payload.isAllDay ? 1 : 0); }
  if (payload.categories !== undefined) {
    const catsJson = JSON.stringify(Array.isArray(payload.categories) ? payload.categories : [payload.categories]);
    sets.push('categories = ?'); vals.push(catsJson);
  }

  if (sets.length > 0) {
    sets.push('last_synced = CURRENT_TIMESTAMP');
    vals.push(event.id);
    await dbAsync.run(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  res.json({ success: true, message: 'Updated' });
}

app.put('/:id', authenticate, async (req, res) => {
  try { await updateEventById(req.params.id, req.body, req.user.username, res); }
  catch (error) { console.error('Error in PUT /:id:', error); res.status(500).json({ error: 'Error updating' }); }
});

app.patch('/:id', authenticate, async (req, res) => {
  try { await updateEventById(req.params.id, req.body, req.user.username, res); }
  catch (error) { console.error('Error in PATCH /:id:', error); res.status(500).json({ error: 'Error updating' }); }
});

app.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });

    const event = await findOwnedEvent(id, requester);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.microsoft_id && !event.microsoft_id.startsWith('local_')) {
      const owner = event.user_id === requester.id
        ? requester
        : await dbAsync.get(
            'SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?',
            [event.user_id]
          );
      if (owner && owner.microsoft_access_token) {
        try {
          const validToken = await getValidAccessToken(owner);
          if (validToken) {
            const client = getAuthenticatedClient(validToken);
            await client.api(`/me/events/${event.microsoft_id}`).delete();
          }
        } catch (e) {
          console.error('[OUTLOOK] Delete failed (maybe already deleted):', e.message);
        }
      }
    }

    await dbAsync.run('DELETE FROM calendar_events WHERE id = ?', [event.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Error in DELETE /:id:', error);
    res.status(500).json({ error: 'Error deleting' });
  }
});

app.put('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { id } = req.params;
    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';

    // Find the event in the local DB first (by microsoft_id or by local numeric id)
    let dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    if (!dbEvent && !isNaN(id)) {
      dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [parseInt(id), user.id]);
    }
    // If not found and user is admin/boss, search without user_id filter (for assigned events)
    if (!dbEvent && isAdminOrBoss) {
      dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
      if (!dbEvent && !isNaN(id)) {
        dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [parseInt(id)]);
      }
    }

    if (!dbEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const isLocalOnly = !dbEvent.microsoft_id || dbEvent.microsoft_id.startsWith('local_');
    const categoriesJson = JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : []));

    // Use event owner's token for Microsoft Graph (not admin's if editing someone else's event)
    const eventOwner = dbEvent.user_id === user.id 
      ? user 
      : await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?', [dbEvent.user_id]);

    // If linked to Microsoft and event owner has token, update in Graph
    if (!isLocalOnly && eventOwner && eventOwner.microsoft_access_token) {
      try {
        const validToken = await getValidAccessToken(eventOwner);
        if (!validToken) throw new Error('Token refresh failed');
        const client = getAuthenticatedClient(validToken);

        const updatedEvent = {
          subject: title,
          location: location ? { displayName: location } : null,
          body: { contentType: 'text', content: description || '' },
          categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
        };

        if (allDay) {
          updatedEvent.isAllDay = true;
          updatedEvent.start = { dateTime: `${start.split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' };
          updatedEvent.end = { dateTime: `${end.split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' };
        } else {
          updatedEvent.isAllDay = false;
          updatedEvent.start = { dateTime: start, timeZone: 'Europe/Madrid' };
          updatedEvent.end = { dateTime: end, timeZone: 'Europe/Madrid' };
        }

        const response = await client.api(`/me/events/${dbEvent.microsoft_id}`).patch(updatedEvent);

        // Update local DB with Microsoft response
        // For all-day events, convert UTC dateTime back to correct Madrid date
        const dbStartTime = response.isAllDay
          ? (utcDateTimeToMadridDate(response.start.dateTime) || start.split('T')[0])
          : (response.start.dateTime || start);
        const dbEndTime = response.isAllDay
          ? (utcDateTimeToMadridDate(response.end.dateTime) || end.split('T')[0])
          : (response.end.dateTime || end);
        await dbAsync.run(`
            UPDATE calendar_events SET
            subject = ?, body_preview = ?, start_time = ?, end_time = ?, is_all_day = ?,
            location = ?, web_link = ?, categories = ?, last_synced = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            response.subject, response.bodyPreview, dbStartTime, dbEndTime,
            response.isAllDay ? 1 : 0, response.location?.displayName, response.webLink,
            categoriesJson, dbEvent.id
        ]);

        return res.json({ id: response.id, title: response.subject });
      } catch (msError) {
        console.error('[OUTLOOK] Microsoft Graph update failed:', msError.message);
        // Fall through to local-only update
      }
    }

    // Local-only update (no Microsoft link, token expired, or Graph failed)
    await dbAsync.run(`
        UPDATE calendar_events SET
        subject = ?, body_preview = ?, start_time = ?, end_time = ?, is_all_day = ?,
        location = ?, categories = ?, last_synced = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        title, description || '', start, end,
        allDay ? 1 : 0, location || null,
        categoriesJson, dbEvent.id
    ]);

    res.json({ id: dbEvent.microsoft_id || dbEvent.id.toString(), title });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Error actualizando evento' });
  }
});

app.get('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { id } = req.params;
    const validToken = await getValidAccessToken(user);
    if (!validToken) return res.status(401).json({ error: 'Token expirado, reconecta tu cuenta' });
    const client = getAuthenticatedClient(validToken);

    const event = await client.api(`/me/events/${id}`).get();
    
    let startDate, endDate;
    if (event.isAllDay) {
      // All-day events: convert dateTime back to correct Madrid date
      startDate = utcDateTimeToMadridDate(event.start.dateTime) || (event.start.dateTime ? event.start.dateTime.split('T')[0] : null);
      endDate = utcDateTimeToMadridDate(event.end.dateTime) || (event.end.dateTime ? event.end.dateTime.split('T')[0] : null);
    } else {
      startDate = convertToSpainTime(event.start.dateTime);
      endDate = convertToSpainTime(event.end.dateTime);
    }

    res.json({
      id: event.id,
      title: event.subject,
      start: startDate,
      end: endDate,
      allDay: event.isAllDay,
      location: event.location?.displayName,
      description: event.body?.content,
      categories: event.categories
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
});

// --- GROUP EVENTS ENDPOINT ---
app.post('/group', authenticate, async (req, res) => {
  try {
    const { groupId, title, start, end, allDay, location, description, categories } = req.body;
    
    const assignerUsername = req.user.username || 'Alguien';
    
    // Build description with assigner info
    let fullDescription = description || '';
    if (!fullDescription.includes('Tarea creada por') && !fullDescription.includes('Asignado por')) {
      const assignText = `Asignado por: ${assignerUsername}`;
      fullDescription = fullDescription ? `${fullDescription}\n\n${assignText}` : assignText;
    }
    
    // 1. Get group members
    const members = await dbAsync.all(`
      SELECT u.id, u.username, u.microsoft_access_token, u.microsoft_refresh_token 
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `, [groupId]);

    if (!members || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Group has no members' });
    }

    const results = { success: 0, failed: 0, details: [] };

    // 2. Iterate and create events for each member
    for (const member of members) {
      try {
        let microsoftId = null;
        let webLink = null;

        // Try Outlook sync if linked (with auto-refresh)
        const memberToken = await getValidAccessToken(member);
        if (memberToken) {
          try {
            const client = getAuthenticatedClient(memberToken);
            
            const newEvent = {
              subject: `[Grupo] ${title}`,
              location: location ? { displayName: location } : null,
              body: { contentType: 'text', content: fullDescription },
              categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
            };

            if (allDay) {
              newEvent.isAllDay = true;
              const startDate = start.split('T')[0];
              let endDate = end.split('T')[0];
              if (endDate <= startDate) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + 1);
                endDate = d.toISOString().split('T')[0];
              }
              // All-day events: use dateTime with T00:00:00 (Graph API DateTimeTimeZone has no 'date' property)
              newEvent.start = { dateTime: `${startDate}T00:00:00`, timeZone: 'Europe/Madrid' };
              newEvent.end = { dateTime: `${endDate}T00:00:00`, timeZone: 'Europe/Madrid' };
            } else {
              newEvent.isAllDay = false;
              newEvent.start = { dateTime: start, timeZone: 'Europe/Madrid' };
              newEvent.end = { dateTime: end, timeZone: 'Europe/Madrid' };
            }

            const createdEvent = await client.api('/me/events').post(newEvent);
            microsoftId = createdEvent.id;
            webLink = createdEvent.webLink;
          } catch (outlookErr) {
            console.warn(`[GROUP] Outlook sync failed for ${member.username}: ${outlookErr.message}`);
          }
        }

        // Always save to DB (with or without Outlook)
        const eventId = microsoftId || `local_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
        
        await dbAsync.run(`
            INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, assigned_by, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            eventId, member.id, `[Grupo] ${title}`, fullDescription,
            start, end, allDay ? 1 : 0,
            location || null, webLink || null,
            JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : [])),
            assignerUsername
        ]);

        // Create Notification (via notification-service for socket emit)
        try {
          const notifRes = await fetch('http://notification-service:5002/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: member.id,
              title: 'calendar_event_assigned',
              message: `${assignerUsername}|${title}`,
              type: 'task',
              link: '/calendar',
              metadata: { 
                notifType: 'calendar_group',
                from: assignerUsername, 
                eventTitle: title,
                start, end, allDay: allDay || false
              }
            })
          });
          if (!notifRes.ok) {
            console.warn(`⚠️ Notification service error for ${member.username}:`, notifRes.status);
          }
        } catch (notifError) {
          console.warn(`⚠️ Could not send notification to ${member.username}:`, notifError.message);
        }

        results.success++;
      } catch (err) {
        console.error(`Error creating event for ${member.username}:`, err);
        results.failed++;
        results.details.push({ user: member.username, error: err.message });
      }
    }

    res.json({ success: true, results });

  } catch (error) {
    console.error('Error processing group event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ASSIGN TO USER ENDPOINT ---
app.post('/assign-user', authenticate, async (req, res) => {
  try {
    const { targetUserId, title, start, end, allDay, location, description, categories } = req.body;
    
    // 1. Get target user
    const targetUser = await dbAsync.get(`
      SELECT id, username, microsoft_access_token, microsoft_refresh_token 
      FROM users 
      WHERE id = ?
    `, [targetUserId]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const assignerUsername = req.user.username || 'Alguien';
    
    // Build description with assigner info
    let fullDescription = description || '';
    if (!fullDescription.includes('Tarea creada por') && !fullDescription.includes('Asignado por')) {
      const assignText = `Asignado por: ${assignerUsername}`;
      fullDescription = fullDescription ? `${fullDescription}\n\n${assignText}` : assignText;
    }

    let microsoftId = null;
    let webLink = null;
    let syncError = null;

    // 2. Create in Outlook if linked (with auto-refresh)
    const validToken = await getValidAccessToken(targetUser);
    if (validToken) {
      try {
        const client = getAuthenticatedClient(validToken);
        
        const newEvent = {
          subject: `[Asignado] ${title}`,
          location: location ? { displayName: location } : null,
          body: { contentType: 'text', content: fullDescription },
          categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
        };

        if (allDay) {
          newEvent.isAllDay = true;
          const startDate = start.split('T')[0];
          let endDate = end.split('T')[0];
          if (endDate <= startDate) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + 1);
            endDate = d.toISOString().split('T')[0];
          }
          // All-day events: use dateTime with T00:00:00 (Graph API DateTimeTimeZone has no 'date' property)
          newEvent.start = { dateTime: `${startDate}T00:00:00`, timeZone: 'Europe/Madrid' };
          newEvent.end = { dateTime: `${endDate}T00:00:00`, timeZone: 'Europe/Madrid' };
        } else {
          newEvent.isAllDay = false;
          newEvent.start = { dateTime: start, timeZone: 'Europe/Madrid' };
          newEvent.end = { dateTime: end, timeZone: 'Europe/Madrid' };
        }

        const createdEvent = await client.api('/me/events').post(newEvent);
        microsoftId = createdEvent.id;
        webLink = createdEvent.webLink;
        console.log(`[OUTLOOK] Assigned event created in Cloud for ${targetUser.username}: ${microsoftId}`);
      } catch (e) {
        console.error('[OUTLOOK] Assign creation failed:', e.message);
        syncError = e.message;
      }
    } else {
      console.log(`[ASSIGN] User ${targetUser.username} has no valid Outlook token, saving locally only`);
    }

    // 3. Always save to DB (with or without Outlook)
    const eventId = microsoftId || `local_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    
    await dbAsync.run(`
        INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, assigned_by, last_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
        eventId, targetUser.id, `[Asignado] ${title}`, fullDescription,
        start, end, allDay ? 1 : 0,
        location || null, webLink || null,
        JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : [])),
        assignerUsername
    ]);

    // 4. Create Notification
    try {
      const notifRes = await fetch('http://notification-service:5002/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          title: 'calendar_event_assigned',
          message: `${assignerUsername}|${title}`,
          type: 'task',
          link: '/calendar',
          metadata: { 
            notifType: 'calendar_assign',
            from: assignerUsername, 
            eventTitle: title,
            start, end, allDay: allDay || false
          }
        })
      });
      if (!notifRes.ok) {
        console.warn('⚠️ Notification service returned error:', notifRes.status);
      }
    } catch (notifError) {
      console.warn('⚠️ Could not send calendar notification:', notifError.message);
    }

    res.json({ 
      success: true, 
      message: 'Event assigned successfully',
      syncedToCloud: !!microsoftId,
      syncError: syncError
    });

  } catch (error) {
    console.error('Error assigning event to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// NEW ENDPOINT: Get Event by ID (verify existence for sync-status checks)
app.get('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Try local DB first
    let event = null;
    if (!isNaN(id)) {
      try {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
      } catch {}
    }
    if (!event) {
      event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    // If it's a Microsoft-backed event, also check live in Graph
    if (event && event.microsoft_id && !event.microsoft_id.startsWith('local_') && user.microsoft_access_token) {
      try {
        const validToken = await getValidAccessToken(user);
        if (validToken) {
          const client = getAuthenticatedClient(validToken);
          const remote = await client.api(`/me/events/${event.microsoft_id}`).get();
          return res.json({
            exists: true,
            source: 'graph',
            id: event.id,
            microsoftId: remote.id,
            subject: remote.subject,
            start: remote.start,
            end: remote.end,
            webLink: remote.webLink
          });
        }
      } catch (e) {
        // 404 from Graph means event was deleted
        if (e.statusCode === 404 || (e.code && e.code === 'ErrorItemNotFound')) {
          return res.status(404).json({ exists: false, error: 'Event not found in Outlook' });
        }
        console.warn('[OUTLOOK] Graph lookup failed, falling back to local:', e.message);
      }
    }

    if (event) {
      return res.json({
        exists: true,
        source: 'local',
        id: event.id,
        microsoftId: event.microsoft_id,
        subject: event.subject,
        start: { dateTime: event.start_time },
        end: { dateTime: event.end_time }
      });
    }

    // Not in local and not verifiable → if looks like MS id and we have token, check graph directly
    if (user.microsoft_access_token) {
      try {
        const validToken = await getValidAccessToken(user);
        if (validToken) {
          const client = getAuthenticatedClient(validToken);
          const remote = await client.api(`/me/events/${id}`).get();
          return res.json({
            exists: true,
            source: 'graph',
            microsoftId: remote.id,
            subject: remote.subject,
            start: remote.start,
            end: remote.end
          });
        }
      } catch (e) {
        if (e.statusCode === 404 || (e.code && e.code === 'ErrorItemNotFound')) {
          return res.status(404).json({ exists: false, error: 'Event not found' });
        }
      }
    }

    return res.status(404).json({ exists: false, error: 'Event not found' });
  } catch (error) {
    console.error('[OUTLOOK] Error in GET /events/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// NEW ENDPOINT: Create Event (AI/Manual)
app.post('/events', authenticate, async (req, res) => {
  try {
    const { subject, body, startTime, endTime, location, isAllDay, categories, provider_id } = req.body;
    const username = req.user.username;

    if (!subject || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let microsoftId = null;
    let webLink = null;
    let syncError = null;

    // 1. Create in Outlook if linked (with auto-refresh)
    if (user.microsoft_access_token) {
      try {
        const validToken = await getValidAccessToken(user);
        if (!validToken) throw new Error('Token refresh failed');
        const client = getAuthenticatedClient(validToken);
        const newEvent = {
          subject,
          body: {
            contentType: 'Text',
            content: body || ''
          },
          start: {
              dateTime: startTime, // Expecting ISO string e.g. "2023-10-27T10:00:00Z"
              timeZone: 'UTC'
          },
          end: {
              dateTime: endTime,
              timeZone: 'UTC'
          },
          location: { displayName: location || '' },
          isAllDay: !!isAllDay,
          categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
        };

        const result = await client.api('/me/events').post(newEvent);
        microsoftId = result.id;
        webLink = result.webLink;
        console.log(`[OUTLOOK] Event created in Cloud: ${microsoftId}`);
      } catch (e) {
        console.error('[OUTLOOK] Creation failed:', e.message);
        syncError = e.message;
        // Token already attempted refresh in getValidAccessToken
      }
    }

    // 2. Save Local
    const eventId = microsoftId || `local_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    
    // Check if duplicate (unlikely for new, but good practice)
    await dbAsync.run(`
        INSERT INTO calendar_events (
            microsoft_id, user_id, subject, body_preview, 
            start_time, end_time, is_all_day, location, 
            web_link, categories, provider_id, last_synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
        eventId,
        user.id,
        subject,
        body || '',
        startTime,
        endTime,
        isAllDay ? 1 : 0,
        location || null,
        webLink || null,
        JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : [])),
        provider_id || null
    ]);

    res.json({ 
        success: true, 
        microsoftId: eventId,
        syncedToCloud: !!microsoftId,
        syncError: syncError
    });

  } catch (error) {
    console.error('Error in POST /events:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// NEW ENDPOINT: Update Event
app.patch('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body, startTime, endTime, location, isAllDay, categories } = req.body;
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';

    let event = null;
    if (!isNaN(id)) {
      try {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
      } catch (e) { }
    }

    if (!event) {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    if (!event && isAdminOrBoss) {
        if (!isNaN(id)) {
            try {
                event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [id]);
            } catch (e) {  }
        }
        if (!event) {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
        }
    }

    if (!event) return res.status(404).json({ error: 'Event not found or not owned' });

    const isLocalOnly = !event.microsoft_id || event.microsoft_id.startsWith('local_');

    const eventOwner = event.user_id === user.id 
      ? user 
      : await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?', [event.user_id]);

    if (!isLocalOnly && eventOwner && eventOwner.microsoft_access_token) {
        try {
            const validToken = await getValidAccessToken(eventOwner);
            if (!validToken) throw new Error('Token refresh failed');
            const client = getAuthenticatedClient(validToken);
            const updateEvent = {};
            if (subject) updateEvent.subject = subject;
            if (body) updateEvent.body = { contentType: 'Text', content: body };
            if (isAllDay !== undefined) updateEvent.isAllDay = isAllDay;
            if (startTime) {
                updateEvent.start = isAllDay
                    ? { dateTime: `${startTime.split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' }
                    : { dateTime: startTime, timeZone: 'UTC' };
            }
            if (endTime) {
                updateEvent.end = isAllDay
                    ? { dateTime: `${endTime.split('T')[0]}T00:00:00`, timeZone: 'Europe/Madrid' }
                    : { dateTime: endTime, timeZone: 'UTC' };
            }
            if (location) updateEvent.location = { displayName: location };
            if (categories) updateEvent.categories = Array.isArray(categories) ? categories : [categories];

            await client.api(`/me/events/${event.microsoft_id}`).patch(updateEvent);
            console.log(`[OUTLOOK] Event updated in Cloud for user ${event.user_id}: ${event.microsoft_id}`);
        } catch (e) {
            console.error('[OUTLOOK] Update failed:', e.message);
        }
    }

    let sets = [];
    let vals = [];
    if (subject) { sets.push('subject = ?'); vals.push(subject); }
    if (body) { sets.push('body_preview = ?'); vals.push(body); }
    if (startTime) { sets.push('start_time = ?'); vals.push(startTime); }
    if (endTime) { sets.push('end_time = ?'); vals.push(endTime); }
    if (location) { sets.push('location = ?'); vals.push(location); }
    if (isAllDay !== undefined) { sets.push('is_all_day = ?'); vals.push(isAllDay ? 1 : 0); }
    if (categories) {
        const catsJson = JSON.stringify(Array.isArray(categories) ? categories : [categories]);
        sets.push('categories = ?'); vals.push(catsJson);
    }
    
    if (sets.length > 0) {
        sets.push('last_synced = CURRENT_TIMESTAMP');
        vals.push(event.id); 
        await dbAsync.run(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`, vals);
    }

    res.json({ success: true, message: 'Updated' });

  } catch (error) {
    console.error('Error in PATCH /events:', error);
    res.status(500).json({ error: 'Error updating' });
  }
});

app.delete('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';

    let event = null;
    if (!isNaN(id)) {
        try {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
        } catch (e) {  }
    }

    if (!event) {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    if (!event && isAdminOrBoss) {
        if (!isNaN(id)) {
            try {
                event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [id]);
            } catch (e) {  }
        }
        if (!event) {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
        }
    }

    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.microsoft_id && !event.microsoft_id.startsWith('local_')) {
        const eventOwner = event.user_id === user.id 
          ? user 
          : await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?', [event.user_id]);
        
        if (eventOwner && eventOwner.microsoft_access_token) {
            try {
                 const validToken = await getValidAccessToken(eventOwner);
                 if (validToken) {
                   const client = getAuthenticatedClient(validToken);
                   await client.api(`/me/events/${event.microsoft_id}`).delete();
                   console.log(`[OUTLOOK] Event deleted in Cloud for user ${event.user_id}: ${event.microsoft_id}`);
                 }
            } catch (e) {
                 console.error('[OUTLOOK] Delete failed (maybe already deleted):', e.message);
            }
        }
    }

    await dbAsync.run('DELETE FROM calendar_events WHERE id = ?', [event.id]);
    res.json({ success: true, message: 'Deleted' });

  } catch (error) {
    console.error('Error in DELETE /events:', error);
    res.status(500).json({ error: 'Error deleting' });
  }
});


function getMimeType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    mp3: 'audio/mpeg', wav: 'audio/wav',
    mp4: 'video/mp4', avi: 'video/x-msvideo',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    json: 'application/json', xml: 'application/xml',
    html: 'text/html', css: 'text/css', js: 'application/javascript',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

app.post('/attachments', authenticate, async (req, res) => {
  try {
    const { eventId, fileName, filePath, fileOwner, fileSize } = req.body;
    const username = req.user.username;

    if (!eventId || !fileName || !filePath) {
      return res.status(400).json({ error: 'Missing required fields (eventId, fileName, filePath)' });
    }

    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    const isAdminOrBoss = requester.role === 'admin' || requester.role === 'boss';
    let targetEvent = await dbAsync.get('SELECT user_id FROM calendar_events WHERE microsoft_id = ?', [eventId]);
    if (!targetEvent && !isNaN(eventId)) {
      targetEvent = await dbAsync.get('SELECT user_id FROM calendar_events WHERE id = ?', [parseInt(eventId)]);
    }
    if (!targetEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (targetEvent.user_id !== requester.id && !isAdminOrBoss) {
      return res.status(403).json({ error: 'No tienes permiso para adjuntar a este evento' });
    }

    const resolvedFileOwner = fileOwner || username;
    if (resolvedFileOwner !== username && !isAdminOrBoss) {
      const shareRow = await dbAsync.get(
        'SELECT id FROM shared_files WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
        [filePath, resolvedFileOwner, username]
      );
      if (!shareRow) {
        return res.status(403).json({ error: 'No tienes acceso a este archivo' });
      }
    }

    const result = await dbAsync.run(
      `INSERT INTO event_attachments (event_id, file_name, file_path, file_owner, attached_by, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, fileName, filePath, fileOwner || username, username, fileSize || 0]
    );

    const attachmentRecord = {
      id: result.lastID,
      eventId,
      fileName,
      filePath,
      fileOwner: fileOwner || username,
      attachedBy: username,
      fileSize: fileSize || 0
    };

    try {
      const dbEvent = await dbAsync.get(
        'SELECT microsoft_id, user_id FROM calendar_events WHERE microsoft_id = ?',
        [eventId]
      );

      if (dbEvent && dbEvent.microsoft_id && !dbEvent.microsoft_id.startsWith('local_')) {
        const eventOwner = await dbAsync.get(
          'SELECT id, username, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?',
          [dbEvent.user_id]
        );

        if (eventOwner && eventOwner.microsoft_access_token) {
          const validToken = await getValidAccessToken(eventOwner);
          
          if (validToken) {
            const fileOwnerName = fileOwner || username;
            const fileId = Buffer.from(filePath).toString('base64');
            const internalToken = jwt.sign(
              { username: fileOwnerName, role: 'admin' },
              JWT_SECRET,
              { expiresIn: '1m' }
            );
            
            const fileResponse = await fetch(
              `http://file-service:5004/download/${encodeURIComponent(fileId)}?token=${encodeURIComponent(internalToken)}`
            );

            if (fileResponse.ok) {
              const fileBuffer = await fileResponse.buffer();
              const base64Content = fileBuffer.toString('base64');
              const contentType = getMimeType(fileName);

              if (fileBuffer.length < 3 * 1024 * 1024) {
                const client = getAuthenticatedClient(validToken);
                await client.api(`/me/events/${dbEvent.microsoft_id}/attachments`).post({
                  '@odata.type': '#microsoft.graph.fileAttachment',
                  name: fileName,
                  contentType: contentType,
                  contentBytes: base64Content
                });
                console.log(`[OUTLOOK] Uploaded attachment "${fileName}" to event ${dbEvent.microsoft_id}`);
              } else {
                console.log(`[OUTLOOK] File "${fileName}" too large for simple attachment (${fileBuffer.length} bytes), skipping Graph upload`);
              }
            } else {
              console.warn(`[OUTLOOK] Could not download file from file-service: ${fileResponse.status}`);
            }
          }
        }
      }
    } catch (graphError) {
      console.error('[OUTLOOK] Error uploading attachment to Graph:', graphError.message);
    }

    res.status(201).json({ 
      success: true, 
      attachment: attachmentRecord
    });
  } catch (error) {
    console.error('Error attaching file:', error);
    res.status(500).json({ error: 'Error attaching file' });
  }
});

app.get('/:eventId/attachments', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const username = req.user.username;

    const requester = await dbAsync.get('SELECT id, role FROM users WHERE username = ?', [username]);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    const isAdminOrBoss = requester.role === 'admin' || requester.role === 'boss';
    let targetEvent = await dbAsync.get('SELECT user_id FROM calendar_events WHERE microsoft_id = ?', [eventId]);
    if (!targetEvent && !isNaN(eventId)) {
      targetEvent = await dbAsync.get('SELECT user_id FROM calendar_events WHERE id = ?', [parseInt(eventId)]);
    }
    if (!targetEvent) {
      return res.json({ success: true, attachments: [] });
    }
    if (targetEvent.user_id !== requester.id && !isAdminOrBoss) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const attachments = await dbAsync.all(
      'SELECT * FROM event_attachments WHERE event_id = ? ORDER BY created_at DESC',
      [eventId]
    );

    res.json({ 
      success: true, 
      attachments: (attachments || []).map(a => ({
        id: a.id,
        eventId: a.event_id,
        fileName: a.file_name,
        filePath: a.file_path,
        fileOwner: a.file_owner,
        attachedBy: a.attached_by,
        fileSize: a.file_size,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting attachments:', error);
    res.status(500).json({ error: 'Error getting attachments' });
  }
});

app.delete('/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const username = req.user.username;

    const attachment = await dbAsync.get(
      'SELECT * FROM event_attachments WHERE id = ?',
      [attachmentId]
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (attachment.attached_by !== username && attachment.file_owner !== username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to remove this attachment' });
    }

    await dbAsync.run('DELETE FROM event_attachments WHERE id = ?', [attachmentId]);

    res.json({ success: true, message: 'Attachment removed' });
  } catch (error) {
    console.error('Error removing attachment:', error);
    res.status(500).json({ error: 'Error removing attachment' });
  }
});

app.listen(PORT, () => {

  console.log(`Outlook Service running on port ${PORT}`);
});
