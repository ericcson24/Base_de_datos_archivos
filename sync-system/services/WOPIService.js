/**
 * Servicio WOPI (Web Application Open Platform Interface) para Office Online
 * Permite integrar archivos de Office con Office Online para edición web
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

class WOPIService {
    constructor() {
        this.baseUrl = process.env.WOPI_BASE_URL || 'http://localhost:5000';
        this.officeOnlineUrl = process.env.OFFICE_ONLINE_URL || 'https://view.officeapps.live.com';
        this.secret = process.env.WOPI_SECRET || process.env.JWT_SECRET;
        
        // URLs de Office Online para diferentes acciones
        this.officeActions = {
            word: {
                view: 'https://view.officeapps.live.com/wv/wordviewerframe.aspx',
                edit: 'https://word-edit.officeapps.live.com/we/wordeditorframe.aspx'
            },
            excel: {
                view: 'https://view.officeapps.live.com/x/_layouts/xlviewerinternal.aspx',
                edit: 'https://excel.officeapps.live.com/x/_layouts/xlviewerinternal.aspx'
            },
            powerpoint: {
                view: 'https://view.officeapps.live.com/p/PowerPointFrame.aspx',
                edit: 'https://powerpoint.officeapps.live.com/p/PowerPointFrame.aspx'
            }
        };
    }

    /**
     * Genera URL de WOPI para un archivo
     */
    async generateWOPIUrl(fileId, fileName, action = 'view', userId) {
        try {
            // Generar token de acceso WOPI
            const accessToken = this.generateAccessToken(fileId, userId, action);
            
            // Determinar tipo de Office
            const fileType = this.getOfficeType(fileName);
            if (!fileType) {
                throw new Error('Tipo de archivo no soportado para Office Online');
            }
            
            // Construir URL base del archivo WOPI
            const wopiSrc = `${this.baseUrl}/api/wopi/files/${fileId}`;
            
            // URL de acción de Office Online
            const officeUrl = this.officeActions[fileType][action];
            
            // URL completa con parámetros
            const embedUrl = `${officeUrl}?WOPISrc=${encodeURIComponent(wopiSrc)}&access_token=${accessToken}`;
            
            return {
                embedUrl,
                accessToken,
                wopiSrc,
                fileType,
                action,
                expiresAt: Date.now() + (3600 * 1000) // 1 hora
            };
            
        } catch (error) {
            console.error('Error generando URL WOPI:', error);
            throw error;
        }
    }

    /**
     * Genera token de acceso para WOPI
     */
    generateAccessToken(fileId, userId, action) {
        const payload = {
            fileId,
            userId,
            action,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
        };
        
        return jwt.sign(payload, this.secret);
    }

    /**
     * Verifica token de acceso WOPI
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (error) {
            throw new Error('Token WOPI inválido');
        }
    }

    /**
     * Determina el tipo de Office basado en la extensión del archivo
     */
    getOfficeType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        
        const typeMap = {
            'doc': 'word',
            'docx': 'word',
            'xls': 'excel',
            'xlsx': 'excel',
            'ppt': 'powerpoint',
            'pptx': 'powerpoint'
        };
        
        return typeMap[extension];
    }

    /**
     * Obtiene información del archivo para WOPI
     */
    async getFileInfo(fileId, userId) {
        try {
            // Aquí deberías obtener la información del archivo desde tu base de datos
            // Por ahora, simulamos la estructura
            const file = await this.getFileFromDatabase(fileId, userId);
            
            if (!file) {
                throw new Error('Archivo no encontrado');
            }
            
            // Información requerida por WOPI
            return {
                BaseFileName: file.fileName,
                Size: file.size || 0,
                Version: file.version || '1.0',
                SHA256: file.sha256 || '',
                OwnerId: userId,
                UserId: userId,
                UserFriendlyName: file.ownerName || 'Usuario',
                UserCanWrite: file.permissions?.canEdit || true,
                UserCanNotWriteRelative: false,
                ReadOnly: !file.permissions?.canEdit,
                RestrictedWebViewOnly: false,
                UserCanRename: file.permissions?.canRename || false,
                UserCanPrint: file.permissions?.canPrint || true,
                SupportsCoauth: true,
                SupportsLocks: true,
                SupportsGetLock: true,
                SupportsDeleteFile: file.permissions?.canDelete || false,
                LastModifiedTime: file.lastModified || new Date().toISOString(),
                BreadcrumbBrandName: 'NubeDistribuible',
                BreadcrumbFolderName: file.folderName || 'Archivos',
                BreadcrumbDocName: file.fileName
            };
            
        } catch (error) {
            console.error('Error obteniendo info del archivo WOPI:', error);
            throw error;
        }
    }

    /**
     * Obtiene el contenido del archivo para WOPI
     */
    async getFileContents(fileId, userId) {
        try {
            const file = await this.getFileFromDatabase(fileId, userId);
            
            if (!file) {
                throw new Error('Archivo no encontrado');
            }
            
            // Leer el archivo desde el sistema de archivos
            const filePath = path.join(process.cwd(), 'uploads', file.filePath);
            const contents = await fs.readFile(filePath);
            
            return contents;
            
        } catch (error) {
            console.error('Error obteniendo contenido del archivo WOPI:', error);
            throw error;
        }
    }

    /**
     * Guarda el contenido del archivo desde WOPI
     */
    async putFileContents(fileId, userId, contents, lock = null) {
        try {
            const file = await this.getFileFromDatabase(fileId, userId);
            
            if (!file) {
                throw new Error('Archivo no encontrado');
            }
            
            // Verificar permisos de escritura
            if (!file.permissions?.canEdit) {
                throw new Error('Sin permisos de escritura');
            }
            
            // Verificar lock si es necesario
            if (lock && file.lock && file.lock !== lock) {
                throw new Error('Archivo bloqueado por otro usuario');
            }
            
            // Guardar el archivo
            const filePath = path.join(process.cwd(), 'uploads', file.filePath);
            await fs.writeFile(filePath, contents);
            
            // Actualizar metadatos en la base de datos
            await this.updateFileMetadata(fileId, {
                size: contents.length,
                lastModified: new Date(),
                version: (parseFloat(file.version || '1.0') + 0.1).toFixed(1)
            });
            
            return {
                success: true,
                version: file.version,
                lastModified: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error guardando contenido del archivo WOPI:', error);
            throw error;
        }
    }

    /**
     * Simulación de obtener archivo de la base de datos
     * Deberías reemplazar esto con tu lógica real
     */
    async getFileFromDatabase(fileId, userId) {
        // Aquí deberías consultar tu base de datos real
        // Por ahora retornamos un objeto simulado
        return {
            _id: fileId,
            fileName: 'documento.docx',
            filePath: `user_${userId}/documento.docx`,
            size: 1024,
            version: '1.0',
            lastModified: new Date(),
            ownerName: 'Usuario Demo',
            folderName: 'Documentos',
            permissions: {
                canEdit: true,
                canRename: false,
                canDelete: false,
                canPrint: true
            }
        };
    }

    /**
     * Actualiza metadatos del archivo
     */
    async updateFileMetadata(fileId, metadata) {
        // Aquí deberías actualizar tu base de datos real
        console.log(`Actualizando metadatos del archivo ${fileId}:`, metadata);
        return true;
    }

    /**
     * Maneja locks de archivos para colaboración
     */
    async handleFileLock(fileId, userId, action, lock = null) {
        try {
            const file = await this.getFileFromDatabase(fileId, userId);
            
            switch (action) {
                case 'lock':
                    if (file.lock && file.lock !== userId) {
                        throw new Error('Archivo ya bloqueado por otro usuario');
                    }
                    await this.updateFileMetadata(fileId, { lock: userId, lockTime: new Date() });
                    return { lock: userId };
                    
                case 'unlock':
                    if (file.lock && file.lock !== userId) {
                        throw new Error('No puedes desbloquear este archivo');
                    }
                    await this.updateFileMetadata(fileId, { lock: null, lockTime: null });
                    return { lock: null };
                    
                case 'refresh':
                    // Refrescar lock existente
                    if (file.lock === userId) {
                        await this.updateFileMetadata(fileId, { lockTime: new Date() });
                        return { lock: userId };
                    }
                    throw new Error('No tienes un lock activo');
                    
                default:
                    throw new Error('Acción de lock no válida');
            }
            
        } catch (error) {
            console.error('Error manejando lock del archivo:', error);
            throw error;
        }
    }
}

module.exports = WOPIService;