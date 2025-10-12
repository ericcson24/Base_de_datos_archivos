const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configurar multer para upload de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const username = req.user.username;
      const uploadPath = req.body.path || '';
      const fullPath = path.join(__dirname, '../../Datos', username, uploadPath);
      
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Mantener el nombre original del archivo
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB límite por archivo
  }
});

// Middleware de autenticación simple
const authenticate = (req, res, next) => {
  // Por ahora, obtener usuario del header Authorization o de la sesión
  // En producción: verificar token JWT
  const authHeader = req.headers.authorization;
  console.log(`🔐 Middleware authenticate - Auth header:`, authHeader ? 'present' : 'missing');

  let token = null;

  // Intentar obtener token del header Authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Si no hay token en header, intentar obtenerlo de query parameter (para window.open)
  if (!token) {
    token = req.query.token;
    console.log(`🔐 Middleware authenticate - Query token:`, token ? 'present' : 'missing');
  }

  if (token) {
    try {
      // El token contiene el username por ahora (simplificado)
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = userData;
      console.log(`✅ Usuario autenticado:`, userData.username);
      next();
    } catch (error) {
      console.log(`❌ Error parseando token:`, error.message);
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  } else {
    console.log(`❌ No hay header de autorización ni token en query`);
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
};

// Función para leer archivos de una carpeta
async function readDirectoryContents(dirPath, basePath = '') {
  try {
    console.log(`📂 Leyendo directorio: ${dirPath}`);
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    console.log(`📂 Encontrados ${items.length} items en ${dirPath}`);

    const files = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.join(basePath, item.name);

      console.log(`📄 Procesando: ${item.name} (${item.isDirectory() ? 'dir' : 'file'})`);

      if (item.isDirectory()) {
        // Es una carpeta - leer recursivamente
        try {
          const children = await readDirectoryContents(fullPath, relativePath);
          const folder = {
            id: Buffer.from(relativePath).toString('base64'),
            name: item.name,
            type: 'folder',
            size: 0,
            modified: (await fs.stat(fullPath)).mtime.toISOString(),
            children: children,
            path: relativePath
          };
          files.push(folder);
        } catch (error) {
          console.log(`⚠️ Error leyendo subdirectorio ${fullPath}:`, error.message);
        }
      } else {
        // Es un archivo
        try {
          const stats = await fs.stat(fullPath);
          const file = {
            id: Buffer.from(relativePath).toString('base64'),
            name: item.name,
            type: 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
            extension: path.extname(item.name).substring(1),
            path: relativePath
          };
          files.push(file);
        } catch (error) {
          console.log(`⚠️ Error obteniendo stats de ${fullPath}:`, error.message);
        }
      }
    }

    return files;
  } catch (error) {
    console.error('❌ Error reading directory:', error);
    return [];
  }
}

// Función para calcular espacio usado recursivamente
function calculateStorage(files) {
  return files.reduce((total, file) => {
    if (file.type === 'file') {
      return total + (file.size || 0);
    } else if (file.children) {
      return total + calculateStorage(file.children);
    }
    return total;
  }, 0);
}

// Función para filtrar archivos por path actual
function getFilesAtPath(files, currentPath) {
  if (currentPath.length === 0) {
    return files;
  }

  let currentFiles = files;
  for (const folderName of currentPath) {
    const folder = currentFiles.find(item =>
      item.type === 'folder' && item.name === folderName
    );
    if (folder && folder.children) {
      currentFiles = folder.children;
    } else {
      return [];
    }
  }
  return currentFiles;
}

// Obtener archivos del usuario
router.get('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const currentPath = req.query.path ? req.query.path.split('/').filter(p => p) : [];

    // Ruta base del usuario
    const userDir = path.join(__dirname, '../../Datos', username);

    console.log(`📁 Leyendo archivos para usuario: ${username}, path: ${currentPath.join('/')}`);
    console.log(`📂 Ruta del directorio: ${userDir}`);
    console.log(`🔍 Usuario del token:`, req.user);

    // Verificar que el directorio del usuario existe
    try {
      await fs.access(userDir);
      console.log(`✅ Directorio existe: ${userDir}`);
    } catch (error) {
      console.log(`⚠️ Directorio del usuario ${username} no existe, creando...`);
      await fs.mkdir(userDir, { recursive: true });
    }

    // Leer archivos del directorio del usuario
    const allFiles = await readDirectoryContents(userDir);
    console.log(`📋 Archivos encontrados en ${userDir}:`, allFiles.map(f => `${f.type}:${f.name}`));

    // Filtrar por el path actual
    const filesAtPath = getFilesAtPath(allFiles, currentPath);
    console.log(`📋 Archivos en path ${currentPath.join('/')}:`, filesAtPath.map(f => `${f.type}:${f.name}`));

    // Calcular espacio usado
    const storageUsed = calculateStorage(allFiles);

    console.log(`✅ Encontrados ${filesAtPath.length} elementos en el path actual`);

    res.json({
      success: true,
      files: filesAtPath,
      storageUsed,
      currentPath
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener archivos',
      error: error.message
    });
  }
});

