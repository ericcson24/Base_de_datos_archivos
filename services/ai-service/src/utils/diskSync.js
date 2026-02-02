const fs = require('fs').promises;
const path = require('path');
const db = require('./database');

const UPLOAD_ROOT = '/app/uploads';

const MIME_MAP = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.csv': 'text/csv'
};

async function syncDatabaseWithDisk() {
    console.log('🔄 Iniciando sincronización de disco con base de datos...');
    
    try {
        // 1. Obtener usuarios para saber qué carpetas escanear
        const usersResult = await db.query('SELECT id, username FROM users');
        const users = usersResult.rows; // [{ id: 1, username: 'admin' }, ...]

        // 2. Obtener lista actual de archivos en BD para no duplicar
        // Guardamos un Set de physical_path normalizados
        const dbFilesResult = await db.query('SELECT physical_path FROM files');
        const dbPaths = new Set(dbFilesResult.rows.map(row => row.physical_path));

        let addedCount = 0;

        for (const user of users) {
             if (!user.username) continue;
             
             const userDir = path.join(UPLOAD_ROOT, user.username);
             
             try {
                 await fs.access(userDir);
             } catch (e) {
                 // Carpeta de usuario no existe en disco, skip
                 continue;
             }

             // Leer archivos de la carpeta del usuario
             const files = await fs.readdir(userDir);
             
             for (const fileName of files) {
                 const fullPath = path.join(userDir, fileName);
                 
                 // Normalizar para comparar con BD (usar forward slashes)
                 const normalizedPath = fullPath.replace(/\\/g, '/');

                 if (dbPaths.has(normalizedPath)) {
                     // Ya existe en BD
                     continue;
                 }

                 // Verificar que sea archivo y no carpeta (simple, no recursivo por ahora)
                 try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) continue;

                    // Nuevo archivo detectado! Insertar en BD
                    const ext = path.extname(fileName).toLowerCase();
                    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
                    
                    console.log(`➕ Sincronizando nuevo archivo: ${fileName} (Usuario: ${user.username})`);

                    await db.query(
                        `INSERT INTO files 
                        (name, physical_path, size, mime_type, owner_id, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            fileName,
                            normalizedPath,
                            stats.size,
                            mimeType,
                            user.id,
                            new Date()
                        ]
                    );
                    
                    addedCount++;

                 } catch (err) {
                     console.error(`Error procesando archivo ${fileName}:`, err.message);
                 }
             }
        }

        if (addedCount > 0) {
            console.log(`✅ Sincronización completada: ${addedCount} archivos añadidos a la BD.`);
        } else {
            console.log('✅ Sincronización completada: Disco y BD están al día.');
        }

    } catch (error) {
        console.error('❌ Error fatal en sincronización de disco:', error);
    }
}

module.exports = { syncDatabaseWithDisk };
