const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_startup');
const ROADMAP_SERVICE_URL = process.env.ROADMAP_SERVICE_URL || 'http://roadmap-service:5010';
const OUTLOOK_SERVICE_URL = process.env.OUTLOOK_SERVICE_URL || 'http://outlook-service:5003';
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://file-service:5004';

/**
 * AI Roadmap Command Handler
 * Supports: create_task, move_task, assign_task, query_roadmap, auto_doc
 */
const handleRoadmapCommand = async (req, res) => {
  try {
    const { query, projectId } = req.body;
    const userId = req.user.id;
    const authHeader = req.headers.authorization || '';

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    // Fetch available projects for the user
    let projects = [];
    try {
      const projRes = await fetch(`${ROADMAP_SERVICE_URL}/projects`, {
        headers: { 'Authorization': authHeader }
      });
      if (projRes.ok) projects = await projRes.json();
    } catch (e) {
      console.warn('[AI ROADMAP] Could not fetch projects:', e.message);
    }

    // Fetch columns for context if projectId is specified
    let columns = [];
    if (projectId) {
      try {
        const colRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${projectId}/columns`, {
          headers: { 'Authorization': authHeader }
        });
        if (colRes.ok) columns = await colRes.json();
      } catch (e) {
        console.warn('[AI ROADMAP] Could not fetch columns:', e.message);
      }
    }

    // Fetch users for assignment context
    let users = [];
    try {
      const userRows = await db.dbAsync.all('SELECT id, username FROM users');
      users = userRows || [];
    } catch (e) { /* ignore */ }

    // Build timezone context
    const userTimeZone = 'Europe/Madrid';
    const now = new Date();
    const parts = new Intl.DateTimeFormat('es-ES', {
      timeZone: userTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(now);

    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const nowStr = `${day}/${month}/${year} ${hour}:${minute}`;

    const projectsCtx = projects.length
      ? `Proyectos del usuario: ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })))}`
      : 'No hay proyectos. Sugiere crear uno.';

    const columnsCtx = columns.length
      ? `Columnas del proyecto actual: ${JSON.stringify(columns.map(c => ({ id: c.id, name: c.name })))}`
      : '';

    const usersCtx = users.length
      ? `Usuarios disponibles: ${JSON.stringify(users.map(u => ({ id: u.id, username: u.username })))}`
      : '';

    const prompt = `Eres un asistente de gestión de proyectos (Roadmap/Kanban) inteligente.

Contexto:
- Fecha actual: ${nowStr} (zona ${userTimeZone})
- ${projectsCtx}
${columnsCtx ? `- ${columnsCtx}` : ''}
${usersCtx ? `- ${usersCtx}` : ''}

Acciones posibles:
1. "create_task": Crear nueva tarea en el Roadmap
2. "move_task": Mover tarea a otra columna
3. "assign_task": Asignar/reasignar tarea a usuario
4. "query_roadmap": Consultar estado del proyecto
5. "create_project": Crear nuevo proyecto
6. "auto_doc": Generar documentación de una tarea terminada

IMPORTANTE SOBRE FECHAS:
- "mañana" = sumar 1 día
- "viernes" = el próximo viernes
- Devuelve ISO 8601 UTC con Z al final

IMPORTANTE SOBRE COLUMNAS:
- Si el usuario dice "Validar" → busca la columna que mejor coincida
- Si dice "crear tarea en backlog" → usar la columna Backlog

Estructura JSON de Respuesta:
{
  "intent": "create_task",
  "title": "Título de la tarea",
  "description": "Descripción opcional",
  "column_name": "Nombre de la columna destino (para create_task o move_task)",
  "column_id": ID numérico si lo puedes deducir,
  "assigned_to_username": "nombre del usuario (para assign_task)",
  "assigned_to_id": ID numérico si lo puedes deducir,
  "due_date": "YYYY-MM-DDTHH:mm:ssZ",
  "priority": "low|medium|high|critical",
  "project_id": ID del proyecto (si lo puedes deducir),
  "project_name": "Nombre del proyecto (para create_project)",
  "search_title": "Título de la tarea a buscar (para move/assign)",
  "sync_calendar": true,
  "labels": ["etiqueta1"],
  "success": true,
  "message": "Mensaje de respuesta al usuario"
}

Si hay ambigüedad, devuelve success: true con message explicando las opciones.

