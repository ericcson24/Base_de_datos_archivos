const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const { sendNotification } = require('../utils/notificationClient');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");
const OUTLOOK_SERVICE_URL = 'http://outlook-service:5003';
const FILE_SERVICE_URL = 'http://file-service:5004';

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
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    const userTimeZone = 'Europe/Madrid'; 
    const now = new Date();
    
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

    let availableCategories = [];
    try {
      const catRes = await fetch(`${OUTLOOK_SERVICE_URL}/categories`, {
        headers: { 'Authorization': req.headers.authorization || '' }
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        availableCategories = catData.map(c => c.name);
        console.log(`[AI CALENDAR] Categorías disponibles: ${availableCategories.join(', ')}`);
      }
    } catch (e) {
      console.warn('[AI CALENDAR] No se pudieron obtener categorías:', e.message);
    }

    const categoriesContext = availableCategories.length > 0
      ? `\n- Categorías disponibles del usuario: ${JSON.stringify(availableCategories)}\n- IMPORTANTE: Cuando el usuario mencione una categoría, usa el nombre EXACTO de esta lista. Por ejemplo si dice "roja" y existe "Categoría roja", usa "Categoría roja". Si no coincide con ninguna existente, usa el texto tal cual.`
      : '';

    const prompt = `Eres un asistente de calendario inteligente.
Contexto Actual:
- Fecha y hora actual en formato DD/MM/YYYY HH:mm:ss (zona ${userTimeZone}): ${nowInUserTZ}
- El usuario quiere gestionar su calendario.${categoriesContext}

Tu tarea:
1. Analizar la intención del usuario: 
   - "create": Crear nuevo evento.
   - "query": Consultar eventos.
   - "update": Modificar evento existente.
   - "delete": Eliminar evento.
   - "add_category": Crear/añadir una categoría nueva.
   - "attach_file": Adjuntar un archivo a un evento existente.
   - "roadmap_task": Crear una tarea en el Roadmap (si el usuario dice "crea una tarea en el roadmap", "añade al kanban", "tarea de proyecto", etc.)

2. Extraer los detalles.

Si el intent es "roadmap_task", devuelve:
{
  "intent": "roadmap_task",
  "title": "Título de la tarea",
  "description": "Descripción",
  "due_date": "YYYY-MM-DDTHH:mm:ssZ",
  "assigned_to": "nombre del usuario si se menciona",
  "column_name": "nombre de la columna si se menciona (ej: Validar, Backlog)",
  "priority": "low|medium|high|critical",
  "success": true
}

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
  "intent": "create",
  "title": "TÍTULO DEL EVENTO O NUEVO TÍTULO",
  "searchTitle": "TÍTULO ACTUAL del evento (solo para update/delete/attach_file)", 
  "startTimeUTC": "YYYY-MM-DDTHH:mm:ssZ", 
  "endTimeUTC": "YYYY-MM-DDTHH:mm:ssZ",
  "description": "Descripción opcional",
  "location": "Nombre del lugar o dirección completa. Ej: 'Starbucks Gran Vía', 'Calle Mayor 12, Madrid', 'Oficina central'. Usa el nombre real del establecimiento si se menciona.",
  "isAllDay": false,
  "categories": ["Categoría1"],
  "categoryName": "Nombre de la categoría nueva (solo para add_category)",
  "categoryColor": "preset0-preset24 (solo para add_category)",
  "fileName": "nombre del archivo a adjuntar (solo para attach_file, puede ser parcial)",
  "success": true
}

Si el usuario dice "elimina el evento de mañana", y no especifica título, asume que se refiere a cualquier evento en ese rango.
Si hay ambigüedad extrema, devuelve success: false.
Para "attach_file": el usuario quiere adjuntar un archivo a un evento. Extrae "fileName" (nombre parcial o completo del archivo) y "searchTitle" del evento. Ejemplo: "adjunta el informe al evento de mañana" -> fileName="informe", searchTitle="ANY", startTimeUTC=mañana.

Query del usuario: "${query}"
Responde SOLO el JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    let aiResponse;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text().trim();
        break;
      } catch (apiError) {
        retryCount++;
        
        if (apiError.message && (
          apiError.message.includes('429') ||
          apiError.message.includes('quota') ||
          apiError.message.includes('rate limit') ||
          apiError.message.includes('Too Many Requests')
        )) {
          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000;
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

    
    // --- ROADMAP TASK (Bridge to Roadmap Service) ---
    if (eventData.intent === 'roadmap_task') {
      const ROADMAP_SERVICE_URL = 'http://roadmap-service:5010';
      try {
        // Forward to roadmap AI controller
        const roadmapRes = await fetch(`${ROADMAP_SERVICE_URL}/projects`, {
          headers: { 'Authorization': req.headers.authorization || '' }
        });
        let projects = [];
        if (roadmapRes.ok) projects = await roadmapRes.json();

        if (projects.length === 0) {
          return res.json({
            success: true,
            isRoadmap: true,
            message: 'No tienes proyectos en el Roadmap. Crea uno primero desde /roadmap.'
          });
        }

        // Use first project if not specified
        const targetProject = projects[0];
        
        // Resolve column
        let columnId = null;
        if (eventData.column_name) {
          const colsRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProject.id}/columns`, {
            headers: { 'Authorization': req.headers.authorization || '' }
          });
          if (colsRes.ok) {
            const cols = await colsRes.json();
            const match = cols.find(c => c.name.toLowerCase().includes(eventData.column_name.toLowerCase()));
            if (match) columnId = match.id;
          }
        }

        // Resolve assignee
        let assignedTo = null;
        if (eventData.assigned_to) {
          const assignee = await dbAsync.get('SELECT id FROM users WHERE username ILIKE ?', [eventData.assigned_to]);
          if (assignee) assignedTo = assignee.id;
        }

        const issuePayload = {
          title: eventData.title,
          description: eventData.description || '',
          priority: eventData.priority || 'medium',
          due_date: eventData.due_date || eventData.startTimeUTC || null,
          column_id: columnId,
          assigned_to: assignedTo,
          syncCalendar: true
        };

        const createRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProject.id}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' },
          body: JSON.stringify(issuePayload)
        });

        if (createRes.ok) {
          const issue = await createRes.json();
          return res.json({
            success: true,
            isRoadmap: true,
            message: `Tarea "${eventData.title}" creada en el Roadmap del proyecto "${targetProject.name}"${eventData.due_date ? ' y sincronizada con el calendario' : ''}`,
            issue
          });
        }
      } catch (e) {
        console.error('[AI CALENDAR] Roadmap bridge error:', e);
      }
      return res.json({ success: true, isRoadmap: true, message: 'Tarea procesada' });
    }

    // --- QUERY ---
    if (eventData.intent === 'query') {
        const timeFilter = eventData.dateFilter || 'today';
        return res.json({
            success: true,
            message: "Consulta no soportada en modal rápido.",
            events: []
        });
    }

    if (eventData.intent === 'update' || eventData.intent === 'delete') {
        const searchTitle = eventData.searchTitle || eventData.title;
        const isGeneric = isGenericTitle(searchTitle);

        let allEvents = [];
        try {
            const now = new Date();
            const start = new Date(now.getFullYear() - 1, 0, 1).toISOString();
            const end = new Date(now.getFullYear() + 1, 11, 31).toISOString();
            
            const eventsRes = await fetch(`${OUTLOOK_SERVICE_URL}/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
                headers: { 'Authorization': req.headers.authorization || '' }
            });
            
            if (eventsRes.ok) {
                allEvents = await eventsRes.json();
                console.log(`[AI CALENDAR] Fetched ${allEvents.length} events from outlook-service for search`);
            } else {
                console.error(`[AI CALENDAR] Failed to fetch events from outlook-service: ${eventsRes.status}`);
                return res.status(500).json({ error: 'No se pudieron obtener los eventos del calendario.' });
            }
        } catch (e) {
            console.error('[AI CALENDAR] Error fetching events:', e.message);
            return res.status(500).json({ error: 'Error conectando con el servicio de calendario.' });
        }

        if (allEvents.length === 0) {
            return res.status(404).json({ error: 'No hay eventos en tu calendario.', success: false });
        }

        let targetEvent = null;

        const aiDate = eventData.startTimeUTC ? new Date(eventData.startTimeUTC) : null;

        const scored = allEvents.map(ev => {
            let score = 0;
            
            if (searchTitle && !isGeneric) {
                const t = (ev.title || '').toLowerCase();
                const s = searchTitle.toLowerCase();
                if (t === s) score += 100;
                else if (t.includes(s)) score += 60;
                else if (s.includes(t)) score += 40;
                const p = (ev.preview || '').toLowerCase();
                if (p.includes(s)) score += 20;
            }

            if (aiDate) {
                const evStart = new Date(ev.start);
                const diffMs = Math.abs(evStart.getTime() - aiDate.getTime());
                const diffHours = diffMs / (1000 * 60 * 60);
                
                if (diffHours < 1) score += 80;
                else if (diffHours < 6) score += 60;
                else if (diffHours < 24) score += 40;
                else if (diffHours < 48) score += 20;
                else score -= Math.min(50, diffHours / 24);
            }

            return { event: ev, score };
        });

        scored.sort((a, b) => b.score - a.score);
        
        if (scored.length > 0 && scored[0].score > 0) {
            targetEvent = scored[0].event;
            console.log(`[AI CALENDAR] Best match: "${targetEvent.title}" (score: ${scored[0].score}, id: ${targetEvent.id})`);
        }

        if (!targetEvent && aiDate) {
            const byDate = allEvents
                .map(ev => ({ event: ev, diff: Math.abs(new Date(ev.start).getTime() - aiDate.getTime()) }))
                .sort((a, b) => a.diff - b.diff);
            
            if (byDate.length > 0 && byDate[0].diff < 48 * 60 * 60 * 1000) {
                targetEvent = byDate[0].event;
                console.log(`[AI CALENDAR] Date fallback match: "${targetEvent.title}" (id: ${targetEvent.id})`);
            }
        }

        if (!targetEvent) {
            return res.status(404).json({ 
                error: `No encontré ningún evento para ${searchTitle && !isGeneric ? '"' + searchTitle + '"' : 'esa fecha'}.`, 
                success: false 
            });
        }
        
        if (eventData.intent === 'delete') {
             try {
                 const delRes = await fetch(`${OUTLOOK_SERVICE_URL}/${targetEvent.id}`, {
                     method: 'DELETE',
                     headers: { 'Authorization': req.headers.authorization || '' }
                 });
                 
                 if (delRes.ok) {
                     console.log(`[AI CALENDAR] Deleted event: "${targetEvent.title}" (id: ${targetEvent.id})`);
                     return res.json({ success: true, message: `Evento "${targetEvent.title}" eliminado.` });
                 } else {
                     const errData = await delRes.json().catch(() => ({}));
                     console.error(`[AI CALENDAR] Delete failed: ${delRes.status}`, errData);
                     throw new Error(errData.error || 'Error eliminando');
                 }
             } catch (e) {
                 return res.status(500).json({ error: 'Error eliminando evento', details: e.message });
             }
        }
        
        if (eventData.intent === 'update') {
             try {
                 const updatePayload = {};
                 
                 let newTitle = null;
                 if (eventData.title && eventData.title !== searchTitle) {
                     newTitle = eventData.title;
                 } else if (eventData.title && !eventData.searchTitle) {
                     if (eventData.title.toLowerCase() !== (targetEvent.title || '').toLowerCase()) {
                         newTitle = eventData.title;
                     }
                 }
                 
                 updatePayload.title = newTitle || targetEvent.title;
                 updatePayload.start = eventData.startTimeUTC || targetEvent.start;
                 updatePayload.end = eventData.endTimeUTC || targetEvent.end;
                 updatePayload.allDay = eventData.isAllDay !== undefined ? eventData.isAllDay : (targetEvent.allDay || false);
                 updatePayload.location = eventData.location || targetEvent.location || '';
                 updatePayload.description = eventData.description || targetEvent.preview || '';
                 
                 if (eventData.categories && Array.isArray(eventData.categories) && eventData.categories.length > 0) {
                     updatePayload.categories = eventData.categories;
                 } else {
                     updatePayload.categories = targetEvent.categories || [];
                 }

                 console.log(`[AI CALENDAR] Updating event "${targetEvent.title}" (id: ${targetEvent.id}), payload:`, JSON.stringify(updatePayload));

                 const upRes = await fetch(`${OUTLOOK_SERVICE_URL}/${targetEvent.id}`, {
                     method: 'PUT',
                     headers: { 
                         'Content-Type': 'application/json',
                         'Authorization': req.headers.authorization || '' 
                     },
                     body: JSON.stringify(updatePayload)
                 });
                 
                 if (upRes.ok) {
                     const updatedTitle = newTitle || targetEvent.title;
                     console.log(`[AI CALENDAR] Updated successfully: "${updatedTitle}"`);
                     return res.json({ success: true, message: `Evento "${updatedTitle}" actualizado.` });
                 } else {
                     const errData = await upRes.json().catch(() => ({}));
                     console.error(`[AI CALENDAR] Update failed: ${upRes.status}`, errData);
                     throw new Error(errData.error || 'Error actualizando');
                 }
             } catch (e) {
                 console.error('[AI CALENDAR] Update error:', e);
                 return res.status(500).json({ error: 'Error actualizando evento', details: e.message });
             }
        }
    }

    if (eventData.intent === 'attach_file') {
        const searchTitle = eventData.searchTitle || eventData.title;
        const fileName = eventData.fileName;
        const isGeneric = isGenericTitle(searchTitle);
        const attachUsername = req.user?.username || req.user?.name || 'unknown';

        if (!fileName) {
            return res.status(400).json({ error: 'No especificaste qué archivo adjuntar.', success: false });
        }

        let allEvents = [];
        try {
            const now = new Date();
            const start = new Date(now.getFullYear() - 1, 0, 1).toISOString();
            const end = new Date(now.getFullYear() + 1, 11, 31).toISOString();
            
            const eventsRes = await fetch(`${OUTLOOK_SERVICE_URL}/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
                headers: { 'Authorization': req.headers.authorization || '' }
            });
            
            if (eventsRes.ok) {
                allEvents = await eventsRes.json();
                console.log(`[AI CALENDAR] Attach: Fetched ${allEvents.length} events`);
            } else {
                return res.status(500).json({ error: 'No se pudieron obtener los eventos del calendario.' });
            }
        } catch (e) {
            console.error('[AI CALENDAR] Attach - Error fetching events:', e.message);
            return res.status(500).json({ error: 'Error conectando con el servicio de calendario.' });
        }

        if (allEvents.length === 0) {
            return res.status(404).json({ error: 'No hay eventos en tu calendario.', success: false });
        }

        let targetEvent = null;
        const aiDate = eventData.startTimeUTC ? new Date(eventData.startTimeUTC) : null;

        const scored = allEvents.map(ev => {
            let score = 0;
            if (searchTitle && !isGeneric) {
                const t = (ev.title || '').toLowerCase();
                const s = searchTitle.toLowerCase();
                if (t === s) score += 100;
                else if (t.includes(s)) score += 60;
                else if (s.includes(t)) score += 40;
                const p = (ev.preview || '').toLowerCase();
                if (p.includes(s)) score += 20;
            }
            if (aiDate) {
                const evStart = new Date(ev.start);
                const diffMs = Math.abs(evStart.getTime() - aiDate.getTime());
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours < 1) score += 80;
                else if (diffHours < 6) score += 60;
                else if (diffHours < 24) score += 40;
                else if (diffHours < 48) score += 20;
                else score -= Math.min(50, diffHours / 24);
            }
            return { event: ev, score };
        });

        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 0 && scored[0].score > 0) {
            targetEvent = scored[0].event;
            console.log(`[AI CALENDAR] Attach: Best event match: "${targetEvent.title}" (score: ${scored[0].score})`);
        }

        if (!targetEvent && aiDate) {
            const byDate = allEvents
                .map(ev => ({ event: ev, diff: Math.abs(new Date(ev.start).getTime() - aiDate.getTime()) }))
                .sort((a, b) => a.diff - b.diff);
            if (byDate.length > 0 && byDate[0].diff < 48 * 60 * 60 * 1000) {
                targetEvent = byDate[0].event;
                console.log(`[AI CALENDAR] Attach: Date fallback: "${targetEvent.title}"`);
            }
        }

        if (!targetEvent) {
            return res.status(404).json({ 
                error: `No encontré ningún evento para ${searchTitle && !isGeneric ? '"' + searchTitle + '"' : 'esa fecha'}.`, 
                success: false 
            });
        }

        let matchedFile = null;
        try {
            const filesRes = await fetch(`${FILE_SERVICE_URL}/user-files?search=${encodeURIComponent(fileName)}`, {
                headers: { 'Authorization': req.headers.authorization || '' }
            });

            if (filesRes.ok) {
                const filesData = await filesRes.json();
                const files = filesData.files || [];
                console.log(`[AI CALENDAR] Attach: Found ${files.length} files matching "${fileName}"`);

                if (files.length > 0) {
                    const searchLower = fileName.toLowerCase();
                    const scoredFiles = files.map(f => {
                        const fName = (f.name || '').toLowerCase();
                        let fScore = 0;
                        if (fName === searchLower) fScore = 100;
                        else if (fName.startsWith(searchLower)) fScore = 80;
                        else if (fName.includes(searchLower)) fScore = 60;
                        else if (searchLower.includes(fName.replace(/\.[^.]+$/, ''))) fScore = 40;
                        return { file: f, score: fScore };
                    });
                    scoredFiles.sort((a, b) => b.score - a.score);
                    if (scoredFiles[0].score > 0) {
                        matchedFile = scoredFiles[0].file;
                    } else {
                        matchedFile = files[0];
                    }
                    console.log(`[AI CALENDAR] Attach: Best file match: "${matchedFile.name}"`);
                }
            } else {
                console.error(`[AI CALENDAR] Attach: file-service returned ${filesRes.status}`);
            }
        } catch (e) {
            console.error('[AI CALENDAR] Attach - Error searching files:', e.message);
        }

        if (!matchedFile) {
            return res.status(404).json({ 
                error: `No encontré ningún archivo que coincida con "${fileName}".`, 
                success: false 
            });
        }

        try {
            const attachRes = await fetch(`${OUTLOOK_SERVICE_URL}/attachments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                },
                body: JSON.stringify({
                    eventId: targetEvent.id,
                    fileName: matchedFile.name,
                    filePath: matchedFile.path || matchedFile.id || '',
                    fileOwner: matchedFile.owner || attachUsername,
                    fileSize: matchedFile.size || 0
                })
            });

            if (attachRes.ok) {
                console.log(`[AI CALENDAR] Attached "${matchedFile.name}" to event "${targetEvent.title}"`);
                return res.json({ 
                    success: true, 
                    message: `Archivo "${matchedFile.name}" adjuntado al evento "${targetEvent.title}".` 
                });
            } else {
                const errData = await attachRes.json().catch(() => ({}));
                console.error(`[AI CALENDAR] Attach failed: ${attachRes.status}`, errData);
                throw new Error(errData.error || 'Error adjuntando archivo');
            }
        } catch (e) {
            console.error('[AI CALENDAR] Attach error:', e);
            return res.status(500).json({ error: 'Error adjuntando archivo al evento', details: e.message });
        }
    }

    if (eventData.intent === 'add_category') {
        try {
            const categoryName = eventData.categoryName || eventData.title;
            const categoryColor = eventData.categoryColor || 'preset6';
            
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

    let targetUserIds = [];
    if (assignMode === 'group' && groupId) {
      const groupResult = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
      targetUserIds = groupResult.rows.map(row => row.user_id);
    } else if (assignMode === 'user' && targetUserId) {
      targetUserIds = [targetUserId];
    } else {
      targetUserIds = [userId];
    }

    const createdEvents = [];
    
    let finalDescription = eventData.description || '';
    if (assignMode !== 'me') {
      const creatorResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
      const creatorName = creatorResult.rows[0]?.username || 'Admin';
      finalDescription += `\n\n(Tarea asignada por ${creatorName})`;
    }

    for (const targetId of targetUserIds) {
      let createdEvent = null;

      if (targetId === userId) {
        try {
            const outlookRes = await fetch(`${OUTLOOK_SERVICE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                },
                body: JSON.stringify({
                    subject: eventData.title,
                    body: finalDescription,
                    startTime: eventData.startTimeUTC,
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
      } else {
        try {
            const assignRes = await fetch(`${OUTLOOK_SERVICE_URL}/assign-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || ''
                },
                body: JSON.stringify({
                    targetUserId: targetId,
                    title: eventData.title,
                    start: eventData.startTimeUTC,
                    end: eventData.endTimeUTC,
                    allDay: eventData.isAllDay || false,
                    location: eventData.location,
                    description: finalDescription,
                    categories: eventData.categories || []
                })
            });

            if (assignRes.ok) {
                const assignData = await assignRes.json();
                createdEvent = {
                    id: assignData.eventId || `assigned_${targetId}_${Date.now()}`,
                    subject: eventData.title,
                    start_time: eventData.startTimeUTC,
                    source: 'outlook-assign',
                    syncedToCloud: assignData.syncedToCloud
                };
                console.log(`[AI CALENDAR] Evento asignado a usuario ${targetId} via outlook-service (cloud: ${assignData.syncedToCloud})`);
            } else {
                console.warn(`[AI CALENDAR] assign-user falló (${assignRes.status}), usando fallback local.`);
            }
        } catch (e) {
            console.error('[AI CALENDAR] Error en assign-user:', e.message);
        }
      }

      if (!createdEvent) {
          const insertResult = await db.query(
            `INSERT INTO calendar_events (user_id, subject, body_preview, start_time, end_time, location, is_all_day, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [
              targetId,
              eventData.title,
              finalDescription,
              eventData.startTimeUTC,
              eventData.endTimeUTC,
              eventData.location,
              eventData.isAllDay ? 1 : 0
            ]
          );
          createdEvent = insertResult.rows[0];

          if (targetId !== userId) {
            try {
              await sendNotification({
                userId: targetId,
                title: '[Calendar] Nuevo Evento Asignado',
                message: `"${eventData.title}" para el ${new Date(eventData.startTimeUTC).toLocaleDateString()}`,
                type: 'info',
                link: '/calendar',
                metadata: { eventId: createdEvent.id || createdEvent.microsoft_id }
              });
            } catch (notifError) { 
            }
          }
      }

      createdEvents.push(createdEvent);
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

const suggestFiles = async (req, res) => {
  try {
    const { title, description, location, categories } = req.body;
    const userId = req.user.id;

    if (!title && !description) {
      return res.json({ success: true, suggestions: [] });
    }

    let allFiles = [];
    try {
      const filesRes = await fetch(`${FILE_SERVICE_URL}/user-files`, {
        headers: { 'Authorization': req.headers.authorization || '' }
      });
      if (filesRes.ok) {
        const data = await filesRes.json();
        allFiles = data.files || [];
      }
    } catch (e) {
      console.error('[AI SUGGEST] Error fetching files:', e.message);
    }

    try {
      const dirsRes = await fetch(`${FILE_SERVICE_URL}/list?path=`, {
        headers: { 'Authorization': req.headers.authorization || '' }
      });
      if (dirsRes.ok) {
        const dirsData = await dirsRes.json();
        const folders = (dirsData.files || []).filter(f => f.isDirectory);
        
        for (const folder of folders.slice(0, 10)) {
          try {
            const subRes = await fetch(`${FILE_SERVICE_URL}/user-files?path=${encodeURIComponent(folder.name)}`, {
              headers: { 'Authorization': req.headers.authorization || '' }
            });
            if (subRes.ok) {
              const subData = await subRes.json();
              const subFiles = (subData.files || []).map(f => ({
                ...f,
                name: `${folder.name}/${f.name}`,
                path: `${folder.name}/${f.path || f.name}`
              }));
              allFiles = [...allFiles, ...subFiles];
            }
          } catch (e) {  }
        }
      }
    } catch (e) {  }

    if (allFiles.length === 0) {
      return res.json({ success: true, suggestions: [] });
    }

    const fileList = allFiles.slice(0, 200).map((f, i) => 
      `${i + 1}. "${f.name}" (${formatSize(f.size)}, ${f.extension || '?'})`
    ).join('\n');

    const eventContext = [
      title && `Título: ${title}`,
      description && `Descripción: ${description}`,
      location && `Ubicación: ${location}`,
      categories?.length > 0 && `Categorías: ${categories.join(', ')}`
    ].filter(Boolean).join('\n');

    const prompt = `Eres un asistente inteligente. El usuario está creando un evento en su calendario con estos datos:

${eventContext}

Aquí está la lista completa de archivos del usuario:
${fileList}

Tu tarea: Identifica qué archivos podrían estar relacionados con este evento. Piensa en:
- Nombres de archivos que coincidan con el tema del evento (ej: "cena" → "menu_cena.pdf", "receta_san_valentin.docx")
- Archivos que podrían ser útiles como referencia o preparación
- Documentos, imágenes, PDFs, presentaciones relacionados
- Sé creativo pero relevante. NO incluyas archivos claramente irrelevantes.

Responde SOLO un JSON array con los números de los archivos relevantes y una razón corta:
[{"index": 1, "reason": "Razón breve de por qué es relevante"}]

Si no hay archivos relevantes, responde: []
Máximo 5 sugerencias. SOLO responde el JSON, nada más.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    let aiResponse;
    let retryCount = 0;
    while (retryCount < 2) {
      try {
        aiResponse = await model.generateContent(prompt);
        break;
      } catch (e) {
        if (e.status === 429) {
          retryCount++;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw e;
        }
      }
    }

    if (!aiResponse) {
      return res.json({ success: true, suggestions: [] });
    }

    const responseText = aiResponse.response.text();
    
    let parsed = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('[AI SUGGEST] Parse error:', e.message, responseText);
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = parsed
      .filter(s => s.index >= 1 && s.index <= allFiles.length)
      .slice(0, 5)
      .map(s => {
        const file = allFiles[s.index - 1];
        return {
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          extension: file.extension,
          reason: s.reason || ''
        };
      });

    console.log(`[AI SUGGEST] Event "${title}" → ${suggestions.length} suggestions from ${allFiles.length} files`);
    
    return res.json({ success: true, suggestions });

  } catch (error) {
    console.error('[AI SUGGEST] Error:', error);
    return res.json({ success: true, suggestions: [] });
  }
};

function formatSize(bytes) {
  if (!bytes) return '?';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

module.exports = {
    createEvent,
    suggestFiles
};
