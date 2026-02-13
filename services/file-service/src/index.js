require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('./database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
// const { syncDiskToDb } = require('./utils/syncDiskToDb');

const app = express();
const PORT = process.env.PORT || 5004;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fsSync.existsSync(UPLOAD_DIR)){
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initial Sync Scanning (Windows Server style)
// setTimeout(() => {
//    syncDiskToDb(UPLOAD_DIR).catch(err => console.error('Sync failed:', err));
// }, 5000); // Wait 5s for DB to be ready

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Middleware de autenticación simple
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
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

// Helper para logs
async function logAction(username, action, details) {
  try {
    const user = await dbAsync.get('SELECT id FROM users WHERE username = ?', [username]);
    const userId = user ? user.id : null;

    await dbAsync.run(
      'INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, username, action, details, '::1']
    );
  } catch (error) {
    console.error('Error registrando log de archivo:', error);
  }
}

// Configurar multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const username = req.user.username;
      const uploadPath = req.body.path || '';
      const fullPath = path.join(UPLOAD_DIR, username, uploadPath);
      
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Configuración de multer para actualización de archivos (usa carpeta temporal)
const uploadTemp = multer({ 
  dest: '/tmp/uploads',
  limits: { fileSize: 100 * 1024 * 1024 }
});

// --- Rutas ---

app.get('/', (req, res) => {
  res.send('File Service is running');
});

// Listar archivos
app.get('/list', authenticate, async (req, res) => {
  try {
    console.log(`[DEBUG] List request from ${req.user.username} for path: ${req.query.path}`);
    const username = req.user.username;
    const requestedPath = req.query.path || '';
    const owner = req.query.owner;
    
    if (requestedPath.includes('..')) {
      return res.status(400).json({ success: false, message: 'Ruta inválida' });
    }

    let targetDir;
    if (owner && owner !== username) {
       targetDir = path.join(UPLOAD_DIR, owner, requestedPath);
    } else {
       targetDir = path.join(UPLOAD_DIR, username, requestedPath);
    }
    
    console.log(`[DEBUG] Target directory: ${targetDir}`);

    // Asegurar directorio usuario
    if (!owner || owner === username) {
        try {
            await fs.access(path.join(UPLOAD_DIR, username));
        } catch (error) {
            console.log(`[DEBUG] Creating user directory: ${path.join(UPLOAD_DIR, username)}`);
            await fs.mkdir(path.join(UPLOAD_DIR, username), { recursive: true });
        }
    }

    try {
      await fs.access(targetDir);
    } catch (error) {
      console.log(`[DEBUG] Directory not found: ${targetDir}`);
      return res.status(404).json({ success: false, message: 'Directorio no encontrado' });
    }

    const items = await fs.readdir(targetDir, { withFileTypes: true });
    
    // FETCH SHARED STATUS
    let sharedPaths = new Set();
    let sharedWithMap = {}; // path -> [usernames]
    // Only check if we are viewing our own files (user is owner)
    if (!owner || owner === username) {
        try {
             const shares = await dbAsync.all('SELECT path, shared_with_username FROM shared_files WHERE owner_username = ?', [username]);
             if (shares) {
                shares.forEach(s => {
                    sharedPaths.add(s.path);
                    if (!sharedWithMap[s.path]) sharedWithMap[s.path] = [];
                    sharedWithMap[s.path].push(s.shared_with_username);
                });
             }
        } catch (e) {
             console.error('Error fetching shared status:', e);
        }
    }

    console.log(`[DEBUG] Found ${items.length} items`);
    let files = [];

    for (const item of items) {
      const fullPath = path.join(targetDir, item.name);
      const relativePath = path.join(requestedPath, item.name);
      
      // Check shared status (normalize paths)
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const winPath = relativePath.replace(/\//g, '\\');
      const isShared = sharedPaths.has(normalizedPath) || sharedPaths.has(winPath) || sharedPaths.has(relativePath);
      const sharedWith = sharedWithMap[normalizedPath] || sharedWithMap[winPath] || sharedWithMap[relativePath] || [];

      if (item.isDirectory()) {
        files.push({
          id: Buffer.from(relativePath).toString('base64'),
          name: item.name,
          type: 'folder',
          size: 0,
          modified: (await fs.stat(fullPath)).mtime,
          path: relativePath,
          shared: isShared,
          sharedWith: isShared ? sharedWith : undefined,
          owner: owner || username
        });
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          id: Buffer.from(relativePath).toString('base64'),
          name: item.name,
          type: 'file',
          size: stats.size,
          modified: stats.mtime,
          path: relativePath,
          extension: path.extname(item.name).toLowerCase(),
          shared: isShared,
          sharedWith: isShared ? sharedWith : undefined,
          owner: owner || username
        });
      }
    }

    // Filtering
    const searchQuery = req.query.search;
    if (searchQuery) {
        files = files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Include pinned shared files in the main listing (only at root level, own files view)
    if ((!requestedPath || requestedPath === '') && (!owner || owner === username)) {
      try {
        const pinnedShares = await dbAsync.all(
          'SELECT * FROM shared_files WHERE shared_with_username = ? AND pinned_to_panel = TRUE',
          [username]
        );
        if (pinnedShares && pinnedShares.length > 0) {
          for (const share of pinnedShares) {
            const fullPath = path.join(UPLOAD_DIR, share.owner_username, share.path);
            try {
              const stats = await fs.stat(fullPath);
              const idString = `shared:${share.owner_username}:${share.path}`;
              const pinnedFile = {
                id: Buffer.from(idString).toString('base64'),
                name: path.basename(share.path),
                type: stats.isDirectory() ? 'folder' : 'file',
                size: stats.size,
                modified: stats.mtime,
                path: share.path,
                extension: path.extname(share.path).toLowerCase(),
                owner: share.owner_username,
                shared: true,
                pinnedFromShared: true
              };
              // Apply search filter if active
              if (!searchQuery || pinnedFile.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                files.push(pinnedFile);
              }
            } catch (e) {
              // File might have been deleted by owner
            }
          }
        }
      } catch (e) {
        console.error('Error loading pinned shared files:', e);
      }
    }

    // Sorting
    const sortBy = req.query.sortBy;
    const order = req.query.order === 'desc' ? -1 : 1;

    if (sortBy) {
      files.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (sortBy === 'modified') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        if (sortBy === 'name' && typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    } else {
      files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
    }

    res.json({ success: true, files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, message: 'Error al listar archivos' });
  }
});

// Helper: resolve file path from base64 ID (supports own files and shared files)
async function resolveFilePath(fileId, username) {
    let decoded;
    try {
        decoded = Buffer.from(fileId, 'base64').toString();
    } catch (e) {
        return { error: 'ID inválido', status: 400 };
    }

    // Check if it's a shared file (shared:ownerUsername:path)
    if (decoded.startsWith('shared:')) {
        const parts = decoded.split(':');
        if (parts.length < 3) return { error: 'ID compartido inválido', status: 400 };
        const ownerUsername = parts[1];
        const filePath = parts.slice(2).join(':'); // path may contain colons

        // Verify the share exists in DB
        const share = await dbAsync.get(
            'SELECT * FROM shared_files WHERE owner_username = ? AND shared_with_username = ? AND path = ?',
            [ownerUsername, username, filePath]
        );
        if (!share) {
            return { error: 'No tienes acceso a este archivo compartido', status: 403 };
        }

        const fullPath = path.join(UPLOAD_DIR, ownerUsername, filePath);
        if (!fullPath.startsWith(path.join(UPLOAD_DIR, ownerUsername))) {
            return { error: 'Acceso denegado', status: 403 };
        }

        return { fullPath, filePath, ownerUsername, isShared: true };
    }

    // Own file
    const fullPath = path.join(UPLOAD_DIR, username, decoded);
    if (!fullPath.startsWith(path.join(UPLOAD_DIR, username))) {
        return { error: 'Acceso denegado', status: 403 };
    }

    return { fullPath, filePath: decoded, ownerUsername: username, isShared: false };
}

// Descargar archivo
app.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const resolved = await resolveFilePath(fileId, req.user.username);
    
    if (resolved.error) {
        return res.status(resolved.status).json({ success: false, message: resolved.error });
    }

    try {
        await fs.access(resolved.fullPath);
    } catch (e) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    res.download(resolved.fullPath);
  } catch (error) {
    console.error('Error downloading:', error);
    res.status(500).json({ success: false, message: 'Error al descargar' });
  }
});

