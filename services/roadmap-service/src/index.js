const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { dbAsync } = require('./database/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5010;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const OUTLOOK_SERVICE_URL = process.env.OUTLOOK_SERVICE_URL || 'http://outlook-service:5003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5002';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========================================
// AUTH MIDDLEWARE
// ========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (!token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// ========================================
// HELPER: Send notification via Redis
// ========================================
const sendNotification = async (userId, title, message, type = 'info', metadata = {}) => {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/internal/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message, type, metadata })
    });
  } catch (e) {
    console.warn('[ROADMAP] Notification send failed:', e.message);
  }
};

// ========================================
// HELPER: Sync issue to calendar
// ========================================
const syncIssueToCalendar = async (issue, authHeader, action = 'create') => {
  try {
    if (action === 'create' && issue.due_date) {
      const startDate = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date);
      const dueDate = new Date(issue.due_date);
      
      // Si no hay start_date o es igual a due_date, ponemos bloque de 1h
      let endDate = new Date(dueDate);
      if (!issue.start_date || startDate.getTime() === dueDate.getTime()) {
        endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);
      }

      const eventPayload = {
        subject: `[Roadmap] ${issue.title}`,
        body: { contentType: 'text', content: issue.description || `Tarea del Roadmap: ${issue.title}` },
        start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Madrid' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Madrid' },
        categories: ['Roadmap']
      };

      const response = await fetch(`${OUTLOOK_SERVICE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(eventPayload)
      });

      if (response.ok) {
        const eventData = await response.json();
        const eventId = eventData.id || eventData.microsoft_id;
        if (eventId) {
          // Store the calendar link
          await dbAsync.run(
            'INSERT INTO roadmap_issue_events (issue_id, event_id, provider, sync_direction) VALUES (?, ?, ?, ?)',
            [issue.id, eventId, 'outlook', 'both']
          );
          // Update issue with calendar_event_id
          await dbAsync.run('UPDATE roadmap_issues SET calendar_event_id = ? WHERE id = ?', [eventId, issue.id]);
        }
        return eventId;
      }
    } else if (action === 'update' && issue.calendar_event_id) {
      const startDate = issue.start_date ? new Date(issue.start_date) : null;
      const dueDate = issue.due_date ? new Date(issue.due_date) : null;
      const patchBody = { subject: `[Roadmap] ${issue.title}` };
      
      if (dueDate) {
        const actualStart = startDate || dueDate;
        let endDate = new Date(dueDate);
        // Si no hay start o coinciden, bloque de 1h
        if (!startDate || startDate.getTime() === dueDate.getTime()) {
          endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);
        }
        
        patchBody.start = { dateTime: actualStart.toISOString(), timeZone: 'Europe/Madrid' };
        patchBody.end = { dateTime: endDate.toISOString(), timeZone: 'Europe/Madrid' };
      }
      if (issue.description) patchBody.body = { contentType: 'text', content: issue.description };

      await fetch(`${OUTLOOK_SERVICE_URL}/events/${issue.calendar_event_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(patchBody)
      });
    } else if (action === 'delete' && issue.calendar_event_id) {
      await fetch(`${OUTLOOK_SERVICE_URL}/events/${issue.calendar_event_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
    }
  } catch (e) {
    console.warn('[ROADMAP] Calendar sync error:', e.message);
  }
  return null;
};

// ========================================
// HELPER: Log activity
// ========================================
const logActivity = async (projectId, issueId, userId, action, details = {}) => {
  try {
    await dbAsync.run(
      'INSERT INTO roadmap_activity (project_id, issue_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)',
      [projectId, issueId, userId, action, JSON.stringify(details)]
    );
  } catch (e) {
    console.warn('[ROADMAP] Activity log error:', e.message);
  }
};

// ========================================
// DB MIGRATION (run on startup)
// ========================================
const runMigrations = async () => {
  try {
    // Add project_type column
    await dbAsync.run(`ALTER TABLE roadmap_projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'personal'`).catch(() => {});
    // Create access control table
    await dbAsync.run(`CREATE TABLE IF NOT EXISTS roadmap_user_access (
      user_id INTEGER PRIMARY KEY,
      access_level TEXT DEFAULT 'member',
      can_create_projects BOOLEAN DEFAULT FALSE,
      granted_by INTEGER,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).catch(() => {});
    // Calendar-Roadmap links table
    await dbAsync.run(`CREATE TABLE IF NOT EXISTS roadmap_calendar_links (
      id SERIAL PRIMARY KEY,
      calendar_event_id TEXT NOT NULL,
      issue_id INTEGER NOT NULL,
      linked_by INTEGER NOT NULL,
      link_direction TEXT DEFAULT 'both',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
      FOREIGN KEY(linked_by) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(calendar_event_id, issue_id)
    )`).catch(() => {});
    console.log('[ROADMAP] Migrations completed');
  } catch (e) {
    console.warn('[ROADMAP] Migration warning:', e.message);
  }
};
runMigrations();

// ========================================
// ACCESS CONTROL MIDDLEWARE
// ========================================
const checkRoadmapAccess = (minLevel = 'viewer') => {
  const levels = { none: 0, viewer: 1, member: 2, manager: 3, admin: 4 };
  return async (req, res, next) => {
    // Admins always have full access
    if (req.user.role === 'admin') return next();
    try {
      const access = await dbAsync.get('SELECT * FROM roadmap_user_access WHERE user_id = ?', [req.user.id]);
      // Default to 'member' if user has no row in roadmap_user_access
      const userLevel = access?.access_level || 'member';
      if (levels[userLevel] >= levels[minLevel]) {
        req.roadmapAccess = access || { access_level: 'member', can_create_projects: true };
        return next();
      }
      return res.status(403).json({ error: 'No tienes acceso al Roadmap. Contacta al administrador.' });
    } catch (e) {
      // If table doesn't exist yet, allow access (backwards compatibility)
      return next();
    }
  };
};

// ========================================
// PROJECTS
// ========================================

// GET /projects — list projects based on access + type
app.get('/projects', authenticateToken, checkRoadmapAccess('viewer'), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let projects;
    if (isAdmin) {
      // Admins see everything
      projects = await dbAsync.all(`
        SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.status,
               p.project_key, p.issue_counter, p.created_at, p.updated_at,
               COALESCE(p.project_type, 'personal') AS project_type,
               u.username AS owner_username
        FROM roadmap_projects p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.updated_at DESC
      `);
    } else {
      // Users see: general projects + personal projects they own/are member of
      projects = await dbAsync.all(`
        SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.status,
               p.project_key, p.issue_counter, p.created_at, p.updated_at,
               COALESCE(p.project_type, 'personal') AS project_type,
               u.username AS owner_username
        FROM roadmap_projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN roadmap_members m ON p.id = m.project_id AND m.user_id = ?
        WHERE COALESCE(p.project_type, 'personal') = 'general'
           OR p.owner_id = ?
           OR m.user_id IS NOT NULL
        ORDER BY p.updated_at DESC
      `, [userId, userId]);
    }

    // Enrich with counts
    for (const p of projects) {
      try {
        const ic = await dbAsync.get('SELECT COUNT(*) AS cnt FROM roadmap_issues WHERE project_id = ?', [p.id]);
        p.issue_count = ic?.cnt || 0;
        const mc = await dbAsync.get('SELECT COUNT(*) AS cnt FROM roadmap_members WHERE project_id = ?', [p.id]);
        p.member_count = mc?.cnt || 0;
      } catch (e) {
        p.issue_count = 0;
        p.member_count = 0;
      }
    }
    res.json(projects);
  } catch (error) {
    console.error('[ROADMAP] Error fetching projects:', error.message, error.stack);
    res.status(500).json({ error: 'Error al obtener proyectos', details: error.message });
  }
});

