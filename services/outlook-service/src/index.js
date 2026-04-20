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

// Middleware de autenticación
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

// --- Token refresh lock per user to avoid race conditions ---
const tokenRefreshLocks = new Map(); // userId -> Promise

async function withTokenRefreshLock(userId, fn) {
  // If a refresh is already in progress for this user, wait for it
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

// --- Auto-refresh Microsoft tokens ---
// Refreshes an expired access_token using the stored refresh_token
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
      // If refresh token is also invalid, clear everything
      if (data.error === 'invalid_grant') {
        await dbAsync.run('UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE id = ?', [userId]);
      }
      return null;
    }

    // Save new tokens to DB
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken; // MS may or may not return a new refresh token
    
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

// Gets a valid access token for a user - refreshes automatically if expired
// user object must have: id, microsoft_access_token, microsoft_refresh_token
async function getValidAccessToken(user) {
  if (!user.microsoft_access_token) return null;

  // First try with existing token (fast path - no extra API call)
  try {
    const client = getAuthenticatedClient(user.microsoft_access_token);
    // Quick validation - use a lightweight endpoint
    await client.api('/me').select('id').get();
    return user.microsoft_access_token; // Token is valid
  } catch (err) {
    // Token expired or invalid - try refresh
    if (err.statusCode === 401 || err.code === 'InvalidAuthenticationToken' || 
        (err.message && (err.message.includes('JWT is not well formed') || err.message.includes('Access token has expired') || err.message.includes('Lifetime validation failed')))) {
      console.log(`[TOKEN] Access token expired for user ID ${user.id}, attempting refresh...`);
      const newToken = await withTokenRefreshLock(user.id, () => refreshAccessToken(user.id, user.microsoft_refresh_token));
      return newToken; // null if refresh failed
    }
    // Some other error (network, etc.) - return existing token and let caller handle
    console.warn('[TOKEN] Validation check failed with non-auth error:', err.message);
    return user.microsoft_access_token;
  }
}

// Helper Response Handler
const sendResponse = (res, status, data, notification = null) => {
  const response = { ...data };
  if (notification) {
    response.notification = notification;
  }
  res.status(status).json(response);
};

// Función CORREGIDA - Usar UTC
function convertToSpainTime(dateStr, isAllDay = false) {
  if (!dateStr) return null;
  if (isAllDay) return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  // Si no tiene Z y no tiene offset, asumir que es UTC y añadir Z
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
      return dateStr + 'Z';
  }
  return dateStr;
}

/**
 * Convert a UTC dateTime string from Graph API to the correct date (YYYY-MM-DD) in Europe/Madrid.
 * Graph API with Prefer: outlook.timezone="UTC" shifts all-day event midnight from Madrid to UTC,
 * causing the date to move back one day. This converts it back to the correct Madrid date.
 */
function utcDateTimeToMadridDate(dateTimeStr) {
  if (!dateTimeStr) return null;
  if (!dateTimeStr.includes('T')) return dateTimeStr;
  const utc = new Date(dateTimeStr.endsWith('Z') ? dateTimeStr : dateTimeStr + 'Z');
  return utc.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

/**
 * Ensure a value from DB is a date-only string (YYYY-MM-DD) for all-day events.
 * PostgreSQL TIMESTAMP columns return JS Date objects via the pg driver.
 */
function toDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toLocaleDateString('en-CA', { timeZone: 'UTC' });
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  return val;
}

