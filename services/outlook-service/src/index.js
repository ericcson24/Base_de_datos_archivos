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
    let targetUserId = user.id;
    if ((user.role === 'admin' || user.role === 'boss') && req.query.userId) {
        targetUserId = req.query.userId;
    }
    
    console.log(`[DEBUG] Fetching events for user_id: ${targetUserId}`);

    let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
    let params = [targetUserId];

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
            preview: e.body_preview,
            url: e.web_link,
            categories: categories,
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
    const username = req.user.username;
    const user = await dbAsync.get('SELECT microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) {
      return res.json([]);
    }

    const client = getAuthenticatedClient(user.microsoft_access_token);
    const categoriesResponse = await client.api('/me/outlook/masterCategories').get();

    const formattedCategories = categoriesResponse.value.map(category => ({
      id: category.id,
      name: category.displayName,
      color: category.color,
      hexColor: getOutlookCategoryColor(category.color)
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error('Error getting categories:', error);
    if (error.code === 'InvalidAuthenticationToken') {
       await dbAsync.run('UPDATE users SET microsoft_access_token = NULL WHERE username = ?', [req.user.username]);
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

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { id } = req.params;
    const client = getAuthenticatedClient(user.microsoft_access_token);

    await client.api(`/me/events/${id}`).delete();
    await dbAsync.run('DELETE FROM calendar_events WHERE microsoft_id = ?', [id]);

    res.json({ success: true, message: 'Evento eliminado', id });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando evento' });
  }
});

app.put('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id, microsoft_access_token FROM users WHERE username = ?', [username]);

    if (!user || !user.microsoft_access_token) return res.status(401).json({ error: 'No vinculado' });

    const { id } = req.params;
    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
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

    const response = await client.api(`/me/events/${id}`).patch(updatedEvent);

    await dbAsync.run(`
        UPDATE calendar_events SET
        subject = ?, body_preview = ?, start_time = ?, end_time = ?, is_all_day = ?,
        location = ?, web_link = ?, last_synced = CURRENT_TIMESTAMP
        WHERE microsoft_id = ?
    `, [
        response.subject, response.bodyPreview, response.start.dateTime, response.end.dateTime,
        response.isAllDay ? 1 : 0, response.location?.displayName, response.webLink, id
    ]);

    res.json({ id: response.id, title: response.subject });
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Outlook Service running on port ${PORT}`);
});