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