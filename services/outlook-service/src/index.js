require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@microsoft/microsoft-graph-client');
const { dbAsync } = require('./database/db');
require('isomorphic-fetch');

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

function getAuthenticatedClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
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

// Función para convertir colores de Outlook a hexadecimal
function getOutlookCategoryColor(outlookColor) {
  const colorMap = {
    'preset0': '#ff1a1a',   // Rojo
    'preset1': '#ff8c00',   // Naranja
    'preset2': '#8b4513',   // Marrón
    'preset3': '#ffd700',   // Amarillo
    'preset4': '#32cd32',   // Verde
    'preset5': '#008080',   // Turquesa
    'preset6': '#2563eb',   // Azul
    'preset7': '#800080',   // Púrpura
    'preset8': '#c0c0c0',   // Gris
    'preset9': '#696969',   // Gris oscuro
    'preset10': '#dc143c',  // Crimson
    'preset11': '#ff69b4',  // Rosa
    'preset12': '#3b82f6',  // Azul real
    'preset13': '#228b22',  // Verde bosque
    'preset14': '#ff4500',  // Rojo naranja
    'preset15': '#9932cc',  // Orquídea oscura
    'preset16': '#8b0000',  // Rojo oscuro
    'preset17': '#556b2f',  // Verde oliva oscuro
    'preset18': '#2f4f4f',  // Gris pizarra oscuro
    'preset19': '#b22222',  // Ladrillo
    'preset20': '#8fbc8f',  // Verde marino oscuro
    'preset21': '#1e40af',  // Azul pizarra oscuro
    'preset22': '#2e8b57',  // Verde marino
    'preset23': '#800000',  // Granate
    'preset24': '#9acd32'   // Verde amarillo
  };

  return colorMap[outlookColor] || '#4285f4';
}

// --- Rutas ---

