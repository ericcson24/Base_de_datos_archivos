require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const JSZip = require('jszip');
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
  storage: storage
});

// Configuración de multer para actualización de archivos (usa carpeta temporal)
const uploadTemp = multer({ 
  dest: '/tmp/uploads'
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

    // Fetch folder metadata (colors/icons)
    let folderMeta = {};
    try {
      const metas = await dbAsync.all('SELECT folder_path, color, icon FROM folder_metadata WHERE username = ?', [owner || username]);
      if (metas) {
        metas.forEach(m => { folderMeta[m.folder_path] = { color: m.color, icon: m.icon }; });
      }
    } catch (e) { /* table might not exist yet */ }

    for (const item of items) {
      const fullPath = path.join(targetDir, item.name);
      const relativePath = path.join(requestedPath, item.name);
      
      // Check shared status (normalize paths)
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const winPath = relativePath.replace(/\//g, '\\');
      const isShared = sharedPaths.has(normalizedPath) || sharedPaths.has(winPath) || sharedPaths.has(relativePath);
      const sharedWith = sharedWithMap[normalizedPath] || sharedWithMap[winPath] || sharedWithMap[relativePath] || [];

      if (item.isDirectory()) {
        const meta = folderMeta[normalizedPath] || folderMeta[winPath] || folderMeta[relativePath] || {};
        files.push({
          id: Buffer.from(relativePath).toString('base64'),
          name: item.name,
          type: 'folder',
          size: 0,
          modified: (await fs.stat(fullPath)).mtime,
          path: relativePath,
          shared: isShared,
          sharedWith: isShared ? sharedWith : undefined,
          owner: owner || username,
          folder_color: meta.color || null,
          folder_icon: meta.icon || null
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

    // Create proper Office documents instead of empty files
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.docx') {
      const zip = new JSZip();
      zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
      zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
      zip.folder('word').file('document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t></w:t></w:r></w:p></w:body></w:document>');
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      await fs.writeFile(fullPath, buf);
    } else if (ext === '.xlsx') {
      const zip = new JSZip();
      zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
      zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
      const xl = zip.folder('xl');
      xl.folder('_rels').file('workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
      xl.file('workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
      xl.folder('worksheets').file('sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>');
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      await fs.writeFile(fullPath, buf);
    } else if (ext === '.pptx') {
      const zip = new JSZip();
      // [Content_Types].xml
      zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
      // _rels/.rels
      zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
      // docProps
      zip.folder('docProps').file('core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>ProyectoNube</dc:creator></cp:coreProperties>');
      zip.folder('docProps').file('app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ProyectoNube</Application><Slides>1</Slides></Properties>');
      const ppt = zip.folder('ppt');
      // presentation.xml
      ppt.file('presentation.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="es-ES"/></a:defPPr></p:defaultTextStyle></p:presentation>');
      ppt.folder('_rels').file('presentation.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>');
      // theme
      ppt.folder('theme').file('theme1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>');
      // slideMaster
      const smFolder = ppt.folder('slideMasters');
      smFolder.file('slideMaster1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/><a:ea typeface="+mj-ea"/><a:cs typeface="+mj-cs"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>');
      smFolder.folder('_rels').file('slideMaster1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>');
      // slideLayout
      const slFolder = ppt.folder('slideLayouts');
      slFolder.file('slideLayout1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>');
      slFolder.folder('_rels').file('slideLayout1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>');
      // slide
      const slideFolder = ppt.folder('slides');
      slideFolder.file('slide1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');
      slideFolder.folder('_rels').file('slide1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>');
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      await fs.writeFile(fullPath, buf);
    } else {
      await fs.writeFile(fullPath, '');
    }
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

// Customize folder (color/icon)
app.patch('/folder-customize', authenticate, async (req, res) => {
  try {
    const { folderPath, color, icon } = req.body;
    const username = req.user.username;
    
    if (!folderPath) return res.status(400).json({ success: false, message: 'folderPath requerido' });
    
    // Normalize the path
    const normalizedPath = folderPath.replace(/\\/g, '/');
    
    // Verify folder exists
    const fullPath = path.join(UPLOAD_DIR, username, normalizedPath);
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ success: false, message: 'No es una carpeta' });
      }
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Carpeta no encontrada' });
    }
    
    // Upsert metadata
    await dbAsync.run(`
      INSERT INTO folder_metadata (username, folder_path, color, icon, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (username, folder_path)
      DO UPDATE SET color = COALESCE(?, folder_metadata.color), 
                    icon = COALESCE(?, folder_metadata.icon),
                    updated_at = CURRENT_TIMESTAMP
    `, [username, normalizedPath, color || '#5f9ee9', icon || 'default', color, icon]);
    
    await logAction(username, 'FOLDER_CUSTOMIZE', `Carpeta personalizada: ${normalizedPath}`);
    
    res.json({ success: true, message: 'Carpeta personalizada', color: color || '#5f9ee9', icon: icon || 'default' });
  } catch (error) {
    console.error('Error customizing folder:', error);
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

// Save shared file to own files (actually copy the file and remove the share)
app.post('/save-to-my-files', authenticate, async (req, res) => {
  try {
    const { path: filePath, ownerUsername, destinationPath } = req.body;
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

    // Source: owner's file
    const sourcePath = path.join(UPLOAD_DIR, ownerUsername, filePath);
    
    // Destination: user's own directory (root or specified destination)
    const destFolder = destinationPath || '';
    const fileName = path.basename(filePath);
    let destPath = path.join(UPLOAD_DIR, username, destFolder, fileName);

    // Verify source exists
    try {
      await fs.access(sourcePath);
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Source file no longer exists' });
    }

    // Handle name collision - add (1), (2) etc.
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    let finalName = fileName;
    let counter = 1;
    
    try {
      await fs.access(destPath);
      // File exists, find unique name
      while (true) {
        finalName = `${baseName} (${counter})${ext}`;
        destPath = path.join(destDir, finalName);
        try {
          await fs.access(destPath);
          counter++;
        } catch {
          break; // Name is available
        }
      }
    } catch {
      // Destination doesn't exist, good to go
    }

    // Copy the file or directory
    const sourceStats = await fs.stat(sourcePath);
    if (sourceStats.isDirectory()) {
      await copyDir(sourcePath, destPath);
    } else {
      await fs.copyFile(sourcePath, destPath);
    }

    // Remove the share record (no longer shared, user has their own copy)
    await dbAsync.run(
      'DELETE FROM shared_files WHERE path = ? AND owner_username = ? AND shared_with_username = ?',
      [filePath, ownerUsername, username]
    );

    await logAction(username, 'SAVE_SHARED_TO_MY_FILES', `Copied shared file ${filePath} from ${ownerUsername} to own files as ${finalName}`);
    res.json({ success: true, message: 'File saved to your files', savedName: finalName });
  } catch (error) {
    console.error('Error saving to my files:', error);
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