// POST /projects — create a new project with default columns
app.post('/projects', authenticateToken, checkRoadmapAccess('member'), async (req, res) => {
  try {
    const { name, description, project_type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const pType = project_type || 'personal';
    const isAdmin = req.user.role === 'admin';

    // Only admins and managers can create general projects
    if (pType === 'general' && !isAdmin) {
      const access = req.roadmapAccess;
      if (!access || (access.access_level !== 'manager' && access.access_level !== 'admin' && !access.can_create_projects)) {
        return res.status(403).json({ error: 'No tienes permiso para crear proyectos generales' });
      }
    }

    // Generate project key from name (first 3-4 uppercase chars)
    const projectKey = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'PRJ';

    const result = await dbAsync.run(
      `INSERT INTO roadmap_projects (name, description, owner_id, project_key, issue_counter, project_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || '', req.user.id, projectKey, 0, pType]
    );
    const projectId = result.lastID;

    if (!projectId) {
      // Fallback: query the just-inserted project
      const inserted = await dbAsync.get(
        'SELECT id FROM roadmap_projects WHERE name = ? AND owner_id = ? ORDER BY created_at DESC LIMIT 1',
        [name.trim(), req.user.id]
      );
      if (!inserted) return res.status(500).json({ error: 'Error al crear proyecto: no se obtuvo ID' });
      var finalProjectId = inserted.id;
    } else {
      var finalProjectId = projectId;
    }

    // Add owner as member
    await dbAsync.run(
      'INSERT INTO roadmap_members (project_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT (project_id, user_id) DO NOTHING',
      [finalProjectId, req.user.id, 'owner']
    );

    // Create default columns
    const defaultColumns = [
      { name: 'Backlog', color: '#6b7280', position: 0 },
      { name: 'Por Hacer', color: '#3b82f6', position: 1 },
      { name: 'En Progreso', color: '#f59e0b', position: 2 },
      { name: 'Validar', color: '#8b5cf6', position: 3 },
      { name: 'Terminado', color: '#10b981', position: 4 }
    ];

    for (const col of defaultColumns) {
      await dbAsync.run(
        'INSERT INTO roadmap_columns (project_id, name, position, color) VALUES (?, ?, ?, ?)',
        [finalProjectId, col.name, col.position, col.color]
      );
    }

    await logActivity(finalProjectId, null, req.user.id, 'project_created', { name, project_type: pType });
    
    const project = await dbAsync.get('SELECT * FROM roadmap_projects WHERE id = ?', [finalProjectId]);
    res.status(201).json(project);
  } catch (error) {
    console.error('[ROADMAP] Error creating project:', error.message, error.stack);
    res.status(500).json({ error: 'Error al crear proyecto', details: error.message });
  }
});

// PUT /projects/:id
app.put('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const project = await dbAsync.get('SELECT * FROM roadmap_projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    await dbAsync.run(
      'UPDATE roadmap_projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || project.name, description ?? project.description, status || project.status, req.params.id]
    );

    await logActivity(project.id, null, req.user.id, 'project_updated', { name, status });
    const updated = await dbAsync.get('SELECT * FROM roadmap_projects WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('[ROADMAP] Error updating project:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// DELETE /projects/:id
app.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await dbAsync.get('SELECT * FROM roadmap_projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo el propietario puede eliminar el proyecto' });
    }

    await dbAsync.run('DELETE FROM roadmap_projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting project:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
});

// ========================================
// COLUMNS
// ========================================

// GET /projects/:projectId/columns
app.get('/projects/:projectId/columns', authenticateToken, async (req, res) => {
  try {
    const columns = await dbAsync.all(
      'SELECT * FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC',
      [req.params.projectId]
    );
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener columnas' });
  }
});

// POST /projects/:projectId/columns
app.post('/projects/:projectId/columns', authenticateToken, async (req, res) => {
  try {
    const { name, color, position } = req.body;
    const maxPos = await dbAsync.get(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM roadmap_columns WHERE project_id = ?',
      [req.params.projectId]
    );
    const result = await dbAsync.run(
      'INSERT INTO roadmap_columns (project_id, name, position, color) VALUES (?, ?, ?, ?)',
      [req.params.projectId, name, position ?? (maxPos.max_pos + 1), color || '#5f9ee9']
    );
    const col = await dbAsync.get('SELECT * FROM roadmap_columns WHERE id = ?', [result.lastID]);
    res.status(201).json(col);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear columna' });
  }
});

// PUT /columns/:id
app.put('/columns/:id', authenticateToken, async (req, res) => {
  try {
    const { name, color, position, wip_limit } = req.body;
    const col = await dbAsync.get('SELECT * FROM roadmap_columns WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Columna no encontrada' });

    await dbAsync.run(
      'UPDATE roadmap_columns SET name = ?, color = ?, position = ?, wip_limit = ? WHERE id = ?',
      [name || col.name, color || col.color, position ?? col.position, wip_limit ?? col.wip_limit, req.params.id]
    );
    const updated = await dbAsync.get('SELECT * FROM roadmap_columns WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar columna' });
  }
});

// DELETE /columns/:id
app.delete('/columns/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_columns WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar columna' });
  }
});

// PUT /projects/:projectId/columns/reorder
app.put('/projects/:projectId/columns/reorder', authenticateToken, async (req, res) => {
  try {
    const { columnIds } = req.body; // ordered array of column ids
    for (let i = 0; i < columnIds.length; i++) {
      await dbAsync.run('UPDATE roadmap_columns SET position = ? WHERE id = ? AND project_id = ?',
        [i, columnIds[i], req.params.projectId]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al reordenar columnas' });
  }
});

// ========================================
// ISSUES (Cards)
// ========================================

// GET /projects/:projectId/issues
app.get('/projects/:projectId/issues', authenticateToken, async (req, res) => {
  try {
    const { sprint_id, issue_type, assignee, status, epic_id } = req.query;
    
    let query = `
      SELECT i.*, u.username AS assigned_username, c.username AS creator_username, 
             r.username AS reporter_username, ep.title AS epic_title,
             s.name AS sprint_name
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users c ON i.created_by = c.id
      LEFT JOIN users r ON i.reporter_id = r.id
      LEFT JOIN roadmap_issues ep ON i.epic_id = ep.id
      LEFT JOIN roadmap_sprints s ON i.sprint_id = s.id
      WHERE i.project_id = ? AND i.parent_id IS NULL
    `;
    const params = [req.params.projectId];

    if (sprint_id) { query += ' AND i.sprint_id = ?'; params.push(sprint_id); }
    if (issue_type) { query += ' AND i.issue_type = ?'; params.push(issue_type); }
    if (assignee) { query += ' AND i.assigned_to = ?'; params.push(assignee); }
    if (status) { query += ' AND i.status = ?'; params.push(status); }
    if (epic_id) { query += ' AND i.epic_id = ?'; params.push(epic_id); }

    query += ' ORDER BY i.position ASC';

    const issues = await dbAsync.all(query, params);

    // Fetch linked documents, events, subtasks, watchers for each issue
    for (const issue of issues) {
      issue.documents = await dbAsync.all(
        'SELECT * FROM roadmap_issue_documents WHERE issue_id = ?', [issue.id]
      );
      issue.events = await dbAsync.all(
        'SELECT * FROM roadmap_issue_events WHERE issue_id = ?', [issue.id]
      );
      issue.subtasks = await dbAsync.all(
        'SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.issue_id = ? ORDER BY st.position ASC', [issue.id]
      );
      issue.watchers = await dbAsync.all(
        'SELECT w.user_id, u.username FROM roadmap_watchers w LEFT JOIN users u ON w.user_id = u.id WHERE w.issue_id = ?', [issue.id]
      );
      issue.links = await dbAsync.all(`
        SELECT l.*, 
          si.title AS source_title, si.issue_key AS source_key, si.status AS source_status,
          ti.title AS target_title, ti.issue_key AS target_key, ti.status AS target_status
        FROM roadmap_issue_links l
        LEFT JOIN roadmap_issues si ON l.source_issue_id = si.id
        LEFT JOIN roadmap_issues ti ON l.target_issue_id = ti.id
        WHERE l.source_issue_id = ? OR l.target_issue_id = ?
      `, [issue.id, issue.id]);
      const subtotal = issue.subtasks.length;
      const subDone = issue.subtasks.filter(s => s.is_completed).length;
      issue.subtask_progress = subtotal > 0 ? Math.round((subDone / subtotal) * 100) : null;
      issue.labels = typeof issue.labels === 'string' ? JSON.parse(issue.labels) : (issue.labels || []);
    }

    res.json(issues);
  } catch (error) {
    console.error('[ROADMAP] Error fetching issues:', error);
    res.status(500).json({ error: 'Error al obtener issues' });
  }
});

// POST /projects/:projectId/issues — create issue + optional calendar sync
app.post('/projects/:projectId/issues', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, assigned_to, due_date, start_date, column_id, labels,
      estimated_hours, story_points, syncCalendar, issue_type, sprint_id, epic_id, parent_id,
      reporter_id, environment, acceptance_criteria } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });

    // Get column — use first column if none specified
    let targetColumnId = column_id;
    if (!targetColumnId) {
      const firstCol = await dbAsync.get(
        'SELECT id FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC LIMIT 1',
        [req.params.projectId]
      );
      if (!firstCol) return res.status(400).json({ error: 'El proyecto no tiene columnas' });
      targetColumnId = firstCol.id;
    }

    // Get max position in column
    const maxPos = await dbAsync.get(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM roadmap_issues WHERE column_id = ?',
      [targetColumnId]
    );

    // Generate issue key (PRJ-1, PRJ-2, etc.)
    const project = await dbAsync.get('SELECT project_key, issue_counter FROM roadmap_projects WHERE id = ?', [req.params.projectId]);
    const nextCounter = (project?.issue_counter || 0) + 1;
    const issueKey = `${project?.project_key || 'TASK'}-${nextCounter}`;
    await dbAsync.run('UPDATE roadmap_projects SET issue_counter = ? WHERE id = ?', [nextCounter, req.params.projectId]);

    const result = await dbAsync.run(`
      INSERT INTO roadmap_issues (project_id, column_id, title, description, issue_type, issue_key, priority, assigned_to,
        reporter_id, created_by, due_date, start_date, position, labels, story_points, estimated_hours, remaining_hours,
        sprint_id, epic_id, parent_id, environment, acceptance_criteria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.projectId, targetColumnId, title, description || '',
      issue_type || 'task', issueKey, priority || 'medium', assigned_to || null,
      reporter_id || req.user.id, req.user.id,
      due_date || null, start_date || null, maxPos.max_pos + 1,
      JSON.stringify(labels || []), story_points || 0, estimated_hours || 0, estimated_hours || 0,
      sprint_id || null, epic_id || null, parent_id || null,
      environment || null, acceptance_criteria || null
    ]);

    const issue = await dbAsync.get(`
      SELECT i.*, u.username AS assigned_username
      FROM roadmap_issues i LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.id = ?
    `, [result.lastID]);

    // Auto-watch: creator and assignee
    await dbAsync.run('INSERT INTO roadmap_watchers (issue_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [issue.id, req.user.id]);
    if (assigned_to && assigned_to !== req.user.id) {
      await dbAsync.run('INSERT INTO roadmap_watchers (issue_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [issue.id, assigned_to]);
    }

    // Calendar sync
    if (syncCalendar !== false && due_date) {
      await syncIssueToCalendar(issue, req.headers.authorization || '', 'create');
    }

    // Notification to assignee
    if (assigned_to && assigned_to !== req.user.id) {
      await sendNotification(assigned_to,
        'Nueva tarea asignada',
        `Se te asignó ${issueKey}: "${title}" en el Roadmap`,
        'info',
        { type: 'roadmap_assignment', issueId: issue.id, projectId: req.params.projectId }
      );
    }

    // Issue history
    await dbAsync.run(
      'INSERT INTO roadmap_issue_history (issue_id, user_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
      [issue.id, req.user.id, 'created', null, title]
    );

    await logActivity(req.params.projectId, issue.id, req.user.id, 'issue_created', { title, priority, issue_type: issue_type || 'task', issue_key: issueKey });

    issue.documents = [];
    issue.events = [];
    issue.subtasks = [];
    issue.watchers = [{ user_id: req.user.id, username: req.user.username }];
    issue.links = [];
    issue.subtask_progress = null;
    issue.labels = typeof issue.labels === 'string' ? JSON.parse(issue.labels) : (issue.labels || []);
    res.status(201).json(issue);
  } catch (error) {
    console.error('[ROADMAP] Error creating issue:', error);
    res.status(500).json({ error: 'Error al crear issue' });
  }
});

// PUT /issues/:id — update issue
app.put('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await dbAsync.get('SELECT * FROM roadmap_issues WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Issue no encontrada' });

    const { title, description, priority, assigned_to, due_date, start_date, column_id, position,
      labels, estimated_hours, remaining_hours, story_points, status, syncCalendar,
      issue_type, sprint_id, epic_id, environment, acceptance_criteria, resolution } = req.body;

    // Track field changes for history
    const trackField = async (field, oldVal, newVal) => {
      if (newVal !== undefined && String(newVal) !== String(oldVal)) {
        await dbAsync.run(
          'INSERT INTO roadmap_issue_history (issue_id, user_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, req.user.id, field, oldVal != null ? String(oldVal) : null, newVal != null ? String(newVal) : null]
        );
      }
    };

    // Detect column change for activity log
    const columnChanged = column_id && column_id !== existing.column_id;
    let oldColName = null, newColName = null;
    if (columnChanged) {
      const oldCol = await dbAsync.get('SELECT name FROM roadmap_columns WHERE id = ?', [existing.column_id]);
      const newCol = await dbAsync.get('SELECT name FROM roadmap_columns WHERE id = ?', [column_id]);
      oldColName = oldCol?.name;
      newColName = newCol?.name;
    }

    // If moving to last column (Terminado), mark completed
    let completedAt = existing.completed_at;
    let finalStatus = status || existing.status;
    let finalResolution = resolution || existing.resolution;
    if (columnChanged) {
      const allCols = await dbAsync.all(
        'SELECT id FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC',
        [existing.project_id]
      );
      const lastColId = allCols[allCols.length - 1]?.id;
      if (column_id === lastColId) {
        completedAt = new Date().toISOString();
        finalStatus = 'done';
        if (!finalResolution) finalResolution = 'completed';
      } else {
        completedAt = null;
        if (finalStatus === 'done') finalStatus = 'open';
        finalResolution = null;
      }
    }

    await dbAsync.run(`
      UPDATE roadmap_issues SET
        title = ?, description = ?, issue_type = ?, priority = ?, assigned_to = ?,
        due_date = ?, start_date = ?, column_id = ?, position = ?, labels = ?,
        story_points = ?, estimated_hours = ?, remaining_hours = ?,
        status = ?, resolution = ?, completed_at = ?,
        sprint_id = ?, epic_id = ?, environment = ?, acceptance_criteria = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title ?? existing.title,
      description ?? existing.description,
      issue_type || existing.issue_type,
      priority || existing.priority,
      assigned_to !== undefined ? assigned_to : existing.assigned_to,
      due_date !== undefined ? due_date : existing.due_date,
      start_date !== undefined ? start_date : existing.start_date,
      column_id || existing.column_id,
      position ?? existing.position,
      JSON.stringify(labels || (typeof existing.labels === 'string' ? JSON.parse(existing.labels) : existing.labels) || []),
      story_points ?? existing.story_points,
      estimated_hours ?? existing.estimated_hours,
      remaining_hours ?? existing.remaining_hours,
      finalStatus,
      finalResolution,
      completedAt,
      sprint_id !== undefined ? sprint_id : existing.sprint_id,
      epic_id !== undefined ? epic_id : existing.epic_id,
      environment !== undefined ? environment : existing.environment,
      acceptance_criteria !== undefined ? acceptance_criteria : existing.acceptance_criteria,
      req.params.id
    ]);

    // Track history for key fields
    await trackField('title', existing.title, title);
    await trackField('priority', existing.priority, priority);
    await trackField('status', existing.status, finalStatus !== existing.status ? finalStatus : undefined);
    await trackField('assigned_to', existing.assigned_to, assigned_to);
    await trackField('sprint_id', existing.sprint_id, sprint_id);
    await trackField('story_points', existing.story_points, story_points);
    if (columnChanged) await trackField('column', oldColName, newColName);

    // Calendar sync
    if (syncCalendar !== false) {
      const updatedForSync = { 
        ...existing, 
        ...(title && { title }), 
        ...(due_date !== undefined && { due_date }), 
        ...(start_date !== undefined && { start_date }), 
        ...(description && { description }) 
      };
      if (existing.calendar_event_id) {
        await syncIssueToCalendar(updatedForSync, req.headers.authorization || '', 'update');
      } else if (due_date) {
        const freshIssue = await dbAsync.get('SELECT * FROM roadmap_issues WHERE id = ?', [req.params.id]);
        await syncIssueToCalendar(freshIssue, req.headers.authorization || '', 'create');
      }
    }

    // Activity logging
    if (columnChanged) {
      await logActivity(existing.project_id, existing.id, req.user.id, 'issue_moved', {
        from: oldColName, to: newColName
      });
    } else {
      await logActivity(existing.project_id, existing.id, req.user.id, 'issue_updated', {
        title: title || existing.title
      });
    }

    // Notify assignee if changed
    if (assigned_to && assigned_to !== existing.assigned_to && assigned_to !== req.user.id) {
      await sendNotification(assigned_to,
        'Tarea reasignada',
        `Se te reasignó ${existing.issue_key || ''}: "${title || existing.title}" en el Roadmap`,
        'info',
        { type: 'roadmap_assignment', issueId: existing.id }
      );
    }

    // Notify watchers on status change
    if (finalStatus !== existing.status) {
      const watchers = await dbAsync.all('SELECT user_id FROM roadmap_watchers WHERE issue_id = ? AND user_id != ?', [existing.id, req.user.id]);
      for (const w of watchers) {
        await sendNotification(w.user_id,
          'Tarea actualizada',
          `${existing.issue_key || ''} "${existing.title}" cambió a "${finalStatus}"`,
          'info',
          { type: 'roadmap_status_change', issueId: existing.id }
        );
      }
    }

    const updated = await dbAsync.get(`
      SELECT i.*, u.username AS assigned_username, c.username AS creator_username,
             r.username AS reporter_username, ep.title AS epic_title, s.name AS sprint_name
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users c ON i.created_by = c.id
      LEFT JOIN users r ON i.reporter_id = r.id
      LEFT JOIN roadmap_issues ep ON i.epic_id = ep.id
      LEFT JOIN roadmap_sprints s ON i.sprint_id = s.id
      WHERE i.id = ?
    `, [req.params.id]);
    updated.documents = await dbAsync.all('SELECT * FROM roadmap_issue_documents WHERE issue_id = ?', [updated.id]);
    updated.events = await dbAsync.all('SELECT * FROM roadmap_issue_events WHERE issue_id = ?', [updated.id]);
    updated.subtasks = await dbAsync.all('SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.issue_id = ? ORDER BY st.position ASC', [updated.id]);
    updated.watchers = await dbAsync.all('SELECT w.user_id, u.username FROM roadmap_watchers w LEFT JOIN users u ON w.user_id = u.id WHERE w.issue_id = ?', [updated.id]);
    updated.links = await dbAsync.all(`
      SELECT l.*, si.title AS source_title, si.issue_key AS source_key, ti.title AS target_title, ti.issue_key AS target_key
      FROM roadmap_issue_links l LEFT JOIN roadmap_issues si ON l.source_issue_id = si.id LEFT JOIN roadmap_issues ti ON l.target_issue_id = ti.id
      WHERE l.source_issue_id = ? OR l.target_issue_id = ?
    `, [updated.id, updated.id]);
    updated.labels = typeof updated.labels === 'string' ? JSON.parse(updated.labels) : (updated.labels || []);
    const subtotal = updated.subtasks.length;
    const subDone = updated.subtasks.filter(s => s.is_completed).length;
    updated.subtask_progress = subtotal > 0 ? Math.round((subDone / subtotal) * 100) : null;

    res.json(updated);
  } catch (error) {
    console.error('[ROADMAP] Error updating issue:', error);
    res.status(500).json({ error: 'Error al actualizar issue' });
  }
});

// DELETE /issues/:id
app.delete('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await dbAsync.get('SELECT * FROM roadmap_issues WHERE id = ?', [req.params.id]);
    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });

    // Remove calendar event
    if (issue.calendar_event_id) {
      await syncIssueToCalendar(issue, req.headers.authorization || '', 'delete');
    }

    await logActivity(issue.project_id, issue.id, req.user.id, 'issue_deleted', { title: issue.title });
    await dbAsync.run('DELETE FROM roadmap_issues WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar issue' });
  }
});

// PUT /issues/reorder — batch reorder issues within/across columns
app.put('/issues/reorder', authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, column_id, position }]
    for (const u of updates) {
      await dbAsync.run(
        'UPDATE roadmap_issues SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [u.column_id, u.position, u.id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al reordenar issues' });
  }
});

// ========================================
// COMMENTS
// ========================================

// GET /issues/:issueId/comments
app.get('/issues/:issueId/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await dbAsync.all(`
      SELECT c.*, u.username, u.avatar_url
      FROM roadmap_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.issue_id = ?
      ORDER BY c.created_at ASC
    `, [req.params.issueId]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// POST /issues/:issueId/comments
app.post('/issues/:issueId/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenido requerido' });

    const issue = await dbAsync.get('SELECT * FROM roadmap_issues WHERE id = ?', [req.params.issueId]);
    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });

    const result = await dbAsync.run(
      'INSERT INTO roadmap_comments (issue_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.issueId, req.user.id, content]
    );

    // Notify assignee
    if (issue.assigned_to && issue.assigned_to !== req.user.id) {
      await sendNotification(issue.assigned_to,
        'Nuevo comentario en tarea',
        `${req.user.username} comentó en "${issue.title}"`,
        'info',
        { type: 'roadmap_comment', issueId: issue.id }
      );
    }

    await logActivity(issue.project_id, issue.id, req.user.id, 'comment_added', {});

    const comment = await dbAsync.get(`
      SELECT c.*, u.username, u.avatar_url
      FROM roadmap_comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// DELETE /comments/:id
app.delete('/comments/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await dbAsync.get('SELECT * FROM roadmap_comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await dbAsync.run('DELETE FROM roadmap_comments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar comentario' });
  }
});

// ========================================
// MILESTONES
// ========================================

// GET /projects/:projectId/milestones
app.get('/projects/:projectId/milestones', authenticateToken, async (req, res) => {
  try {
    const milestones = await dbAsync.all(
      'SELECT * FROM roadmap_milestones WHERE project_id = ? ORDER BY due_date ASC',
      [req.params.projectId]
    );
    // Enrichment: count linked issues (issues with due_date <= milestone due_date)
    for (const m of milestones) {
      const counts = await dbAsync.get(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'done' THEN 1 END) AS completed
        FROM roadmap_issues WHERE project_id = ? AND due_date <= ?
      `, [req.params.projectId, m.due_date]);
      m.total_issues = counts?.total || 0;
      m.completed_issues = counts?.completed || 0;
    }
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener hitos' });
  }
});

// POST /projects/:projectId/milestones
app.post('/projects/:projectId/milestones', authenticateToken, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });

    const result = await dbAsync.run(
      'INSERT INTO roadmap_milestones (project_id, title, description, due_date) VALUES (?, ?, ?, ?)',
      [req.params.projectId, title, description || '', due_date || null]
    );

    // Sync milestone to calendar if it has a date
    if (due_date) {
      try {
        const milestoneDate = new Date(due_date);
        const eventPayload = {
          subject: `[Hito] ${title}`,
          body: { contentType: 'text', content: description || `Hito del Roadmap: ${title}` },
          start: { dateTime: milestoneDate.toISOString(), timeZone: 'Europe/Madrid' },
          end: { dateTime: new Date(milestoneDate.getTime() + 30 * 60000).toISOString(), timeZone: 'Europe/Madrid' },
          categories: ['Roadmap']
        };
        const calRes = await fetch(`${OUTLOOK_SERVICE_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' },
          body: JSON.stringify(eventPayload)
        });
        if (calRes.ok) {
          const calData = await calRes.json();
          const eventId = calData.id || calData.microsoft_id;
          if (eventId) {
            await dbAsync.run('UPDATE roadmap_milestones SET calendar_event_id = ? WHERE id = ?', [eventId, result.lastID]);
          }
        }
      } catch (e) {
        console.warn('[ROADMAP] Milestone calendar sync error:', e.message);
      }
    }

    await logActivity(req.params.projectId, null, req.user.id, 'milestone_created', { title });
    const milestone = await dbAsync.get('SELECT * FROM roadmap_milestones WHERE id = ?', [result.lastID]);
    res.status(201).json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear hito' });
  }
});

