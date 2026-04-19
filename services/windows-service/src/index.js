require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { dbAsync, initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5010;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const HOST_USERS_DIR = process.env.HOST_USERS_DIR || '/host-users';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Auth middleware ──
const requireAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const userData = jwt.verify(token, JWT_SECRET);
    if (userData.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin required' });
    req.user = userData;
    next();
  } catch (e) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Folders to ignore when scanning C:\Users ──
const SYSTEM_PROFILES = new Set([
  'public', 'default', 'default user', 'all users',
  'defaultapppool', 'desktop.ini', '.net v4.5', '.net v4.5 classic'
]);

// ── Helper: detect Windows user profiles from mounted dir ──
function detectWindowsUsers() {
  try {
    if (!fs.existsSync(HOST_USERS_DIR)) {
      console.warn('[windows-service] Host users dir not found:', HOST_USERS_DIR);
      return [];
    }
    const entries = fs.readdirSync(HOST_USERS_DIR, { withFileTypes: true });
    const users = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (SYSTEM_PROFILES.has(name.toLowerCase())) continue;
      // Check if it looks like a real user profile (has Desktop or NTUSER.DAT)
      const profilePath = path.join(HOST_USERS_DIR, name);
      const hasDesktop = fs.existsSync(path.join(profilePath, 'Desktop'));
      const hasDocuments = fs.existsSync(path.join(profilePath, 'Documents'));
      const hasDownloads = fs.existsSync(path.join(profilePath, 'Downloads'));
      if (hasDesktop || hasDocuments || hasDownloads) {
        // Gather folder sizes
        const folders = [];
        if (hasDesktop) folders.push({ type: 'desktop', path: path.join(profilePath, 'Desktop'), count: countFiles(path.join(profilePath, 'Desktop')) });
        if (hasDocuments) folders.push({ type: 'documents', path: path.join(profilePath, 'Documents'), count: countFiles(path.join(profilePath, 'Documents')) });
        if (hasDownloads) folders.push({ type: 'downloads', path: path.join(profilePath, 'Downloads'), count: countFiles(path.join(profilePath, 'Downloads')) });
        users.push({
          username: name,
          profilePath,
          folders,
          hasDesktop,
          hasDocuments,
          hasDownloads
        });
      }
    }
    return users;
  } catch (err) {
    console.error('[windows-service] Error detecting users:', err.message);
    return [];
  }
}

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '__pycache__', '.venv', 'venv',
  '.cache', '.npm', '.nuget', 'AppData', '$Recycle.Bin',
  '.vs', '.idea', 'obj', 'bin', '.gradle', 'target'
]);

function countFiles(dir, depth = 0) {
  if (depth > 3) return 0; // Limit depth for speed
  try {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile()) count++;
      else if (e.isDirectory() && !SKIP_DIRS.has(e.name)) {
        try { count += countFiles(path.join(dir, e.name), depth + 1); } catch (_) {}
      }
    }
    return count;
  } catch (_) { return 0; }
}

// ── Helper: recursively list files ──
function listFilesRecursive(dir, basePath = '') {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push({ name: entry.name, type: 'folder', path: relativePath, children: listFilesRecursive(fullPath, relativePath) });
      } else {
        try {
          const stat = fs.statSync(fullPath);
          results.push({ name: entry.name, type: 'file', path: relativePath, size: stat.size, modified: stat.mtime });
        } catch (_) {
          results.push({ name: entry.name, type: 'file', path: relativePath, size: 0 });
        }
      }
    }
  } catch (err) {
    // Permission denied or similar
  }
  return results;
}

// ── Helper: copy directory recursively ──
// ── Helper: copy directory recursively (async, non-blocking) ──
const MAX_FILES_PER_SYNC = 200;
const fsPromises = require('fs').promises;

