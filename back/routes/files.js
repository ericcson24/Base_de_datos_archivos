const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { dbAsync } = require('../database/db');

// Función auxiliar para registrar logs en la base de datos
async function logAction(username, action, details) {
  try {
    // Obtener ID de usuario
    const user = await dbAsync.get("SELECT id FROM users WHERE username = ?", [username]);
    const userId = user ? user.id : null;

    await dbAsync.run(
      "INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
      [userId, username, action, details, '::1']
    );
  } catch (error) {
    console.error('Error registrando log de archivo:', error);
  }
}

// Configurar multer para upload de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const username = req.user.username;
      const uploadPath = req.body.path || '';
      const fullPath = path.join(__dirname, '../../../Datos', username, uploadPath);
      
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
            size: 0, // Las carpetas no tienen tamaño directo
            modified: (await fs.stat(fullPath)).mtime,
            path: relativePath,
            children: children
          };
          files.push(folder);
        } catch (err) {
          console.error(`Error leyendo subdirectorio ${item.name}:`, err);
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
            modified: stats.mtime,
            path: relativePath,
            extension: path.extname(item.name).toLowerCase()
          };
          files.push(file);
        } catch (err) {
          console.error(`Error leyendo archivo ${item.name}:`, err);
        }
      }
    }

    return files;
  } catch (error) {
    console.error(`Error leyendo directorio ${dirPath}:`, error);
    // Si el directorio no existe, retornamos array vacío
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Obtener archivos recientes
router.get('/recent', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const userDir = path.join(__dirname, '../../../Datos', username);

    // Función recursiva para obtener todos los archivos
    async function getAllFiles(dir, fileList = []) {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          await getAllFiles(fullPath, fileList);
        } else {
          const stats = await fs.stat(fullPath);
          fileList.push({
            name: file.name,
            path: path.relative(userDir, fullPath), // Path relativo al root del usuario
            fullPath: fullPath,
            size: stats.size,
            modified: stats.mtime,
            type: 'file',
            extension: path.extname(file.name).toLowerCase()
          });
        }
      }
      return fileList;
    }

    // Asegurar que el directorio existe
    try {
      await fs.access(userDir);
    } catch (error) {
      return res.json({ success: true, files: [] });
    }

    const allFiles = await getAllFiles(userDir);

    // Ordenar por fecha de modificación (más reciente primero)
    allFiles.sort((a, b) => b.modified - a.modified);

    // Tomar los últimos 10
    const recentFiles = allFiles.slice(0, 10).map(f => ({
      id: Buffer.from(f.path).toString('base64'),
      name: f.name,
      type: 'file',
      size: f.size,
      modified: f.modified,
      path: f.path,
      extension: f.extension
    }));

    res.json({
      success: true,
      files: recentFiles
    });

  } catch (error) {
    console.error('Error getting recent files:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener archivos recientes'
    });
  }
});

// Listar archivos
router.get('/', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const requestedPath = req.query.path || '';
    
    // Prevent path traversal
    if (requestedPath.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Ruta inválida'
      });
    }

    const userDir = path.join(__dirname, '../../../Datos', username);
    const targetDir = path.join(userDir, requestedPath);

    console.log(`📂 Listando archivos para usuario: ${username}`);
    console.log(`📂 Directorio objetivo: ${targetDir}`);

    // Asegurar que el directorio del usuario existe
    try {
      await fs.access(userDir);
    } catch (error) {
      console.log(`📂 Creando directorio para usuario: ${username}`);
      await fs.mkdir(userDir, { recursive: true });
    }

    // Verificar que el directorio objetivo existe
    try {
      await fs.access(targetDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Directorio no encontrado'
      });
    }

    // Leer contenido del directorio solicitado
    // Pasamos requestedPath como base para que los IDs se generen correctamente
    let files = await readDirectoryContents(targetDir, requestedPath);
    
    // Ordenar archivos si se solicitó
    const sortBy = req.query.sortBy;
    const order = req.query.order === 'desc' ? -1 : 1;

    if (sortBy) {
      files.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Manejo especial para fechas
        if (sortBy === 'modified') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        
        // Manejo especial para nombres (case insensitive)
        if (sortBy === 'name' && typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    } else {
      // Orden por defecto: Carpetas primero, luego archivos alfabéticamente
      files.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
      });
    }

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar archivos'
    });
  }
});

