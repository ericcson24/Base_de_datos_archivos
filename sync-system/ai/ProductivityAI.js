/**
 * IA Asistente de Productividad
 * Analiza calendarios y propone archivos relacionados usando Microsoft Graph API
 */

const { Client } = require('@microsoft/microsoft-graph-client');

class ProductivityAI {
    constructor() {
        this.patterns = new Map(); // Almacena patrones aprendidos por usuario
        this.userBehavior = new Map(); // Comportamiento del usuario
        this.fileRelations = new Map(); // Relaciones archivo-evento
        this.confidence_threshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7;
    }

    /**
     * Inicializa el análisis para un usuario
     */
    async initializeForUser(userId, accessToken) {
        try {
            // Crear cliente de Microsoft Graph
            const graphClient = Client.init({
                authProvider: (done) => {
                    done(null, accessToken);
                }
            });

            // Cargar patrones existentes del usuario
            await this.loadUserPatterns(userId);
            
            // Analizar eventos recientes
            await this.analyzeRecentEvents(userId, graphClient);
            
            return {
                success: true,
                patternsLoaded: this.patterns.get(userId)?.length || 0
            };
            
        } catch (error) {
            console.error('Error inicializando IA para usuario:', error);
            throw error;
        }
    }

    /**
     * Analiza un evento y sugiere archivos relacionados
     */
    async analyzeEventAndSuggestFiles(userId, event, userFiles, accessToken) {
        try {
            console.log(`Analizando evento: ${event.subject}`);
            
            // Extraer información relevante del evento
            const eventContext = this.extractEventContext(event);
            
            // Obtener archivos candidatos basados en diferentes criterios
            const candidates = await this.getCandidateFiles(userId, eventContext, userFiles);
            
            // Calcular puntuaciones de relevancia
            const scoredFiles = await this.scoreFileRelevance(userId, eventContext, candidates);
            
            // Filtrar por umbral de confianza
            const suggestions = scoredFiles.filter(file => file.confidence >= this.confidence_threshold);
            
            // Ordenar por relevancia descendente
            suggestions.sort((a, b) => b.confidence - a.confidence);
            
            // Limitar a máximo 5 sugerencias
            const finalSuggestions = suggestions.slice(0, 5);
            
            // Registrar análisis para aprendizaje
            await this.logAnalysis(userId, event, finalSuggestions);
            
            return {
                eventId: event.id,
                eventSubject: event.subject,
                suggestions: finalSuggestions,
                totalCandidates: candidates.length,
                analysisTime: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error analizando evento:', error);
            throw error;
        }
    }

    /**
     * Extrae contexto relevante de un evento
     */
    extractEventContext(event) {
        const context = {
            title: event.subject || '',
            description: event.body?.content || '',
            location: event.location?.displayName || '',
            attendees: event.attendees?.map(a => a.emailAddress?.name || a.emailAddress?.address) || [],
            categories: event.categories || [],
            start: event.start?.dateTime,
            end: event.end?.dateTime,
            isRecurring: !!event.recurrence,
            importance: event.importance || 'normal'
        };

        // Extraer palabras clave relevantes
        const text = `${context.title} ${context.description} ${context.location}`.toLowerCase();
        context.keywords = this.extractKeywords(text);
        
        // Detectar tipo de evento
        context.eventType = this.detectEventType(context);
        
        // Calcular duración
        if (context.start && context.end) {
            const start = new Date(context.start);
            const end = new Date(context.end);
            context.duration = (end - start) / (1000 * 60); // minutos
        }
        
        return context;
    }

    /**
     * Extrae palabras clave del texto
     */
    extractKeywords(text) {
        // Palabras comunes a ignorar
        const stopWords = new Set([
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
            'da', 'su', 'por', 'son', 'con', 'una', 'sus', 'me', 'si', 'sin', 'sobre', 'este',
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is'
        ]);
        
        const words = text
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => 
                word.length > 2 && 
                !stopWords.has(word) && 
                !/^\d+$/.test(word)
            );
            
        // Contar frecuencia
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        // Devolver palabras más frecuentes
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Detecta el tipo de evento basado en el contexto
     */
    detectEventType(context) {
        const { title, description, keywords } = context;
        const text = `${title} ${description}`.toLowerCase();
        
        // Patrones para diferentes tipos de eventos
        const patterns = {
            meeting: /\b(reunión|meeting|junta|call|videoconferencia|zoom|teams)\b/,
            presentation: /\b(presentación|presentation|demo|demostración|pitch)\b/,
            project: /\b(proyecto|project|desarrollo|development|planificación)\b/,
            training: /\b(capacitación|training|curso|workshop|formación)\b/,
            review: /\b(revisión|review|evaluación|assessment|feedback)\b/,
            planning: /\b(planificación|planning|estrategia|strategy|roadmap)\b/,
            interview: /\b(entrevista|interview|candidato|candidate)\b/,
            client: /\b(cliente|client|customer|comercial|ventas|sales)\b/
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return type;
            }
        }
        
        return 'general';
    }