// DELETE /milestones/:id
app.delete('/milestones/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_milestones WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar hito' });
  }
});

// ========================================
// MEMBERS
// ========================================

// GET /projects/:projectId/members
app.get('/projects/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const members = await dbAsync.all(`
      SELECT m.*, u.username, u.avatar_url, u.microsoft_email
      FROM roadmap_members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.project_id = ?
      ORDER BY m.role DESC, u.username ASC
    `, [req.params.projectId]);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener miembros' });
  }
});

// POST /projects/:projectId/members
app.post('/projects/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    await dbAsync.run(
      'INSERT INTO roadmap_members (project_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role',
      [req.params.projectId, user_id, role || 'member']
    );

    await sendNotification(user_id,
      'Añadido a proyecto',
      `Has sido añadido al proyecto del Roadmap`,
      'info',
      { type: 'roadmap_member_added', projectId: req.params.projectId }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir miembro' });
  }
});

// DELETE /projects/:projectId/members/:userId
app.delete('/projects/:projectId/members/:userId', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run(
      'DELETE FROM roadmap_members WHERE project_id = ? AND user_id = ?',
      [req.params.projectId, req.params.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar miembro' });
  }
});

// ========================================
// DOCUMENT LINKING
// ========================================

// POST /issues/:issueId/documents — link a document from the Panel
app.post('/issues/:issueId/documents', authenticateToken, async (req, res) => {
  try {
    const { file_id, file_path, file_name } = req.body;
    if (!file_name) return res.status(400).json({ error: 'file_name requerido' });

    const result = await dbAsync.run(
      'INSERT INTO roadmap_issue_documents (issue_id, file_id, file_path, file_name, linked_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.issueId, file_id || null, file_path || '', file_name, req.user.id]
    );

    const issue = await dbAsync.get('SELECT * FROM roadmap_issues WHERE id = ?', [req.params.issueId]);
    if (issue) {
      await logActivity(issue.project_id, issue.id, req.user.id, 'document_linked', { file_name });
    }

    const doc = await dbAsync.get('SELECT * FROM roadmap_issue_documents WHERE id = ?', [result.lastID]);
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Error al vincular documento' });
  }
});

// DELETE /documents/:id — unlink a document
app.delete('/documents/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_issue_documents WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al desvincular documento' });
  }
});

// GET /issues/:issueId/documents
app.get('/issues/:issueId/documents', authenticateToken, async (req, res) => {
  try {
    const docs = await dbAsync.all('SELECT * FROM roadmap_issue_documents WHERE issue_id = ?', [req.params.issueId]);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// ========================================
// ACTIVITY LOG
// ========================================

// GET /projects/:projectId/activity
app.get('/projects/:projectId/activity', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await dbAsync.all(`
      SELECT a.*, u.username, u.avatar_url
      FROM roadmap_activity a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `, [req.params.projectId]);
    
    for (const act of activities) {
      act.details = typeof act.details === 'string' ? JSON.parse(act.details) : (act.details || {});
    }
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
});

// ========================================
// AI INSIGHTS — Workload analysis
// ========================================

// GET /projects/:projectId/insights — AI-driven bottleneck detection
app.get('/projects/:projectId/insights', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const issues = await dbAsync.all('SELECT * FROM roadmap_issues WHERE project_id = ?', [projectId]);
    const columns = await dbAsync.all('SELECT * FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC', [projectId]);
    const members = await dbAsync.all(`
      SELECT m.user_id, u.username FROM roadmap_members m
      LEFT JOIN users u ON m.user_id = u.id WHERE m.project_id = ?
    `, [projectId]);

    const insights = [];

    // 1. Bottleneck detection: columns exceeding WIP limit
    for (const col of columns) {
      const colIssues = issues.filter(i => i.column_id === col.id);
      if (col.wip_limit > 0 && colIssues.length > col.wip_limit) {
        insights.push({
          type: 'bottleneck',
          severity: 'high',
          message: `La columna "${col.name}" tiene ${colIssues.length} tareas (límite: ${col.wip_limit})`,
          column_id: col.id
        });
      }
    }

    // 2. Overdue issues
    const now = new Date();
    const overdue = issues.filter(i => i.due_date && new Date(i.due_date) < now && i.status !== 'done');
    for (const issue of overdue) {
      const daysPast = Math.ceil((now - new Date(issue.due_date)) / (1000 * 60 * 60 * 24));
      insights.push({
        type: 'overdue',
        severity: daysPast > 7 ? 'high' : 'medium',
        message: `"${issue.title}" venció hace ${daysPast} día(s)`,
        issue_id: issue.id
      });
    }

    // 3. Workload imbalance
    const workload = {};
    for (const m of members) {
      workload[m.user_id] = { username: m.username, count: 0 };
    }
    for (const issue of issues.filter(i => i.assigned_to && i.status !== 'done')) {
      if (workload[issue.assigned_to]) workload[issue.assigned_to].count++;
    }
    const counts = Object.values(workload).map(w => w.count);
    const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    for (const [uid, w] of Object.entries(workload)) {
      if (w.count > avg * 1.5 && w.count > 3) {
        insights.push({
          type: 'workload',
          severity: 'medium',
          message: `${w.username} tiene ${w.count} tareas activas (promedio: ${Math.round(avg)})`,
          user_id: parseInt(uid)
        });
      }
    }

    // 4. At-risk issues (due in next 2 days but not in last column)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const lastCol = columns[columns.length - 1];
    const atRisk = issues.filter(i =>
      i.due_date && new Date(i.due_date) <= twoDaysFromNow && new Date(i.due_date) >= now &&
      i.status !== 'done' && i.column_id !== lastCol?.id
    );
    for (const issue of atRisk) {
      insights.push({
        type: 'at_risk',
        severity: 'medium',
        message: `"${issue.title}" vence pronto y aún no está terminada`,
        issue_id: issue.id
      });
    }

    // 5. Unassigned issues
    const unassigned = issues.filter(i => !i.assigned_to && i.status !== 'done');
    if (unassigned.length > 0) {
      insights.push({
        type: 'unassigned',
        severity: 'low',
        message: `${unassigned.length} tarea(s) sin asignar`,
        count: unassigned.length
      });
    }

    res.json({ insights, summary: { total: issues.length, done: issues.filter(i => i.status === 'done').length, overdue: overdue.length, atRisk: atRisk.length } });
  } catch (error) {
    console.error('[ROADMAP] Insights error:', error);
    res.status(500).json({ error: 'Error al generar insights' });
  }
});

// ========================================
// SEARCH — Cross-search across issues + comments
// ========================================

// GET /search?q=term
app.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const userId = req.user.id;

    const issues = await dbAsync.all(`
      SELECT i.*, p.name AS project_name, u.username AS assigned_username
      FROM roadmap_issues i
      LEFT JOIN roadmap_projects p ON i.project_id = p.id
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN roadmap_members m ON i.project_id = m.project_id AND m.user_id = ?
      WHERE (p.owner_id = ? OR m.user_id IS NOT NULL)
        AND (i.title ILIKE ? OR i.description ILIKE ?)
      ORDER BY i.updated_at DESC LIMIT 20
    `, [userId, userId, q, q]);

    const comments = await dbAsync.all(`
      SELECT c.*, i.title AS issue_title, p.name AS project_name, u.username
      FROM roadmap_comments c
      LEFT JOIN roadmap_issues i ON c.issue_id = i.id
      LEFT JOIN roadmap_projects p ON i.project_id = p.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN roadmap_members m ON i.project_id = m.project_id AND m.user_id = ?
      WHERE (p.owner_id = ? OR m.user_id IS NOT NULL)
        AND c.content ILIKE ?
      ORDER BY c.created_at DESC LIMIT 10
    `, [userId, userId, q]);

    res.json({ issues, comments });
  } catch (error) {
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// ========================================
// AUTO-DOCUMENTATION — Generate delivery note from completed issue
// ========================================

// POST /issues/:issueId/generate-doc
app.post('/issues/:issueId/generate-doc', authenticateToken, async (req, res) => {
  try {
    const issue = await dbAsync.get(`
      SELECT i.*, p.name AS project_name, u.username AS assigned_username
      FROM roadmap_issues i
      LEFT JOIN roadmap_projects p ON i.project_id = p.id
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.id = ?
    `, [req.params.issueId]);

    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });

    const comments = await dbAsync.all(`
      SELECT c.content, u.username, c.created_at
      FROM roadmap_comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.issue_id = ? ORDER BY c.created_at ASC
    `, [req.params.issueId]);

    // Build the document content as Markdown
    const commentBlock = comments.map(c =>
      `**${c.username}** (${new Date(c.created_at).toLocaleString('es-ES')}):\n${c.content}`
    ).join('\n\n---\n\n');

    const docContent = `# Nota de Entrega: ${issue.title}

**Proyecto:** ${issue.project_name}
**Asignado a:** ${issue.assigned_username || 'Sin asignar'}
**Prioridad:** ${issue.priority}
**Creado:** ${new Date(issue.created_at).toLocaleString('es-ES')}
**Completado:** ${issue.completed_at ? new Date(issue.completed_at).toLocaleString('es-ES') : 'Pendiente'}

## Descripción
${issue.description || 'Sin descripción'}

## Historial de Comentarios
${commentBlock || 'Sin comentarios'}

---
*Documento generado automáticamente desde Roadmap*
`;

    res.json({ success: true, content: docContent, filename: `Entrega_${issue.title.replace(/[^a-zA-Z0-9]/g, '_')}.md` });
  } catch (error) {
    console.error('[ROADMAP] Generate doc error:', error);
    res.status(500).json({ error: 'Error al generar documento' });
  }
});

// ========================================
// SPRINTS
// ========================================

// GET sprints for project
app.get('/projects/:projectId/sprints', authenticateToken, async (req, res) => {
  try {
    const sprints = await dbAsync.all(
      'SELECT * FROM roadmap_sprints WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    // Enrich with issue counts
    for (const s of sprints) {
      const counts = await dbAsync.get(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
         SUM(COALESCE(story_points, 0)) as total_points,
         SUM(CASE WHEN status = 'done' THEN COALESCE(story_points, 0) ELSE 0 END) as done_points
         FROM roadmap_issues WHERE sprint_id = ?`,
        [s.id]
      );
      s.issue_count = counts?.total || 0;
      s.done_count = counts?.done || 0;
      s.total_points = counts?.total_points || 0;
      s.done_points = counts?.done_points || 0;
    }
    res.json(sprints);
  } catch (error) {
    console.error('[ROADMAP] Error fetching sprints:', error);
    res.status(500).json({ error: 'Error al obtener sprints' });
  }
});