app.get('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const { start, end } = req.query;

    // 1. Obtener usuario y token
    const user = await dbAsync.get('SELECT id, microsoft_access_token, role FROM users WHERE username = ?', [username]);
    
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 2. Si tiene token, sincronizar con Microsoft
    if (user.microsoft_access_token) {
        try {
            const client = getAuthenticatedClient(user.microsoft_access_token);
            
            let query = client.api('/me/calendar/events')
                .header('Prefer', 'outlook.timezone="UTC"')
                .select('id,subject,bodyPreview,start,end,location,webLink,isAllDay,categories')
                .top(100);

            if (start && end) {
                const startISO = new Date(start).toISOString();
                const endISO = new Date(end).toISOString();
                query = query.filter(`start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'`);
            }
            
            const eventsResponse = await query.get();

            // Sync to DB
            for (const event of eventsResponse.value) {
                const startTime = event.start.dateTime.endsWith('Z') ? event.start.dateTime : event.start.dateTime + 'Z';
                const endTime = event.end.dateTime.endsWith('Z') ? event.end.dateTime : event.end.dateTime + 'Z';

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
                    event.id,
                    user.id,
                    event.subject,
                    event.bodyPreview,
                    startTime,
                    endTime,
                    event.isAllDay ? 1 : 0,
                    event.location?.displayName,
                    event.webLink,
                    JSON.stringify(event.categories || [])
                ]);
            }
        } catch (msError) {
            console.error('Error syncing with Microsoft:', msError);
            if (msError.code === 'InvalidAuthenticationToken' || (msError.message && msError.message.includes('JWT is not well formed'))) {
              try {
                await dbAsync.run(
                  'UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?', 
                  [username]
                );
              } catch (dbError) {}
            }
        }
    }

    // 3. Devolver eventos de la DB
    let targetUserIds = [user.id];
    if ((user.role === 'admin' || user.role === 'boss') && req.query.userId) {
        // Support comma-separated list of IDs
        targetUserIds = req.query.userId.split(',').map(id => id.trim());
    }
    
    console.log(`[DEBUG] Fetching events for user_ids: ${targetUserIds.join(',')}`);

    // Construct query for multiple users
    const placeholders = targetUserIds.map(() => '?').join(',');
    let query = `SELECT * FROM calendar_events WHERE user_id IN (${placeholders})`;
    let params = [...targetUserIds];

    const dbEvents = await dbAsync.all(query, params);
    console.log(`[DEBUG] Found ${dbEvents.length} events in DB`);

    const formattedEvents = dbEvents.map(e => {
        let categories = [];
        try {
            // Handle both JSON string and array (if already parsed by driver)
            if (typeof e.categories === 'string') {
                categories = JSON.parse(e.categories);
            } else if (Array.isArray(e.categories)) {
                categories = e.categories;
            }
        } catch (err) {}

        return {
            id: e.microsoft_id || e.id.toString(),
            title: e.subject,
            start: e.start_time,
            end: e.end_time,
            allDay: e.is_all_day === 1 || e.is_all_day === true, // Handle boolean/int
            location: e.location,
            description: e.body_preview,
            url: e.web_link,
            categories: categories,
            assignedBy: e.assigned_by || null,
            source: 'database'
        };
    });

    res.json(formattedEvents);

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
        const user = await dbAsync.get('SELECT microsoft_access_token FROM users WHERE username = ?', [username]);
        
        if (!user || !user.microsoft_access_token) continue;

        const client = getAuthenticatedClient(user.microsoft_access_token);
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
    const user = await dbAsync.get('SELECT microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { name, color } = req.body;
    const client = getAuthenticatedClient(user.microsoft_access_token);

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
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) {
      return sendResponse(res, 400, { error: 'No vinculado' });
    }

    const client = getAuthenticatedClient(user.microsoft_access_token);
    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 1);
    const end = new Date(now); end.setMonth(end.getMonth() + 6);

    const eventsResponse = await client.api('/me/calendar/events')
        .header('Prefer', 'outlook.timezone="UTC"')
        .select('id,subject,bodyPreview,start,end,location,webLink,isAllDay,categories')
        .filter(`start/dateTime ge '${start.toISOString()}' and end/dateTime le '${end.toISOString()}'`)
        .top(200)
        .get();

    let syncedCount = 0;
    for (const event of eventsResponse.value) {
        const startTime = event.start.dateTime.endsWith('Z') ? event.start.dateTime : event.start.dateTime + 'Z';
        const endTime = event.end.dateTime.endsWith('Z') ? event.end.dateTime : event.end.dateTime + 'Z';

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
            event.id, user.id, event.subject, event.bodyPreview, startTime, endTime,
            event.isAllDay ? 1 : 0, event.location?.displayName, event.webLink, JSON.stringify(event.categories || [])
        ]);
        syncedCount++;
    }

    sendResponse(res, 200, { success: true, message: `Sincronizados ${syncedCount} eventos` });
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Error de sincronización' });
  }
});

