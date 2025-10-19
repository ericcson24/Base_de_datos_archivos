/**
 * Rutas API para el Sistema de IA Asistente de Productividad
 * Integración con Microsoft Graph API y análisis de calendario
 */

const express = require('express');
const router = express.Router();
const ProductivityAI = require('../sync-system/ai/ProductivityAI');
const { Client } = require('@microsoft/microsoft-graph-client');
const auth = require('../middleware/auth');

const productivityAI = new ProductivityAI();

/**
 * POST /api/ai/initialize
 * Inicializa la IA para un usuario específico
 */
router.post('/initialize', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                error: 'Token de acceso de Microsoft Graph requerido'
            });
        }

        const result = await productivityAI.initializeForUser(userId, accessToken);

        res.json({
            success: true,
            message: 'IA inicializada correctamente',
            patternsLoaded: result.patternsLoaded,
            userId: userId
        });

    } catch (error) {
        console.error('Error inicializando IA:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/ai/analyze-event
 * Analiza un evento específico y sugiere archivos relacionados
 */
router.post('/analyze-event', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { event, accessToken } = req.body;

        if (!event || !accessToken) {
            return res.status(400).json({
                error: 'Evento y token de acceso son requeridos'
            });
        }

        // Obtener archivos del usuario desde la base de datos
        const userFiles = await getUserFiles(userId);

        const analysis = await productivityAI.analyzeEventAndSuggestFiles(
            userId, 
            event, 
            userFiles, 
            accessToken
        );

        res.json({
            success: true,
            analysis: analysis,
            suggestionsCount: analysis.suggestions.length
        });

    } catch (error) {
        console.error('Error analizando evento:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/ai/upcoming-events
 * Obtiene eventos próximos y sugerencias automáticas
 */
router.get('/upcoming-events', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { accessToken, days = 7 } = req.query;

        if (!accessToken) {
            return res.status(400).json({
                error: 'Token de acceso requerido'
            });
        }

        // Crear cliente de Microsoft Graph
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        // Obtener eventos próximos
        const startTime = new Date();
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + parseInt(days));

        const events = await graphClient
            .api('/me/calendar/events')
            .filter(`start/dateTime ge '${startTime.toISOString()}' and start/dateTime le '${endTime.toISOString()}'`)
            .select('id,subject,body,start,end,location,attendees,categories,importance')
            .orderby('start/dateTime')
            .top(20)
            .get();

        // Obtener archivos del usuario
        const userFiles = await getUserFiles(userId);

        // Analizar cada evento
        const eventsWithSuggestions = [];
        
        for (const event of events.value || []) {
            try {
                const analysis = await productivityAI.analyzeEventAndSuggestFiles(
                    userId, 
                    event, 
                    userFiles, 
                    accessToken
                );
                
                eventsWithSuggestions.push({
                    event: {
                        id: event.id,
                        subject: event.subject,
                        start: event.start,
                        end: event.end,
                        location: event.location?.displayName,
                        importance: event.importance
                    },
                    suggestions: analysis.suggestions,
                    hasHighConfidenceSuggestions: analysis.suggestions.some(s => s.confidence > 0.8)
                });
            } catch (eventError) {
                console.error(`Error analizando evento ${event.id}:`, eventError);
                // Continuar con otros eventos
            }
        }

        res.json({
            success: true,
            events: eventsWithSuggestions,
            totalEvents: eventsWithSuggestions.length,
            eventsWithSuggestions: eventsWithSuggestions.filter(e => e.suggestions.length > 0).length
        });

    } catch (error) {
        console.error('Error obteniendo eventos próximos:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/ai/attach-file-to-event
 * Adjunta un archivo a un evento de Outlook usando Microsoft Graph
 */
router.post('/attach-file-to-event', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId, fileId, accessToken, attachmentType = 'file' } = req.body;

        if (!eventId || !fileId || !accessToken) {
            return res.status(400).json({
                error: 'eventId, fileId y accessToken son requeridos'
            });
        }

        // Crear cliente de Microsoft Graph
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        // Obtener información del archivo
        const fileInfo = await getFileInfo(fileId, userId);
        if (!fileInfo) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        let attachmentResult;

        if (attachmentType === 'link') {
            // Adjuntar como enlace compartido
            const shareLink = await createShareLink(fileId, userId);
            
            const linkAttachment = {
                '@odata.type': '#microsoft.graph.referenceAttachment',
                name: fileInfo.fileName,
                sourceUrl: shareLink,
                providerType: 'oneDriveConsumer',
                permission: 'view'
            };

            attachmentResult = await graphClient
                .api(`/me/events/${eventId}/attachments`)
                .post(linkAttachment);
        } else {
            // Adjuntar archivo completo (para archivos pequeños)
            if (fileInfo.size > 3 * 1024 * 1024) { // 3MB
                return res.status(400).json({
                    error: 'Archivo muy grande para adjuntar directamente. Use attachmentType: "link"'
                });
            }

            const fileContent = await getFileContent(fileId, userId);
            
            const fileAttachment = {
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: fileInfo.fileName,
                contentType: fileInfo.mimeType || 'application/octet-stream',
                contentBytes: fileContent.toString('base64')
            };

            attachmentResult = await graphClient
                .api(`/me/events/${eventId}/attachments`)
                .post(fileAttachment);
        }

        // Registrar feedback positivo en la IA
        await productivityAI.recordUserFeedback(
            userId, 
            eventId, 
            fileId, 
            'accepted', 
            new Date()
        );

        res.json({
            success: true,
            attachment: {
                id: attachmentResult.id,
                name: attachmentResult.name,
                type: attachmentType
            },
            message: 'Archivo adjuntado exitosamente al evento'
        });

    } catch (error) {
        console.error('Error adjuntando archivo:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/ai/feedback
 * Registra feedback del usuario sobre sugerencias de IA
 */
router.post('/feedback', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId, fileId, action, timestamp } = req.body;

        if (!eventId || !fileId || !action) {
            return res.status(400).json({
                error: 'eventId, fileId y action son requeridos'
            });
        }

        if (!['accepted', 'rejected', 'ignored'].includes(action)) {
            return res.status(400).json({
                error: 'action debe ser "accepted", "rejected" o "ignored"'
            });
        }

        await productivityAI.recordUserFeedback(
            userId, 
            eventId, 
            fileId, 
            action, 
            timestamp || new Date()
        );

        res.json({
            success: true,
            message: 'Feedback registrado correctamente'
        });

    } catch (error) {
        console.error('Error registrando feedback:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/ai/stats
 * Obtiene estadísticas de rendimiento de la IA para un usuario
 */
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const stats = productivityAI.getPerformanceStats(userId);

        res.json({
            success: true,
            stats: {
                ...stats,
                performance: {
                    excellent: stats.acceptanceRate >= 80,
                    good: stats.acceptanceRate >= 60 && stats.acceptanceRate < 80,
                    fair: stats.acceptanceRate >= 40 && stats.acceptanceRate < 60,
                    poor: stats.acceptanceRate < 40
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/ai/calendar/sync
 * Sincroniza calendario desde Microsoft Graph
 */
router.get('/calendar/sync', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { accessToken } = req.query;

        if (!accessToken) {
            return res.status(400).json({
                error: 'Token de acceso requerido'
            });
        }

        // Crear cliente de Microsoft Graph
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        // Obtener eventos de los próximos 30 días
        const startTime = new Date();
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + 30);

        const events = await graphClient
            .api('/me/calendar/events')
            .filter(`start/dateTime ge '${startTime.toISOString()}' and start/dateTime le '${endTime.toISOString()}'`)
            .select('id,subject,body,start,end,location,attendees,categories,importance,lastModifiedDateTime')
            .orderby('start/dateTime')
            .top(100)
            .get();

        // Procesar y almacenar eventos (implementar según tu base de datos)
        const processedEvents = events.value?.map(event => ({
            outlookId: event.id,
            subject: event.subject,
            start: event.start,
            end: event.end,
            location: event.location?.displayName,
            importance: event.importance,
            lastModified: event.lastModifiedDateTime,
            userId: userId
        })) || [];

        // Aquí guardarías en tu base de datos local
        // await saveEventsToDatabase(userId, processedEvents);

        res.json({
            success: true,
            syncedEvents: processedEvents.length,
            events: processedEvents
        });

    } catch (error) {
        console.error('Error sincronizando calendario:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/ai/recommendations/bulk
 * Obtiene recomendaciones en lote para múltiples eventos
 */
router.post('/recommendations/bulk', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventIds, accessToken } = req.body;

        if (!eventIds || !Array.isArray(eventIds) || !accessToken) {
            return res.status(400).json({
                error: 'eventIds (array) y accessToken son requeridos'
            });
        }

        // Crear cliente de Microsoft Graph
        const graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        // Obtener archivos del usuario
        const userFiles = await getUserFiles(userId);

        const recommendations = [];

        for (const eventId of eventIds) {
            try {
                // Obtener evento
                const event = await graphClient
                    .api(`/me/events/${eventId}`)
                    .select('id,subject,body,start,end,location,attendees,categories,importance')
                    .get();

                // Analizar evento
                const analysis = await productivityAI.analyzeEventAndSuggestFiles(
                    userId, 
                    event, 
                    userFiles, 
                    accessToken
                );

                recommendations.push({
                    eventId: eventId,
                    eventSubject: event.subject,
                    suggestions: analysis.suggestions,
                    confidence: analysis.suggestions.length > 0 ? 
                        Math.max(...analysis.suggestions.map(s => s.confidence)) : 0
                });

            } catch (eventError) {
                console.error(`Error procesando evento ${eventId}:`, eventError);
                recommendations.push({
                    eventId: eventId,
                    error: eventError.message,
                    suggestions: []
                });
            }
        }

        res.json({
            success: true,
            recommendations: recommendations,
            totalEvents: eventIds.length,
            eventsWithSuggestions: recommendations.filter(r => r.suggestions && r.suggestions.length > 0).length
        });

    } catch (error) {
        console.error('Error obteniendo recomendaciones en lote:', error);
        res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene archivos del usuario desde la base de datos
 */
async function getUserFiles(userId) {
    try {
        // Implementar según tu base de datos
        // Por ahora retorna array simulado
        return [
            {
                _id: 'file1',
                fileName: 'Proyecto-Alfa.docx',
                filePath: '/documents/Proyecto-Alfa.docx',
                size: 1024000,
                lastModified: new Date(),
                tags: ['proyecto', 'alfa', 'desarrollo'],
                folderPath: '/Proyectos/Alfa'
            },
            {
                _id: 'file2',
                fileName: 'Presentacion-Cliente.pptx',
                filePath: '/presentations/Presentacion-Cliente.pptx',
                size: 2048000,
                lastModified: new Date(),
                tags: ['presentacion', 'cliente', 'ventas'],
                folderPath: '/Presentaciones/Cliente'
            }
        ];
    } catch (error) {
        console.error('Error obteniendo archivos del usuario:', error);
        return [];
    }
}

/**
 * Obtiene información de un archivo específico
 */
async function getFileInfo(fileId, userId) {
    try {
        // Implementar según tu base de datos
        return {
            _id: fileId,
            fileName: 'documento.docx',
            size: 1024000,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            userId: userId
        };
    } catch (error) {
        console.error('Error obteniendo info del archivo:', error);
        return null;
    }
}

/**
 * Obtiene contenido de un archivo
 */
async function getFileContent(fileId, userId) {
    try {
        // Implementar según tu sistema de archivos
        const fs = require('fs').promises;
        const path = require('path');
        
        // Simulación - reemplazar con tu lógica real
        const filePath = path.join(process.cwd(), 'uploads', `${fileId}.bin`);
        return await fs.readFile(filePath);
    } catch (error) {
        console.error('Error obteniendo contenido del archivo:', error);
        throw error;
    }
}

/**
 * Crea enlace compartido para un archivo
 */
async function createShareLink(fileId, userId) {
    try {
        // Implementar según tu sistema
        return `${process.env.CLIENT_URL}/shared/${fileId}?token=${generateShareToken(fileId, userId)}`;
    } catch (error) {
        console.error('Error creando enlace compartido:', error);
        throw error;
    }
}

/**
 * Genera token de compartición
 */
function generateShareToken(fileId, userId) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { fileId, userId, type: 'share' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = router;