// POST create sprint
app.post('/projects/:projectId/sprints', authenticateToken, async (req, res) => {
  try {
    const { name, goal, start_date, end_date } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await dbAsync.run(
      'INSERT INTO roadmap_sprints (project_id, name, goal, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.projectId, name, goal || null, start_date || null, end_date || null, 'planning']
    );
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [result.lastID || result.id]);
    res.status(201).json(sprint);
  } catch (error) {
    console.error('[ROADMAP] Error creating sprint:', error);
    res.status(500).json({ error: 'Error al crear sprint' });
  }
});

// PUT update sprint
app.put('/sprints/:id', authenticateToken, async (req, res) => {
  try {
    const { name, goal, start_date, end_date } = req.body;
    await dbAsync.run(
      'UPDATE roadmap_sprints SET name = COALESCE(?, name), goal = COALESCE(?, goal), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, goal, start_date, end_date, req.params.id]
    );
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    res.json(sprint);
  } catch (error) {
    console.error('[ROADMAP] Error updating sprint:', error);
    res.status(500).json({ error: 'Error al actualizar sprint' });
  }
});

// PUT start sprint
app.put('/sprints/:id/start', authenticateToken, async (req, res) => {
  try {
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint no encontrado' });
    if (sprint.status !== 'planning') return res.status(400).json({ error: 'Solo se puede iniciar un sprint en planificación' });
    // Check no other active sprint in this project
    const active = await dbAsync.get('SELECT id FROM roadmap_sprints WHERE project_id = ? AND status = ?', [sprint.project_id, 'active']);
    if (active) return res.status(400).json({ error: 'Ya hay un sprint activo en este proyecto' });
    await dbAsync.run(
      'UPDATE roadmap_sprints SET status = ?, start_date = COALESCE(start_date, CURRENT_DATE), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['active', req.params.id]
    );
    // Create initial burndown snapshot
    const issueStats = await dbAsync.get(
      `SELECT COUNT(*) as total, SUM(COALESCE(story_points, 0)) as total_points,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
       SUM(CASE WHEN status = 'done' THEN COALESCE(story_points, 0) ELSE 0 END) as done_points
       FROM roadmap_issues WHERE sprint_id = ?`,
      [req.params.id]
    );
    await dbAsync.run(
      'INSERT INTO roadmap_sprint_burndown (sprint_id, date, remaining_points, remaining_issues, completed_points, completed_issues) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)',
      [req.params.id,
        (issueStats?.total_points || 0) - (issueStats?.done_points || 0),
        (issueStats?.total || 0) - (issueStats?.done || 0),
        issueStats?.done_points || 0,
        issueStats?.done || 0]
    );
    const updated = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('[ROADMAP] Error starting sprint:', error);
    res.status(500).json({ error: 'Error al iniciar sprint' });
  }
});

