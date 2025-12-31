const express = require('express');
const { Client } = require('@microsoft/microsoft-graph-client');
const { dbAsync } = require('../database/db');
const router = express.Router();

// Middleware de autenticación (copiado de auth.js)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
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



// Función CORREGIDA - Sumar 2 horas a lo que devuelve Graph
function convertToSpainTime(dateStr, isAllDay = false) {
  if (!dateStr) return null;
  if (isAllDay) return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  // Limpiar milisegundos
  let cleanDate = dateStr;
  if (cleanDate.includes('.')) cleanDate = cleanDate.split('.')[0];

  // Si ya tiene Z o +02:00, no tocar
  if (cleanDate.endsWith('Z') || /\+\d{2}:\d{2}$/.test(cleanDate)) return cleanDate;

  // Sumar 2 horas y devolver con offset explícito
  const date = new Date(cleanDate);
  date.setHours(date.getHours() + 2);

  // Formatear como ISO y añadir offset de Madrid (verano: +02:00)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // DEVOLVER SIEMPRE CON OFFSET
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+02:00`;
}

// Función CORREGIDA para convertir desde España a UTC para envío
function convertFromSpainTime(dateStr, timeStr = null, isAllDay = false) {
  if (isAllDay) {
    // Para eventos de todo el día, enviar en formato de fecha
    return {
      date: dateStr,
      timeZone: 'Europe/Madrid'
    };
  }

  // Para eventos con hora - enviar directamente con zona horaria España
  const fullDateStr = timeStr ? `${dateStr}T${timeStr}:00` : dateStr;
  console.log('📤 Enviando a Graph con zona España:', fullDateStr);

  return {
    dateTime: fullDateStr,
    timeZone: 'Europe/Madrid'  // Usar zona horaria España en lugar de UTC
  };
}

// GET - Obtener todas las categorías de Outlook
router.get('/categories', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      // Si no hay token, devolver array vacío en lugar de error 401 para no romper el frontend
      return res.json([]);
    }

    console.log('🏷️ Obteniendo categorías de Outlook...');
    const client = getAuthenticatedClient(user.microsoft_access_token);

    const categoriesResponse = await client
      .api('/me/outlook/masterCategories')
      .get();

    console.log(`📊 Categorías encontradas: ${categoriesResponse.value.length}`);

    const formattedCategories = categoriesResponse.value.map(category => ({
      id: category.id,
      name: category.displayName,
      color: category.color,
      hexColor: getOutlookCategoryColor(category.color)
    }));

    res.json(formattedCategories);

  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);

    // Detectar token corrupto o inválido y limpiar DB
    if (error.code === 'InvalidAuthenticationToken' || (error.message && error.message.includes('JWT is not well formed'))) {
      console.log('⚠️ Token inválido detectado. Eliminando token corrupto de la base de datos.');
      try {
        await dbAsync.run(
          "UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?", 
          [req.user.username]
        );
      } catch (dbError) {
        console.error('Error limpiando token:', dbError);
      }
      return res.status(401).json({ error: 'REAUTH', message: 'Sesión de Microsoft inválida' });
    }

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Crear nueva categoría en Outlook
router.post('/categories', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      return res.status(401).json({ error: 'No vinculado con Microsoft' });
    }

    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    console.log('🏷️ Creando nueva categoría:', { name, color });
    const client = getAuthenticatedClient(user.microsoft_access_token);

    const newCategory = {
      displayName: name,
      color: color || 'preset0'
    };

    const createdCategory = await client
      .api('/me/outlook/masterCategories')
      .post(newCategory);

    const formattedCategory = {
      id: createdCategory.id,
      name: createdCategory.displayName,
      color: createdCategory.color,
      hexColor: getOutlookCategoryColor(createdCategory.color)
    };

    console.log('✅ Categoría creada:', formattedCategory);
    res.status(201).json(formattedCategory);

  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para convertir colores de Outlook a hexadecimal
function getOutlookCategoryColor(outlookColor) {
  const colorMap = {
    'preset0': '#ff1a1a',   // Rojo
    'preset1': '#ff8c00',   // Naranja
    'preset2': '#8b4513',   // Marrón
    'preset3': '#ffd700',   // Amarillo
    'preset4': '#32cd32',   // Verde
    'preset5': '#008080',   // Turquesa
    'preset6': '#326acb',   // Azul
    'preset7': '#800080',   // Púrpura
    'preset8': '#c0c0c0',   // Gris
    'preset9': '#696969',   // Gris oscuro
    'preset10': '#dc143c',  // Crimson
    'preset11': '#ff69b4',  // Rosa
    'preset12': '#4169e1',  // Azul real
    'preset13': '#228b22',  // Verde bosque
    'preset14': '#ff4500',  // Rojo naranja
    'preset15': '#9932cc',  // Orquídea oscura
    'preset16': '#8b0000',  // Rojo oscuro
    'preset17': '#556b2f',  // Verde oliva oscuro
    'preset18': '#2f4f4f',  // Gris pizarra oscuro
    'preset19': '#b22222',  // Ladrillo
    'preset20': '#8fbc8f',  // Verde marino oscuro
    'preset21': '#483d8b',  // Azul pizarra oscuro
    'preset22': '#2e8b57',  // Verde marino
    'preset23': '#800000',  // Granate
    'preset24': '#9acd32'   // Verde amarillo
  };

  return colorMap[outlookColor] || '#4285f4';
}

// POST - Forzar sincronización
router.post('/sync', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT id, microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      return res.status(400).json({ error: 'No vinculado con Microsoft' });
    }

    const client = getAuthenticatedClient(user.microsoft_access_token);
    
    // Sync next 6 months and past 1 month
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(now);
    end.setMonth(end.getMonth() + 6);

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const eventsResponse = await client.api('/me/calendar/events')
        .select('id,subject,bodyPreview,start,end,location,webLink,isAllDay')
        .filter(`start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'`)
        .top(200)
        .get();

    let syncedCount = 0;
    for (const event of eventsResponse.value) {
        await dbAsync.run(`
            INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(microsoft_id) DO UPDATE SET
            subject=excluded.subject,
            body_preview=excluded.body_preview,
            start_time=excluded.start_time,
            end_time=excluded.end_time,
            is_all_day=excluded.is_all_day,
            location=excluded.location,
            web_link=excluded.web_link,
            last_synced=CURRENT_TIMESTAMP
        `, [
            event.id,
            user.id,
            event.subject,
            event.bodyPreview,
            event.start.dateTime,
            event.end.dateTime,
            event.isAllDay ? 1 : 0,
            event.location?.displayName,
            event.webLink
        ]);
        syncedCount++;
    }

    res.json({ success: true, message: `Sincronizados ${syncedCount} eventos` });

  } catch (error) {
    console.error('Error syncing events:', error);
    
    // Detectar token corrupto o inválido y limpiar DB
    if (error.code === 'InvalidAuthenticationToken' || (error.message && error.message.includes('JWT is not well formed'))) {
      console.log('⚠️ Token inválido detectado en sync. Eliminando token corrupto.');
      try {
        await dbAsync.run(
          "UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?", 
          [req.user.username]
        );
      } catch (dbError) {
        console.error('Error limpiando token:', dbError);
      }
      return res.status(401).json({ error: 'REAUTH', message: 'Sesión de Microsoft inválida' });
    }

    res.status(500).json({ error: 'Error durante la sincronización' });
  }
});

