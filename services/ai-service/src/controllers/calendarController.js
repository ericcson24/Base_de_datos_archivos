const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const { sendNotification } = require('../utils/notificationClient');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");
const OUTLOOK_SERVICE_URL = 'http://outlook-service:5003';

const GENERIC_TITLES = [
  'tarea', 'evento', 'reunion', 'reunión', 'cita', 'cosa', 'algo', 'recordatorio', 
  'pendiente', 'actividad', 'nota', 'puesto', 'clase', 'llamada', 'encuentro', 'labor', 
  'la tarea', 'el evento', 'la reunión', 'la reunion', 'el recordatorio', 'la cita'
];

const isGenericTitle = (title) => {
  if (!title) return true;
  const t = title.toLowerCase().trim().replace(/^(el|la|los|las|un|una)\s+/, '');
  return GENERIC_TITLES.some(g => g === t || g === title.toLowerCase().trim()) || t === 'any' || t === '';
};

const createEvent = async (req, res) => {
  try {
    const { query, assignMode = 'me', targetUserId, groupId } = req.body;
    const userId = req.user.id; // Added via authenticateToken middleware

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    // 1. Contexto de Tiempo (User Timezone)
    // Asumimos Europe/Madrid por contexto del usuario
    const userTimeZone = 'Europe/Madrid'; 
    const now = new Date();
    
    // Formato DD/MM/YYYY HH:mm:ss determinista para la IA
    const parts = new Intl.DateTimeFormat('es-ES', {
      timeZone: userTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);
    
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    
    const nowInUserTZ = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    
    console.log(`[AI CALENDAR] Usuario ${userId}: "${query}" [UserTZ: ${nowInUserTZ}]`);

    // 2. Prompt para Gemini (Inteligente con Zonas Horarias)
    const prompt = `Eres un asistente de calendario inteligente.
Contexto Actual:
- Fecha y hora actual en formato DD/MM/YYYY HH:mm:ss (zona ${userTimeZone}): ${nowInUserTZ}
- El usuario quiere gestionar su calendario.

Tu tarea:
1. Analizar la intención del usuario: 
   - "create": Crear nuevo evento.
   - "query": Consultar eventos.
   - "update": Modificar evento existente.
   - "delete": Eliminar evento.
   - "add_category": Crear/añadir una categoría nueva.

2. Extraer los detalles.

IMPORTANTE SOBRE FECHAS:
- La fecha/hora actual es: ${nowInUserTZ} (formato DD/MM/YYYY HH:mm:ss, zona ${userTimeZone})
- Calcula fecha/hora exacta basándote en esta fecha actual
- "mañana" o "mñn" significa sumar 1 día a la fecha actual
- "hoy" significa la misma fecha que la actual
- "pasado mañana" significa sumar 2 días a la fecha actual
- Devuelve SIEMPRE formato ISO 8601 UTC con Z al final (ejemplo: "2026-02-11T20:00:00Z") 

IMPORTANTE SOBRE UPDATES Y DELETES:
- Si el usuario pone "bórralo", "elimínalo", "cámbialo" sin decir el nombre pero indicando un momento ("lo de las 5", "lo de mañana"), pon "ANY" en searchTitle y la fecha aproximada en startTimeUTC.
- NO uses palabras genéricas como "tarea" o "evento" como searchTitle si el usuario las usa de forma genérica. Solo si es el nombre propio del evento.
- "searchTitle" debe ser el título ACTUAL del evento que queremos buscar.
- "title" debe ser el NUEVO título si el usuario pide cambiar el nombre. Si no, pon null.
- Las categorías son etiquetas de color para eventos (ej: "Trabajo", "Personal", "Urgente")
- Para crear categoría: intent="add_category", categoryName="nombre", categoryColor="preset0" a "preset24"
- Para asignar categorías a un evento (create/update): incluye el campo "categories" como array de strings
- Colores disponibles: preset0(rojo), preset1(naranja), preset2(marrón), preset3(amarillo), preset4(verde), preset5(turquesa), preset6(azul), preset7(púrpura), preset8(gris), preset9(gris oscuro), preset12(azul real), preset13(verde bosque)

Estructura JSON de Respuesta:
{
  "intent": "create", // "query", "update", "delete", "add_category"
  "title": "TÍTULO DEL EVENTO O NUEVO TÍTULO",
  "searchTitle": "TÍTULO ACTUAL del evento (solo para update/delete)", 
  "startTimeUTC": "YYYY-MM-DDTHH:mm:ssZ", 
  "endTimeUTC": "YYYY-MM-DDTHH:mm:ssZ",
  "description": "Descripción opcional",
  "location": "Ubicación opcional",
  "isAllDay": false,
  "categories": ["Categoría1"], // Array de nombres de categorías a asignar
  "categoryName": "Nombre de la categoría nueva (solo para add_category)",
  "categoryColor": "preset0-preset24 (solo para add_category)",
  "success": true
}

Si el usuario dice "elimina el evento de mañana", y no especifica título, asume que se refiere a cualquier evento en ese rango.
Si hay ambigüedad extrema, devuelve success: false.

Query del usuario: "${query}"
Responde SOLO el JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    // Retry logic for rate limiting
    let aiResponse;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text().trim();
        break; // Success, exit loop
      } catch (apiError) {
        retryCount++;
        
        // Check if it's a rate limit error (429 or quota exceeded)
        if (apiError.message && (
          apiError.message.includes('429') ||
          apiError.message.includes('quota') ||
          apiError.message.includes('rate limit') ||
          apiError.message.includes('Too Many Requests')
        )) {
          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`[AI CALENDAR] Rate limit hit, waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          console.error('[AI CALENDAR] Rate limit exceeded after retries');
          return res.status(429).json({ 
            error: 'Demasiadas solicitudes a la IA. Intenta de nuevo en unos segundos.',
            retryAfter: 10
          });
        }
        
        // Other errors, throw immediately
        throw apiError;
      }
    }
    
    if (!aiResponse) {
      return res.status(500).json({ error: 'No se pudo obtener respuesta de la IA' });
    }
    
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let eventData;
    try {
      eventData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[AI CALENDAR] JSON Error:', aiResponse);
      return res.status(400).json({ error: 'Error interpretando respuesta IA' });
    }

    if (!eventData.success) {
      return res.status(400).json({ error: eventData.error || 'No se pudo procesar la solicitud' });
    }

    // 3. Manejo de Intenciones
    
    // --- QUERY ---
    if (eventData.intent === 'query') {
        const timeFilter = eventData.dateFilter || 'today'; // prompt should support this
        // Placeholder message
        return res.json({
            success: true,
            message: "Consulta no soportada en modal rápido.",
            events: []
        });
    }

    // --- UPDATE or DELETE ---
    if (eventData.intent === 'update' || eventData.intent === 'delete') {
        const searchTitle = eventData.searchTitle || eventData.title;
        const isGeneric = isGenericTitle(searchTitle);
        let searchRes;

        // Construcción de consulta dinámica y flexible
        let queryStr = `SELECT * FROM calendar_events WHERE user_id = $1`;
        let params = [userId];

        // 1. Filtro por título (si no es genérico)
        if (searchTitle && !isGeneric) {
            queryStr += ` AND (subject ILIKE $${params.length + 1} OR body_preview ILIKE $${params.length + 1})`;
            params.push(`%${searchTitle}%`);
        }

        // 2. Filtro por fecha (si se proporciona)
        if (eventData.startTimeUTC) {
            // Buscamos en un rango generoso de 24h alrededor de la fecha indicada
            // Si Gemini dice "mañana", suele poner las 00:00:00, cubriendo todo el día
            queryStr += ` 
                AND start_time >= $${params.length + 1}::timestamp 
                AND start_time <= ($${params.length + 2}::timestamp + interval '24 hours')`;
            params.push(eventData.startTimeUTC);
            params.push(eventData.startTimeUTC);
        }

        // 3. Orden y Límite
        // Priorizamos eventos más cercanos si hay una fecha, o el más reciente si no la hay
        if (eventData.startTimeUTC) {
            queryStr += ` ORDER BY ABS(EXTRACT(EPOCH FROM (start_time - $${params.length}::timestamp))) ASC LIMIT 1`;
        } else {
            queryStr += ` ORDER BY start_time DESC LIMIT 1`;
        }
        
        // Si no hay ningún criterio, error
        if (params.length === 1 && !eventData.startTimeUTC) {
             return res.status(400).json({ error: "Necesito un título o fecha específica para encontrar el evento." });
        }

        searchRes = await db.query(queryStr, params);
        
        if (!searchRes || searchRes.rows.length === 0) {
            // Segundo intento: Si falló con el título, intentamos solo con el tiempo si está disponible
            if (!isGeneric && searchTitle && eventData.startTimeUTC) {
                console.log(`[AI CALENDAR] No encontrado con título "${searchTitle}", reintentando solo con tiempo...`);
                const retryRes = await db.query(
                    `SELECT * FROM calendar_events 
                     WHERE user_id = $1 
                     AND start_time >= $2::timestamp 
                     AND start_time <= ($3::timestamp + interval '36 hours')
                     ORDER BY start_time ASC LIMIT 1`,
                    [userId, eventData.startTimeUTC, eventData.startTimeUTC]
                );
                if (retryRes.rows.length > 0) {
                    searchRes = retryRes;
                }
            }
        }
        
        if (!searchRes || searchRes.rows.length === 0) {
            return res.status(404).json({ 
                error: `No encontré ningún evento para ${searchTitle && !isGeneric ? '"' + searchTitle + '"' : 'esa fecha'}.`, 
                success: false 
            });
        }
        
        const targetEvent = searchRes.rows[0];
        
        if (eventData.intent === 'delete') {
             try {
                 const delRes = await fetch(`${OUTLOOK_SERVICE_URL}/events/${targetEvent.id}`, {
                     method: 'DELETE',
                     headers: { 'Authorization': req.headers.authorization || '' }
                 });
                 if (delRes.ok) {
                     return res.json({ success: true, message: `Evento "${targetEvent.subject}" eliminado.` });
                 } else {
                     throw new Error(await delRes.text());
                 }
             } catch (e) {
                 return res.status(500).json({ error: 'Error eliminando evento', details: e.message });
             }
        }
        
        if (eventData.intent === 'update') {
             try {
                 // Construct payload - only include fields that need changing
                 const updatePayload = {};
                 // Only set new title if the AI explicitly provided one different from search
                 if (eventData.title && eventData.title !== searchTitle) {
                     updatePayload.subject = eventData.title;
                 } else if (eventData.title && !eventData.searchTitle) {
                     // Legacy: if no searchTitle, title might be the new title
                     // but only if it differs from the found event
                     if (eventData.title.toLowerCase() !== targetEvent.subject.toLowerCase()) {
                         updatePayload.subject = eventData.title;
                     }
                 }
                 if (eventData.startTimeUTC) updatePayload.startTime = eventData.startTimeUTC;
                 if (eventData.endTimeUTC) updatePayload.endTime = eventData.endTimeUTC;
                 if (eventData.location) updatePayload.location = eventData.location;
                 if (eventData.description) updatePayload.body = eventData.description;
                 if (eventData.isAllDay !== undefined) updatePayload.isAllDay = eventData.isAllDay;
                 if (eventData.categories && Array.isArray(eventData.categories) && eventData.categories.length > 0) {
                     updatePayload.categories = eventData.categories;
                 }
                 
                 const upRes = await fetch(`${OUTLOOK_SERVICE_URL}/events/${targetEvent.id}`, {
                     method: 'PATCH',
                     headers: { 
                         'Content-Type': 'application/json',
                         'Authorization': req.headers.authorization || '' 
                     },
                     body: JSON.stringify(updatePayload)
                 });
                 
                 if (upRes.ok) {
                     const updatedTitle = updatePayload.subject || targetEvent.subject;
                     return res.json({ success: true, message: `Evento "${updatedTitle}" actualizado.` });
                 } else {
                     throw new Error(await upRes.text());
                 }
             } catch (e) {
                 return res.status(500).json({ error: 'Error actualizando evento', details: e.message });
             }
        }
    }

    // --- ADD CATEGORY ---
    if (eventData.intent === 'add_category') {
        try {
            const categoryName = eventData.categoryName || eventData.title;
            const categoryColor = eventData.categoryColor || 'preset6'; // Default blue
            
            if (!categoryName) {
                return res.status(400).json({ error: 'Nombre de categoría requerido' });
            }
            
            const catRes = await fetch(`${OUTLOOK_SERVICE_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                },
                body: JSON.stringify({ name: categoryName, color: categoryColor })
            });
            
            if (catRes.ok) {
                const catData = await catRes.json();
                return res.json({ 
                    success: true, 
                    message: `Categoría "${categoryName}" creada correctamente.`,
                    category: catData
                });
            } else {
                const errorData = await catRes.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error creating category');
            }
        } catch (e) {
            return res.status(500).json({ error: 'Error creando categoría', details: e.message });
        }
    }

    // --- CREATE (Existing Logic) ---
    let targetUserIds = [];
    if (assignMode === 'group' && groupId) {
      const groupResult = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
      targetUserIds = groupResult.rows.map(row => row.user_id);
    } else if (assignMode === 'user' && targetUserId) {
      targetUserIds = [targetUserId];
    } else {
      targetUserIds = [userId];
    }

    // 5. Crear Eventos (Loop)
    const createdEvents = [];
    
    // Descripción automática
    let finalDescription = eventData.description || '';
    if (assignMode !== 'me') {
      const creatorResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
      const creatorName = creatorResult.rows[0]?.username || 'Admin';
      finalDescription += `\n\n(Tarea asignada por ${creatorName})`;
    }

    for (const targetId of targetUserIds) {
      let createdEvent = null;

      // INTENTO 1: Usar Outlook Service (Solo si es para mí mismo, para usar mis credenciales)
      if (targetId === userId) {
        try {
            // Reenviamos el token del request actual (Bearer ...)
            // fetch es global en Node 18
            const outlookRes = await fetch(`${OUTLOOK_SERVICE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                },
                body: JSON.stringify({
                    subject: eventData.title,
                    body: finalDescription,
                    startTime: eventData.startTimeUTC, // Enviamos UTC directo
                    endTime: eventData.endTimeUTC,
                    location: eventData.location,
                    isAllDay: eventData.isAllDay,
                    categories: eventData.categories || []
                })
            });

            if (outlookRes.ok) {
                const outData = await outlookRes.json();
                if (outData.success) {
                    createdEvent = {
                        id: outData.microsoftId || outData.localId,
                        subject: eventData.title,
                        start_time: eventData.startTimeUTC,
                        source: 'outlook-service'
                    };
                    
                    if (!outData.syncedToCloud) {
                        console.warn(`[AI CALENDAR] Event created LOCALLY only. Sync error: ${outData.syncError}`);
                        // Add warning to message
                        finalDescription += "\n(⚠️ No sincronizado con Outlook: " + (outData.syncError ? "Error de conexión" : "Cuenta no vinculada") + ")";
                        // We could try to update the event body in DB with this warning, but simpler to just let user know via UI
                    } else {
                        console.log(`[AI CALENDAR] Evento creado via Outlook Service y Cloud: ${createdEvent.id}`);
                    }
                }
            } else {
                console.warn(`[AI CALENDAR] Outlook Service falló (${outlookRes.status}), usando fallback local.`);
            }
        } catch (e) {
            console.error('[AI CALENDAR] Error contactando Outlook Service:', e.message);
        }
      }

      // INTENTO 2: Fallback Local (Si falló Outlook o es para otro usuario)
      if (!createdEvent) {
          const insertResult = await db.query(
            `INSERT INTO calendar_events (user_id, subject, body_preview, start_time, end_time, location, is_all_day, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [
              targetId,
              eventData.title,
              finalDescription,
              eventData.startTimeUTC, // Postgres guardará este string ISO. Si es timestamptz, respetará la Z.
              eventData.endTimeUTC,
              eventData.location,
              eventData.isAllDay ? 1 : 0
            ]
          );
          createdEvent = insertResult.rows[0];
      }

      createdEvents.push(createdEvent);

      // Notificar (Si es para otro)
      if (targetId !== userId) {
        try {
          await sendNotification({
            userId: targetId,
            title: '📅 Nuevo Evento Asignado',
            message: `"${eventData.title}" para el ${new Date(eventData.startTimeUTC).toLocaleDateString()}`,
            type: 'info',
            link: '/calendar',
            metadata: { eventId: createdEvent.id || createdEvent.microsoft_id }
          });
        } catch (notifError) { 
            // Ignorar error notif
        }
      }
    }

    res.json({
        success: true,
        events: createdEvents,
        message: `Evento creado para ${targetUserIds.length} usuario(s)`
    });

  } catch (error) {
    console.error('[AI CALENDAR] Error:', error);
    res.status(500).json({ error: 'Error creating event', details: error.message });
  }
};

module.exports = {
    createEvent
};