// Descargar archivo
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Decodificar el ID del archivo
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);

    // Verificar que el archivo existe
    try {
      await fs.access(fullPath);
      
      // Verificar que está dentro del directorio del usuario (seguridad)
      const userDir = path.join(__dirname, '../../../Datos', req.user.username);
      const resolvedPath = path.resolve(fullPath);
      const resolvedUserDir = path.resolve(userDir);
      
      if (!resolvedPath.startsWith(resolvedUserDir)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      // Obtener tipo MIME
      const ext = path.extname(fullPath).toLowerCase();
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.zip': 'application/zip',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const stats = await fs.stat(fullPath);

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);

      // Enviar archivo
      const fileStream = require('fs').createReadStream(fullPath);
      fileStream.pipe(res);

      // Log de descarga (opcional, puede generar mucho ruido)
      // await logAction(req.user.username, 'FILE_DOWNLOAD', `Descargado archivo: ${filePath}`);

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
router.post('/upload', authenticate, (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. El límite es 100MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Error de subida: ${err.message}`
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error desconocido: ${err.message}`
      });
    }
    next();
  });
}, async (req, res) => {
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
      path: path.relative(path.join(__dirname, '../../../Datos', req.user.username), file.path)
    }));

    // Log de subida
    const fileNames = uploadedFiles.map(f => f.originalname).join(', ');
    await logAction(req.user.username, 'FILE_UPLOAD', `Subidos ${uploadedFiles.length} archivos: ${fileNames}`);

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
    const targetPath = path.join(__dirname, '../../../Datos', req.user.username, relativePath);
    
    // Crear directorios si no existen
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    // Mover archivo a la ubicación final
    await fs.rename(uploadedFile.path, targetPath);

    // Log de subida de carpeta (archivo individual parte de carpeta)
    // await logAction(req.user.username, 'FOLDER_UPLOAD', `Subido archivo de carpeta: ${relativePath}`);

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
    const fullPath = path.join(__dirname, '../../../Datos', username, basePath, name.trim());

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

    // Log de creación de carpeta
    await logAction(req.user.username, 'FOLDER_CREATE', `Creada carpeta: ${path.join(basePath, name.trim())}`);

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

    console.log(`🗑️ Solicitando eliminación del archivo con ID: ${fileId}`);

    // Decodificar el ID del archivo (que es el path codificado en base64)
    let filePath;
    try {
      filePath = Buffer.from(fileId, 'base64').toString();
      console.log(`📄 Path decodificado: ${filePath}`);
    } catch (error) {
      console.error('❌ Error decodificando fileId:', error);
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);
    console.log(`📂 Ruta completa: ${fullPath}`);

    // Verificar que el archivo/carpeta existe y está dentro del directorio del usuario
    try {
      await fs.access(fullPath);
      console.log(`✅ Archivo existe: ${fullPath}`);
      
      // Verificar que está dentro del directorio del usuario (seguridad)
      const userDir = path.join(__dirname, '../../../Datos', req.user.username);
      const resolvedPath = path.resolve(fullPath);
      const resolvedUserDir = path.resolve(userDir);
      
      console.log(`🔒 Verificando seguridad:`);
      console.log(`   Archivo resuelto: ${resolvedPath}`);
      console.log(`   Dir usuario: ${resolvedUserDir}`);
      
      if (!resolvedPath.startsWith(resolvedUserDir)) {
        console.error('🚨 Intento de acceso fuera del directorio del usuario');
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado'
        });
      }

      const stats = await fs.stat(fullPath);
      const isDirectory = stats.isDirectory();
      console.log(`📋 Tipo de elemento: ${isDirectory ? 'Carpeta' : 'Archivo'}`);
      
      if (isDirectory) {
        // Eliminar carpeta recursivamente
        console.log(`📁 Eliminando carpeta recursivamente: ${fullPath}`);
        await fs.rm(fullPath, { recursive: true, force: true });
        console.log(`✅ Carpeta eliminada exitosamente`);
        
        // Log de eliminación
        await logAction(req.user.username, 'FOLDER_DELETE', `Eliminada carpeta: ${filePath}`);
      } else {
        // Eliminar archivo
        console.log(`📄 Eliminando archivo: ${fullPath}`);
        await fs.unlink(fullPath);
        console.log(`✅ Archivo eliminado exitosamente`);
        
        // Log de eliminación
        await logAction(req.user.username, 'FILE_DELETE', `Eliminado archivo: ${filePath}`);
      }

      res.json({
        success: true,
        message: `${isDirectory ? 'Carpeta' : 'Archivo'} eliminado exitosamente`
      });

    } catch (accessError) {
      console.error('❌ Error de acceso al archivo:', accessError);
      
      if (accessError.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'Archivo o carpeta no encontrado'
        });
      } else if (accessError.code === 'EACCES') {
        return res.status(403).json({
          success: false,
          message: 'Sin permisos para eliminar este elemento'
        });
      } else if (accessError.code === 'EBUSY') {
        return res.status(409).json({
          success: false,
          message: 'El archivo está siendo usado por otro proceso'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: `Error al acceder al archivo: ${accessError.message}`
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general eliminando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
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
    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);
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

    // Log de renombrado
    await logAction(req.user.username, 'FILE_RENAME', `Renombrado: ${filePath} -> ${newName.trim()}`);

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

// Mover archivo o carpeta
router.post('/:fileId/move', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { destinationPath } = req.body;

    if (destinationPath === undefined) {
      return res.status(400).json({
        success: false,
        message: 'La ruta de destino es requerida'
      });
    }

    // Decodificar el ID del archivo
    const filePath = Buffer.from(fileId, 'base64').toString();
    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);
    const fileName = path.basename(fullPath);
    
    // Ruta de destino completa
    const fullDestinationPath = path.join(__dirname, '../../../Datos', req.user.username, destinationPath, fileName);

    // Verificar que el archivo original existe
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo o carpeta no encontrado'
      });
    }

    // Verificar que la carpeta de destino existe
    const destinationDir = path.join(__dirname, '../../../Datos', req.user.username, destinationPath);
    try {
      await fs.access(destinationDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Carpeta de destino no encontrada'
      });
    }

    // Verificar que no existe un archivo con el mismo nombre en el destino
    try {
      await fs.access(fullDestinationPath);
      return res.status(400).json({
        success: false,
        message: 'Ya existe un archivo o carpeta con ese nombre en el destino'
      });
    } catch (error) {
      // El nombre está disponible
    }

    // Evitar mover una carpeta dentro de sí misma
    if (fullDestinationPath.startsWith(fullPath) && fullDestinationPath !== fullPath) {
      return res.status(400).json({
        success: false,
        message: 'No puedes mover una carpeta dentro de sí misma'
      });
    }

    // Mover
    await fs.rename(fullPath, fullDestinationPath);

    // Log de movimiento
    await logAction(req.user.username, 'FILE_MOVE', `Movido: ${filePath} -> ${path.join(destinationPath, fileName)}`);

    res.json({
      success: true,
      message: 'Movido exitosamente'
    });

  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al mover: ' + error.message
    });
  }
});