// Crear archivo vacío
app.post('/create', authenticate, async (req, res) => {
  try {
    const { name, path: relativePath, type } = req.body;
    const username = req.user.username;
    
    if (!name) return res.status(400).json({ success: false, message: 'Nombre requerido' });

    // Agregar extensión automáticamente según el tipo si no la tiene
    let fileName = name;
    const extensionMap = {
      'word': '.docx',
      'excel': '.xlsx',
      'powerpoint': '.pptx',
      'text': '.txt'
    };

    if (type && extensionMap[type]) {
      const ext = extensionMap[type];
      if (!fileName.toLowerCase().endsWith(ext)) {
        fileName += ext;
      }
    }

    const fullPath = path.join(UPLOAD_DIR, username, relativePath || '', fileName);
    
    try {
        await fs.access(fullPath);
        return res.status(400).json({ success: false, message: 'El archivo ya existe' });
    } catch (e) {}

    await fs.writeFile(fullPath, '');
    await logAction(username, 'CREATE_FILE', `Creado archivo: ${fileName}`);

    res.json({
      success: true,
      message: 'Archivo creado',
      file: {
        name: fileName,
        path: path.join(relativePath || '', fileName),
        type: 'file',
        size: 0,
        modified: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subir archivos
app.post('/upload', authenticate, upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }
    
    const fileDetails = req.files.map(file => ({
      id: Buffer.from(path.relative(path.join(UPLOAD_DIR, req.user.username), file.path)).toString('base64'),
      name: file.originalname,
      size: file.size,
      path: path.relative(path.join(UPLOAD_DIR, req.user.username), file.path)
    }));

    // Log each file individually for "Recent Files" tracking
    for (const file of req.files) {
        // We log the relative path if possible, or just the name
        const relPath = path.relative(path.join(UPLOAD_DIR, req.user.username), file.path);
        await logAction(req.user.username, 'FILE_UPLOAD', `Subido archivo: ${relPath}`);
    }

    res.json({ success: true, files: fileDetails });
});

// Crear carpeta
app.post('/folder', authenticate, async (req, res) => {
  try {
    const { name, path: folderPath } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nombre requerido' });

    const fullPath = path.join(UPLOAD_DIR, req.user.username, folderPath || '', name);
    
    try {
        await fs.access(fullPath);
        return res.status(400).json({ success: false, message: 'Ya existe' });
    } catch (e) {}

    await fs.mkdir(fullPath, { recursive: true });
    await logAction(req.user.username, 'FOLDER_CREATE', `Creada carpeta: ${name}`);

    res.json({ success: true, message: 'Carpeta creada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar
app.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);

    if (!fullPath.startsWith(path.join(UPLOAD_DIR, req.user.username))) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
        await logAction(req.user.username, 'FOLDER_DELETE', `Eliminada carpeta: ${filePath}`);
    } else {
        await fs.unlink(fullPath);
        await logAction(req.user.username, 'FILE_DELETE', `Eliminado archivo: ${filePath}`);
    }

    res.json({ success: true, message: 'Eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Renombrar
app.put('/:fileId/rename', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);
    const newPath = path.join(path.dirname(fullPath), newName);

    await fs.rename(fullPath, newPath);
    await logAction(req.user.username, 'FILE_RENAME', `Renombrado: ${filePath} -> ${newName}`);

    res.json({ success: true, message: 'Renombrado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mover
app.post('/:fileId/move', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { destinationPath } = req.body;
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);
    const fileName = path.basename(fullPath);
    const fullDest = path.join(UPLOAD_DIR, req.user.username, destinationPath, fileName);

    await fs.rename(fullPath, fullDest);
    await logAction(req.user.username, 'FILE_MOVE', `Movido: ${filePath} -> ${destinationPath}`);

    res.json({ success: true, message: 'Movido exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Guardar contenido
app.put('/:fileId/content', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, encoding } = req.body;
    
    const resolved = await resolveFilePath(fileId, req.user.username);
    if (resolved.error) {
      return res.status(resolved.status).json({ success: false, message: resolved.error });
    }
    
    const fullPath = resolved.fullPath;

    if (encoding === 'base64') {
      const base64Data = content.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      await fs.writeFile(fullPath, Buffer.from(base64Data, 'base64'));
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }

    await logAction(req.user.username, 'FILE_EDIT', `Editado archivo: ${resolved.filePath}${resolved.isShared ? ' (compartido por ' + resolved.ownerUsername + ')' : ''}`);
    res.json({ success: true, message: 'Guardado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update complete file (replace with new file upload)
app.put('/:fileId', authenticate, uploadTemp.single('file'), async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('[PUT] File update request:', fileId, 'User:', req.user.username);
    
    if (!req.file) {
      console.log('[PUT] No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('[PUT] File received:', req.file.originalname, 'Size:', req.file.size);

    const resolved = await resolveFilePath(fileId, req.user.username);
    if (resolved.error) {
      // Clean up temp file
      try { await fs.unlink(req.file.path); } catch(e) {}
      return res.status(resolved.status).json({ success: false, message: resolved.error });
    }
    
    const fullPath = resolved.fullPath;

    // Eliminar archivo existente si existe
    try {
      await fs.unlink(fullPath);
    } catch (unlinkErr) {
      // Si no existe, no pasa nada
      if (unlinkErr.code !== 'ENOENT') {
        console.warn('Warning unlinking old file:', unlinkErr);
      }
    }

    // Copiar el archivo nuevo (no podemos usar rename entre diferentes filesystems)
    console.log('[PUT] Copying file from', req.file.path, 'to', fullPath);
    await fs.copyFile(req.file.path, fullPath);
    
    // Eliminar el archivo temporal
    await fs.unlink(req.file.path);
    console.log('[PUT] File saved successfully');

    await logAction(req.user.username, 'FILE_EDIT', `Editado archivo: ${resolved.filePath}${resolved.isShared ? ' (compartido por ' + resolved.ownerUsername + ')' : ''}`);
    res.json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Preview / Ver contenido
app.get('/preview/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const resolved = await resolveFilePath(fileId, req.user.username);
    
    if (resolved.error) {
        return res.status(resolved.status).json({ success: false, message: resolved.error });
    }

    console.log('[PREVIEW] Full path:', resolved.fullPath);

    try {
        await fs.access(resolved.fullPath);
    } catch (e) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // NOTE: FILE_OPEN logging is handled by POST /log-open from frontend
    // Do NOT log here to avoid duplicate entries (preview is also called for thumbnails, AI viewer, etc.)

    res.sendFile(resolved.fullPath, { headers: { 'Content-Disposition': 'inline' } });
  } catch (error) {
    console.error('Error previewing:', error);
    res.status(500).json({ success: false, message: 'Error al previsualizar' });
  }
});

// Log file open from frontend (for recents tracking)
app.post('/log-open', authenticate, async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'Missing fileId' });
    }
    
    const resolved = await resolveFilePath(fileId, req.user.username);
    if (resolved.error) {
      return res.status(resolved.status).json({ success: false, message: resolved.error });
    }
    
    await logAction(req.user.username, 'FILE_OPEN', `Abierto archivo: ${resolved.filePath}${resolved.isShared ? ' (compartido por ' + resolved.ownerUsername + ')' : ''}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging file open:', error);
    res.status(200).json({ success: false }); // Don't block UI
  }
});

// --- Missing Endpoints Implementation ---

// Recent files (Stub)
app.get('/recent', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get('SELECT id FROM users WHERE username = ?', [username]);
    
    if (!user) {
        return res.json({ success: true, files: [] });
    }

    // Get recent file actions from audit_logs
    // We look for CREATE_FILE, FILE_UPLOAD, FILE_EDIT, FOLDER_UPLOAD, FILE_OPEN
    const logs = await dbAsync.all(
        `SELECT details, timestamp, action FROM audit_logs 
         WHERE user_id = ? AND action IN ('CREATE_FILE', 'FILE_UPLOAD', 'FILE_EDIT', 'FOLDER_UPLOAD', 'FILE_OPEN') 
         ORDER BY timestamp DESC LIMIT 30`,
        [user.id]
    );

    const recentFiles = [];
    const processedPaths = new Set();

    for (const log of logs) {
        let filePath = '';
        let isShared = false;
        let sharedOwner = '';
        
        if (log.action === 'FILE_EDIT') {
             const match = log.details.match(/Editado archivo: (.+?)(?:\s*\(compartido por (.+)\))?$/);
             if (match) {
                 filePath = match[1].trim();
                 if (match[2]) {
                   isShared = true;
                   sharedOwner = match[2];
                 }
             }
        } else if (log.action === 'CREATE_FILE') {
             const match = log.details.match(/Creado archivo: (.+)/);
             if (match) filePath = match[1];
        } else if (log.action === 'FILE_UPLOAD') {
             const match = log.details.match(/Subido archivo: (.+)/);
             if (match) filePath = match[1];
        } else if (log.action === 'FOLDER_UPLOAD') {
             const match = log.details.match(/Subido archivo de carpeta: (.+)/);
             if (match) filePath = match[1];
        } else if (log.action === 'FILE_OPEN') {
             const match = log.details.match(/Abierto archivo: (.+?)(?:\s*\(compartido por (.+)\))?$/);
             if (match) {
                 filePath = match[1].trim();
                 if (match[2]) {
                   isShared = true;
                   sharedOwner = match[2];
                 }
             }
        }

        const uniqueKey = isShared ? `shared:${sharedOwner}:${filePath}` : filePath;

        if (filePath && !processedPaths.has(uniqueKey)) {
            // Determine the actual full path based on whether it's shared
            const ownerDir = isShared ? sharedOwner : username;
            const fullPath = path.join(UPLOAD_DIR, ownerDir, filePath);
            try {
                const stats = await fs.stat(fullPath);
                
                if (isShared) {
                  // For shared files, build the same ID format as shared-with-me
                  const idString = `shared:${sharedOwner}:${filePath}`;
                  recentFiles.push({
                    id: Buffer.from(idString).toString('base64'),
                    name: path.basename(filePath),
                    type: 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    modifiedAt: stats.mtime,
                    path: filePath,
                    owner: sharedOwner,
                    shared: true,
                    extension: path.extname(filePath).toLowerCase()
                  });
                } else {
                  recentFiles.push({
                    id: Buffer.from(filePath).toString('base64'),
                    name: path.basename(filePath),
                    type: 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    modifiedAt: stats.mtime,
                    path: filePath,
                    extension: path.extname(filePath).toLowerCase()
                  });
                }
                processedPaths.add(uniqueKey);
            } catch (e) {
                // File might have been deleted
            }
        }
    }

    res.json({ success: true, files: recentFiles });
  } catch (error) {
    console.error('Error getting recent files:', error);
    res.status(500).json({ success: false, message: 'Error al obtener recientes' });
  }
});

// Shared with me
app.get('/shared-with-me', authenticate, async (req, res) => {
    try {
        const username = req.user.username;
        const sharedFiles = await dbAsync.all(
            'SELECT * FROM shared_files WHERE shared_with_username = ?',
            [username]
        );
        
        const files = [];
        for (const share of sharedFiles) {
             const fullPath = path.join(UPLOAD_DIR, share.owner_username, share.path);
             try {
                 const stats = await fs.stat(fullPath);
                 // We use a prefix for ID to identify shared files in download/preview
                 const idString = `shared:${share.owner_username}:${share.path}`;
                 
                 files.push({
                    id: Buffer.from(idString).toString('base64'),
                    name: path.basename(share.path),
                    type: stats.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    path: share.path,
                    owner: share.owner_username,
                    shared: true,
                    extension: path.extname(share.path).toLowerCase()
                 });
             } catch (e) {
                 // File might have been deleted, ignore
             }
        }
        res.json({ success: true, files });
    } catch (error) {
         console.error('Error listing shared:', error);
         res.status(500).json({ success: false, message: error.message });
    }
});

// Shared folders (Returns distinct owners who share with current user)
app.get('/shared-folders', authenticate, async (req, res) => {
    try {
        const username = req.user.username;
        const owners = await dbAsync.all(
            'SELECT DISTINCT owner_username FROM shared_files WHERE shared_with_username = ?',
            [username]
        );
        
        const folders = (owners || []).map(o => ({
            id: Buffer.from(`shared-owner:${o.owner_username}`).toString('base64'),
            name: o.owner_username,
            type: 'folder',
            owner: o.owner_username,
            shared: true
        }));
        
        res.json({ success: true, files: folders });
    } catch (error) {
        console.error('Error listing shared folders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Share
app.post('/share', authenticate, async (req, res) => {
  try {
    const { path: filePath, username: targetUsername } = req.body;
    const ownerUsername = req.user.username;

    if (!filePath || !targetUsername) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }

    if (ownerUsername === targetUsername) {
        return res.status(400).json({ success: false, message: 'No puedes compartir contigo mismo' });
    }

    // Verify target user exists
    const user = await dbAsync.get('SELECT id FROM users WHERE username = ?', [targetUsername]);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario destino no encontrado' });
    }
    
    // Verify file exists
    try {
        await fs.access(path.join(UPLOAD_DIR, ownerUsername, filePath));
    } catch {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Insert into DB
    await dbAsync.run(
        'INSERT INTO shared_files (path, owner_username, shared_with_username) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
        [filePath, ownerUsername, targetUsername]
    );

    // Send notification to the target user
    const fileName = filePath.split('/').pop() || filePath;
    try {
        const notifRes = await fetch('http://notification-service:5002/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                title: 'file_shared',
                message: `${ownerUsername}|${fileName}`,
                type: 'info',
                link: '/shared',
                metadata: { 
                    notifType: 'file_share',
                    from: ownerUsername, 
                    fileName: fileName,
                    path: filePath 
                }
            })
        });
        if (!notifRes.ok) {
            console.warn('⚠️ Notification service returned error:', notifRes.status);
        }
    } catch (notifErr) {
        console.warn('⚠️ Could not send share notification:', notifErr.message);
    }

    // Also Log
    await logAction(ownerUsername, 'FILE_SHARE', `Compartido ${filePath} con ${targetUsername}`);

    res.json({ success: true, message: `Compartido con ${targetUsername}` });
  } catch (error) {
    console.error('Error sharing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unshare - Remove a share
app.post('/unshare', authenticate, async (req, res) => {
  try {
    const { path: filePath, username: targetUsername } = req.body;
    const ownerUsername = req.user.username;

    if (!filePath || !targetUsername) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }

    const result = await dbAsync.run(
      'DELETE FROM shared_files WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, targetUsername]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Compartición no encontrada' });
    }

    await logAction(ownerUsername, 'FILE_UNSHARE', `Dejado de compartir ${filePath} con ${targetUsername}`);
    res.json({ success: true, message: `Dejado de compartir con ${targetUsername}` });
  } catch (error) {
    console.error('Error unsharing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove shared file from recipient's view (recipient removes the share from their panel)
app.post('/remove-shared', authenticate, async (req, res) => {
  try {
    const { path: filePath, ownerUsername } = req.body;
    const username = req.user.username;

    if (!filePath || !ownerUsername) {
      return res.status(400).json({ success: false, message: 'Missing path or ownerUsername' });
    }

    const result = await dbAsync.run(
      'DELETE FROM shared_files WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, username]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Share not found' });
    }

    await logAction(username, 'REMOVE_SHARED', `Removed shared file ${filePath} from ${ownerUsername}`);
    res.json({ success: true, message: 'Removed from shared' });
  } catch (error) {
    console.error('Error removing shared:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Move shared file to own panel (pin it so it appears in main file listing)
app.post('/save-to-my-files', authenticate, async (req, res) => {
  try {
    const { path: filePath, ownerUsername } = req.body;
    const username = req.user.username;

    if (!filePath || !ownerUsername) {
      return res.status(400).json({ success: false, message: 'Missing path or ownerUsername' });
    }

    // Verify the share exists
    const share = await dbAsync.get(
      'SELECT * FROM shared_files WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, username]
    );

    if (!share) {
      return res.status(404).json({ success: false, message: 'Share not found' });
    }

    // Pin to panel (toggle)
    await dbAsync.run(
      'UPDATE shared_files SET pinned_to_panel = TRUE WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, username]
    );

    await logAction(username, 'PIN_SHARED', `Pinned shared file ${filePath} from ${ownerUsername} to panel`);
    res.json({ success: true, message: 'Moved to your panel', savedName: path.basename(filePath) });
  } catch (error) {
    console.error('Error pinning to panel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unpin shared file from panel
app.post('/unpin-from-panel', authenticate, async (req, res) => {
  try {
    const { path: filePath, ownerUsername } = req.body;
    const username = req.user.username;

    if (!filePath || !ownerUsername) {
      return res.status(400).json({ success: false, message: 'Missing path or ownerUsername' });
    }

    await dbAsync.run(
      'UPDATE shared_files SET pinned_to_panel = FALSE WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, username]
    );

    res.json({ success: true, message: 'Unpinned from panel' });
  } catch (error) {
    console.error('Error unpinning from panel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to recursively copy directory
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Get shares info for a specific file (who is it shared with)
app.get('/shares', authenticate, async (req, res) => {
  try {
    const filePath = req.query.path;
    const ownerUsername = req.user.username;

    if (!filePath) {
      return res.status(400).json({ success: false, message: 'Path requerido' });
    }

    const shares = await dbAsync.all(
      'SELECT shared_with_username, created_at FROM shared_files WHERE path = ? AND owner_username = ?',
      [filePath, ownerUsername]
    );

    res.json({ success: true, shares: shares || [] });
  } catch (error) {
    console.error('Error getting shares:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// List user's files (for external services like AI/calendar to browse)
app.get('/user-files', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const requestedPath = req.query.path || '';
    const searchQuery = req.query.search || '';

    if (requestedPath.includes('..')) {
      return res.status(400).json({ success: false, message: 'Ruta inválida' });
    }

    const targetDir = path.join(UPLOAD_DIR, username, requestedPath);

    try {
      await fs.access(targetDir);
    } catch (e) {
      return res.json({ success: true, files: [] });
    }

    const items = await fs.readdir(targetDir, { withFileTypes: true });
    let files = [];

    for (const item of items) {
      const relativePath = path.join(requestedPath, item.name);
      if (item.isDirectory()) continue; // Only return files for attachment selection

      const stats = await fs.stat(path.join(targetDir, item.name));
      files.push({
        id: Buffer.from(relativePath).toString('base64'),
        name: item.name,
        path: relativePath,
        size: stats.size,
        modified: stats.mtime,
        extension: path.extname(item.name).toLowerCase()
      });
    }

    // Search filter
    if (searchQuery) {
      files = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    res.json({ success: true, files });
  } catch (error) {
    console.error('Error listing user files:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Duplicate
app.post('/:fileId/duplicate', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);
    
    const ext = path.extname(fullPath);
    const name = path.basename(fullPath, ext);
    const newName = `${name} - Copy${ext}`;
    const newPath = path.join(path.dirname(fullPath), newName);

    await fs.copyFile(fullPath, newPath);
    await logAction(req.user.username, 'FILE_DUPLICATE', `Duplicado: ${filePath} -> ${newName}`);

    res.json({ success: true, message: 'Duplicado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload folder (Single file handling with relative path)
app.post('/upload-folder', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const { relativePath, path: currentPath } = req.body;
        const username = req.user.username;
        let finalPath;
        
        if (relativePath) {
             // Use relativePath to maintain structure
             // relativePath includes filename, so dirname gets the folder structure
             finalPath = path.join(UPLOAD_DIR, username, currentPath || '', path.dirname(relativePath));
        } else {
             finalPath = path.join(UPLOAD_DIR, username, currentPath || '');
        }

        await fs.mkdir(finalPath, { recursive: true });
        
        const targetFile = path.join(finalPath, req.file.originalname);
        await fs.rename(req.file.path, targetFile);
        
        await logAction(username, 'FOLDER_UPLOAD', `Subido archivo de carpeta: ${req.file.originalname}`);
        
        res.json({ success: true, message: 'Archivo subido' });
    } catch (error) {
        console.error('Error uploading folder file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const AutoSyncService = require('./autoSync');

// Iniciar servicio de sincronización automática
console.log(' Inicializando AutoSyncService...');
const syncService = new AutoSyncService(dbAsync, UPLOAD_DIR);
syncService.start();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`File Service running on port ${PORT}`);
});