/**
 * Rutas API para Office Online Integration
 * Maneja WOPI (Web Application Open Platform Interface)
 */

const express = require('express');
const router = express.Router();
const WOPIService = require('../../sync-system/services/WOPIService');
const auth = require('../middleware/auth'); // Middleware de autenticación

const wopiService = new WOPIService();

/**
 * POST /api/office/generate-wopi-url
 * Genera URL de Office Online para un archivo
 */
router.post('/generate-wopi-url', auth, async (req, res) => {
    try {
        const { fileId, fileName, action = 'view' } = req.body;
        const userId = req.user.id;

        if (!fileId || !fileName) {
            return res.status(400).json({
                error: 'fileId y fileName son requeridos'
            });
        }

        if (!['view', 'edit'].includes(action)) {
            return res.status(400).json({
                error: 'action debe ser "view" o "edit"'
            });
        }

        const wopiData = await wopiService.generateWOPIUrl(fileId, fileName, action, userId);

        res.json({
            success: true,
            embedUrl: wopiData.embedUrl,
            wopiSrc: wopiData.wopiSrc,
            fileType: wopiData.fileType,
            action: wopiData.action,
            expiresAt: wopiData.expiresAt
        });

    } catch (error) {
        console.error('Error generando URL WOPI:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/wopi/files/:fileId
 * Endpoint WOPI para obtener información del archivo
 */
router.get('/wopi/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const accessToken = req.query.access_token;

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        // Verificar token
        const tokenData = wopiService.verifyAccessToken(accessToken);
        
        if (tokenData.fileId !== fileId) {
            return res.status(403).json({ error: 'Token no válido para este archivo' });
        }

        // Obtener información del archivo
        const fileInfo = await wopiService.getFileInfo(fileId, tokenData.userId);

        res.json(fileInfo);

    } catch (error) {
        console.error('Error obteniendo info WOPI:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/wopi/files/:fileId/contents
 * Endpoint WOPI para obtener contenido del archivo
 */
router.get('/wopi/files/:fileId/contents', async (req, res) => {
    try {
        const { fileId } = req.params;
        const accessToken = req.query.access_token;

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        // Verificar token
        const tokenData = wopiService.verifyAccessToken(accessToken);
        
        if (tokenData.fileId !== fileId) {
            return res.status(403).json({ error: 'Token no válido para este archivo' });
        }

        // Obtener contenido del archivo
        const contents = await wopiService.getFileContents(fileId, tokenData.userId);

        // Establecer headers apropiados
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Length': contents.length
        });

        res.send(contents);

    } catch (error) {
        console.error('Error obteniendo contenido WOPI:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/wopi/files/:fileId/contents
 * Endpoint WOPI para guardar contenido del archivo
 */
router.post('/wopi/files/:fileId/contents', async (req, res) => {
    try {
        const { fileId } = req.params;
        const accessToken = req.query.access_token || req.headers['x-wopi-override'];
        const lock = req.headers['x-wopi-lock'];

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        // Verificar token
        const tokenData = wopiService.verifyAccessToken(accessToken);
        
        if (tokenData.fileId !== fileId) {
            return res.status(403).json({ error: 'Token no válido para este archivo' });
        }

        if (tokenData.action !== 'edit') {
            return res.status(403).json({ error: 'Token no tiene permisos de edición' });
        }

        // Guardar contenido
        const result = await wopiService.putFileContents(
            fileId, 
            tokenData.userId, 
            req.body, 
            lock
        );

        res.json({
            success: true,
            version: result.version,
            lastModified: result.lastModified
        });

    } catch (error) {
        console.error('Error guardando contenido WOPI:', error);
        
        if (error.message.includes('bloqueado')) {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/wopi/files/:fileId/lock
 * Endpoint WOPI para manejar locks de archivos
 */
router.post('/wopi/files/:fileId/lock', async (req, res) => {
    try {
        const { fileId } = req.params;
        const accessToken = req.query.access_token;
        const override = req.headers['x-wopi-override'];
        const lock = req.headers['x-wopi-lock'];
        const oldLock = req.headers['x-wopi-oldlock'];

        if (!accessToken) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }

        // Verificar token
        const tokenData = wopiService.verifyAccessToken(accessToken);
        
        if (tokenData.fileId !== fileId) {
            return res.status(403).json({ error: 'Token no válido para este archivo' });
        }

        let action = 'lock';
        
        if (override === 'UNLOCK') {
            action = 'unlock';
        } else if (override === 'REFRESH_LOCK') {
            action = 'refresh';
        }

        const result = await wopiService.handleFileLock(
            fileId, 
            tokenData.userId, 
            action, 
            lock || oldLock
        );

        res.json({
            success: true,
            lock: result.lock
        });

    } catch (error) {
        console.error('Error manejando lock WOPI:', error);
        
        if (error.message.includes('bloqueado')) {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/office/supported-types
 * Obtiene tipos de archivo soportados por Office Online
 */
router.get('/supported-types', (req, res) => {
    res.json({
        success: true,
        supportedTypes: {
            'word': {
                extensions: ['doc', 'docx'],
                mimeTypes: [
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ],
                actions: ['view', 'edit']
            },
            'excel': {
                extensions: ['xls', 'xlsx'],
                mimeTypes: [
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ],
                actions: ['view', 'edit']
            },
            'powerpoint': {
                extensions: ['ppt', 'pptx'],
                mimeTypes: [
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                ],
                actions: ['view', 'edit']
            }
        }
    });
});

/**
 * POST /api/office/validate-file
 * Valida si un archivo es compatible con Office Online
 */
router.post('/validate-file', auth, async (req, res) => {
    try {
        const { fileName, mimeType } = req.body;

        if (!fileName) {
            return res.status(400).json({
                error: 'fileName es requerido'
            });
        }

        const extension = fileName.split('.').pop().toLowerCase();
        const officeType = wopiService.getOfficeType(fileName);

        res.json({
            success: true,
            isSupported: !!officeType,
            officeType: officeType || null,
            extension,
            availableActions: officeType ? ['view', 'edit'] : []
        });

    } catch (error) {
        console.error('Error validando archivo:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

module.exports = router;