// Función para convertir colores de Outlook a hexadecimal
function getOutlookCategoryColor(outlookColor) {
  // Microsoft Outlook category preset colors (official mapping)
  const colorMap = {
    'preset0': '#e74856',   // Red
    'preset1': '#ff8c00',   // Orange
    'preset2': '#f7b262',   // Peach / Brown
    'preset3': '#f8db3e',   // Yellow
    'preset4': '#3da848',   // Green
    'preset5': '#47a5a5',   // Teal
    'preset6': '#9cac36',   // Olive
    'preset7': '#4585ed',   // Blue
    'preset8': '#b085dc',   // Purple
    'preset9': '#c44569',   // Cranberry
    'preset10': '#647687',  // Steel
    'preset11': '#4b5d6e',  // DarkSteel
    'preset12': '#98a8b4',  // Gray
    'preset13': '#636c73',  // DarkGray
    'preset14': '#4a4c4f',  // Black
    'preset15': '#8f3a40',  // DarkRed
    'preset16': '#c06000',  // DarkOrange
    'preset17': '#c18c4a',  // DarkPeach
    'preset18': '#b39e35',  // DarkYellow
    'preset19': '#2f7635',  // DarkGreen
    'preset20': '#377b7b',  // DarkTeal
    'preset21': '#72852b',  // DarkOlive
    'preset22': '#304da5',  // DarkBlue
    'preset23': '#8459a5',  // DarkPurple
    'preset24': '#96314c'   // DarkCranberry
  };

  return colorMap[outlookColor] || '#4585ed';
}

// --- Rutas ---

// Background sync tracker: avoid concurrent syncs for same user
const syncInProgress = new Map();

// --- Connection status endpoint ---
// Actually validates the Microsoft token instead of just checking if it exists
app.get('/status', authenticate, async (req, res) => {
  try {
    const user = await dbAsync.get(
      'SELECT id, microsoft_access_token, microsoft_refresh_token, microsoft_email FROM users WHERE username = ?',
      [req.user.username]
    );

    if (!user || !user.microsoft_access_token) {
      return res.json({ success: true, linked: false, email: null });
    }

    // Actually validate the token (will auto-refresh if expired)
    const validToken = await getValidAccessToken(user);

    if (!validToken) {
      // Token expired AND refresh failed — connection is dead, clean up
      console.log(`[STATUS] Clearing dead tokens for user ${req.user.username}`);
      await dbAsync.run('UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE id = ?', [user.id]);
      return res.json({ success: true, linked: false, email: user.microsoft_email });
    }

    return res.json({ success: true, linked: true, email: user.microsoft_email });
  } catch (error) {
    console.error('[STATUS] Error checking connection:', error.message);
    return res.json({ success: true, linked: false, email: null });
  }
});

// Helper: fetch events from Microsoft Graph and upsert into DB
// Returns the array of formatted events from MS, or [] on failure
async function syncEventsFromMicrosoft(user, start, end) {
    const validToken = await getValidAccessToken(user);
    if (!validToken) return [];
    const client = getAuthenticatedClient(validToken);

    let msQuery = client.api('/me/calendar/events')
        .header('Prefer', 'outlook.timezone="UTC"')
        .select('id,subject,bodyPreview,start,end,location,webLink,isAllDay,categories')
        .top(200);

    if (start && end) {
        const startISO = new Date(start).toISOString();
        const endISO = new Date(end).toISOString();
        msQuery = msQuery.filter(`start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'`);
    }

    const eventsResponse = await msQuery.get();
    const formatted = [];

    for (const event of eventsResponse.value) {
        let startTime, endTime;
        if (event.isAllDay) {
            startTime = utcDateTimeToMadridDate(event.start.dateTime);
            endTime = utcDateTimeToMadridDate(event.end.dateTime);
        } else {
            startTime = event.start.dateTime.endsWith('Z') ? event.start.dateTime : event.start.dateTime + 'Z';
            endTime = event.end.dateTime.endsWith('Z') ? event.end.dateTime : event.end.dateTime + 'Z';
        }

        await dbAsync.run(`
            INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(microsoft_id) DO UPDATE SET
            subject=excluded.subject,
            body_preview=excluded.body_preview,
            start_time=excluded.start_time,
            end_time=excluded.end_time,
            is_all_day=excluded.is_all_day,
            location=excluded.location,
            web_link=excluded.web_link,
            categories=excluded.categories,
            last_synced=CURRENT_TIMESTAMP
        `, [
            event.id, user.id, event.subject, event.bodyPreview,
            startTime, endTime, event.isAllDay ? 1 : 0,
            event.location?.displayName, event.webLink,
            JSON.stringify(event.categories || [])
        ]);

        formatted.push({
            id: event.id,
            title: event.subject,
            start: event.isAllDay ? startTime : startTime,
            end: event.isAllDay ? endTime : endTime,
            allDay: event.isAllDay || false,
            location: event.location?.displayName,
            description: event.bodyPreview,
            url: event.webLink,
            categories: event.categories || [],
            source: 'microsoft'
        });
    }

    return formatted;
}