// PUT complete sprint
app.put('/sprints/:id/complete', authenticateToken, async (req, res) => {
  try {
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint no encontrado' });
    if (sprint.status !== 'active') return res.status(400).json({ error: 'Solo se puede completar un sprint activo' });
    // Calculate velocity
    const donePoints = await dbAsync.get(
      `SELECT SUM(COALESCE(story_points, 0)) as pts FROM roadmap_issues WHERE sprint_id = ? AND status = 'done'`,
      [req.params.id]
    );
    const velocity = donePoints?.pts || 0;
    await dbAsync.run(
      'UPDATE roadmap_sprints SET status = ?, end_date = COALESCE(end_date, CURRENT_DATE), velocity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', velocity, req.params.id]
    );
    // Move incomplete issues to backlog (sprint_id = NULL)
    const { moveToSprintId } = req.body;
    if (moveToSprintId) {
      await dbAsync.run(
        `UPDATE roadmap_issues SET sprint_id = ? WHERE sprint_id = ? AND status != 'done'`,
        [moveToSprintId, req.params.id]
      );
    } else {
      await dbAsync.run(
        `UPDATE roadmap_issues SET sprint_id = NULL WHERE sprint_id = ? AND status != 'done'`,
        [req.params.id]
      );
    }
    const updated = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('[ROADMAP] Error completing sprint:', error);
    res.status(500).json({ error: 'Error al completar sprint' });
  }
});

// DELETE sprint
app.delete('/sprints/:id', authenticateToken, async (req, res) => {
  try {
    // Move issues out of sprint
    await dbAsync.run('UPDATE roadmap_issues SET sprint_id = NULL WHERE sprint_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM roadmap_sprint_burndown WHERE sprint_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting sprint:', error);
    res.status(500).json({ error: 'Error al eliminar sprint' });
  }
});

// GET sprint burndown data
app.get('/sprints/:id/burndown', authenticateToken, async (req, res) => {
  try {
    const data = await dbAsync.all(
      'SELECT * FROM roadmap_sprint_burndown WHERE sprint_id = ? ORDER BY date ASC',
      [req.params.id]
    );
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ?', [req.params.id]);
    res.json({ sprint, burndown: data });
  } catch (error) {
    console.error('[ROADMAP] Error fetching burndown:', error);
    res.status(500).json({ error: 'Error al obtener burndown' });
  }
});

// POST sprint burndown snapshot (daily cron or manual)
app.post('/sprints/:id/snapshot', authenticateToken, async (req, res) => {
  try {
    const sprint = await dbAsync.get('SELECT * FROM roadmap_sprints WHERE id = ? AND status = ?', [req.params.id, 'active']);
    if (!sprint) return res.status(404).json({ error: 'Sprint activo no encontrado' });
    const stats = await dbAsync.get(
      `SELECT COUNT(*) as total, SUM(COALESCE(story_points, 0)) as total_points,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
       SUM(CASE WHEN status = 'done' THEN COALESCE(story_points, 0) ELSE 0 END) as done_points
       FROM roadmap_issues WHERE sprint_id = ?`,
      [req.params.id]
    );
    await dbAsync.run(
      'INSERT INTO roadmap_sprint_burndown (sprint_id, date, remaining_points, remaining_issues, completed_points, completed_issues) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)',
      [req.params.id,
        (stats?.total_points || 0) - (stats?.done_points || 0),
        (stats?.total || 0) - (stats?.done || 0),
        stats?.done_points || 0,
        stats?.done || 0]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error creating snapshot:', error);
    res.status(500).json({ error: 'Error al crear snapshot' });
  }
});

// GET backlog issues (no sprint assigned)
app.get('/projects/:projectId/backlog', authenticateToken, async (req, res) => {
  try {
    const issues = await dbAsync.all(`
      SELECT i.*, u.username AS assigned_username, c.username AS creator_username
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users c ON i.created_by = c.id
      WHERE i.project_id = ? AND i.sprint_id IS NULL AND (i.parent_id IS NULL)
      ORDER BY i.position ASC, i.created_at DESC
    `, [req.params.projectId]);
    for (const issue of issues) {
      issue.labels = typeof issue.labels === 'string' ? JSON.parse(issue.labels) : (issue.labels || []);
      const sub = await dbAsync.all('SELECT * FROM roadmap_subtasks WHERE issue_id = ?', [issue.id]);
      const total = sub.length;
      const done = sub.filter(s => s.is_completed).length;
      issue.subtask_progress = total > 0 ? Math.round((done / total) * 100) : null;
    }
    res.json(issues);
  } catch (error) {
    console.error('[ROADMAP] Error fetching backlog:', error);
    res.status(500).json({ error: 'Error al obtener backlog' });
  }
});

// ========================================
// SUBTASKS
// ========================================

// GET subtasks for issue
app.get('/issues/:issueId/subtasks', authenticateToken, async (req, res) => {
  try {
    const subtasks = await dbAsync.all(
      'SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.issue_id = ? ORDER BY st.position ASC',
      [req.params.issueId]
    );
    res.json(subtasks);
  } catch (error) {
    console.error('[ROADMAP] Error fetching subtasks:', error);
    res.status(500).json({ error: 'Error al obtener subtareas' });
  }
});

// POST create subtask
app.post('/issues/:issueId/subtasks', authenticateToken, async (req, res) => {
  try {
    const { title, assigned_to } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });
    const maxPos = await dbAsync.get('SELECT MAX(position) as mp FROM roadmap_subtasks WHERE issue_id = ?', [req.params.issueId]);
    const result = await dbAsync.run(
      'INSERT INTO roadmap_subtasks (issue_id, title, assigned_to, position) VALUES (?, ?, ?, ?)',
      [req.params.issueId, title, assigned_to || null, (maxPos?.mp || 0) + 1]
    );
    const subtask = await dbAsync.get('SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.id = ?', [result.lastID || result.id]);
    res.status(201).json(subtask);
  } catch (error) {
    console.error('[ROADMAP] Error creating subtask:', error);
    res.status(500).json({ error: 'Error al crear subtarea' });
  }
});

// PUT update subtask (toggle completion, rename, reorder)
app.put('/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, is_completed, assigned_to, position } = req.body;
    const existing = await dbAsync.get('SELECT * FROM roadmap_subtasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Subtarea no encontrada' });
    await dbAsync.run(
      'UPDATE roadmap_subtasks SET title = COALESCE(?, title), is_completed = COALESCE(?, is_completed), assigned_to = COALESCE(?, assigned_to), position = COALESCE(?, position), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, is_completed !== undefined ? (is_completed ? 1 : 0) : null, assigned_to, position, req.params.id]
    );
    const updated = await dbAsync.get('SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('[ROADMAP] Error updating subtask:', error);
    res.status(500).json({ error: 'Error al actualizar subtarea' });
  }
});

// DELETE subtask
app.delete('/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_subtasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting subtask:', error);
    res.status(500).json({ error: 'Error al eliminar subtarea' });
  }
});

// ========================================
// TIME TRACKING
// ========================================

// GET time logs for issue
app.get('/issues/:issueId/time-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await dbAsync.all(
      'SELECT tl.*, u.username FROM roadmap_time_logs tl LEFT JOIN users u ON tl.user_id = u.id WHERE tl.issue_id = ? ORDER BY tl.work_date DESC',
      [req.params.issueId]
    );
    res.json(logs);
  } catch (error) {
    console.error('[ROADMAP] Error fetching time logs:', error);
    res.status(500).json({ error: 'Error al obtener registros de tiempo' });
  }
});

