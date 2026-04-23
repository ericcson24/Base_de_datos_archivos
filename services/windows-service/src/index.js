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
const SYNC_STATE_DIR = process.env.SYNC_STATE_DIR || '/app/sync-state';
try { fs.mkdirSync(SYNC_STATE_DIR, { recursive: true }); } catch (_) {}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

const SYSTEM_PROFILES = new Set([
  'public', 'default', 'default user', 'all users',
  'defaultapppool', 'desktop.ini', '.net v4.5', '.net v4.5 classic'
]);

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
      const profilePath = path.join(HOST_USERS_DIR, name);
      const hasDesktop = fs.existsSync(path.join(profilePath, 'Desktop'));
      const hasDocuments = fs.existsSync(path.join(profilePath, 'Documents'));
      const hasDownloads = fs.existsSync(path.join(profilePath, 'Downloads'));
      if (hasDesktop || hasDocuments || hasDownloads) {
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
  '.vs', '.idea', 'obj', 'bin', '.gradle', 'target',
  'build', 'dist', '.next', '.nuxt', 'Datos', 'database_storage',
  'OneDrive', 'OneDriveTemp', 'Dropbox', 'Google Drive',
  'Application Data', 'Local Settings', 'Cookies',
  'Program Files', 'Program Files (x86)', 'Windows',
  'Base_de_datos_archivos', 'Wired_driver_31'
]);

function countFiles(dir, depth = 0) {
  if (depth > 3) return 0;
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
  }
  return results;
}

const MAX_FILES_PER_SYNC = 500;
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const fsPromises = require('fs').promises;

async function walkFiles(root, basePath = '', depth = 0, out = {}) {
  if (depth > 4) return out;
  let entries;
  try { entries = await fsPromises.readdir(root, { withFileTypes: true }); } catch (_) { return out; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.toLowerCase() === 'desktop.ini' || entry.name.startsWith('.')) continue;
    const rel = basePath ? `${basePath}/${entry.name}` : entry.name;
    const full = path.join(root, entry.name);
    try {
      if (entry.isDirectory()) {
        await walkFiles(full, rel, depth + 1, out);
      } else if (entry.isFile()) {
        const st = await fsPromises.stat(full);
        if (st.size > MAX_FILE_SIZE_BYTES) continue;
        out[rel] = { size: st.size, mtimeMs: st.mtimeMs };
      }
    } catch (_) {}
  }
  return out;
}

function loadManifest(linkId, folderKey) {
  try {
    const p = path.join(SYNC_STATE_DIR, `${linkId}_${folderKey}.json`);
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) { return {}; }
}

function saveManifest(linkId, folderKey, data) {
  try {
    const p = path.join(SYNC_STATE_DIR, `${linkId}_${folderKey}.json`);
    fs.writeFileSync(p, JSON.stringify(data));
  } catch (e) {
    console.warn('[sync] Could not save manifest:', e.message);
  }
}