    /**
     * Obtiene archivos candidatos basados en el contexto del evento
     */
    async getCandidateFiles(userId, eventContext, userFiles) {
        const candidates = [];
        
        for (const file of userFiles) {
            let relevanceScore = 0;
            const reasons = [];
            
            // 1. Coincidencia de nombre de archivo
            const fileName = file.fileName.toLowerCase();
            for (const keyword of eventContext.keywords) {
                if (fileName.includes(keyword)) {
                    relevanceScore += 0.3;
                    reasons.push(`Nombre contiene "${keyword}"`);
                }
            }
            
            // 2. Coincidencia en metadatos/tags
            if (file.tags) {
                for (const tag of file.tags) {
                    if (eventContext.keywords.includes(tag.toLowerCase())) {
                        relevanceScore += 0.2;
                        reasons.push(`Tag coincide: "${tag}"`);
                    }
                }
            }
            
            // 3. Tipo de archivo apropiado para el evento
            const fileTypeScore = this.getFileTypeScore(file, eventContext);
            relevanceScore += fileTypeScore.score;
            if (fileTypeScore.reason) reasons.push(fileTypeScore.reason);
            
            // 4. Frecuencia de uso reciente
            const usageScore = this.getUsageScore(userId, file);
            relevanceScore += usageScore.score;
            if (usageScore.reason) reasons.push(usageScore.reason);
            
            // 5. Ubicación/carpeta relevante
            if (file.folderPath) {
                const folderScore = this.getFolderScore(file.folderPath, eventContext);
                relevanceScore += folderScore.score;
                if (folderScore.reason) reasons.push(folderScore.reason);
            }
            
            // 6. Historial de relaciones previas
            const historyScore = this.getHistoryScore(userId, file, eventContext);
            relevanceScore += historyScore.score;
            if (historyScore.reason) reasons.push(historyScore.reason);
            
            if (relevanceScore > 0) {
                candidates.push({
                    ...file,
                    baseRelevance: relevanceScore,
                    reasons: reasons
                });
            }
        }
        
        return candidates;
    }

    /**
     * Calcula puntuación basada en tipo de archivo
     */
    getFileTypeScore(file, eventContext) {
        const extension = file.fileName.split('.').pop().toLowerCase();
        const { eventType, duration } = eventContext;
        
        // Mapeo de tipos de evento a tipos de archivo preferidos
        const typePreferences = {
            presentation: {
                'pptx': 0.4, 'ppt': 0.4, 'pdf': 0.3, 'docx': 0.2
            },
            meeting: {
                'docx': 0.3, 'pdf': 0.3, 'xlsx': 0.2, 'pptx': 0.2
            },
            project: {
                'xlsx': 0.4, 'docx': 0.3, 'pdf': 0.2, 'pptx': 0.2
            },
            training: {
                'pdf': 0.4, 'pptx': 0.3, 'docx': 0.3
            },
            review: {
                'pdf': 0.3, 'docx': 0.3, 'xlsx': 0.2
            }
        };
        
        const preferences = typePreferences[eventType] || typePreferences.meeting;
        const score = preferences[extension] || 0;
        
        if (score > 0) {
            return {
                score,
                reason: `Tipo de archivo apropiado para ${eventType}`
            };
        }
        
        return { score: 0 };
    }