// Obtener carpetas compartidas
router.get('/shared-folders', authenticate, async (req, res) => {
  try {
    // Simular carpetas compartidas
    const sharedFolders = [
      {
        id: 'shared1',
        name: 'Compartida_Trabajador1_eric',
        withUser: 'Trabajador1',
        created: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      folders: sharedFolders
    });
  } catch (error) {
    console.error('Error getting shared folders:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carpetas compartidas'
    });
  }
});

// Preview archivo (para visualización en el navegador)
router.get('/preview/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Decodificar el ID del archivo (que es el path codificado en base64)
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../Datos', req.user.username, filePath);

    // Verificar que el archivo existe y está dentro del directorio del usuario
    try {
      await fs.access(fullPath);

      // Verificar que el archivo está dentro del directorio del usuario (seguridad)
      const userDir = path.join(__dirname, '../../Datos', req.user.username);
      const resolvedPath = path.resolve(fullPath);
      const resolvedUserDir = path.resolve(userDir);

      if (!resolvedPath.startsWith(resolvedUserDir)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      const stats = await fs.stat(fullPath);
      const fileName = path.basename(fullPath);
      const ext = path.extname(fileName).toLowerCase();

      // Determinar tipo MIME para preview
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/plain',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.py': 'text/plain',
        '.java': 'text/plain',
        '.cpp': 'text/plain',
        '.c': 'text/plain',
        '.php': 'application/php',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      // Para archivos de texto, limitar el tamaño para evitar problemas de memoria
      if (mimeType.startsWith('text/') && stats.size > 1024 * 1024) { // 1MB límite para texto
        return res.status(413).json({
          success: false,
          message: 'Archivo de texto demasiado grande para preview'
        });
      }

      // Configurar headers para preview
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache por 1 hora

      // Para archivos que se pueden mostrar inline en el navegador
      if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf') {
        res.setHeader('Content-Disposition', 'inline');
      }

      // Enviar archivo
      const fileStream = require('fs').createReadStream(fullPath);
      fileStream.pipe(res);

    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

  } catch (error) {
    console.error('Error previewing file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener preview del archivo'
    });
  }
});

// Descargar archivo
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { download } = req.query;

    // Decodificar el ID del archivo (que es el path codificado en base64)
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../Datos', req.user.username, filePath);

    // Verificar que el archivo existe y está dentro del directorio del usuario
    try {
      await fs.access(fullPath);
      
      // Verificar que el archivo está dentro del directorio del usuario (seguridad)
      const userDir = path.join(__dirname, '../../Datos', req.user.username);
      const resolvedPath = path.resolve(fullPath);
      const resolvedUserDir = path.resolve(userDir);
      
      if (!resolvedPath.startsWith(resolvedUserDir)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      const stats = await fs.stat(fullPath);
      const fileName = path.basename(fullPath);

      if (download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }

      // Determinar tipo MIME basado en extensión
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);

      // Enviar archivo
      const fileStream = require('fs').createReadStream(fullPath);
      fileStream.pipe(res);

    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar archivo'
    });
  }
});