async function removeEmptyDirs(root) {
  try {
    const entries = await fsPromises.readdir(root, { withFileTypes: true });
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name.startsWith('.')) continue;
      if (e.isDirectory()) {
        const sub = path.join(root, e.name);
        await removeEmptyDirs(sub);
        try {
          const remaining = await fsPromises.readdir(sub);
          if (remaining.length === 0) await fsPromises.rmdir(sub);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

async function syncFolderBidirectional(srcWin, srcCloud, linkId, folderKey, counter) {
  const stats = { copiedToCloud: 0, copiedToWin: 0, deletedFromCloud: 0, deletedFromWin: 0 };

  try { await fsPromises.mkdir(srcWin, { recursive: true }); } catch (_) {}
  try { await fsPromises.mkdir(srcCloud, { recursive: true }); } catch (_) {}

  const [winFiles, cloudFiles] = await Promise.all([
    walkFiles(srcWin),
    walkFiles(srcCloud)
  ]);
  const manifest = loadManifest(linkId, folderKey);
  const newManifest = {};

  const allPaths = new Set([...Object.keys(winFiles), ...Object.keys(cloudFiles)]);

  for (const rel of allPaths) {
    if (counter.copied >= MAX_FILES_PER_SYNC) break;
    const w = winFiles[rel];
    const c = cloudFiles[rel];
    const prev = manifest[rel];
    const winFull = path.join(srcWin, rel);
    const cloudFull = path.join(srcCloud, rel);

    try {
      if (w && c) {
        // Exists on both: newer wins
        if (Math.abs(w.mtimeMs - c.mtimeMs) > 1500 || w.size !== c.size) {
          if (w.mtimeMs >= c.mtimeMs) {
            await fsPromises.mkdir(path.dirname(cloudFull), { recursive: true });
            await fsPromises.copyFile(winFull, cloudFull);
            const srcT = new Date(w.mtimeMs);
            try { await fsPromises.utimes(cloudFull, srcT, srcT); } catch (_) {}
            stats.copiedToCloud++;
            counter.copied++;
          } else {
            await fsPromises.mkdir(path.dirname(winFull), { recursive: true });
            await fsPromises.copyFile(cloudFull, winFull);
            const srcT = new Date(c.mtimeMs);
            try { await fsPromises.utimes(winFull, srcT, srcT); } catch (_) {}
            stats.copiedToWin++;
            counter.copied++;
          }
        }
        const nw = await fsPromises.stat(winFull).catch(() => null);
        const nc = await fsPromises.stat(cloudFull).catch(() => null);
        newManifest[rel] = { size: (nw || nc).size, mtimeMs: Math.max(nw?.mtimeMs || 0, nc?.mtimeMs || 0) };
      } else if (w && !c) {
        // On Windows only
        if (prev) {
          // Was there before → cloud deleted it → delete from Windows
          await fsPromises.unlink(winFull);
          stats.deletedFromWin++;
        } else {
          // New on Windows → copy to cloud
          await fsPromises.mkdir(path.dirname(cloudFull), { recursive: true });
          await fsPromises.copyFile(winFull, cloudFull);
          const srcT = new Date(w.mtimeMs);
          try { await fsPromises.utimes(cloudFull, srcT, srcT); } catch (_) {}
          stats.copiedToCloud++;
          counter.copied++;
          newManifest[rel] = { size: w.size, mtimeMs: w.mtimeMs };
        }
      } else if (!w && c) {
        // On cloud only
        if (prev) {
          // Was there before → Windows deleted it → delete from cloud
          await fsPromises.unlink(cloudFull);
          stats.deletedFromCloud++;
        } else {
          // New in cloud → copy to Windows
          await fsPromises.mkdir(path.dirname(winFull), { recursive: true });
          await fsPromises.copyFile(cloudFull, winFull);
          const srcT = new Date(c.mtimeMs);
          try { await fsPromises.utimes(winFull, srcT, srcT); } catch (_) {}
          stats.copiedToWin++;
          counter.copied++;
          newManifest[rel] = { size: c.size, mtimeMs: c.mtimeMs };
        }
      }
    } catch (err) {
      console.warn(`[sync] Error on "${rel}":`, err.message);
    }
  }

  await removeEmptyDirs(srcWin);
  await removeEmptyDirs(srcCloud);

  saveManifest(linkId, folderKey, newManifest);
  return stats;
}


app.get('/', (req, res) => res.send('Windows Integration Service running'));

app.get('/api/windows/users', requireAdmin, (req, res) => {
  try {
    const windowsUsers = detectWindowsUsers();
    res.json({ success: true, users: windowsUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/windows/users/:username/folders', requireAdmin, (req, res) => {
  try {
    const { username } = req.params;
    const { folder, subpath } = req.query;
    
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
        const cleanSub = path.normalize(subpath).replace(/^(\.\.(\/|\\|$))+/, '');
        targetPath = path.join(targetPath, cleanSub);
      }
      
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

app.post('/api/windows/link', requireAdmin, async (req, res) => {
  try {
    const { cloud_username, windows_username, sync_desktop = true, sync_documents = true, sync_downloads = true } = req.body;
    
    if (!cloud_username || !windows_username) {
      return res.status(400).json({ success: false, message: 'Both cloud and windows username required' });
    }

    const profilePath = path.join(HOST_USERS_DIR, windows_username);
    if (!fs.existsSync(profilePath)) {
      return res.status(400).json({ success: false, message: `Windows profile "${windows_username}" not found` });
    }

    const cloudUser = await dbAsync.get("SELECT id FROM users WHERE username = ?", [cloud_username]);
    if (!cloudUser) {
      return res.status(400).json({ success: false, message: `Cloud user "${cloud_username}" not found` });
    }

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

app.delete('/api/windows/link/:id', requireAdmin, async (req, res) => {
  try {
    await dbAsync.run("DELETE FROM windows_user_links WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Unlinked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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
        const existing = await dbAsync.get("SELECT id FROM users WHERE username = ?", [winUser]);
        if (existing) {
          skipped.push(winUser);
          continue;
        }
        
        const result = await dbAsync.run(
          "INSERT INTO users (username, role, created_at) VALUES (?, ?, ?)",
          [winUser, defaultRole, new Date().toISOString()]
        );
        const userId = result.lastID;
        
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await dbAsync.run(
          "INSERT INTO user_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)",
          [userId, hashedPassword, new Date().toISOString()]
        );
        
        if (autoLink) {
          const profilePath = path.join(HOST_USERS_DIR, winUser);
          if (fs.existsSync(profilePath)) {
            try {
              await dbAsync.run(
                "INSERT INTO windows_user_links (cloud_username, windows_username) VALUES (?, ?)",
                [winUser, winUser]
              );
            } catch (_) {
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

async function syncLinkedUser(link) {
  const result = {
    desktop: { copiedToCloud: 0, copiedToWin: 0, deletedFromCloud: 0, deletedFromWin: 0 },
    documents: { copiedToCloud: 0, copiedToWin: 0, deletedFromCloud: 0, deletedFromWin: 0 },
    downloads: { copiedToCloud: 0, copiedToWin: 0, deletedFromCloud: 0, deletedFromWin: 0 },
    total: 0
  };
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
    const winDir = path.join(HOST_USERS_DIR, link.windows_username, config.winName);
    const cloudDir = path.join(userUploadDir, config.cloudName);

    const tStart = Date.now();
    try {
      console.log(`[sync] [${link.cloud_username}/${key}] start (win=${winDir})`);
      const s = await syncFolderBidirectional(winDir, cloudDir, link.id, key, counter);
      result[key] = s;
      result.total += s.copiedToCloud + s.copiedToWin + s.deletedFromCloud + s.deletedFromWin;
      console.log(`[sync] [${link.cloud_username}/${key}] done in ${Date.now()-tStart}ms ${JSON.stringify(s)}`);
    } catch (err) {
      console.warn(`[sync] Error syncing ${key} for ${link.cloud_username}:`, err.message);
    }
  }

  return result;
}

let autoSyncInterval = null;
let autoSyncRunning = false;

async function runAutoSync() {
  if (autoSyncRunning) {
    console.log('[auto-sync] Previous run still in progress, skipping tick');
    return;
  }
  autoSyncRunning = true;
  const tickStart = Date.now();
  console.log(`[auto-sync] Tick start ${new Date().toISOString()}`);
  try {
    const links = await dbAsync.all("SELECT * FROM windows_user_links WHERE sync_enabled = true");
    console.log(`[auto-sync] Found ${links.length} enabled links`);
    if (links.length === 0) return;

    await Promise.all(links.map(async (link) => {
      const linkStart = Date.now();
      try {
        console.log(`[auto-sync] -> link ${link.id} (${link.cloud_username} <-> ${link.windows_username})`);
        const result = await Promise.race([
          syncLinkedUser(link),
          new Promise((_, reject) => setTimeout(() => reject(new Error('sync timeout 60s')), 60000))
        ]);
        const elapsed = Date.now() - linkStart;
        console.log(`[auto-sync] <- link ${link.id} done in ${elapsed}ms, total=${result.total}, desk=${JSON.stringify(result.desktop)} docs=${JSON.stringify(result.documents)} dl=${JSON.stringify(result.downloads)}`);
        if (result.total > 0) {
          await dbAsync.run("UPDATE windows_user_links SET last_sync = ? WHERE id = ?", [new Date().toISOString(), link.id]);
        }
      } catch (e) {
        console.error(`[auto-sync] Error for link ${link.id}/${link.cloud_username} after ${Date.now()-linkStart}ms:`, e.message);
      }
    }));
  } catch (err) {
    console.error('[auto-sync] Outer error:', err.stack || err.message);
  } finally {
    autoSyncRunning = false;
    console.log(`[auto-sync] Tick done in ${Date.now() - tickStart}ms`);
  }
}

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[windows-service] Running on port ${PORT}`);
    console.log(`[windows-service] HOST_USERS_DIR=${HOST_USERS_DIR}, UPLOAD_DIR=${UPLOAD_DIR}, SYNC_STATE_DIR=${SYNC_STATE_DIR}`);
    
    autoSyncInterval = setInterval(runAutoSync, 15 * 1000);
    setTimeout(runAutoSync, 5000);
  });
}).catch(err => {
  console.error('[windows-service] Failed to start:', err);
  process.exit(1);
});