    /**
     * Calcula puntuación basada en uso reciente
     */
    getUsageScore(userId, file) {
        const behavior = this.userBehavior.get(userId) || {};
        const fileUsage = behavior[file._id] || { lastAccessed: null, frequency: 0 };
        
        if (!fileUsage.lastAccessed) {
            return { score: 0 };
        }
        
        const daysSinceAccess = (Date.now() - new Date(fileUsage.lastAccessed)) / (1000 * 60 * 60 * 24);
        
        let score = 0;
        let reason = '';
        
        if (daysSinceAccess <= 1) {
            score = 0.3;
            reason = 'Usado recientemente (último día)';
        } else if (daysSinceAccess <= 7) {
            score = 0.2;
            reason = 'Usado recientemente (última semana)';
        } else if (daysSinceAccess <= 30) {
            score = 0.1;
            reason = 'Usado recientemente (último mes)';
        }
        
        // Bonus por frecuencia
        if (fileUsage.frequency > 5) {
            score += 0.1;
            reason += ', uso frecuente';
        }
        
        return { score, reason };
    }

    /**
     * Calcula puntuación basada en carpeta/ubicación
     */
    getFolderScore(folderPath, eventContext) {
        const folder = folderPath.toLowerCase();
        const { keywords, eventType } = eventContext;
        
        let score = 0;
        const reasons = [];
        
        // Coincidencia de palabras clave en la ruta de la carpeta
        for (const keyword of keywords) {
            if (folder.includes(keyword)) {
                score += 0.15;
                reasons.push(`Carpeta relacionada: "${keyword}"`);
            }
        }
        
        // Carpetas típicas por tipo de evento
        const folderPatterns = {
            project: /\b(proyecto|project|desarrollo|dev)\b/,
            presentation: /\b(presentacion|presentation|demo)\b/,
            meeting: /\b(reunión|meeting|junta)\b/,
            client: /\b(cliente|client|customer)\b/
        };
        
        const pattern = folderPatterns[eventType];
        if (pattern && pattern.test(folder)) {
            score += 0.2;
            reasons.push(`Carpeta típica para ${eventType}`);
        }
        
        return {
            score,
            reason: reasons.join(', ')
        };
    }

    /**
     * Calcula puntuación basada en historial
     */
    getHistoryScore(userId, file, eventContext) {
        const relations = this.fileRelations.get(userId) || [];
        
        // Buscar relaciones previas con eventos similares
        const similarEvents = relations.filter(relation => 
            this.calculateEventSimilarity(relation.eventContext, eventContext) > 0.7
        );
        
        const fileRelations = similarEvents.filter(relation => 
            relation.fileId === file._id && relation.wasAccepted
        );
        
        if (fileRelations.length > 0) {
            const score = Math.min(0.3, fileRelations.length * 0.1);
            return {
                score,
                reason: `Usado en eventos similares (${fileRelations.length} veces)`
            };
        }
        
        return { score: 0 };
    }

    /**
     * Calcula puntuaciones finales de relevancia
     */
    async scoreFileRelevance(userId, eventContext, candidates) {
        const scoredFiles = [];
        
        for (const candidate of candidates) {
            // Aplicar algoritmo de machine learning simulado
            const mlScore = await this.applyMLModel(userId, candidate, eventContext);
            
            // Combinar puntuaciones
            const finalScore = (candidate.baseRelevance * 0.7) + (mlScore * 0.3);
            
            // Convertir a confianza (0-1)
            const confidence = Math.min(1, Math.max(0, finalScore));
            
            if (confidence > 0.1) { // Umbral mínimo
                scoredFiles.push({
                    fileId: candidate._id,
                    fileName: candidate.fileName,
                    filePath: candidate.filePath,
                    fileType: candidate.fileName.split('.').pop(),
                    confidence: parseFloat(confidence.toFixed(3)),
                    reasons: candidate.reasons,
                    lastModified: candidate.lastModified,
                    size: candidate.size,
                    thumbnailUrl: candidate.thumbnailUrl,
                    downloadUrl: `/api/files/download/${candidate._id}`,
                    editUrl: this.supportsOnlineEdit(candidate.fileName) ? 
                        `/api/office/edit/${candidate._id}` : null
                });
            }
        }
        
        return scoredFiles;
    }