// Guardar contenido de archivo
router.put('/:fileId/content', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, encoding } = req.body;

    if (content === undefined) {
      return res.status(400).json({
        success: false,
        message: 'El contenido es requerido'
      });
    }

    // Decodificar el ID del archivo
    let filePath;
    try {
      filePath = Buffer.from(fileId, 'base64').toString();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);

    // Verificar que el archivo existe
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar seguridad (path traversal)
    const userDir = path.join(__dirname, '../../../Datos', req.user.username);
    const resolvedPath = path.resolve(fullPath);
    const resolvedUserDir = path.resolve(userDir);
    
    if (!resolvedPath.startsWith(resolvedUserDir)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    // Guardar contenido
    if (encoding === 'base64') {
      // Si viene en base64 (para imágenes o binarios)
      // Eliminar prefijo data:image/...;base64, si existe
      const base64Data = content.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      await fs.writeFile(fullPath, Buffer.from(base64Data, 'base64'));
    } else {
      // Texto plano por defecto
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // Obtener tamaño nuevo
    const stats = await fs.stat(fullPath);

    // Log de edición
    await logAction(req.user.username, 'FILE_EDIT', `Editado archivo: ${filePath} (Nuevo tamaño: ${stats.size} bytes)`);

    res.json({
      success: true,
      message: 'Archivo guardado exitosamente',
      size: stats.size,
      modified: stats.mtime
    });

  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar archivo: ' + error.message
    });
  }
});

// Previsualizar archivo (Stream)
router.get('/preview/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Decodificar el ID del archivo
    let filePath;
    try {
      filePath = Buffer.from(fileId, 'base64').toString();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'ID de archivo inválido'
      });
    }

    const fullPath = path.join(__dirname, '../../../Datos', req.user.username, filePath);

    // Verificar que el archivo existe
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar seguridad (path traversal)
    const userDir = path.join(__dirname, '../../../Datos', req.user.username);
    const resolvedPath = path.resolve(fullPath);
    const resolvedUserDir = path.resolve(userDir);
    
    if (!resolvedPath.startsWith(resolvedUserDir)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    // Obtener tipo MIME
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const stats = await fs.stat(fullPath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    
    // Permitir caching para mejor rendimiento de imágenes
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Enviar archivo como stream
    const fileStream = require('fs').createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error previewing file:', error);
    res.status(500).json({
      success: false,
      message: 'Error al previsualizar archivo: ' + error.message
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