// POST log time
app.post('/issues/:issueId/time-logs', authenticateToken, async (req, res) => {
  try {
    const { hours, description, work_date } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'Horas requeridas (> 0)' });
    const result = await dbAsync.run(
      'INSERT INTO roadmap_time_logs (issue_id, user_id, hours, description, work_date) VALUES (?, ?, ?, ?, ?)',
      [req.params.issueId, req.user.id, hours, description || null, work_date || new Date().toISOString().split('T')[0]]
    );
    // Update logged_hours on issue
    await dbAsync.run(
      'UPDATE roadmap_issues SET logged_hours = COALESCE(logged_hours, 0) + ? WHERE id = ?',
      [hours, req.params.issueId]
    );
    // If remaining_hours provided, update it
    if (req.body.remaining_hours !== undefined) {
      await dbAsync.run('UPDATE roadmap_issues SET remaining_hours = ? WHERE id = ?', [req.body.remaining_hours, req.params.issueId]);
    }
    const log = await dbAsync.get('SELECT tl.*, u.username FROM roadmap_time_logs tl LEFT JOIN users u ON tl.user_id = u.id WHERE tl.id = ?', [result.lastID || result.id]);
    // Issue history
    await dbAsync.run(
      'INSERT INTO roadmap_issue_history (issue_id, user_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
      [req.params.issueId, req.user.id, 'time_logged', null, `${hours}h`]
    );
    res.status(201).json(log);
  } catch (error) {
    console.error('[ROADMAP] Error logging time:', error);
    res.status(500).json({ error: 'Error al registrar tiempo' });
  }
});

// DELETE time log
app.delete('/time-logs/:id', authenticateToken, async (req, res) => {
  try {
    const log = await dbAsync.get('SELECT * FROM roadmap_time_logs WHERE id = ?', [req.params.id]);
    if (!log) return res.status(404).json({ error: 'Registro no encontrado' });
    // Subtract from logged_hours
    await dbAsync.run(
      'UPDATE roadmap_issues SET logged_hours = GREATEST(COALESCE(logged_hours, 0) - ?, 0) WHERE id = ?',
      [log.hours, log.issue_id]
    );
    await dbAsync.run('DELETE FROM roadmap_time_logs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting time log:', error);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// ========================================
// WATCHERS
// ========================================

// GET watchers for issue
app.get('/issues/:issueId/watchers', authenticateToken, async (req, res) => {
  try {
    const watchers = await dbAsync.all(
      'SELECT w.user_id, u.username, COALESCE(u.microsoft_email, \'\') AS email FROM roadmap_watchers w LEFT JOIN users u ON w.user_id = u.id WHERE w.issue_id = ?',
      [req.params.issueId]
    );
    res.json(watchers);
  } catch (error) {
    console.error('[ROADMAP] Error fetching watchers:', error);
    res.status(500).json({ error: 'Error al obtener observadores' });
  }
});

// POST add watcher
app.post('/issues/:issueId/watchers', authenticateToken, async (req, res) => {
  try {
    const userId = req.body.user_id || req.user.id;
    await dbAsync.run(
      'INSERT INTO roadmap_watchers (issue_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [req.params.issueId, userId]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error adding watcher:', error);
    res.status(500).json({ error: 'Error al agregar observador' });
  }
});

// DELETE remove watcher
app.delete('/issues/:issueId/watchers/:userId', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run(
      'DELETE FROM roadmap_watchers WHERE issue_id = ? AND user_id = ?',
      [req.params.issueId, req.params.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error removing watcher:', error);
    res.status(500).json({ error: 'Error al eliminar observador' });
  }
});

// ========================================
// ISSUE LINKS
// ========================================

// GET links for issue
app.get('/issues/:issueId/links', authenticateToken, async (req, res) => {
  try {
    const links = await dbAsync.all(`
      SELECT l.*,
        si.title AS source_title, si.issue_key AS source_key, si.status AS source_status,
        ti.title AS target_title, ti.issue_key AS target_key, ti.status AS target_status
      FROM roadmap_issue_links l
      LEFT JOIN roadmap_issues si ON l.source_issue_id = si.id
      LEFT JOIN roadmap_issues ti ON l.target_issue_id = ti.id
      WHERE l.source_issue_id = ? OR l.target_issue_id = ?
    `, [req.params.issueId, req.params.issueId]);
    res.json(links);
  } catch (error) {
    console.error('[ROADMAP] Error fetching links:', error);
    res.status(500).json({ error: 'Error al obtener enlaces' });
  }
});

// POST create link
app.post('/issues/:issueId/links', authenticateToken, async (req, res) => {
  try {
    const { target_issue_id, link_type } = req.body;
    if (!target_issue_id || !link_type) return res.status(400).json({ error: 'target_issue_id y link_type requeridos' });
    const validTypes = ['blocks', 'blocked_by', 'relates_to', 'duplicates', 'is_duplicated_by', 'clones', 'is_cloned_by'];
    if (!validTypes.includes(link_type)) return res.status(400).json({ error: `link_type inválido. Válidos: ${validTypes.join(', ')}` });
    // Normalize direction: blocks/blocked_by are opposite
    let srcId = parseInt(req.params.issueId), tgtId = parseInt(target_issue_id), type = link_type;
    if (link_type === 'blocked_by') { srcId = tgtId; tgtId = parseInt(req.params.issueId); type = 'blocks'; }
    if (link_type === 'is_duplicated_by') { srcId = tgtId; tgtId = parseInt(req.params.issueId); type = 'duplicates'; }
    if (link_type === 'is_cloned_by') { srcId = tgtId; tgtId = parseInt(req.params.issueId); type = 'clones'; }
    const result = await dbAsync.run(
      'INSERT INTO roadmap_issue_links (source_issue_id, target_issue_id, link_type, created_by) VALUES (?, ?, ?, ?)',
      [srcId, tgtId, type, req.user.id]
    );
    const link = await dbAsync.get(`
      SELECT l.*, si.title AS source_title, si.issue_key AS source_key, ti.title AS target_title, ti.issue_key AS target_key
      FROM roadmap_issue_links l LEFT JOIN roadmap_issues si ON l.source_issue_id = si.id LEFT JOIN roadmap_issues ti ON l.target_issue_id = ti.id
      WHERE l.id = ?
    `, [result.lastID || result.id]);
    res.status(201).json(link);
  } catch (error) {
    if (error.message?.includes('UNIQUE') || error.code === '23505') return res.status(409).json({ error: 'Enlace ya existe' });
    console.error('[ROADMAP] Error creating link:', error);
    res.status(500).json({ error: 'Error al crear enlace' });
  }
});

// DELETE remove link
app.delete('/links/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_issue_links WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting link:', error);
    res.status(500).json({ error: 'Error al eliminar enlace' });
  }
});

// ========================================
// ISSUE HISTORY / AUDIT LOG
// ========================================

app.get('/issues/:issueId/history', authenticateToken, async (req, res) => {
  try {
    const history = await dbAsync.all(
      'SELECT h.*, u.username FROM roadmap_issue_history h LEFT JOIN users u ON h.user_id = u.id WHERE h.issue_id = ? ORDER BY h.created_at DESC',
      [req.params.issueId]
    );
    res.json(history);
  } catch (error) {
    console.error('[ROADMAP] Error fetching history:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// ========================================
// CUSTOM FIELDS
// ========================================

// GET custom fields for project
app.get('/projects/:projectId/custom-fields', authenticateToken, async (req, res) => {
  try {
    const fields = await dbAsync.all('SELECT * FROM roadmap_custom_fields WHERE project_id = ? ORDER BY name ASC', [req.params.projectId]);
    for (const f of fields) {
      f.options = typeof f.options === 'string' ? JSON.parse(f.options) : (f.options || null);
    }
    res.json(fields);
  } catch (error) {
    console.error('[ROADMAP] Error fetching custom fields:', error);
    res.status(500).json({ error: 'Error al obtener campos personalizados' });
  }
});

// POST create custom field
app.post('/projects/:projectId/custom-fields', authenticateToken, async (req, res) => {
  try {
    const { name, field_type, options, is_required } = req.body;
    if (!name || !field_type) return res.status(400).json({ error: 'name y field_type requeridos' });
    const validTypes = ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'user'];
    if (!validTypes.includes(field_type)) return res.status(400).json({ error: `Tipo inválido. Válidos: ${validTypes.join(', ')}` });
    const result = await dbAsync.run(
      'INSERT INTO roadmap_custom_fields (project_id, name, field_type, options, is_required) VALUES (?, ?, ?, ?, ?)',
      [req.params.projectId, name, field_type, options ? JSON.stringify(options) : null, is_required ? 1 : 0]
    );
    const field = await dbAsync.get('SELECT * FROM roadmap_custom_fields WHERE id = ?', [result.lastID || result.id]);
    field.options = typeof field.options === 'string' ? JSON.parse(field.options) : (field.options || null);
    res.status(201).json(field);
  } catch (error) {
    console.error('[ROADMAP] Error creating custom field:', error);
    res.status(500).json({ error: 'Error al crear campo personalizado' });
  }
});

// DELETE custom field
app.delete('/custom-fields/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_custom_field_values WHERE field_id = ?', [req.params.id]);
    await dbAsync.run('DELETE FROM roadmap_custom_fields WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting custom field:', error);
    res.status(500).json({ error: 'Error al eliminar campo' });
  }
});

// GET custom field values for issue
app.get('/issues/:issueId/custom-fields', authenticateToken, async (req, res) => {
  try {
    const values = await dbAsync.all(
      `SELECT v.*, f.name, f.field_type, f.options, f.is_required
       FROM roadmap_custom_field_values v
       JOIN roadmap_custom_fields f ON v.field_id = f.id
       WHERE v.issue_id = ?`,
      [req.params.issueId]
    );
    for (const v of values) { v.options = typeof v.options === 'string' ? JSON.parse(v.options) : (v.options || null); }
    res.json(values);
  } catch (error) {
    console.error('[ROADMAP] Error fetching custom field values:', error);
    res.status(500).json({ error: 'Error al obtener valores de campos' });
  }
});

// PUT set custom field value for issue
app.put('/issues/:issueId/custom-fields/:fieldId', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    // Upsert
    const existing = await dbAsync.get(
      'SELECT id FROM roadmap_custom_field_values WHERE issue_id = ? AND field_id = ?',
      [req.params.issueId, req.params.fieldId]
    );
    if (existing) {
      await dbAsync.run('UPDATE roadmap_custom_field_values SET value = ? WHERE id = ?', [value, existing.id]);
    } else {
      await dbAsync.run(
        'INSERT INTO roadmap_custom_field_values (issue_id, field_id, value) VALUES (?, ?, ?)',
        [req.params.issueId, req.params.fieldId, value]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error setting custom field:', error);
    res.status(500).json({ error: 'Error al guardar campo' });
  }
});

// ========================================
// SAVED FILTERS
// ========================================