async function copyDirRecursiveAsync(src, dest, counter = { copied: 0 }, depth = 0) {
  if (depth > 5) return 0;
  try { await fsPromises.mkdir(dest, { recursive: true }); } catch (_) {}
  let entries;
  try { entries = await fsPromises.readdir(src, { withFileTypes: true }); } catch (_) { return 0; }
  let copied = 0;
  for (const entry of entries) {
    if (counter.copied >= MAX_FILES_PER_SYNC) break;
    if (SKIP_DIRS.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    try {
      if (entry.isDirectory()) {
        copied += await copyDirRecursiveAsync(srcPath, destPath, counter, depth + 1);
      } else {
        let needCopy = false;
        try {
          const destStat = await fsPromises.stat(destPath);
          const srcStat = await fsPromises.stat(srcPath);
          if (srcStat.mtime > destStat.mtime || srcStat.size !== destStat.size) needCopy = true;
        } catch (_) {
          needCopy = true; // dest doesn't exist
        }
        if (needCopy) {
          await fsPromises.copyFile(srcPath, destPath);
          copied++;
          counter.copied++;
        }
      }
    } catch (err) {
      // Silently skip permission errors
    }
  }
  return copied;
}

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════

app.get('/', (req, res) => res.send('Windows Integration Service running'));

// ── GET /api/windows/users - List detected Windows users ──
app.get('/api/windows/users', requireAdmin, (req, res) => {
  try {
    const windowsUsers = detectWindowsUsers();
    res.json({ success: true, users: windowsUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/windows/users/:username/folders - Browse Windows user folders ──
app.get('/api/windows/users/:username/folders', requireAdmin, (req, res) => {
  try {
    const { username } = req.params;
    const { folder, subpath } = req.query; // folder = desktop|documents|downloads
    
    // Validate: no path traversal
    if (username.includes('..') || username.includes('/') || username.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid username' });
    }
    
    const profilePath = path.join(HOST_USERS_DIR, username);
    if (!fs.existsSync(profilePath)) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const folderMap = { desktop: 'Desktop', documents: 'Documents', downloads: 'Downloads' };
    
    if (folder && folderMap[folder]) {
      let targetPath = path.join(profilePath, folderMap[folder]);
      if (subpath) {
        // Validate subpath
        const cleanSub = path.normalize(subpath).replace(/^(\.\.(\/|\\|$))+/, '');
        targetPath = path.join(targetPath, cleanSub);
      }
      
      // Ensure we don't escape the profile directory
      const resolvedTarget = path.resolve(targetPath);
      const resolvedProfile = path.resolve(profilePath);
      if (!resolvedTarget.startsWith(resolvedProfile)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }
      const files = listFilesRecursive(targetPath);
      res.json({ success: true, folder: folder, files });
    } else {
      // Return all available folders
      const folders = {};
      for (const [key, name] of Object.entries(folderMap)) {
        const p = path.join(profilePath, name);
        if (fs.existsSync(p)) {
          folders[key] = { exists: true, count: countFiles(p) };
        }
      }
      res.json({ success: true, folders });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/windows/links - Get all linked accounts ──
app.get('/api/windows/links', requireAdmin, async (req, res) => {
  try {
    const links = await dbAsync.all(`
      SELECT wl.*, u.id as user_id, u.role 
      FROM windows_user_links wl
      LEFT JOIN users u ON u.username = wl.cloud_username
      ORDER BY wl.linked_at DESC
    `);
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/windows/link - Link a cloud user to a Windows user ──
app.post('/api/windows/link', requireAdmin, async (req, res) => {
  try {
    const { cloud_username, windows_username, sync_desktop = true, sync_documents = true, sync_downloads = true } = req.body;
    
    if (!cloud_username || !windows_username) {
      return res.status(400).json({ success: false, message: 'Both cloud and windows username required' });
    }

    // Validate Windows user exists
    const profilePath = path.join(HOST_USERS_DIR, windows_username);
    if (!fs.existsSync(profilePath)) {
      return res.status(400).json({ success: false, message: `Windows profile "${windows_username}" not found` });
    }

    // Validate cloud user exists
    const cloudUser = await dbAsync.get("SELECT id FROM users WHERE username = ?", [cloud_username]);
    if (!cloudUser) {
      return res.status(400).json({ success: false, message: `Cloud user "${cloud_username}" not found` });
    }

    // Check if either is already linked
    const existingCloud = await dbAsync.get("SELECT id FROM windows_user_links WHERE cloud_username = ?", [cloud_username]);
    if (existingCloud) {
      return res.status(400).json({ success: false, message: `Cloud user "${cloud_username}" already linked` });
    }
    const existingWin = await dbAsync.get("SELECT id FROM windows_user_links WHERE windows_username = ?", [windows_username]);
    if (existingWin) {
      return res.status(400).json({ success: false, message: `Windows user "${windows_username}" already linked` });
    }

    await dbAsync.run(
      `INSERT INTO windows_user_links (cloud_username, windows_username, sync_desktop, sync_documents, sync_downloads) 
       VALUES (?, ?, ?, ?, ?)`,
      [cloud_username, windows_username, sync_desktop, sync_documents, sync_downloads]
    );

    console.log(`[windows-service] Linked: ${cloud_username} ↔ ${windows_username}`);
    res.json({ success: true, message: 'Users linked successfully' });
  } catch (err) {
    console.error('[windows-service] Link error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/windows/link/:id - Unlink ──
app.delete('/api/windows/link/:id', requireAdmin, async (req, res) => {
  try {
    await dbAsync.run("DELETE FROM windows_user_links WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Unlinked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/windows/link/:id - Update sync settings ──
app.put('/api/windows/link/:id', requireAdmin, async (req, res) => {
  try {
    const { sync_enabled, sync_desktop, sync_documents, sync_downloads } = req.body;
    const updates = [];
    const params = [];
    
    if (sync_enabled !== undefined) { updates.push('sync_enabled = ?'); params.push(sync_enabled); }
    if (sync_desktop !== undefined) { updates.push('sync_desktop = ?'); params.push(sync_desktop); }
    if (sync_documents !== undefined) { updates.push('sync_documents = ?'); params.push(sync_documents); }
    if (sync_downloads !== undefined) { updates.push('sync_downloads = ?'); params.push(sync_downloads); }
    
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    
    params.push(req.params.id);
    await dbAsync.run(`UPDATE windows_user_links SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/windows/sync/:id - Trigger manual sync for a linked account ──
app.post('/api/windows/sync/:id', requireAdmin, async (req, res) => {
  try {
    const link = await dbAsync.get("SELECT * FROM windows_user_links WHERE id = ?", [req.params.id]);
    if (!link) return res.status(404).json({ success: false, message: 'Link not found' });
    
    const result = await syncLinkedUser(link);
    
    await dbAsync.run("UPDATE windows_user_links SET last_sync = ? WHERE id = ?", [new Date().toISOString(), link.id]);
    
    res.json({ success: true, message: `Synced ${result.total} files`, details: result });
  } catch (err) {
    console.error('[windows-service] Sync error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/windows/sync-all - Sync all linked accounts ──
app.post('/api/windows/sync-all', requireAdmin, async (req, res) => {
  try {
    const links = await dbAsync.all("SELECT * FROM windows_user_links WHERE sync_enabled = true");
    let totalFiles = 0;
    const results = [];
    
    for (const link of links) {
      const result = await syncLinkedUser(link);
      totalFiles += result.total;
      results.push({ cloud_username: link.cloud_username, ...result });
      await dbAsync.run("UPDATE windows_user_links SET last_sync = ? WHERE id = ?", [new Date().toISOString(), link.id]);
    }
    
    res.json({ success: true, message: `Synced ${totalFiles} files across ${links.length} accounts`, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/windows/auto-create - Auto-create cloud users from Windows users ──
app.post('/api/windows/auto-create', requireAdmin, async (req, res) => {
  try {
    const { users: selectedUsers, defaultPassword, defaultRole = 'user', autoLink = true } = req.body;
    
    if (!selectedUsers || !Array.isArray(selectedUsers) || selectedUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected' });
    }
    if (!defaultPassword) {
      return res.status(400).json({ success: false, message: 'Default password required' });
    }
    
    const bcrypt = require('bcrypt');
    const created = [];
    const skipped = [];
    const errors = [];
    
    for (const winUser of selectedUsers) {
      try {
        // Check if cloud user already exists
        const existing = await dbAsync.get("SELECT id FROM users WHERE username = ?", [winUser]);
        if (existing) {
          skipped.push(winUser);
          continue;
        }
        
        // Create user
        const result = await dbAsync.run(
          "INSERT INTO users (username, role, created_at) VALUES (?, ?, ?)",
          [winUser, defaultRole, new Date().toISOString()]
        );
        const userId = result.lastID;
        
        // Create credentials
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await dbAsync.run(
          "INSERT INTO user_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)",
          [userId, hashedPassword, new Date().toISOString()]
        );
        
        // Auto-link if requested
        if (autoLink) {
          const profilePath = path.join(HOST_USERS_DIR, winUser);
          if (fs.existsSync(profilePath)) {
            try {
              await dbAsync.run(
                "INSERT INTO windows_user_links (cloud_username, windows_username) VALUES (?, ?)",
                [winUser, winUser]
              );
            } catch (_) {
              // Link might already exist
            }
          }
        }
        
        created.push(winUser);
      } catch (err) {
        errors.push({ username: winUser, error: err.message });
      }
    }
    
    res.json({
      success: true,
      message: `Created ${created.length} users, skipped ${skipped.length}`,
      created, skipped, errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Sync helper function ──
async function syncLinkedUser(link) {
  const result = { desktop: 0, documents: 0, downloads: 0, total: 0 };
  const userUploadDir = path.join(UPLOAD_DIR, link.cloud_username);
  
  if (!fs.existsSync(userUploadDir)) {
    fs.mkdirSync(userUploadDir, { recursive: true });
  }
  
  const folderMap = {
    desktop: { enabled: link.sync_desktop, winName: 'Desktop', cloudName: 'Escritorio' },
    documents: { enabled: link.sync_documents, winName: 'Documents', cloudName: 'Documentos' },
    downloads: { enabled: link.sync_downloads, winName: 'Downloads', cloudName: 'Descargas' }
  };
  
  const counter = { copied: 0 };
  for (const [key, config] of Object.entries(folderMap)) {
    if (!config.enabled) continue;
    const srcDir = path.join(HOST_USERS_DIR, link.windows_username, config.winName);
    const destDir = path.join(userUploadDir, config.cloudName);
    
    if (fs.existsSync(srcDir)) {
      try {
        const count = await copyDirRecursiveAsync(srcDir, destDir, counter);
        result[key] = count;
        result.total += count;
      } catch (err) {
        console.warn(`[sync] Error syncing ${key} for ${link.cloud_username}:`, err.message);
      }
    }
  }
  
  return result;
}

// ── Background auto-sync (every 5 minutes) ──
let autoSyncInterval = null;

async function runAutoSync() {
  try {
    const links = await dbAsync.all("SELECT * FROM windows_user_links WHERE sync_enabled = true");
    if (links.length === 0) return;
    
    let totalFiles = 0;
    for (const link of links) {
      const result = await syncLinkedUser(link);
      totalFiles += result.total;
      if (result.total > 0) {
        await dbAsync.run("UPDATE windows_user_links SET last_sync = ? WHERE id = ?", [new Date().toISOString(), link.id]);
      }
    }
    
    if (totalFiles > 0) {
      console.log(`[auto-sync] Synced ${totalFiles} files across ${links.length} linked accounts`);
    }
  } catch (err) {
    console.error('[auto-sync] Error:', err.message);
  }
}

// ── Start ──
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[windows-service] Running on port ${PORT}`);
    
    // Start auto-sync every 15 seconds
    autoSyncInterval = setInterval(runAutoSync, 15 * 1000);
    // Run initial sync after 10 seconds
    setTimeout(runAutoSync, 10000);
  });
}).catch(err => {
  console.error('[windows-service] Failed to start:', err);
  process.exit(1);
});
