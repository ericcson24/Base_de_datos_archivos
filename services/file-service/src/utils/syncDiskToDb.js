const fs = require('fs').promises;
const path = require('path');
const { dbAsync } = require('../database/db');

/**
async function syncDiskToDb(rootDir) {
    console.log(' Starting Disk-to-DB Synchronization Scanner...');
    
    try {
        try {
            await fs.access(rootDir);
        } catch {
            console.log(` Root dir ${rootDir} does not exist, skipping sync.`);
            return;
        }

        const entries = await fs.readdir(rootDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const username = entry.name;
                
                const user = await dbAsync.get('SELECT id FROM users WHERE username = $1', [username]);
                
                if (user) {
                    console.log(`Processing user: ${username} (ID: ${user.id})`);
                    await processDirectory(path.join(rootDir, username), user.id, null);
                } else {
                    console.log(` Folder found for unknown user: ${username}`);
                }
            }
        }
        console.log(' Disk Synchronization Complete.');
    } catch (e) {
        console.error(' Sync Error:', e);
    }
}

async function processDirectory(currentPath, userId, parentId) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
            const folderId = await getOrCreateFolder(entry.name, userId, parentId);
            
            await processDirectory(fullPath, userId, folderId);
        } else {
            await getOrCreateFile(entry.name, fullPath, userId, parentId);
        }
    }
}

async function getOrCreateFolder(name, userId, parentId) {
    let sql = 'SELECT id FROM folders WHERE name = $1 AND owner_id = $2';
    let params = [name, userId];
    
    if (parentId) {
        sql += ' AND parent_id = $3';
        params.push(parentId);
    } else {
        sql += ' AND parent_id IS NULL';
    }

    const row = await dbAsync.get(sql, params);
    if (row) return row.id;

    const res = await dbAsync.run(
        'INSERT INTO folders (name, owner_id, parent_id) VALUES ($1, $2, $3)',
        [name, userId, parentId]
    );
    return res.lastID;
}

async function getOrCreateFile(name, fullPath, userId, folderId) {
    let sql = 'SELECT id FROM files WHERE name = $1 AND owner_id = $2';
    let params = [name, userId];
    
    if (folderId) {
        sql += ' AND folder_id = $3';
        params.push(folderId);
    } else {
        sql += ' AND folder_id IS NULL';
    }
    
    const row = await dbAsync.get(sql, params);
    if (row) return row.id;

    try {
        const stats = await fs.stat(fullPath);
        const mimeType = getMimeType(name);
        
        await dbAsync.run(
            'INSERT INTO files (folder_id, name, physical_path, size, mime_type, owner_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [folderId, name, fullPath, stats.size, mimeType, userId]
        );
    } catch (e) {
        console.error(`Error syncing file ${name}:`, e.message);
    }
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.zip': 'application/zip',
        '.json': 'application/json',
        '.js': 'text/javascript',
        '.py': 'text/x-python'
    };
    return map[ext] || 'application/octet-stream';
}

module.exports = { syncDiskToDb };