    /**
     * Simula aplicación de modelo de machine learning
     */
    async applyMLModel(userId, file, eventContext) {
        // Simular análisis ML más sofisticado
        const patterns = this.patterns.get(userId) || [];
        
        if (patterns.length === 0) {
            return 0.5; // Puntuación neutral si no hay patrones
        }
        
        // Buscar patrones similares
        const similarPatterns = patterns.filter(pattern => 
            this.calculateEventSimilarity(pattern.eventContext, eventContext) > 0.6
        );
        
        if (similarPatterns.length === 0) {
            return 0.4; // Puntuación baja si no hay patrones similares
        }
        
        // Calcular puntuación basada en éxito histórico
        const successRate = similarPatterns.filter(p => p.wasSuccessful).length / similarPatterns.length;
        
        return successRate * 0.8; // Factor de confianza
    }

    /**
     * Calcula similitud entre eventos
     */
    calculateEventSimilarity(event1, event2) {
        let similarity = 0;
        let factors = 0;
        
        // Similitud en título
        if (event1.title && event2.title) {
            const titleSim = this.calculateTextSimilarity(event1.title, event2.title);
            similarity += titleSim * 0.3;
            factors += 0.3;
        }
        
        // Similitud en tipo de evento
        if (event1.eventType === event2.eventType) {
            similarity += 0.2;
        }
        factors += 0.2;
        
        // Similitud en palabras clave
        if (event1.keywords && event2.keywords) {
            const keywordSim = this.calculateArraySimilarity(event1.keywords, event2.keywords);
            similarity += keywordSim * 0.3;
            factors += 0.3;
        }
        
        // Similitud en duración
        if (event1.duration && event2.duration) {
            const durationSim = 1 - Math.abs(event1.duration - event2.duration) / Math.max(event1.duration, event2.duration);
            similarity += durationSim * 0.2;
            factors += 0.2;
        }
        
        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * Calcula similitud entre textos
     */
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Calcula similitud entre arrays
     */
    calculateArraySimilarity(arr1, arr2) {
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    /**
     * Verifica si un archivo soporta edición online
     */
    supportsOnlineEdit(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);
    }

    /**
     * Registra análisis para aprendizaje futuro
     */
    async logAnalysis(userId, event, suggestions) {
        try {
            const patterns = this.patterns.get(userId) || [];
            
            const analysis = {
                eventId: event.id,
                eventContext: this.extractEventContext(event),
                suggestions: suggestions.map(s => ({
                    fileId: s.fileId,
                    confidence: s.confidence,
                    reasons: s.reasons
                })),
                timestamp: new Date(),
                wasProcessed: false
            };
            
            patterns.push(analysis);
            
            // Mantener solo los últimos 100 análisis
            if (patterns.length > 100) {
                patterns.splice(0, patterns.length - 100);
            }
            
            this.patterns.set(userId, patterns);
            
            // Persistir patrones (implementar según tu base de datos)
            await this.saveUserPatterns(userId);
            
        } catch (error) {
            console.error('Error registrando análisis:', error);
        }
    }

    /**
     * Registra feedback del usuario
     */
    async recordUserFeedback(userId, eventId, fileId, action, timestamp) {
        try {
            const patterns = this.patterns.get(userId) || [];
            
            // Encontrar el análisis correspondiente
            const analysis = patterns.find(p => p.eventId === eventId);
            
            if (analysis) {
                analysis.wasProcessed = true;
                
                // Registrar acción específica
                const suggestion = analysis.suggestions.find(s => s.fileId === fileId);
                if (suggestion) {
                    suggestion.userAction = action; // 'accepted', 'rejected', 'ignored'
                    suggestion.actionTimestamp = timestamp;
                }
                
                // Actualizar comportamiento del usuario
                this.updateUserBehavior(userId, fileId, action);
                
                // Crear relación archivo-evento si fue aceptado
                if (action === 'accepted') {
                    this.addFileEventRelation(userId, {
                        eventId,
                        fileId,
                        eventContext: analysis.eventContext,
                        wasAccepted: true,
                        timestamp
                    });
                }
            }
            
            await this.saveUserPatterns(userId);
            
        } catch (error) {
            console.error('Error registrando feedback:', error);
        }
    }

    /**
     * Actualiza comportamiento del usuario
     */
    updateUserBehavior(userId, fileId, action) {
        const behavior = this.userBehavior.get(userId) || {};
        
        if (!behavior[fileId]) {
            behavior[fileId] = {
                frequency: 0,
                lastAccessed: null,
                acceptanceRate: 0,
                totalSuggestions: 0
            };
        }
        
        const fileBehavior = behavior[fileId];
        fileBehavior.totalSuggestions++;
        
        if (action === 'accepted') {
            fileBehavior.frequency++;
            fileBehavior.lastAccessed = new Date();
            fileBehavior.acceptanceRate = fileBehavior.frequency / fileBehavior.totalSuggestions;
        }
        
        this.userBehavior.set(userId, behavior);
    }

    /**
     * Añade relación archivo-evento
     */
    addFileEventRelation(userId, relation) {
        const relations = this.fileRelations.get(userId) || [];
        relations.push(relation);
        
        // Mantener solo las últimas 200 relaciones
        if (relations.length > 200) {
            relations.splice(0, relations.length - 200);
        }
        
        this.fileRelations.set(userId, relations);
    }

    /**
     * Carga patrones del usuario desde la base de datos
     */
    async loadUserPatterns(userId) {
        try {
            // Implementar carga desde base de datos
            // Por ahora, inicializar vacío
            if (!this.patterns.has(userId)) {
                this.patterns.set(userId, []);
            }
            
            if (!this.userBehavior.has(userId)) {
                this.userBehavior.set(userId, {});
            }
            
            if (!this.fileRelations.has(userId)) {
                this.fileRelations.set(userId, []);
            }
            
        } catch (error) {
            console.error('Error cargando patrones del usuario:', error);
        }
    }

    /**
     * Guarda patrones del usuario en la base de datos
     */
    async saveUserPatterns(userId) {
        try {
            // Implementar guardado en base de datos
            console.log(`Guardando patrones para usuario ${userId}`);
            
            const data = {
                userId,
                patterns: this.patterns.get(userId) || [],
                behavior: this.userBehavior.get(userId) || {},
                relations: this.fileRelations.get(userId) || [],
                lastUpdated: new Date()
            };
            
            // Aquí guardarías en MongoDB o tu base de datos preferida
            // await db.collection('user_ai_patterns').updateOne(
            //     { userId },
            //     { $set: data },
            //     { upsert: true }
            // );
            
        } catch (error) {
            console.error('Error guardando patrones del usuario:', error);
        }
    }

    /**
     * Analiza eventos recientes para bootstrapping
     */
    async analyzeRecentEvents(userId, graphClient) {
        try {
            // Obtener eventos de los últimos 30 días
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const events = await graphClient
                .api('/me/events')
                .filter(`start/dateTime ge '${thirtyDaysAgo.toISOString()}'`)
                .select('id,subject,body,start,end,location,attendees,categories')
                .top(50)
                .get();
            
            // Analizar patrones en eventos históricos
            const eventPatterns = [];
            
            for (const event of events.value || []) {
                const context = this.extractEventContext(event);
                eventPatterns.push({
                    eventId: event.id,
                    eventContext: context,
                    timestamp: new Date(event.start?.dateTime || Date.now()),
                    wasHistorical: true
                });
            }
            
            // Actualizar patrones del usuario
            const existingPatterns = this.patterns.get(userId) || [];
            this.patterns.set(userId, [...existingPatterns, ...eventPatterns]);
            
        } catch (error) {
            console.error('Error analizando eventos recientes:', error);
        }
    }

    /**
     * Obtiene estadísticas de rendimiento de la IA
     */
    getPerformanceStats(userId) {
        const patterns = this.patterns.get(userId) || [];
        const behavior = this.userBehavior.get(userId) || {};
        const relations = this.fileRelations.get(userId) || [];
        
        const processedAnalyses = patterns.filter(p => p.wasProcessed);
        const acceptedSuggestions = processedAnalyses.reduce((acc, analysis) => {
            return acc + (analysis.suggestions?.filter(s => s.userAction === 'accepted').length || 0);
        }, 0);
        
        const totalSuggestions = processedAnalyses.reduce((acc, analysis) => {
            return acc + (analysis.suggestions?.length || 0);
        }, 0);
        
        const acceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;
        
        return {
            totalAnalyses: patterns.length,
            processedAnalyses: processedAnalyses.length,
            totalSuggestions,
            acceptedSuggestions,
            acceptanceRate: parseFloat((acceptanceRate * 100).toFixed(1)),
            learnedPatterns: patterns.length,
            trackedFiles: Object.keys(behavior).length,
            fileEventRelations: relations.length,
            lastActivity: patterns.length > 0 ? patterns[patterns.length - 1].timestamp : null
        };
    }
}

module.exports = ProductivityAI;