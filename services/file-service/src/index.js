require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { dbAsync } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5004;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fsSync.existsSync(UPLOAD_DIR)){
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
    console.log(`[DEBUG] Found ${items.length} items`);
    let files = [];

    for (const item of items) {
      const fullPath = path.join(targetDir, item.name);
      const relativePath = path.join(requestedPath, item.name);

      if (item.isDirectory()) {
        files.push({
          id: Buffer.from(relativePath).toString('base64'),
          name: item.name,
          type: 'folder',
          size: 0,
          modified: (await fs.stat(fullPath)).mtime,
          path: relativePath
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
          extension: path.extname(item.name).toLowerCase()
        });
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

// Descargar archivo
app.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    let filePath;
    try {
        filePath = Buffer.from(fileId, 'base64').toString();
    } catch (e) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);
    
    // Seguridad básica
    if (!fullPath.startsWith(path.join(UPLOAD_DIR, req.user.username))) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    try {
        await fs.access(fullPath);
    } catch (e) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    res.download(fullPath);
  } catch (error) {
    console.error('Error downloading:', error);
    res.status(500).json({ success: false, message: 'Error al descargar' });
  }
});

// Crear archivo vacío
app.post('/create', authenticate, async (req, res) => {
  try {
    const { name, path: relativePath } = req.body;
    const username = req.user.username;
    
    if (!name) return res.status(400).json({ success: false, message: 'Nombre requerido' });

    const fullPath = path.join(UPLOAD_DIR, username, relativePath || '', name);
    
    try {
        await fs.access(fullPath);
        return res.status(400).json({ success: false, message: 'El archivo ya existe' });
    } catch (e) {}

    await fs.writeFile(fullPath, '');
    await logAction(username, 'CREATE_FILE', `Creado archivo: ${name}`);

    res.json({
      success: true,
      message: 'Archivo creado',
      file: {
        name: name,
        path: path.join(relativePath || '', name),
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
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);

    if (encoding === 'base64') {
      const base64Data = content.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      await fs.writeFile(fullPath, Buffer.from(base64Data, 'base64'));
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }

    await logAction(req.user.username, 'FILE_EDIT', `Editado archivo: ${filePath}`);
    res.json({ success: true, message: 'Guardado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Preview / Ver contenido
app.get('/preview/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    let filePath;
    try {
        filePath = Buffer.from(fileId, 'base64').toString();
    } catch (e) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const fullPath = path.join(UPLOAD_DIR, req.user.username, filePath);
    
    if (!fullPath.startsWith(path.join(UPLOAD_DIR, req.user.username))) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    try {
        await fs.access(fullPath);
    } catch (e) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Log file open
    await logAction(req.user.username, 'FILE_OPEN', `Abierto archivo: ${filePath}`);

    // Determinar mime type básico o dejar que express/res.sendFile lo maneje
    // Para preview, queremos que el navegador intente mostrarlo (inline)
    res.sendFile(fullPath, { headers: { 'Content-Disposition': 'inline' } });
  } catch (error) {
    console.error('Error previewing:', error);
    res.status(500).json({ success: false, message: 'Error al previsualizar' });
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
         ORDER BY timestamp DESC LIMIT 20`,
        [user.id]
    );

    const recentFiles = [];
    const processedPaths = new Set();

    for (const log of logs) {
        let filePath = '';
        
        if (log.action === 'FILE_EDIT') {
             const match = log.details.match(/Editado archivo: (.+)/);
             if (match) {
                 try {
                    // Try to decode if it looks like base64, otherwise use as is
                    // The log might contain the raw path or base64
                    // In previous code we assumed base64 but let's be safe
                    filePath = Buffer.from(match[1], 'base64').toString();
                 } catch (e) { filePath = match[1]; }
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
             const match = log.details.match(/Abierto archivo: (.+)/);
             if (match) filePath = match[1];
        }

        if (filePath && !processedPaths.has(filePath)) {
            const fullPath = path.join(UPLOAD_DIR, username, filePath);
            try {
                const stats = await fs.stat(fullPath);
                recentFiles.push({
                    id: Buffer.from(filePath).toString('base64'),
                    name: path.basename(filePath),
                    type: 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    path: filePath,
                    extension: path.extname(filePath).toLowerCase()
                });
                processedPaths.add(filePath);
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

// Shared with me (Stub)
app.get('/shared-with-me', authenticate, async (req, res) => {
    res.json({ success: true, files: [] });
});

// Shared folders (Stub)
app.get('/shared-folders', authenticate, async (req, res) => {
    res.json({ success: true, files: [] });
});

// Share (Stub)
app.post('/share', authenticate, async (req, res) => {
    res.json({ success: true, message: 'Compartido (Simulado)' });
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

app.listen(PORT, () => {
  console.log(`File Service running on port ${PORT}`);
});