// GET - Obtener eventos (Sincronizados con DB)
router.get('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const { start, end } = req.query;

    // 1. Obtener usuario y token
    const user = await dbAsync.get("SELECT id, microsoft_access_token FROM users WHERE username = ?", [username]);
    
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 2. Si tiene token, sincronizar con Microsoft
    if (user.microsoft_access_token) {
        try {
            const client = getAuthenticatedClient(user.microsoft_access_token);
            
            // Fetch events from Microsoft (Primary Calendar)
            let query = client.api('/me/calendar/events')
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
                    event.start.dateTime,
                    event.end.dateTime,
                    event.isAllDay ? 1 : 0,
                    event.location?.displayName,
                    event.webLink,
                    JSON.stringify(event.categories || [])
                ]);
            }
        } catch (msError) {
            console.error('Error syncing with Microsoft:', msError);
            
            // Detectar token corrupto o inválido y limpiar DB
            if (msError.code === 'InvalidAuthenticationToken' || (msError.message && msError.message.includes('JWT is not well formed'))) {
              console.log('⚠️ Token inválido detectado en GET events. Eliminando token corrupto.');
              try {
                await dbAsync.run(
                  "UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL WHERE username = ?", 
                  [username]
                );
              } catch (dbError) {
                console.error('Error limpiando token:', dbError);
              }
              // No retornamos error aquí para permitir que se carguen los eventos de la DB local
              // pero el usuario verá que no está sincronizado en settings
            }
        }
    }

    // 3. Devolver eventos de la DB
    let targetUserId = user.id;
    if ((user.role === 'admin' || user.role === 'boss') && req.query.userId) {
        targetUserId = req.query.userId;
    }

    let query = "SELECT * FROM calendar_events WHERE user_id = ?";
    let params = [targetUserId];

    if (start && end) {
        // Optional: Add DB filtering if needed
    }

    const dbEvents = await dbAsync.all(query, params);

    // Format events for frontend
    const formattedEvents = dbEvents.map(e => {
        let categories = [];
        try {
            categories = e.categories ? JSON.parse(e.categories) : [];
        } catch (err) {
            console.error('Error parsing categories:', err);
        }

        return {
            id: e.microsoft_id || e.id.toString(),
            title: e.subject,
            start: e.start_time, // Assuming stored as ISO string or compatible
            end: e.end_time,
            allDay: e.is_all_day === 1,
            location: e.location,
            preview: e.body_preview,
            url: e.web_link,
            categories: categories,
            source: 'database',
            color: '#4285f4' 
        };
    });

    res.json(formattedEvents);

  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Crear evento en Outlook
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('📝 POST /api/events - Iniciando creación de evento');
    const username = req.user.username;
    const user = await dbAsync.get("SELECT id, microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      console.log('❌ No access token found in DB');
      return res.status(401).json({ error: 'No vinculado con Microsoft' });
    }

    const { title, start, end, allDay, location, description, attendees, categories } = req.body;
    console.log('📥 Request body completo:', JSON.stringify(req.body, null, 2));

    if (!title || !start) {
      console.log('❌ Faltan campos requeridos:', { title: !!title, start: !!start });
      return res.status(400).json({ error: 'Título y fecha de inicio son requeridos' });
    }

    console.log('📝 Creando evento en Outlook:', { title, start, end, allDay, location, description, attendees, categories });

    const client = getAuthenticatedClient(user.microsoft_access_token);

    const newEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: {
        contentType: 'text',
        content: description || ''
      },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    // Manejar fechas según si es todo el día o no
    if (allDay) {
      newEvent.isAllDay = true;
      newEvent.start = {
        date: start.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
      newEvent.end = {
        date: end.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
    } else {
      // CAMBIO: No usar convertFromSpainTime, enviar directo con zona España
      newEvent.isAllDay = false;
      newEvent.start = {
        dateTime: start,
        timeZone: 'Europe/Madrid'
      };
      newEvent.end = {
        dateTime: end,
        timeZone: 'Europe/Madrid'
      };

      console.log('📤 Enviando fechas con zona España:', {
        start: start,
        end: end,
        timeZone: 'Europe/Madrid'
      });
    }

    // Añadir asistentes si se proporcionan
    if (attendees && attendees.trim()) {
      newEvent.attendees = attendees.split(',').map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        }
      }));
    }

    console.log('📤 Enviando evento a Outlook:', JSON.stringify(newEvent, null, 2));

    let createdEvent;
    try {
      createdEvent = await client.api('/me/events').post(newEvent);
      console.log('✅ Evento creado exitosamente en Microsoft Graph');
    } catch (graphError) {
      console.error('❌ Error específico de Microsoft Graph:', {
        statusCode: graphError.statusCode,
        code: graphError.code,
        message: graphError.message,
        body: graphError.body
      });
      throw graphError;
    }

    console.log('✅ Evento creado exitosamente en Microsoft Graph');
    console.log('📄 Respuesta cruda de Graph:', JSON.stringify(createdEvent, null, 2));

    // Formatear respuesta con zona horaria correcta usando el mismo formato que GET
    let startDate, endDate;

    if (createdEvent.isAllDay) {
      startDate = createdEvent.start.date;
      endDate = createdEvent.end.date;
    } else {
      // Función inline para convertir fechas (copia de convertToSpainTime)
      const convertToSpainTimeInline = (dateStr) => {
        if (!dateStr) return null;

        console.log('📅 Graph original (España-2h):', dateStr);

        // Limpiar el formato y quitar milisegundos
        let cleanDate = dateStr;
        if (cleanDate.includes('.')) {
          cleanDate = cleanDate.split('.')[0];
        }

        // Crear fecha y SUMAR 2 horas (porque Graph la devuelve 2 horas menos)
        const date = new Date(cleanDate);
        date.setHours(date.getHours() + 2);

        // Formatear como ISO local sin Z
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        console.log('✅ España (+2h):', result);
        console.log('🕐 Hora original:', cleanDate.split('T')[1]);
        console.log('🕐 Hora final:', result.split('T')[1]);

        return result;
      };

      console.log('🔄 Convirtiendo fechas de respuesta...');
      startDate = convertToSpainTimeInline(createdEvent.start.dateTime);
      endDate = convertToSpainTimeInline(createdEvent.end.dateTime);

      console.log('✅ Fechas convertidas para respuesta:', {
        start: startDate,
        end: endDate
      });
    }

    // Formatear respuesta SIMPLE - sin colores de categorías (se aplican en GET)
    const formattedEvent = {
      id: createdEvent.id,
      title: createdEvent.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: createdEvent.isAllDay || false,
      backgroundColor: '#4285f4', // Color por defecto - se aplicará el correcto en GET
      borderColor: '#4285f4',
      textColor: '#ffffff',
      extendedProps: {
        location: createdEvent.location?.displayName || '',
        description: createdEvent.bodyPreview || '',
        calendarName: 'Calendario Principal',
        calendarId: 'primary',
        calendarOwner: username,
        categories: createdEvent.categories || [],
        showAs: createdEvent.showAs || 'busy'
      }
    };

    // Insert into DB
    try {
      await dbAsync.run(`
          INSERT INTO calendar_events (microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, last_synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
          createdEvent.id,
          user.id,
          createdEvent.subject,
          createdEvent.bodyPreview,
          createdEvent.start.dateTime,
          createdEvent.end.dateTime,
          createdEvent.isAllDay ? 1 : 0,
          createdEvent.location?.displayName,
          createdEvent.webLink
      ]);
    } catch (dbError) {
      console.error('Error saving new event to DB:', dbError);
      // Continue anyway, it will be synced later
    }

    console.log('✅ Evento creado y formateado (sin colores):', formattedEvent.title);
    console.log('📅 Fechas finales POST:', {
      start: formattedEvent.start,
      end: formattedEvent.end,
      allDay: formattedEvent.allDay
    });

    res.status(201).json(formattedEvent);  // Usar 201 para "Created"

  } catch (error) {
    console.error('❌ Error creando evento - detalles completos:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack,
      body: error.body
    });

    if (error.statusCode === 401) {
      console.log('🔐 Token expirado o inválido, requiere reautenticación');
      return res.status(401).json({ error: 'REAUTH' });
    }

    // Devolver mensaje de error más descriptivo
    const errorMessage = error.body?.error?.message || error.message || 'Error interno del servidor';
    console.log('📤 Enviando error al cliente:', errorMessage);

    res.status(500).json({
      error: 'Error interno del servidor',
      details: errorMessage,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// DELETE - Eliminar evento de Outlook
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT id, microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      return res.status(401).json({ error: 'No vinculado con Microsoft' });
    }

    const { id } = req.params;
    console.log('🗑️ Eliminando evento:', id, 'para usuario:', username);

    const client = getAuthenticatedClient(user.microsoft_access_token);

    // Intentar eliminar el evento
    await client.api(`/me/events/${id}`).delete();

    // Delete from DB
    await dbAsync.run("DELETE FROM calendar_events WHERE microsoft_id = ?", [id]);

    console.log('✅ Evento eliminado de Outlook y DB:', id);
    res.json({
      success: true,
      message: 'Evento eliminado correctamente',
      id: id
    });

  } catch (error) {
    console.error('❌ Error eliminando evento:', error);
    console.error('❌ Detalles del error:', {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message
    });

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Evento no encontrado',
        message: 'El evento que intentas eliminar no existe o ya fue eliminado'
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tienes permisos para eliminar este evento'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT - Actualizar evento en Outlook
router.put('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT id, microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      return res.status(401).json({ error: 'No vinculado con Microsoft' });
    }

    const { id } = req.params;
    const { title, start, end, allDay, location, description, attendees, categories } = req.body;

    if (!title || !start) {
      return res.status(400).json({ error: 'Título y fecha de inicio son requeridos' });
    }

    console.log('✏️ Actualizando evento en Outlook:', { id, title, start, end, allDay, location, description, attendees, categories });

    const client = getAuthenticatedClient(user.microsoft_access_token);

    const updatedEvent = {
      subject: title,
      location: location ? { displayName: location } : null,
      body: {
        contentType: 'text',
        content: description || ''
      },
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : [])
    };

    // Manejar fechas según si es todo el día o no
    if (allDay) {
      updatedEvent.isAllDay = true;
      updatedEvent.start = {
        date: start.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
      updatedEvent.end = {
        date: end.split('T')[0],
        timeZone: 'Europe/Madrid'
      };
    } else {
      // CAMBIO: No usar convertFromSpainTime, enviar directo con zona España
      updatedEvent.isAllDay = false;
      updatedEvent.start = {
        dateTime: start,
        timeZone: 'Europe/Madrid'
      };
      updatedEvent.end = {
        dateTime: end,
        timeZone: 'Europe/Madrid'
      };

      console.log('📤 Enviando fechas con zona España:', {
        start: start,
        end: end,
        timeZone: 'Europe/Madrid'
      });
    }

    // Añadir asistentes si se proporcionan
    if (attendees && attendees.trim()) {
      updatedEvent.attendees = attendees.split(',').map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        }
      }));
    }

    console.log('📤 Enviando evento a Outlook:', JSON.stringify(updatedEvent, null, 2));

    const response = await client.api(`/me/events/${id}`).patch(updatedEvent);

    // Update DB
    try {
      await dbAsync.run(`
          UPDATE calendar_events SET
          subject = ?,
          body_preview = ?,
          start_time = ?,
          end_time = ?,
          is_all_day = ?,
          location = ?,
          web_link = ?,
          last_synced = CURRENT_TIMESTAMP
          WHERE microsoft_id = ?
      `, [
          response.subject,
          response.bodyPreview,
          response.start.dateTime,
          response.end.dateTime,
          response.isAllDay ? 1 : 0,
          response.location?.displayName,
          response.webLink,
          id
      ]);
    } catch (dbError) {
      console.error('Error updating event in DB:', dbError);
    }

    console.log('✅ Evento actualizado exitosamente en Microsoft Graph');
    console.log('📄 Respuesta cruda de Graph:', JSON.stringify(response, null, 2));

    // Formatear respuesta con zona horaria correcta usando el mismo formato que GET
    let startDate, endDate;

    if (response.isAllDay) {
      startDate = response.start.date;
      endDate = response.end.date;
    } else {
      // Función inline para convertir fechas (copia de convertToSpainTime)
      const convertToSpainTimeInline = (dateStr) => {
        if (!dateStr) return null;

        console.log('📅 Graph original (España-2h):', dateStr);

        // Limpiar el formato y quitar milisegundos
        let cleanDate = dateStr;
        if (cleanDate.includes('.')) {
          cleanDate = cleanDate.split('.')[0];
        }

        // Crear fecha y SUMAR 2 horas (porque Graph la devuelve 2 horas menos)
        const date = new Date(cleanDate);
        date.setHours(date.getHours() + 2);

        // Formatear como ISO local sin Z
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        console.log('✅ España (+2h):', result);
        console.log('🕐 Hora original:', cleanDate.split('T')[1]);
        console.log('🕐 Hora final:', result.split('T')[1]);

        return result;
      };

      console.log('🔄 Convirtiendo fechas de respuesta...');
      startDate = convertToSpainTimeInline(response.start.dateTime);
      endDate = convertToSpainTimeInline(response.end.dateTime);

      console.log('✅ Fechas convertidas para respuesta:', {
        start: startDate,
        end: endDate
      });
    }

    // Formatear respuesta SIMPLE - sin colores de categorías (se aplican en GET)
    const formattedEvent = {
      id: response.id,
      title: response.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: response.isAllDay || false,
      backgroundColor: '#4285f4', // Color por defecto - se aplicará el correcto en GET
      borderColor: '#4285f4',
      textColor: '#ffffff',
      extendedProps: {
        location: response.location?.displayName || '',
        description: response.bodyPreview || '',
        calendarName: 'Calendario Principal',
        calendarId: 'primary',
        calendarOwner: username,
        categories: response.categories || [],
        showAs: response.showAs || 'busy'
      }
    };

    console.log('✅ Evento actualizado y formateado (sin colores):', formattedEvent.title);
    console.log('📅 Fechas finales PUT:', {
      start: formattedEvent.start,
      end: formattedEvent.end,
      allDay: formattedEvent.allDay
    });

    res.json(formattedEvent);

  } catch (error) {
    console.error('❌ Error actualizando evento:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET - Obtener evento individual de Outlook
router.get('/:id', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT microsoft_access_token FROM users WHERE username = ?", [username]);

    if (!user || !user.microsoft_access_token) {
      return res.status(401).json({ error: 'No vinculado con Microsoft' });
    }

    const { id } = req.params;
    console.log('📄 Obteniendo evento individual:', id);

    const client = getAuthenticatedClient(user.microsoft_access_token);

    const event = await client
      .api(`/me/events/${id}`)
      .select('id,subject,start,end,location,body,bodyPreview,attendees,isAllDay,categories,showAs,sensitivity,organizer,webLink,recurrence')
      .get();

    console.log('✅ Evento obtenido:', event.subject);

    // Formatear fechas
    let startDate, endDate;

    if (event.isAllDay) {
      startDate = event.start.date;
      endDate = event.end.date;
    } else {
      startDate = convertToSpainTime(event.start.dateTime, false);
      endDate = convertToSpainTime(event.end.dateTime, false);
    }

    // Formatear asistentes
    const attendeesEmails = event.attendees ?
      event.attendees.map(att => att.emailAddress.address).join(', ') : '';

    const formattedEvent = {
      id: event.id,
      title: event.subject || 'Sin título',
      start: startDate,
      end: endDate,
      allDay: event.isAllDay || false,
      location: event.location?.displayName || '',
      description: event.body?.content || event.bodyPreview || '',
      attendeesEmails: attendeesEmails,
      categories: event.categories || [],
      showAs: event.showAs || 'busy',
      sensitivity: event.sensitivity || 'normal',
      organizer: event.organizer?.emailAddress?.address || '',
      webLink: event.webLink || ''
    };

    console.log('✅ Evento formateado para modal:', formattedEvent.title);
    res.json(formattedEvent);

  } catch (error) {
    console.error('❌ Error obteniendo evento individual:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'REAUTH' });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para obtener color de una categoría específica
async function getCategoryColor(categoryName, accessToken) {
  try {
    const client = getAuthenticatedClient(accessToken);

    // Obtener todas las categorías master
    const categoriesResponse = await client
      .api('/me/outlook/masterCategories')
      .get();

    // Buscar la categoría específica
    const category = categoriesResponse.value.find(cat =>
      cat.displayName.toLowerCase() === categoryName.toLowerCase()
    );

    if (category) {
      return getOutlookCategoryColor(category.color);
    }

    return '#4285f4'; // Color por defecto

  } catch (error) {
    console.warn(`⚠️ No se pudo obtener color para categoría "${categoryName}":`, error.message);
    return '#4285f4'; // Color por defecto
  }
}

module.exports = router;