// GET user filters + shared filters for project
app.get('/projects/:projectId/filters', authenticateToken, async (req, res) => {
  try {
    const filters = await dbAsync.all(
      'SELECT f.*, u.username AS owner_username FROM roadmap_filters f LEFT JOIN users u ON f.user_id = u.id WHERE f.project_id = ? AND (f.user_id = ? OR f.is_shared = 1) ORDER BY f.name ASC',
      [req.params.projectId, req.user.id]
    );
    for (const f of filters) { f.filter_config = typeof f.filter_config === 'string' ? JSON.parse(f.filter_config) : f.filter_config; }
    res.json(filters);
  } catch (error) {
    console.error('[ROADMAP] Error fetching filters:', error);
    res.status(500).json({ error: 'Error al obtener filtros' });
  }
});

// POST create filter
app.post('/projects/:projectId/filters', authenticateToken, async (req, res) => {
  try {
    const { name, filter_config, is_shared } = req.body;
    if (!name || !filter_config) return res.status(400).json({ error: 'name y filter_config requeridos' });
    const result = await dbAsync.run(
      'INSERT INTO roadmap_filters (project_id, user_id, name, filter_config, is_shared) VALUES (?, ?, ?, ?, ?)',
      [req.params.projectId, req.user.id, name, JSON.stringify(filter_config), is_shared ? 1 : 0]
    );
    const filter = await dbAsync.get('SELECT * FROM roadmap_filters WHERE id = ?', [result.lastID || result.id]);
    filter.filter_config = typeof filter.filter_config === 'string' ? JSON.parse(filter.filter_config) : filter.filter_config;
    res.status(201).json(filter);
  } catch (error) {
    console.error('[ROADMAP] Error creating filter:', error);
    res.status(500).json({ error: 'Error al crear filtro' });
  }
});

// PUT update filter
app.put('/filters/:id', authenticateToken, async (req, res) => {
  try {
    const { name, filter_config, is_shared } = req.body;
    await dbAsync.run(
      'UPDATE roadmap_filters SET name = COALESCE(?, name), filter_config = COALESCE(?, filter_config), is_shared = COALESCE(?, is_shared), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, filter_config ? JSON.stringify(filter_config) : null, is_shared !== undefined ? (is_shared ? 1 : 0) : null, req.params.id, req.user.id]
    );
    const filter = await dbAsync.get('SELECT * FROM roadmap_filters WHERE id = ?', [req.params.id]);
    if (filter) filter.filter_config = typeof filter.filter_config === 'string' ? JSON.parse(filter.filter_config) : filter.filter_config;
    res.json(filter);
  } catch (error) {
    console.error('[ROADMAP] Error updating filter:', error);
    res.status(500).json({ error: 'Error al actualizar filtro' });
  }
});

// DELETE filter
app.delete('/filters/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_filters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting filter:', error);
    res.status(500).json({ error: 'Error al eliminar filtro' });
  }
});

// ========================================
// BULK OPERATIONS
// ========================================

// PUT bulk update issues (move to sprint, change assignee, change priority)
app.put('/projects/:projectId/issues/bulk', authenticateToken, async (req, res) => {
  try {
    const { issue_ids, updates } = req.body;
    if (!issue_ids || !issue_ids.length || !updates) return res.status(400).json({ error: 'issue_ids y updates requeridos' });
    const setClauses = [];
    const params = [];
    if (updates.sprint_id !== undefined) { setClauses.push('sprint_id = ?'); params.push(updates.sprint_id); }
    if (updates.assigned_to !== undefined) { setClauses.push('assigned_to = ?'); params.push(updates.assigned_to); }
    if (updates.priority) { setClauses.push('priority = ?'); params.push(updates.priority); }
    if (updates.labels) { setClauses.push('labels = ?'); params.push(JSON.stringify(updates.labels)); }
    if (updates.issue_type) { setClauses.push('issue_type = ?'); params.push(updates.issue_type); }
    if (updates.epic_id !== undefined) { setClauses.push('epic_id = ?'); params.push(updates.epic_id); }
    if (!setClauses.length) return res.status(400).json({ error: 'No hay campos para actualizar' });
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    const placeholders = issue_ids.map(() => '?').join(',');
    await dbAsync.run(
      `UPDATE roadmap_issues SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`,
      [...params, ...issue_ids]
    );
    res.json({ success: true, updated: issue_ids.length });
  } catch (error) {
    console.error('[ROADMAP] Error bulk update:', error);
    res.status(500).json({ error: 'Error en actualización masiva' });
  }
});

// GET search issues across project
app.get('/projects/:projectId/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.json([]);
    const issues = await dbAsync.all(`
      SELECT i.id, i.title, i.issue_key, i.issue_type, i.status, i.priority, u.username AS assigned_username
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.project_id = ? AND (i.title LIKE ? OR i.issue_key LIKE ? OR i.description LIKE ?)
      ORDER BY i.updated_at DESC LIMIT ?
    `, [req.params.projectId, `%${q}%`, `%${q}%`, `%${q}%`, parseInt(limit) || 20]);
    res.json(issues);
  } catch (error) {
    console.error('[ROADMAP] Error searching:', error);
    res.status(500).json({ error: 'Error al buscar' });
  }
});

// GET single issue detail (with all relations)
app.get('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await dbAsync.get(`
      SELECT i.*, u.username AS assigned_username, c.username AS creator_username,
             r.username AS reporter_username, ep.title AS epic_title, ep.issue_key AS epic_key,
             s.name AS sprint_name, s.status AS sprint_status
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users c ON i.created_by = c.id
      LEFT JOIN users r ON i.reporter_id = r.id
      LEFT JOIN roadmap_issues ep ON i.epic_id = ep.id
      LEFT JOIN roadmap_sprints s ON i.sprint_id = s.id
      WHERE i.id = ?
    `, [req.params.id]);
    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });
    issue.labels = typeof issue.labels === 'string' ? JSON.parse(issue.labels) : (issue.labels || []);
    issue.documents = await dbAsync.all('SELECT * FROM roadmap_issue_documents WHERE issue_id = ?', [issue.id]);
    issue.events = await dbAsync.all('SELECT * FROM roadmap_issue_events WHERE issue_id = ?', [issue.id]);
    issue.subtasks = await dbAsync.all('SELECT st.*, u.username AS assigned_username FROM roadmap_subtasks st LEFT JOIN users u ON st.assigned_to = u.id WHERE st.issue_id = ? ORDER BY st.position ASC', [issue.id]);
    issue.watchers = await dbAsync.all('SELECT w.user_id, u.username FROM roadmap_watchers w LEFT JOIN users u ON w.user_id = u.id WHERE w.issue_id = ?', [issue.id]);
    issue.links = await dbAsync.all(`
      SELECT l.*, si.title AS source_title, si.issue_key AS source_key, si.status AS source_status,
             ti.title AS target_title, ti.issue_key AS target_key, ti.status AS target_status
      FROM roadmap_issue_links l LEFT JOIN roadmap_issues si ON l.source_issue_id = si.id LEFT JOIN roadmap_issues ti ON l.target_issue_id = ti.id
      WHERE l.source_issue_id = ? OR l.target_issue_id = ?
    `, [issue.id, issue.id]);
    issue.time_logs = await dbAsync.all('SELECT tl.*, u.username FROM roadmap_time_logs tl LEFT JOIN users u ON tl.user_id = u.id WHERE tl.issue_id = ? ORDER BY tl.work_date DESC', [issue.id]);
    issue.custom_fields = await dbAsync.all(`
      SELECT v.*, f.name AS field_name, f.field_type, f.options
      FROM roadmap_custom_field_values v JOIN roadmap_custom_fields f ON v.field_id = f.id WHERE v.issue_id = ?
    `, [issue.id]);
    for (const cf of issue.custom_fields) { cf.options = typeof cf.options === 'string' ? JSON.parse(cf.options) : (cf.options || null); }
    issue.children = await dbAsync.all(`
      SELECT i.id, i.title, i.issue_key, i.issue_type, i.status, i.priority, i.story_points, u.username AS assigned_username
      FROM roadmap_issues i LEFT JOIN users u ON i.assigned_to = u.id WHERE i.parent_id = ? ORDER BY i.position ASC
    `, [issue.id]);
    const subtotal = issue.subtasks.length;
    const subDone = issue.subtasks.filter(s => s.is_completed).length;
    issue.subtask_progress = subtotal > 0 ? Math.round((subDone / subtotal) * 100) : null;
    const totalLogged = issue.time_logs.reduce((acc, tl) => acc + (tl.hours || 0), 0);
    issue.total_logged_hours = totalLogged;
    res.json(issue);
  } catch (error) {
    console.error('[ROADMAP] Error fetching issue detail:', error);
    res.status(500).json({ error: 'Error al obtener detalle de issue' });
  }
});

// ========================================
// EPICS
// ========================================

// GET epics for project (issues with issue_type = 'epic')
app.get('/projects/:projectId/epics', authenticateToken, async (req, res) => {
  try {
    const epics = await dbAsync.all(`
      SELECT i.*, u.username AS assigned_username,
        (SELECT COUNT(*) FROM roadmap_issues c WHERE c.epic_id = i.id) AS child_count,
        (SELECT COUNT(*) FROM roadmap_issues c WHERE c.epic_id = i.id AND c.status = 'done') AS done_count,
        (SELECT SUM(COALESCE(c.story_points, 0)) FROM roadmap_issues c WHERE c.epic_id = i.id) AS total_points,
        (SELECT SUM(COALESCE(c.story_points, 0)) FROM roadmap_issues c WHERE c.epic_id = i.id AND c.status = 'done') AS done_points
      FROM roadmap_issues i
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.project_id = ? AND i.issue_type = 'epic'
      ORDER BY i.created_at DESC
    `, [req.params.projectId]);
    for (const e of epics) {
      e.labels = typeof e.labels === 'string' ? JSON.parse(e.labels) : (e.labels || []);
      e.progress = e.child_count > 0 ? Math.round(((e.done_count || 0) / e.child_count) * 100) : 0;
    }
    res.json(epics);
  } catch (error) {
    console.error('[ROADMAP] Error fetching epics:', error);
    res.status(500).json({ error: 'Error al obtener epics' });
  }
});

// ========================================
// ADMIN: ROADMAP ACCESS MANAGEMENT
// ========================================

// GET /admin/access/me — check my own access level (MUST be before /admin/access to avoid route conflict)
app.get('/admin/access/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({ access_level: 'admin', can_create_projects: true, is_admin: true });
    }
    const access = await dbAsync.get('SELECT * FROM roadmap_user_access WHERE user_id = ?', [req.user.id]);
    if (!access) {
      return res.json({ access_level: 'member', can_create_projects: true, is_admin: false });
    }
    res.json({ ...access, is_admin: false });
  } catch (error) {
    // If table doesn't exist or any error, return safe defaults
    console.warn('[ROADMAP] Error fetching my access:', error.message);
    res.json({ access_level: 'member', can_create_projects: true, is_admin: false });
  }
});

// GET /admin/access — list all users with their roadmap access levels (admin only)
app.get('/admin/access', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const users = await dbAsync.all(`
      SELECT u.id, u.username, COALESCE(u.microsoft_email, '') AS email, u.role,
             COALESCE(ra.access_level, 'member') AS access_level,
             COALESCE(ra.can_create_projects, true) AS can_create_projects,
             ra.granted_by, ra.granted_at,
             g.username AS granted_by_username
      FROM users u
      LEFT JOIN roadmap_user_access ra ON u.id = ra.user_id
      LEFT JOIN users g ON ra.granted_by = g.id
      ORDER BY u.username ASC
    `);
    res.json(users);
  } catch (error) {
    console.error('[ROADMAP] Error fetching access list:', error);
    res.status(500).json({ error: 'Error al obtener accesos' });
  }
});

// PUT /admin/access/bulk — set access for multiple users at once (admin only) — MUST be before :userId
app.put('/admin/access/bulk', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const { users } = req.body; // [{ user_id, access_level, can_create_projects }]
    if (!Array.isArray(users)) return res.status(400).json({ error: 'Se requiere array de users' });
    for (const u of users) {
      await dbAsync.run(`
        INSERT INTO roadmap_user_access (user_id, access_level, can_create_projects, granted_by, granted_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          access_level = EXCLUDED.access_level,
          can_create_projects = EXCLUDED.can_create_projects,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [u.user_id, u.access_level || 'member', u.can_create_projects || false, req.user.id]);
    }
    res.json({ success: true, updated: users.length });
  } catch (error) {
    console.error('[ROADMAP] Error bulk access:', error);
    res.status(500).json({ error: 'Error al configurar accesos masivos' });
  }
});