// Subir archivos
router.post('/upload', authenticate, upload.array('files'), async (req, res) => {
  try {
    const uploadedFiles = req.files;
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron archivos'
      });
    }

    const fileDetails = uploadedFiles.map(file => ({
      id: Buffer.from(file.path).toString('base64'),
      name: file.originalname,
      size: file.size,
      path: path.relative(path.join(__dirname, '../../Datos', req.user.username), file.path)
    }));

    res.json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
      files: fileDetails
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivos: ' + error.message
    });
  }
});

// Subir carpetas (maneja archivos individuales con estructura de carpetas)
router.post('/upload-folder', authenticate, upload.single('file'), async (req, res) => {
  try {
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió archivo'
      });
    }

    // Obtener el path relativo desde el body
    const relativePath = req.body.relativePath || uploadedFile.originalname;
    const targetPath = path.join(__dirname, '../../Datos', req.user.username, relativePath);
    
    // Crear directorios si no existen
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    // Mover archivo a la ubicación final
    await fs.rename(uploadedFile.path, targetPath);

    res.json({
      success: true,
      message: 'Archivo de carpeta subido exitosamente',
      file: {
        name: uploadedFile.originalname,
        size: uploadedFile.size,
        path: relativePath
      }
    });
  } catch (error) {
    console.error('Error uploading folder file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivo de carpeta: ' + error.message
    });
  }
});

// Crear carpeta
router.post('/folder', authenticate, async (req, res) => {
  try {
    const { name, path: folderPath } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la carpeta es requerido'
      });
    }

    const username = req.user.username;
    const basePath = folderPath || '';
    const fullPath = path.join(__dirname, '../../Datos', username, basePath, name.trim());

    // Verificar que la carpeta no existe
    try {
      await fs.access(fullPath);
      return res.status(400).json({
        success: false,
        message: 'Ya existe una carpeta con ese nombre'
      });
    } catch (error) {
      // La carpeta no existe, podemos crearla
    }

    // Crear la carpeta
    await fs.mkdir(fullPath, { recursive: true });

    res.json({
      success: true,
      message: 'Carpeta creada exitosamente',
      folder: {
        id: Buffer.from(path.join(basePath, name.trim())).toString('base64'),
        name: name.trim(),
        type: 'folder',
        path: path.join(basePath, name.trim()),
        created: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear carpeta: ' + error.message
    });
  }
});

// Eliminar archivo o carpeta
router.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Decodificar el ID del archivo (que es el path codificado en base64)
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../Datos', req.user.username, filePath);

    // Verificar que el archivo/carpeta existe y está dentro del directorio del usuario
    try {
      await fs.access(fullPath);
      
      // Verificar que está dentro del directorio del usuario (seguridad)
      const userDir = path.join(__dirname, '../../Datos', req.user.username);
      const resolvedPath = path.resolve(fullPath);
      const resolvedUserDir = path.resolve(userDir);
      
      if (!resolvedPath.startsWith(resolvedUserDir)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        // Eliminar carpeta recursivamente
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        // Eliminar archivo
        await fs.unlink(fullPath);
      }

      res.json({
        success: true,
        message: `${stats.isDirectory() ? 'Carpeta' : 'Archivo'} eliminado exitosamente`
      });

    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo o carpeta no encontrado'
      });
    }

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar: ' + error.message
    });
  }
});

// Renombrar archivo o carpeta
router.put('/:fileId/rename', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nuevo nombre es requerido'
      });
    }

    // Decodificar el ID del archivo
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../Datos', req.user.username, filePath);
    const newPath = path.join(path.dirname(fullPath), newName.trim());

    // Verificar que el archivo original existe
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo o carpeta no encontrado'
      });
    }

    // Verificar que no existe otro archivo con el nuevo nombre
    try {
      await fs.access(newPath);
      return res.status(400).json({
        success: false,
        message: 'Ya existe un archivo o carpeta con ese nombre'
      });
    } catch (error) {
      // El nuevo nombre está disponible
    }

    // Renombrar
    await fs.rename(fullPath, newPath);

    res.json({
      success: true,
      message: 'Renombrado exitosamente',
      newName: newName.trim()
    });

  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al renombrar: ' + error.message
    });
  }
});

// Endpoint de prueba para debugging
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Files API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;