app.get('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const { start, end } = req.query;

    // 1. Obtener usuario y token
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);
    
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 2. Devolver eventos de la DB PRIMERO (rápido)
    let targetUserIds = [user.id];
    if ((user.role === 'admin' || user.role === 'boss') && req.query.userId) {
        targetUserIds = req.query.userId.split(',').map(id => id.trim());
    }

    const placeholders = targetUserIds.map(() => '?').join(',');
    let query = `SELECT * FROM calendar_events WHERE user_id IN (${placeholders})`;
    let params = [...targetUserIds];

    // Add date filter to DB query for faster response
    if (start && end) {
        query += ` AND start_time <= ? AND end_time >= ?`;
        params.push(new Date(end).toISOString(), new Date(start).toISOString());
    }

    const dbEvents = await dbAsync.all(query, params);

    const formattedEvents = dbEvents.map(e => {
        let categories = [];
        try {
            if (typeof e.categories === 'string') {
                categories = JSON.parse(e.categories);
            } else if (Array.isArray(e.categories)) {
                categories = e.categories;
            }
        } catch (err) {}

        const isAllDay = e.is_all_day === 1 || e.is_all_day === true;
        return {
            id: e.microsoft_id || e.id.toString(),
            title: e.subject,
            start: isAllDay ? toDateOnly(e.start_time) : e.start_time,
            end: isAllDay ? toDateOnly(e.end_time) : e.end_time,
            allDay: isAllDay,
            location: e.location,
            description: e.body_preview,
            url: e.web_link,
            categories: categories,
            assignedBy: e.assigned_by || null,
            source: 'database'
        };
    });

    // 3. If DB has events, return them immediately and sync in background
    // If DB is EMPTY but user has Microsoft token, do SYNCHRONOUS sync (otherwise user sees nothing)
    const isOwnCalendar = targetUserIds.length === 1 && targetUserIds[0] === user.id;
    const dbIsEmpty = formattedEvents.length === 0;
    const hasMicrosoftToken = !!user.microsoft_access_token;

    if (dbIsEmpty && hasMicrosoftToken && isOwnCalendar && !syncInProgress.get(user.id)) {
        // Synchronous sync: user sees empty calendar otherwise
        syncInProgress.set(user.id, true);
        try {
            console.log(`[SYNC] DB empty for user ${username}, doing synchronous sync...`);
            const msEvents = await syncEventsFromMicrosoft(user, start, end);
            console.log(`[SYNC] Synchronous sync completed for user ${username}: ${msEvents.length} events`);
            return res.json(msEvents);
        } catch (msError) {
            console.error('[SYNC] Synchronous sync failed:', msError.message || msError);
            // Return empty array - DB had nothing and sync failed
            return res.json(formattedEvents);
        } finally {
            syncInProgress.delete(user.id);
        }
    }

    // DB has events - return immediately
    res.json(formattedEvents);

    // Background sync (non-blocking, after response sent)
    if (hasMicrosoftToken && isOwnCalendar && !syncInProgress.get(user.id)) {
        syncInProgress.set(user.id, true);
        setImmediate(async () => {
            try {
                await syncEventsFromMicrosoft(user, start, end);
                console.log(`[SYNC] Background sync completed for user ${username}`);
            } catch (msError) {
                console.error('[SYNC] Background Microsoft sync failed:', msError.message || msError);
            } finally {
                syncInProgress.delete(user.id);
            }
        });
    }

  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/categories', authenticate, async (req, res) => {
  try {
    let targetUsernames = [req.user.username];

    // Allow admin/boss to fetch categories for another user(s)
    if ((req.user.role === 'admin' || req.user.role === 'boss') && req.query.userId) {
      const ids = req.query.userId.split(',').map(id => id.trim()).filter(id => id);
      if (ids.length > 0) {
        // Create placeholders for SQL IN clause
        const placeholders = ids.map(() => '?').join(',');
        const users = await dbAsync.all(`SELECT username FROM users WHERE id IN (${placeholders})`, ids);
        if (users && users.length > 0) {
          targetUsernames = users.map(u => u.username);
        }
      }
    }

    // Use a Map to merge categories by name, avoiding duplicates
    const mergedCategories = new Map();

    for (const username of targetUsernames) {
      try {
        const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);
        
        if (!user || !user.microsoft_access_token) continue;

        const validToken = await getValidAccessToken(user);
        if (!validToken) continue;

        const client = getAuthenticatedClient(validToken);
        const categoriesResponse = await client.api('/me/outlook/masterCategories').get();

        if (categoriesResponse.value) {
          categoriesResponse.value.forEach(category => {
            // If category doesn't exist in map, add it. 
            // If it exists, we keep the first one found (arbitrary priority)
            if (!mergedCategories.has(category.displayName)) {
              mergedCategories.set(category.displayName, {
                id: category.id,
                name: category.displayName,
                color: category.color,
                hexColor: getOutlookCategoryColor(category.color)
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching categories for user ${username}:`, err.message);
        // Continue to next user even if one fails
      }
    }

    res.json(Array.from(mergedCategories.values()));
  } catch (error) {
    console.error('Error getting categories:', error);
    // ... existing error handling ...
    if (error.code === 'InvalidAuthenticationToken') {
       // Only invalidate if it's the current user's token that failed
       if (req.user.username === (await dbAsync.get('SELECT username FROM users WHERE microsoft_access_token IS NOT NULL AND username = ?', [req.user.username]))?.username) {
          await dbAsync.run('UPDATE users SET microsoft_access_token = NULL WHERE username = ?', [req.user.username]);
       }
       return sendResponse(res, 401, { error: 'REAUTH' });
    }
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/categories', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { name, color } = req.body;
    const validToken = await getValidAccessToken(user);
    if (!validToken) return res.status(401).json({ error: 'Token expirado, reconecta tu cuenta' });
    const client = getAuthenticatedClient(validToken);

    const newCategory = { displayName: name, color: color || 'preset0' };
    const createdCategory = await client.api('/me/outlook/masterCategories').post(newCategory);

    res.status(201).json({
      id: createdCategory.id,
      name: createdCategory.displayName,
      color: createdCategory.color,
      hexColor: getOutlookCategoryColor(createdCategory.color)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/sync', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) {
      return sendResponse(res, 400, { error: 'No vinculado' });
    }

    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 1);
    const end = new Date(now); end.setMonth(end.getMonth() + 6);

    const msEvents = await syncEventsFromMicrosoft(user, start.toISOString(), end.toISOString());

    if (msEvents.length === 0 && user.microsoft_access_token) {
      // Sync returned nothing - check if token is actually dead
      const validToken = await getValidAccessToken(user);
      if (!validToken) {
        return sendResponse(res, 401, { error: 'Token expirado, reconecta tu cuenta' });
      }
    }

    sendResponse(res, 200, { success: true, message: `Sincronizados ${msEvents.length} eventos` });
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Error de sincronización' });
  }
});

app.post('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado', message: 'Conecta tu cuenta de Microsoft para crear eventos' });

    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
    const validToken = await getValidAccessToken(user);
    if (!validToken) return res.status(401).json({ error: 'Token expirado', message: 'Token expirado, reconecta tu cuenta de Microsoft' });
    const client = getAuthenticatedClient(validToken);

    const newEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: { contentType: 'text', content: description || '' },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    if (allDay) {
      newEvent.isAllDay = true;
      const startDateStr = start.split('T')[0];
      let endDateStr = end.split('T')[0];
      // Graph API requires end date to be the day AFTER the last day for all-day events
      if (endDateStr <= startDateStr) {
        const d = new Date(startDateStr);
        d.setDate(d.getDate() + 1);
        endDateStr = d.toISOString().split('T')[0];
      }
      // All-day events: use dateTime with T00:00:00 (Graph API DateTimeTimeZone has no 'date' property)
      newEvent.start = { dateTime: `${startDateStr}T00:00:00`, timeZone: 'Europe/Madrid' };
      newEvent.end = { dateTime: `${endDateStr}T00:00:00`, timeZone: 'Europe/Madrid' };
    } else {
      newEvent.isAllDay = false;
      newEvent.start = { dateTime: start, timeZone: 'Europe/Madrid' };
      newEvent.end = { dateTime: end, timeZone: 'Europe/Madrid' };
    }

    if (attendees && attendees.trim()) {
      newEvent.attendees = attendees.split(',').map(email => ({
        emailAddress: { address: email.trim(), name: email.trim() }
      }));
    }

    const createdEvent = await client.api('/me/events').post(newEvent);

    let startDate, endDate;
    if (createdEvent.isAllDay) {
      // All-day events: extract correct Madrid date from response dateTime
      startDate = utcDateTimeToMadridDate(createdEvent.start.dateTime) || start.split('T')[0];
      endDate = utcDateTimeToMadridDate(createdEvent.end.dateTime) || end.split('T')[0];
    } else {
      startDate = createdEvent.start.dateTime.endsWith('Z') ? createdEvent.start.dateTime : createdEvent.start.dateTime + 'Z';
      endDate = createdEvent.end.dateTime.endsWith('Z') ? createdEvent.end.dateTime : createdEvent.end.dateTime + 'Z';
    }

    const formattedEvent = {
      id: createdEvent.id,
      title: createdEvent.subject,
      start: startDate,
      end: endDate,
      allDay: createdEvent.isAllDay,
      extendedProps: {
        location: createdEvent.location?.displayName,
        description: createdEvent.bodyPreview,
        categories: createdEvent.categories
      }
    };

    try {
      // For all-day events, store the correct Madrid date
      const dbStartTime = createdEvent.isAllDay
        ? (utcDateTimeToMadridDate(createdEvent.start.dateTime) || start.split('T')[0])
        : (createdEvent.start.dateTime || start);
      const dbEndTime = createdEvent.isAllDay
        ? (utcDateTimeToMadridDate(createdEvent.end.dateTime) || end.split('T')[0])
        : (createdEvent.end.dateTime || end);
      await dbAsync.run(`
          INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, last_synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
          createdEvent.id, user.id, createdEvent.subject, createdEvent.bodyPreview,
          dbStartTime, dbEndTime, createdEvent.isAllDay ? 1 : 0,
          createdEvent.location?.displayName, createdEvent.webLink,
          JSON.stringify(createdEvent.categories || [])
      ]);
    } catch (e) {}

    res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creando evento', message: error.message || 'Error creando evento' });
  }
});

app.delete('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { id } = req.params;
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';

    // Find event in local DB - admin/boss can find ANY user's events
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

    // Delete from Microsoft if linked
    // Use the EVENT OWNER's token to delete from their Outlook (not the admin's)
    if (!isLocalOnly) {
      const eventOwner = dbEvent.user_id === user.id 
        ? user 
        : await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token FROM users WHERE id = ?', [dbEvent.user_id]);
      
      if (eventOwner && eventOwner.microsoft_access_token) {
        try {
          const validToken = await getValidAccessToken(eventOwner);
          if (validToken) {
            const client = getAuthenticatedClient(validToken);
            await client.api(`/me/events/${dbEvent.microsoft_id}`).delete();
            console.log(`[OUTLOOK] Deleted event ${dbEvent.microsoft_id} from user ${dbEvent.user_id}'s Outlook`);
          }
        } catch (msError) {
          console.error('[OUTLOOK] Microsoft Graph delete failed:', msError.message);
          // Continue with local deletion even if MS fails
        }
      }
    }

    // Delete from local DB
    await dbAsync.run('DELETE FROM calendar_events WHERE id = ?', [dbEvent.id]);

    res.json({ success: true, message: 'Evento eliminado', id });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Error eliminando evento' });
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


// NEW ENDPOINT: Create Event (AI/Manual)
app.post('/events', authenticate, async (req, res) => {
  try {
    const { subject, body, startTime, endTime, location, isAllDay, categories } = req.body;
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
            web_link, categories, last_synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : []))
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
    const { id } = req.params; // Can be local ID or Microsoft ID
    const { subject, body, startTime, endTime, location, isAllDay, categories } = req.body;
    const username = req.user.username;

    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';
    
    // Check if event exists
    let event = null;
    
    // If id is numeric, try searching by local ID first
    if (!isNaN(id)) {
        try {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
        } catch (e) { /* Ignore type errors */ }
    }
    
    if (!event) {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    // If not found and user is admin/boss, search without user_id filter
    if (!event && isAdminOrBoss) {
        if (!isNaN(id)) {
            try {
                event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [id]);
            } catch (e) { /* Ignore */ }
        }
        if (!event) {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
        }
    }

    if (!event) return res.status(404).json({ error: 'Event not found or not owned' });

    const isLocalOnly = !event.microsoft_id || event.microsoft_id.startsWith('local_');

    // Update Outlook using event OWNER's token if linked
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
            // For all-day events, use dateTime with T00:00:00 (DateTimeTimeZone has no 'date' property)
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
            // Token already attempted refresh in getValidAccessToken
        }
    }

    // Update Local DB - dynamic update builder
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

// NEW ENDPOINT: Delete Event
app.delete('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token, microsoft_refresh_token, role FROM users WHERE username = ?', [username]);
    const isAdminOrBoss = user.role === 'admin' || user.role === 'boss';

    // Find event - first try with user_id filter
    let event = null;
    if (!isNaN(id)) {
        try {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
        } catch (e) { /* Ignore */ }
    }

    if (!event) {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    // If not found and user is admin/boss, search without user_id filter (for assigned events)
    if (!event && isAdminOrBoss) {
        if (!isNaN(id)) {
            try {
                event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ?', [id]);
            } catch (e) { /* Ignore */ }
        }
        if (!event) {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ?', [id]);
        }
    }

    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Delete from Outlook using event OWNER's token (not admin's)
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

    // Delete Local
    await dbAsync.run('DELETE FROM calendar_events WHERE id = ?', [event.id]);
    res.json({ success: true, message: 'Deleted' });

  } catch (error) {
    console.error('Error in DELETE /events:', error);
    res.status(500).json({ error: 'Error deleting' });
  }
});

// --- EVENT ATTACHMENTS ---

// Helper: Get MIME type from filename
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

// Attach a file to an event (saves locally + uploads to Outlook if linked)
app.post('/attachments', authenticate, async (req, res) => {
  try {
    const { eventId, fileName, filePath, fileOwner, fileSize } = req.body;
    const username = req.user.username;

    if (!eventId || !fileName || !filePath) {
      return res.status(400).json({ error: 'Missing required fields (eventId, fileName, filePath)' });
    }

    // Save to local DB first
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

    // Try to upload to Microsoft Outlook via Graph API
    try {
      // Check if event has a microsoft_id (not local-only)
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
            // Download file from file-service (internal docker network)
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

              // Upload to Graph API (files < 3MB use simple attachment)
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
      // Don't fail the whole request if Graph upload fails - attachment is saved locally
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

// Get attachments for an event
app.get('/:eventId/attachments', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    
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

// Remove an attachment
app.delete('/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const username = req.user.username;

    // Only the person who attached or the file owner can remove
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