app.post('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
    const client = getAuthenticatedClient(user.microsoft_access_token);

    const newEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: { contentType: 'text', content: description || '' },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    if (allDay) {
      newEvent.isAllDay = true;
      newEvent.start = { date: start.split('T')[0], timeZone: 'Europe/Madrid' };
      newEvent.end = { date: end.split('T')[0], timeZone: 'Europe/Madrid' };
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
      startDate = createdEvent.start.date;
      endDate = createdEvent.end.date;
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
      await dbAsync.run(`
          INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, last_synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
          createdEvent.id, user.id, createdEvent.subject, createdEvent.bodyPreview,
          createdEvent.start.dateTime, createdEvent.end.dateTime, createdEvent.isAllDay ? 1 : 0,
          createdEvent.location?.displayName, createdEvent.webLink
      ]);
    } catch (e) {}

    res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creando evento' });
  }
});

app.delete('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { id } = req.params;

    // Find event in local DB first
    let dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    if (!dbEvent && !isNaN(id)) {
      dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [parseInt(id), user.id]);
    }

    if (!dbEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const isLocalOnly = !dbEvent.microsoft_id || dbEvent.microsoft_id.startsWith('local_');

    // Delete from Microsoft if linked
    if (!isLocalOnly && user.microsoft_access_token) {
      try {
        const client = getAuthenticatedClient(user.microsoft_access_token);
        await client.api(`/me/events/${dbEvent.microsoft_id}`).delete();
      } catch (msError) {
        console.error('[OUTLOOK] Microsoft Graph delete failed:', msError.message);
        // Continue with local deletion even if MS fails
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
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { id } = req.params;
    const { title, start, end, allDay, location, description, attendees, categories } = req.body;

    // Find the event in the local DB first (by microsoft_id or by local numeric id)
    let dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    if (!dbEvent && !isNaN(id)) {
      dbEvent = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [parseInt(id), user.id]);
    }

    if (!dbEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const isLocalOnly = !dbEvent.microsoft_id || dbEvent.microsoft_id.startsWith('local_');
    const categoriesJson = JSON.stringify(Array.isArray(categories) ? categories : (categories ? [categories] : []));

    // If linked to Microsoft and user has token, update in Graph
    if (!isLocalOnly && user.microsoft_access_token) {
      try {
        const client = getAuthenticatedClient(user.microsoft_access_token);

        const updatedEvent = {
          subject: title,
          location: location ? { displayName: location } : null,
          body: { contentType: 'text', content: description || '' },
          categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
        };

        if (allDay) {
          updatedEvent.isAllDay = true;
          updatedEvent.start = { date: start.split('T')[0], timeZone: 'Europe/Madrid' };
          updatedEvent.end = { date: end.split('T')[0], timeZone: 'Europe/Madrid' };
        } else {
          updatedEvent.isAllDay = false;
          updatedEvent.start = { dateTime: start, timeZone: 'Europe/Madrid' };
          updatedEvent.end = { dateTime: end, timeZone: 'Europe/Madrid' };
        }

        const response = await client.api(`/me/events/${dbEvent.microsoft_id}`).patch(updatedEvent);

        // Update local DB with Microsoft response
        await dbAsync.run(`
            UPDATE calendar_events SET
            subject = ?, body_preview = ?, start_time = ?, end_time = ?, is_all_day = ?,
            location = ?, web_link = ?, categories = ?, last_synced = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            response.subject, response.bodyPreview, response.start.dateTime, response.end.dateTime,
            response.isAllDay ? 1 : 0, response.location?.displayName, response.webLink,
            categoriesJson, dbEvent.id
        ]);

        return res.json({ id: response.id, title: response.subject });
      } catch (msError) {
        console.error('[OUTLOOK] Microsoft Graph update failed:', msError.message);
        // If token expired, invalidate and fall through to local-only update
        if (msError.statusCode === 401 || msError.code === 'InvalidAuthenticationToken' ||
            (msError.message && msError.message.includes('JWT is not well formed'))) {
          try {
            await dbAsync.run('UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?', [username]);
          } catch (dbErr) {}
        }
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
    const user = await dbAsync.get('SELECT microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { id } = req.params;
    const client = getAuthenticatedClient(user.microsoft_access_token);

    const event = await client.api(`/me/events/${id}`).get();
    
    let startDate, endDate;
    if (event.isAllDay) {
      startDate = event.start.date;
      endDate = event.end.date;
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
      SELECT u.id, u.username, u.microsoft_access_token 
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

        // Try Outlook sync if linked
        if (member.microsoft_access_token) {
          try {
            const client = getAuthenticatedClient(member.microsoft_access_token);
            
            const newEvent = {
              subject: `[Grupo] ${title}`,
              location: location ? { displayName: location } : null,
              body: { contentType: 'text', content: fullDescription },
              categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
            };

            if (allDay) {
              newEvent.isAllDay = true;
              newEvent.start = { date: start.split('T')[0], timeZone: 'Europe/Madrid' };
              newEvent.end = { date: end.split('T')[0], timeZone: 'Europe/Madrid' };
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

        // Create Notification
        try {
          await dbAsync.run(`
            INSERT INTO notifications (user_id, title, message, type, link) 
            VALUES (?, ?, ?, ?, ?)
          `, [
            member.id,
            'Nueva Tarea de Grupo',
            `Se te ha asignado la tarea: ${title}`,
            'task',
            '/calendar'
          ]);
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
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
      SELECT id, username, microsoft_access_token 
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

    // 2. Create in Outlook if linked (optional - no longer required)
    if (targetUser.microsoft_access_token) {
      try {
        const client = getAuthenticatedClient(targetUser.microsoft_access_token);
        
        const newEvent = {
          subject: `[Asignado] ${title}`,
          location: location ? { displayName: location } : null,
          body: { contentType: 'text', content: fullDescription },
          categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
        };

        if (allDay) {
          newEvent.isAllDay = true;
          newEvent.start = { date: start.split('T')[0], timeZone: 'Europe/Madrid' };
          newEvent.end = { date: end.split('T')[0], timeZone: 'Europe/Madrid' };
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
        
        if (e.statusCode === 401 || (e.message && e.message.includes('JWT is not well formed'))) {
          try {
            await dbAsync.run('UPDATE users SET microsoft_access_token = NULL WHERE id = ?', [targetUser.id]);
          } catch (dbErr) {}
        }
      }
    } else {
      console.log(`[ASSIGN] User ${targetUser.username} has no Outlook linked, saving locally only`);
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

    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let microsoftId = null;
    let webLink = null;
    let syncError = null;

    // 1. Create in Outlook if linked
    if (user.microsoft_access_token) {
      try {
        const client = getAuthenticatedClient(user.microsoft_access_token);
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
        
         // Auto-Disconnect if token is garbage
        if (e.statusCode === 401 || (e.message && e.message.includes('JWT is not well formed'))) {
             try {
                console.log(`[OUTLOOK] Invalidating token for user ${username}`);
                await dbAsync.run('UPDATE users SET microsoft_access_token = NULL WHERE username = ?', [username]);
                syncError = "Tu sesión de Outlook ha caducado. Vuelve a vincular tu cuenta.";
             } catch (dbErr) {}
        }
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

    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);
    
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

    if (!event) return res.status(404).json({ error: 'Event not found or not owned' });

    const isLocalOnly = !event.microsoft_id || event.microsoft_id.startsWith('local_');

    // Update Outlook if linked
    if (!isLocalOnly && user.microsoft_access_token) {
        try {
            const client = getAuthenticatedClient(user.microsoft_access_token);
            const updateEvent = {};
            if (subject) updateEvent.subject = subject;
            if (body) updateEvent.body = { contentType: 'Text', content: body };
            if (startTime) updateEvent.start = { dateTime: startTime, timeZone: 'UTC' };
            if (endTime) updateEvent.end = { dateTime: endTime, timeZone: 'UTC' };
            if (location) updateEvent.location = { displayName: location };
            if (isAllDay !== undefined) updateEvent.isAllDay = isAllDay;
            if (categories) updateEvent.categories = Array.isArray(categories) ? categories : [categories];

            await client.api(`/me/events/${event.microsoft_id}`).patch(updateEvent);
            console.log(`[OUTLOOK] Event updated in Cloud: ${event.microsoft_id}`);
        } catch (e) {
            console.error('[OUTLOOK] Update failed:', e.message);
            // If token expired, invalidate
            if (e.statusCode === 401 || (e.message && e.message.includes('JWT is not well formed'))) {
                try {
                    await dbAsync.run('UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?', [username]);
                } catch (dbErr) {}
            }
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
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    // Find event
    let event = null;
    if (!isNaN(id)) {
        try {
            event = await dbAsync.get('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
        } catch (e) { /* Ignore */ }
    }

    if (!event) {
        event = await dbAsync.get('SELECT * FROM calendar_events WHERE microsoft_id = ? AND user_id = ?', [id, user.id]);
    }

    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Delete from Outlook
    if (event.microsoft_id && user.microsoft_access_token) {
        try {
             const client = getAuthenticatedClient(user.microsoft_access_token);
             await client.api(`/me/events/${event.microsoft_id}`).delete();
             console.log(`[OUTLOOK] Event deleted in Cloud: ${event.microsoft_id}`);
        } catch (e) {
             console.error('[OUTLOOK] Delete failed (maybe already deleted):', e.message);
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

// Attach a file to an event
app.post('/attachments', authenticate, async (req, res) => {
  try {
    const { eventId, fileName, filePath, fileOwner, fileSize } = req.body;
    const username = req.user.username;

    if (!eventId || !fileName || !filePath) {
      return res.status(400).json({ error: 'Missing required fields (eventId, fileName, filePath)' });
    }

    const result = await dbAsync.run(
      `INSERT INTO event_attachments (event_id, file_name, file_path, file_owner, attached_by, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, fileName, filePath, fileOwner || username, username, fileSize || 0]
    );

    res.status(201).json({ 
      success: true, 
      attachment: {
        id: result.lastID,
        eventId,
        fileName,
        filePath,
        fileOwner: fileOwner || username,
        attachedBy: username,
        fileSize: fileSize || 0
      }
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