// PUT /admin/access/:userId — set access level for a user (admin only)
app.put('/admin/access/:userId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const { access_level, can_create_projects } = req.body;
    const validLevels = ['none', 'viewer', 'member', 'manager', 'admin'];
    if (access_level && !validLevels.includes(access_level)) {
      return res.status(400).json({ error: 'Nivel de acceso inválido' });
    }
    await dbAsync.run(`
      INSERT INTO roadmap_user_access (user_id, access_level, can_create_projects, granted_by, granted_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        access_level = EXCLUDED.access_level,
        can_create_projects = EXCLUDED.can_create_projects,
        granted_by = EXCLUDED.granted_by,
        granted_at = CURRENT_TIMESTAMP
    `, [req.params.userId, access_level || 'member', can_create_projects || false, req.user.id]);
    
    const updated = await dbAsync.get(`
      SELECT u.id, u.username, COALESCE(u.microsoft_email, '') AS email, COALESCE(ra.access_level, 'member') AS access_level,
             COALESCE(ra.can_create_projects, true) AS can_create_projects
      FROM users u LEFT JOIN roadmap_user_access ra ON u.id = ra.user_id
      WHERE u.id = ?
    `, [req.params.userId]);
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('[ROADMAP] Error setting access:', error);
    res.status(500).json({ error: 'Error al configurar acceso' });
  }
});

// ========================================
// CALENDAR-ROADMAP SYNC
// ========================================

// POST /calendar-links — link a calendar event to a roadmap issue
app.post('/calendar-links', authenticateToken, checkRoadmapAccess('member'), async (req, res) => {
  try {
    const { calendar_event_id, issue_id, link_direction } = req.body;
    if (!calendar_event_id || !issue_id) return res.status(400).json({ error: 'calendar_event_id e issue_id requeridos' });
    
    const issue = await dbAsync.get('SELECT id, title, issue_key, project_id FROM roadmap_issues WHERE id = ?', [issue_id]);
    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });

    await dbAsync.run(`
      INSERT INTO roadmap_calendar_links (calendar_event_id, issue_id, linked_by, link_direction)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (calendar_event_id, issue_id) DO UPDATE SET
        link_direction = EXCLUDED.link_direction
    `, [calendar_event_id, issue_id, req.user.id, link_direction || 'both']);

    // Also update the issue's calendar_event_id
    await dbAsync.run('UPDATE roadmap_issues SET calendar_event_id = ? WHERE id = ?', [calendar_event_id, issue_id]);

    res.status(201).json({ success: true, issue_key: issue.issue_key, issue_title: issue.title });
  } catch (error) {
    console.error('[ROADMAP] Error linking calendar:', error);
    res.status(500).json({ error: 'Error al vincular con calendario' });
  }
});

// GET /calendar-links/:eventId — get roadmap issues linked to a calendar event
app.get('/calendar-links/:eventId', authenticateToken, async (req, res) => {
  try {
    const links = await dbAsync.all(`
      SELECT cl.*, i.title, i.issue_key, i.status, i.priority, i.issue_type,
             p.name AS project_name, u.username AS linked_by_username
      FROM roadmap_calendar_links cl
      JOIN roadmap_issues i ON cl.issue_id = i.id
      JOIN roadmap_projects p ON i.project_id = p.id
      LEFT JOIN users u ON cl.linked_by = u.id
      WHERE cl.calendar_event_id = ?
    `, [req.params.eventId]);
    res.json(links);
  } catch (error) {
    console.error('[ROADMAP] Error fetching calendar links:', error);
    res.status(500).json({ error: 'Error al obtener vínculos' });
  }
});

// GET /calendar-links — get all links (for calendar overlay)
app.get('/calendar-links', authenticateToken, async (req, res) => {
  try {
    const links = await dbAsync.all(`
      SELECT cl.*, i.title, i.issue_key, i.status, i.priority, i.due_date,
             i.start_date, i.issue_type, i.story_points,
             p.name AS project_name, p.id AS project_id
      FROM roadmap_calendar_links cl
      JOIN roadmap_issues i ON cl.issue_id = i.id
      JOIN roadmap_projects p ON i.project_id = p.id
      ORDER BY cl.created_at DESC
    `);
    res.json(links);
  } catch (error) {
    console.error('[ROADMAP] Error fetching all calendar links:', error);
    res.status(500).json({ error: 'Error al obtener vínculos' });
  }
});

// DELETE /calendar-links/:id — remove a link
app.delete('/calendar-links/:id', authenticateToken, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM roadmap_calendar_links WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[ROADMAP] Error deleting link:', error);
    res.status(500).json({ error: 'Error al eliminar vínculo' });
  }
});

// POST /calendar-to-issue — create a roadmap issue from a calendar event
app.post('/calendar-to-issue', authenticateToken, checkRoadmapAccess('member'), async (req, res) => {
  try {
    const { project_id, column_id, title, description, due_date, start_date, calendar_event_id, priority } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'project_id y title requeridos' });

    // Get project for issue key
    const project = await dbAsync.get('SELECT * FROM roadmap_projects WHERE id = ?', [project_id]);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const newCounter = (project.issue_counter || 0) + 1;
    await dbAsync.run('UPDATE roadmap_projects SET issue_counter = ? WHERE id = ?', [newCounter, project_id]);
    const issueKey = `${project.project_key || 'PRJ'}-${newCounter}`;

    // Get target column (if not specified, use first non-backlog column)
    let targetColumnId = column_id;
    if (!targetColumnId) {
      const col = await dbAsync.get('SELECT id FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC LIMIT 1 OFFSET 1', [project_id]);
      targetColumnId = col?.id || null;
      if (!targetColumnId) {
        const firstCol = await dbAsync.get('SELECT id FROM roadmap_columns WHERE project_id = ? ORDER BY position ASC LIMIT 1', [project_id]);
        targetColumnId = firstCol?.id;
      }
    }

    const result = await dbAsync.run(`
      INSERT INTO roadmap_issues (project_id, column_id, title, description, issue_key, issue_type, status, priority,
                                  created_by, due_date, start_date, calendar_event_id, position)
      VALUES (?, ?, ?, ?, ?, 'task', 'todo', ?, ?, ?, ?, ?, 0)
    `, [project_id, targetColumnId, title, description || '', issueKey, priority || 'medium',
        req.user.id, due_date || null, start_date || null, calendar_event_id || null]);

    const issueId = result.lastID || (await dbAsync.get('SELECT id FROM roadmap_issues WHERE issue_key = ?', [issueKey]))?.id;

    // Create calendar link if event ID provided
    if (calendar_event_id && issueId) {
      await dbAsync.run(`
        INSERT INTO roadmap_calendar_links (calendar_event_id, issue_id, linked_by, link_direction)
        VALUES (?, ?, ?, 'calendar_to_roadmap')
        ON CONFLICT (calendar_event_id, issue_id) DO NOTHING
      `, [calendar_event_id, issueId, req.user.id]);
    }

    await logActivity(project_id, issueId, req.user.id, 'issue_created_from_calendar', { title, issueKey });

    const issue = await dbAsync.get(`
      SELECT i.*, u.username AS assigned_username
      FROM roadmap_issues i LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.id = ?
    `, [issueId]);

    res.status(201).json(issue);
  } catch (error) {
    console.error('[ROADMAP] Error creating issue from calendar:', error);
    res.status(500).json({ error: 'Error al crear tarea desde calendario' });
  }
});

// POST /issue-to-calendar — create a calendar event from a roadmap issue
app.post('/issue-to-calendar', authenticateToken, checkRoadmapAccess('member'), async (req, res) => {
  try {
    const { issue_id } = req.body;
    if (!issue_id) return res.status(400).json({ error: 'issue_id requerido' });

    const issue = await dbAsync.get(`
      SELECT i.*, p.name AS project_name FROM roadmap_issues i
      JOIN roadmap_projects p ON i.project_id = p.id WHERE i.id = ?
    `, [issue_id]);
    if (!issue) return res.status(404).json({ error: 'Issue no encontrada' });

    // Return event data that the frontend can use to create a calendar event
    const eventData = {
      title: `[${issue.issue_key}] ${issue.title}`,
      description: issue.description || '',
      start: issue.start_date || issue.due_date || new Date().toISOString().split('T')[0],
      end: issue.due_date || issue.start_date || new Date().toISOString().split('T')[0],
      allDay: true,
      extendedProps: {
        roadmap_issue_id: issue.id,
        roadmap_issue_key: issue.issue_key,
        roadmap_project: issue.project_name,
        priority: issue.priority,
        status: issue.status
      }
    };
    res.json(eventData);
  } catch (error) {
    console.error('[ROADMAP] Error preparing calendar event:', error);
    res.status(500).json({ error: 'Error al preparar evento' });
  }
});

// ========================================
// HEALTH
// ========================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'roadmap-service' });
});

// ========================================
// START
// ========================================
app.listen(PORT, () => {
  console.log(`[ROADMAP] Service running on port ${PORT}`);
});

module.exports = app;