Query del usuario: "${query}"
Responde SOLO el JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    let aiResponse;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text().trim();
        break;
      } catch (apiError) {
        retryCount++;
        if (apiError.message && (apiError.message.includes('429') || apiError.message.includes('quota'))) {
          if (retryCount < 3) {
            await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
            continue;
          }
          return res.status(429).json({ error: 'Rate limit. Intenta en unos segundos.' });
        }
        throw apiError;
      }
    }

    if (!aiResponse) return res.status(500).json({ error: 'Sin respuesta de la IA' });

    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let data;
    try { data = JSON.parse(aiResponse); } catch (e) {
      return res.status(400).json({ error: 'Error interpretando respuesta IA' });
    }

    if (!data.success) {
      return res.status(400).json({ error: data.message || 'No se pudo procesar' });
    }

    const targetProjectId = data.project_id || projectId;

    // --- CREATE_TASK ---
    if (data.intent === 'create_task') {
      if (!targetProjectId) {
        return res.json({ success: true, needsProject: true, message: data.message || 'Selecciona un proyecto para crear la tarea', data });
      }

      const issuePayload = {
        title: data.title,
        description: data.description || '',
        priority: data.priority || 'medium',
        due_date: data.due_date || null,
        labels: data.labels || [],
        syncCalendar: data.sync_calendar !== false
      };

      // Resolve column
      if (data.column_id) {
        issuePayload.column_id = data.column_id;
      } else if (data.column_name && columns.length) {
        const match = columns.find(c => c.name.toLowerCase().includes(data.column_name.toLowerCase()));
        if (match) issuePayload.column_id = match.id;
      }

      // Resolve assignee
      if (data.assigned_to_id) {
        issuePayload.assigned_to = data.assigned_to_id;
      } else if (data.assigned_to_username) {
        const u = users.find(u => u.username.toLowerCase() === data.assigned_to_username.toLowerCase());
        if (u) issuePayload.assigned_to = u.id;
      }

      try {
        const createRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProjectId}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify(issuePayload)
        });

        if (createRes.ok) {
          const issue = await createRes.json();
          return res.json({
            success: true,
            message: data.message || `Tarea "${data.title}" creada en el Roadmap`,
            issue,
            syncedCalendar: !!data.due_date
          });
        } else {
          const err = await createRes.json().catch(() => ({}));
          return res.status(500).json({ error: err.error || 'Error creando tarea' });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Error conectando con roadmap-service' });
      }
    }

    // --- CREATE_PROJECT ---
    if (data.intent === 'create_project') {
      try {
        const createRes = await fetch(`${ROADMAP_SERVICE_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ name: data.project_name || data.title, description: data.description || '' })
        });
        if (createRes.ok) {
          const project = await createRes.json();
          return res.json({ success: true, message: `Proyecto "${project.name}" creado`, project });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Error creando proyecto' });
      }
    }

    // --- MOVE_TASK ---
    if (data.intent === 'move_task') {
      if (!targetProjectId) return res.status(400).json({ error: 'Proyecto requerido' });

      // Search issue
      try {
        const issuesRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProjectId}/issues`, {
          headers: { 'Authorization': authHeader }
        });
        if (!issuesRes.ok) return res.status(500).json({ error: 'Error buscando tareas' });
        const issues = await issuesRes.json();

        const searchTerm = (data.search_title || data.title || '').toLowerCase();
        const match = issues.find(i => i.title.toLowerCase().includes(searchTerm));
        if (!match) return res.status(404).json({ error: `No encontré la tarea "${searchTerm}"` });

        // Resolve target column
        let targetColId = data.column_id;
        if (!targetColId && data.column_name) {
          const cMatch = columns.find(c => c.name.toLowerCase().includes(data.column_name.toLowerCase()));
          if (cMatch) targetColId = cMatch.id;
        }
        if (!targetColId) return res.status(400).json({ error: 'No pude determinar la columna destino' });

        const moveRes = await fetch(`${ROADMAP_SERVICE_URL}/issues/${match.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ column_id: targetColId })
        });

        if (moveRes.ok) {
          const updated = await moveRes.json();
          return res.json({ success: true, message: data.message || `Tarea "${match.title}" movida`, issue: updated });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Error moviendo tarea' });
      }
    }

    // --- ASSIGN_TASK ---
    if (data.intent === 'assign_task') {
      if (!targetProjectId) return res.status(400).json({ error: 'Proyecto requerido' });

      try {
        const issuesRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProjectId}/issues`, {
          headers: { 'Authorization': authHeader }
        });
        const issues = await issuesRes.json();

        const searchTerm = (data.search_title || data.title || '').toLowerCase();
        const match = issues.find(i => i.title.toLowerCase().includes(searchTerm));
        if (!match) return res.status(404).json({ error: `No encontré la tarea "${searchTerm}"` });

        let assigneeId = data.assigned_to_id;
        if (!assigneeId && data.assigned_to_username) {
          const u = users.find(u => u.username.toLowerCase() === data.assigned_to_username.toLowerCase());
          if (u) assigneeId = u.id;
        }
        if (!assigneeId) return res.status(400).json({ error: 'No pude identificar al usuario' });

        const assignRes = await fetch(`${ROADMAP_SERVICE_URL}/issues/${match.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ assigned_to: assigneeId })
        });

        if (assignRes.ok) {
          return res.json({ success: true, message: data.message || `Tarea asignada correctamente` });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Error asignando tarea' });
      }
    }

    // --- QUERY_ROADMAP ---
    if (data.intent === 'query_roadmap') {
      return res.json({ success: true, message: data.message, data });
    }

    // --- AUTO_DOC ---
    if (data.intent === 'auto_doc') {
      if (!targetProjectId) return res.status(400).json({ error: 'Proyecto requerido' });

      try {
        const issuesRes = await fetch(`${ROADMAP_SERVICE_URL}/projects/${targetProjectId}/issues`, {
          headers: { 'Authorization': authHeader }
        });
        const issues = await issuesRes.json();

        const searchTerm = (data.search_title || data.title || '').toLowerCase();
        const match = issues.find(i => i.title.toLowerCase().includes(searchTerm));
        if (!match) return res.status(404).json({ error: `No encontré la tarea "${searchTerm}"` });

        const docRes = await fetch(`${ROADMAP_SERVICE_URL}/issues/${match.id}/generate-doc`, {
          method: 'POST',
          headers: { 'Authorization': authHeader }
        });

        if (docRes.ok) {
          const doc = await docRes.json();
          return res.json({ success: true, message: `Documentación generada para "${match.title}"`, document: doc });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Error generando documentación' });
      }
    }

    // Fallback
    return res.json({ success: true, message: data.message || 'Comando procesado', data });

  } catch (error) {
    console.error('[AI ROADMAP] Error:', error);
    res.status(500).json({ error: 'Error interno del servicio', details: error.message });
  }
};

/**
 * Cross-search: Search across Roadmap issues + comments + Panel documents
 */
const crossSearch = async (req, res) => {
  try {
    const { query } = req.body;
    const authHeader = req.headers.authorization || '';

    if (!query) return res.status(400).json({ error: 'Query requerido' });

    const results = { roadmap: { issues: [], comments: [] }, documents: [] };

    // 1. Search roadmap issues + comments
    try {
      const roadmapRes = await fetch(`${ROADMAP_SERVICE_URL}/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': authHeader }
      });
      if (roadmapRes.ok) {
        const data = await roadmapRes.json();
        results.roadmap.issues = data.issues || [];
        results.roadmap.comments = data.comments || [];
      }
    } catch (e) {
      console.warn('[AI CROSS-SEARCH] Roadmap search error:', e.message);
    }

    // 2. Search documents/files using db
    try {
      const q = `%${query}%`;
      const userId = req.user.id;
      const user = await db.dbAsync.get('SELECT username FROM users WHERE id = ?', [userId]);
      const username = user?.username;

      if (username) {
        const files = await db.dbAsync.all(`
          SELECT id, name, physical_path, mime_type, size, created_at
          FROM files WHERE owner_id = ? AND name ILIKE ?
          ORDER BY created_at DESC LIMIT 10
        `, [userId, q]);
        results.documents = files || [];
      }
    } catch (e) {
      console.warn('[AI CROSS-SEARCH] Document search error:', e.message);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[AI CROSS-SEARCH] Error:', error);
    res.status(500).json({ error: 'Error en búsqueda transversal' });
  }
};

module.exports = { handleRoadmapCommand, crossSearch };
