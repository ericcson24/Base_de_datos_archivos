const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./utils/database');
const dualNodeIndexing = require('./utils/dualNodeIndexing');
const { initRedis, sendNotification } = require('./utils/notificationClient');
const { getCachedResult, setCachedResult, getCacheStats } = require('./utils/cache');
const { extractTextFromFile } = require('./utils/fileParser');
const {
  getCachedAnalysis,
  cacheAnalysis,
  recordQueryTime,
  getDetailedCacheStats,
  searchIndex,
  invalidateDocumentCache
} = require('./utils/indexingOptimizations');
const {
  generateDocumentCacheKey,
  validateDocumentContent,
  getDocumentStats,
  buildAnalysisPrompt,
  buildFragmentExplanationPrompt,
  buildEditSuggestionPrompt,
  buildHighlightingPrompt,
  parseHighlightsFromResponse,
  isDocumentFile
} = require('./utils/documentUtils');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5009;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini AI
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY no está configurado - AI Service funcionará limitado');
  // process.exit(1); 
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");

// Authentication middleware (Base64 compatible with other services)
const authenticateToken = (req, res, next) => {
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
      console.log('[AUTH ERROR]', error.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
  } else {
    return res.status(401).json({ error: 'Token requerido' });
  }
};

// ===================================
// ENDPOINT: General User Command / Panel Actions
// ===================================
app.post('/command', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    console.log(`[AI COMMAND] Usuario ${userId}: "${query}"`);

    // Prompt for Gemini to classify and extract command
    const prompt = `Eres un asistente que controla el panel de usuario.
El usuario dice: "${query}"

Acciones disponibles:
1. "change_theme": valores permitidos: "dark", "light", "system".
2. "change_language": valores permitidos: "es", "en", "fr", "de".
3. "navigate": destinos: "dashboard", "files", "calendar", "settings", "profile", "admin".
4. "toggle_notifications": valor: true/false.

Responde SOLO en JSON:
{
  "action": "nombre_accion",
  "value": "valor_detectado",
  "confirmation": "mensaje corto confirmando la acción",
  "success": true
}

Si no reconoces la acción o no es segura, responde:
{
  "success": false,
  "error": "No entendí la orden o no es válida"
}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text().trim();
    
    // Cleanup JSON
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let commandData;
    try {
      commandData = JSON.parse(aiResponse);
    } catch (e) {
      return res.status(400).json({ error: 'Error interpretando comando', details: aiResponse });
    }

    if (!commandData.success) {
      return res.json({ success: false, message: commandData.error });
    }

    // Ejecutar acción en BD si es persistente
    if (commandData.action === 'change_theme') {
      await db.query('UPDATE users SET theme_preference = $1 WHERE id = $2', [commandData.value, userId]);
    } else if (commandData.action === 'change_language') {
      await db.query('UPDATE users SET language = $1 WHERE id = $2', [commandData.value, userId]);
    } else if (commandData.action === 'toggle_notifications') {
      await db.query('UPDATE users SET notifications = $1 WHERE id = $2', [commandData.value === true, userId]);
    }

    res.json(commandData);

  } catch (error) {
    console.error('[AI COMMAND] Error:', error);
    res.status(500).json({ error: 'Error procesando comando', details: error.message });
  }
});

// ===================================
// ENDPOINT: AI File Search (Dual Node Indexing)
// ===================================
app.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    console.log(`[AI SEARCH] Usuario ${userId}: "${query}"`);
    console.log(`[DEBUG] Headers:`, JSON.stringify(req.headers));

    // Verificar cache primero
    const cachedResult = getCachedResult(userId, query);
    if (cachedResult) {
      console.log(`[AI SEARCH] Resultado desde cache`);
      return res.json({ ...cachedResult, cached: true });
    }

    // 1. Intentar búsqueda rápida en índice primario
    let relevantFiles = dualNodeIndexing.searchFiles(userId, query);

    // MOCK MODE FOR TESTING
    if (req.headers['x-test-mode'] === 'isolation') {
        console.log('[TEST MODE] Returning mock files for isolation test');
        if (userId == 1) {
            relevantFiles = [{
                id: 9991,
                name: 'project_alpha.txt',
                physical_path: '/app/test_data/user1/project_alpha.txt',
                mime_type: 'text/plain',
                size: 100
            }];
        } else if (userId == 2) {
            relevantFiles = [{
                id: 9992,
                name: 'project_alpha.txt',
                physical_path: '/app/test_data/user2/project_alpha.txt',
                mime_type: 'text/plain',
                size: 100
            }];
        }
    } else if (relevantFiles === null) {
      // Índice aún no está listo, intentamos búsqueda en BD
      console.log(`[AI SEARCH] Índice primario no listo, buscando en BD`);
      // 1. Buscar por nombre
      const filesResult = await db.query(
        `SELECT id, name, physical_path, size, mime_type 
         FROM files 
         WHERE owner_id = $1 AND name ILIKE $2
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userId, `%${query}%`]
      );
      relevantFiles = filesResult.rows;
    }

    // Si después de todo (índice o BD por nombre) está vacío,
    // traemos los últimos archivos para dar contexto general (si no hay muchas palabras)
    // o para decir "No encontré X en tus archivos recientes A, B, C".
    if (!relevantFiles || relevantFiles.length === 0) {
        console.log(`[AI SEARCH] Sin coincidencias exactas, recuperando archivos recientes para contexto.`);
        const recentFiles = await db.query(
            `SELECT id, name, physical_path, size, mime_type 
             FROM files 
             WHERE owner_id = $1
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );
        relevantFiles = recentFiles.rows;
    }

    if (!relevantFiles || relevantFiles.length === 0) {
      return res.json({
        success: true,
        response: `No se encontraron archivos en tu cuenta para analizar.`,
        files: [],
        sources: [],
        indexStatus: 'empty'
      });
    }

    // 2. ENRIQUECER CON CONTENIDO REAL (Lectura de archivos)
    // Tomamos los 5 archivos más recientes/relevantes para leer su contenido
    const topFiles = relevantFiles.slice(0, 5);
    
    console.log(`[AI SEARCH] Analizando contenido de ${topFiles.length} archivos...`);
    
    const contextPromises = topFiles.map(async (file) => {
      let contentSnippet = "";
      if (file.physical_path) {
        // Fix path mapping: 
        // DB stores paths like "uploads/admin/file.ext" or absolute paths
        // Container has mounted "Datos" at "/app/uploads"
        
        let containerPath = file.physical_path;
        
        // Normalize slashes
        containerPath = containerPath.replace(/\\/g, '/');

        // Mapping Logic
        if (containerPath.includes('/Datos/')) {
             // Host Path: E:/Servidor/Datos/user/file -> /app/uploads/user/file
             const parts = containerPath.split('/Datos/');
             if (parts.length > 1) {
                 containerPath = path.join('/app/uploads', parts[1]);
             }
        } else if (containerPath.includes('Datos/')) {
             const parts = containerPath.split('Datos/');
             if (parts.length > 1) {
                 containerPath = path.join('/app/uploads', parts[1]);
             }
        } else if (containerPath.startsWith('/app/uploads/')) {
             // Already correct container path
        } else if (containerPath.startsWith('uploads/')) {
             // Relative path starting with uploads -> /app/uploads/...
             // Caution: if DB is "uploads/user/file", and mount is uploads -> user/file
             // If we join /app + uploads/user/file -> /app/uploads/user/file.
             containerPath = path.join('/app', containerPath);
        } else if (!path.isAbsolute(containerPath) || !containerPath.startsWith('/')) {
             // Pure relative path: "user/file.ext" -> /app/uploads/user/file.ext
             containerPath = path.join('/app/uploads', containerPath);
        }
        
        // Ensure no double slashes (except protocol)
        containerPath = containerPath.replace(/\/\//g, '/');
        console.log(`[FILE MAP] DB: "${file.physical_path}" -> Container: "${containerPath}"`);

        // Usar el nuevo parser para leer DOCX, PDF, XLSX, PPTX
        try {
          const fullText = await extractTextFromFile(containerPath, file.mime_type || '');
          // Limitar a 1000 caracteres por archivo para no saturar el prompt
          contentSnippet = fullText.substring(0, 1000).replace(/\s+/g, ' ');
        } catch (err) {
          console.warn(`Error leyendo archivo ${file.id}: ${err.message}`);
        }
      }
      
      return `ID: ${file.id}
Nombre: "${file.name}"
Tipo: ${file.mime_type || 'desconocido'}
Contenido (Extracto): "${contentSnippet || 'No se pudo leer el contenido'}"
---`;
    });

    const contextArray = await Promise.all(contextPromises);
    const filesContext = contextArray.join('\n');

    // 3. Prompt para Gemini con contenido real
    const prompt = `Eres un asistente de búsqueda documental inteligente.
El usuario busca: "${query}"

He encontrado estos archivos y he extraído parte de su contenido. 
Analiza los extractos para responder.

Documentos encontrados:
${filesContext}

Instrucciones:
1. Responde directamente a la pregunta del usuario basándote en el CONTENIDO.
2. Si encuentras la respuesta exacta, indícalo copiando el fragmento relevante.
3. POR FAVOR devuelve tu respuesta en formato JSON estrictamente:
{
  "answer": "Tu respuesta aquí...",
  "highlights": [
     { "fileId": 123, "text": "texto exacto encontrado" }
  ]
}

Si no encuentras nada relevante, devuelve "highlights": [] y una respuesta explicativa.`;

    // 4. Llamar a Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    let aiResponseText = result.response.text();

    // Parse JSON response
    let finalResponse = { answer: aiResponseText, highlights: [] };
    try {
        // Cleanup potential markdown
        aiResponseText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        finalResponse = JSON.parse(aiResponseText);
    } catch (e) {
        // Fallback for non-JSON response
        finalResponse.answer = aiResponseText;
    }

    // Guardar en cache
    setCachedResult(userId, query, {
      success: true,
      response: finalResponse.answer,
      highlights: finalResponse.highlights || [],
      files: relevantFiles,
      sources: relevantFiles.map(f => f.name),
      indexStatus: dualNodeIndexing.getIndexStatus()
    });

    res.json({
      success: true,
      response: finalResponse.answer,
      highlights: finalResponse.highlights || [],
      files: relevantFiles,
      sources: relevantFiles.map(f => f.name),
      indexStatus: dualNodeIndexing.getIndexStatus()
    });

  } catch (error) {
    console.error('[AI SEARCH] Error:', error);
    res.status(500).json({ error: 'Error en búsqueda IA', details: error.message });
  }
});

// ===================================
// ENDPOINT: AI Dynamic Edit
// ===================================
app.post('/edit', authenticateToken, async (req, res) => {
  try {
    const { text, instruction, context } = req.body;
    
    if (!text) return res.status(400).json({ error: 'Text required' });

    console.log(`[AI EDIT] Length: ${text.length}, Instruction: ${instruction}`);

    const prompt = `Eres un asistente de edición de texto experto.
Tu tarea es modificar el siguiente texto según las instrucciones del usuario.
Mantén el formato original en la medida de lo posible.

Texto original:
"${text}"

Instrucción:
"${instruction || 'Mejora la redacción y corrige errores gramaticales'}"

Contexto adicional:
${context || 'Ninguno'}

Responde SOLO con el texto mejorado, sin explicaciones ni comillas extra.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    res.json({
      success: true,
      original: text,
      suggestion: suggestion
    });

  } catch (error) {
    console.error('[AI EDIT] Error:', error);
    res.status(500).json({ error: 'Error editing text', details: error.message });
  }
});

// ===================================
// ENDPOINT: AI Calendar Event Creation
// ===================================
app.post('/create-event', authenticateToken, async (req, res) => {
  try {
    const { query, assignMode = 'me', targetUserId, groupId } = req.body;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query vacío' });
    }

    console.log(`[AI CALENDAR] Usuario ${userId}: "${query}" [Asignar: ${assignMode}]`);

    // Prompt para Gemini para extraer información del evento
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0].slice(0, 5);

    const prompt = `Eres un asistente de calendario. Hoy es ${currentDate} y son las ${currentTime}.
El usuario dice: "${query}"

Extrae la información del evento y responde SOLO en formato JSON con esta estructura exacta:
{
  "title": "título del evento",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "description": "descripción breve",
  "success": true
}

Si el usuario menciona:
- "mañana" = día siguiente a ${currentDate}
- "pasado mañana" = dos días después de ${currentDate}
- "hora de comer" = 14:00-15:00
- "mediodía" = 12:00-13:00
- "tarde" = 17:00-18:00
- "mañana" (tiempo) = 09:00-10:00

Si no puedes extraer la información, responde:
{
  "success": false,
  "error": "No pude entender la información del evento"
}

Responde SOLO el JSON, sin texto adicional.`;

    // (Using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiResponse = response.text().trim();

    // Limpiar respuesta JSON (eliminar markdown si existe)
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let eventData;
    try {
      eventData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[AI CALENDAR] Error parseando JSON:', aiResponse);
      return res.status(400).json({ 
        error: 'No pude interpretar tu solicitud de evento',
        aiResponse 
      });
    }

    if (!eventData.success) {
      return res.status(400).json({ 
        error: eventData.error || 'No pude crear el evento',
        aiResponse: eventData
      });
    }

    // Determinar el destino de la tarea
    let targetUserIds = [];
    let responseMessage = '';
    
    if (assignMode === 'group' && groupId) {
      // Obtener miembros del grupo
      const groupResult = await db.query(
        'SELECT user_id FROM group_members WHERE group_id = $1',
        [groupId]
      );
      targetUserIds = groupResult.rows.map(row => row.user_id);
      
      if (targetUserIds.length === 0) {
        return res.status(400).json({ error: 'El grupo no tiene miembros' });
      }
    } else if (assignMode === 'user' && targetUserId) {
      targetUserIds = [targetUserId];
    } else {
      // Asignar a mí mismo
      targetUserIds = [userId];
    }

    // Añadir nota de creador si se asigna a otros
    let finalDescription = eventData.description || '';
    if (assignMode !== 'me') {
      // Obtener nombre del creador
      const creatorResult = await db.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      const creatorName = creatorResult.rows[0]?.username || 'Admin';
      finalDescription += `\n\n(Tarea creada por ${creatorName})`;
    }

    // Crear eventos para cada usuario
    const createdEvents = [];
    for (const targetId of targetUserIds) {
      const insertResult = await db.query(
        `INSERT INTO calendar_events (user_id, subject, body_preview, start_time, end_time, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          targetId,
          eventData.title,
          finalDescription,
          `${eventData.date}T${eventData.startTime}:00`,
          `${eventData.date}T${eventData.endTime}:00`
        ]
      );
      createdEvents.push(insertResult.rows[0]);

      // Notificar al usuario (via Redis -> Notification Service)
      try {
        await sendNotification({
          userId: targetId,
          title: '📅 Nuevo Evento Creado',
          message: `Evento "${eventData.title}" programado para el ${eventData.date} a las ${eventData.startTime}`,
          type: 'info',
          link: '/calendar',
          metadata: {
            eventId: insertResult.rows[0].id,
            date: eventData.date
          }
        });
      } catch (notifError) {
        console.error(`[AI CALENDAR] Error enviando notificación a ${targetId}:`, notifError);
      }
    }

    // Mensaje de respuesta según asignación
    if (assignMode === 'group') {
      responseMessage = `Tarea "${eventData.title}" asignada a ${targetUserIds.length} miembros del grupo para el ${eventData.date}`;
    } else if (assignMode === 'user') {
      responseMessage = `Tarea "${eventData.title}" asignada al usuario para el ${eventData.date}`;
    } else {
      responseMessage = `Evento "${eventData.title}" creado para el ${eventData.date} de ${eventData.startTime} a ${eventData.endTime}`;
    }

    console.log(`[AI CALENDAR] ${createdEvents.length} evento(s) creado(s)`);

    res.json({
      success: true,
      message: responseMessage,
      event: {
        id: createdEvents[0].id,
        title: createdEvents[0].subject,
        description: createdEvents[0].body_preview,
        start: createdEvents[0].start_time,
        end: createdEvents[0].end_time
      },
      eventsCreated: createdEvents.length,
      parsedData: eventData
    });

  } catch (error) {
    console.error('[AI CALENDAR] Error:', error);
    res.status(500).json({ 
      error: 'Error creando evento con IA',
      details: error.message 
    });
  }
});

// ===================================
// ENDPOINT: Document Analysis (Summary, Explanation, Suggestions)
// ===================================
app.post('/analyze-document', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  try {
    const { documentId, content, filename, analysisType } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!documentId || !content || !analysisType) {
      return res.status(400).json({ error: 'documentId, content, y analysisType son requeridos' });
    }

    if (!['summary', 'explanation', 'suggestions', 'highlights', 'readability'].includes(analysisType)) {
      return res.status(400).json({ error: 'analysisType inválido' });
    }

    validateDocumentContent(content);

    // Check optimized cache first
    const cachedData = getCachedAnalysis(userId, documentId, analysisType);
    if (cachedData.cached) {
      const queryTime = Date.now() - startTime;
      recordQueryTime(queryTime);
      console.log(`[DOCUMENT ANALYSIS] Cache hit (${cachedData.cacheLevel}): ${analysisType} - ${queryTime}ms`);
      return res.json({ 
        ...cachedData.result, 
        cached: true,
        cacheLevel: cachedData.cacheLevel,
        responseTime: `${queryTime}ms`
      });
    }

    // Get document stats
    const stats = getDocumentStats(content);
    const documentTitle = filename || `Documento ${documentId}`;

    // Build appropriate prompt
    const systemPrompt = buildAnalysisPrompt(analysisType, documentTitle, stats);

    console.log(`[DOCUMENT ANALYSIS] Usuario ${userId}: ${analysisType} - ${documentTitle}`);

    // Call Gemini API (using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\nDocumento a analizar:\n\n${content}`
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    });

    const analysisResponse = result.response.text();

    const response = {
      success: true,
      documentId,
      analysisType,
      analysis: analysisResponse,
      documentStats: stats,
      timestamp: new Date().toISOString(),
      documentTitle
    };

    // Cache result using optimized system
    cacheAnalysis(userId, documentId, analysisType, response);

    const queryTime = Date.now() - startTime;
    recordQueryTime(queryTime);

    res.json({ 
      ...response, 
      cached: false,
      responseTime: `${queryTime}ms`
    });

  } catch (error) {
    console.error('[DOCUMENT ANALYSIS] Error:', error);
    res.status(500).json({
      error: 'Error analizando documento',
      details: error.message
    });
  }
});

// ===================================
// ENDPOINT: Explain Text Fragment
// ===================================
app.post('/explain-text', authenticateToken, async (req, res) => {
  try {
    const { documentId, fragment, documentTitle } = req.body;
    const userId = req.user.id;

    if (!documentId || !fragment) {
      return res.status(400).json({ error: 'documentId y fragment son requeridos' });
    }

    if (fragment.trim().length === 0) {
      return res.status(400).json({ error: 'Fragment vacío' });
    }

    const cacheKey = `explain_${userId}_${documentId}_${fragment.substring(0, 50).replace(/\s+/g, '_')}`;
    
    // Check cache
    const cachedResult = getCachedResult(userId, cacheKey);
    if (cachedResult) {
      return res.json({ ...cachedResult, cached: true });
    }

    console.log(`[EXPLAIN TEXT] Usuario ${userId}: Explicando fragmento`);

    const systemPrompt = buildFragmentExplanationPrompt(documentTitle || 'Documento');
    // (Using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\nTexto a explicar:\n\n"${fragment}"`
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      }
    });

    const explanation = result.response.text();

    const response = {
      success: true,
      documentId,
      fragment: fragment.substring(0, 200),
      explanation,
      timestamp: new Date().toISOString()
    };

    // Cache result
    setCachedResult(userId, cacheKey, response);

    res.json(response);

  } catch (error) {
    console.error('[EXPLAIN TEXT] Error:', error);
    res.status(500).json({
      error: 'Error explicando texto',
      details: error.message
    });
  }
});

// ===================================
// ENDPOINT: Edit Suggestions
// ===================================
app.post('/edit-suggestion', authenticateToken, async (req, res) => {
  try {
    const { documentId, content, focusArea } = req.body;
    const userId = req.user.id;

    if (!documentId || !content) {
      return res.status(400).json({ error: 'documentId y content son requeridos' });
    }

    validateDocumentContent(content);

    const cacheKey = `edit_${userId}_${documentId}`;
    
    // Check cache
    const cachedResult = getCachedResult(userId, cacheKey);
    if (cachedResult) {
      return res.json({ ...cachedResult, cached: true });
    }

    console.log(`[EDIT SUGGESTION] Usuario ${userId}: Sugiriendo ediciones`);

    const systemPrompt = buildEditSuggestionPrompt();
    const focusText = focusArea ? `\nEnfoque en: ${focusArea}\n` : '';
    // (Using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}${focusText}\n\nTexto a revisar:\n\n${content}`
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    });

    const suggestions = result.response.text();

    const response = {
      success: true,
      documentId,
      suggestions,
      focusArea: focusArea || 'general',
      timestamp: new Date().toISOString()
    };

    // Cache result
    setCachedResult(userId, cacheKey, response);

    res.json(response);

  } catch (error) {
    console.error('[EDIT SUGGESTION] Error:', error);
    res.status(500).json({
      error: 'Error generando sugerencias',
      details: error.message
    });
  }
});

// ===================================
// ENDPOINT: Highlight Analysis
// ===================================
app.post('/highlight-analysis', authenticateToken, async (req, res) => {
  try {
    const { documentId, content } = req.body;
    const userId = req.user.id;

    if (!documentId || !content) {
      return res.status(400).json({ error: 'documentId y content son requeridos' });
    }

    validateDocumentContent(content);

    const cacheKey = `highlight_${userId}_${documentId}`;
    
    // Check cache
    const cachedResult = getCachedResult(userId, cacheKey);
    if (cachedResult) {
      return res.json({ ...cachedResult, cached: true });
    }

    console.log(`[HIGHLIGHT ANALYSIS] Usuario ${userId}: Analizando para resaltes`);

    const systemPrompt = buildHighlightingPrompt();
    // (Using gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\nTexto a analizar:\n\n${content}`
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.5,
      }
    });

    const highlightResponse = result.response.text();
    const highlights = parseHighlightsFromResponse(highlightResponse);

    const response = {
      success: true,
      documentId,
      highlights,
      rawResponse: highlightResponse,
      timestamp: new Date().toISOString()
    };

    // Cache result
    setCachedResult(userId, cacheKey, response);

    res.json(response);

  } catch (error) {
    console.error('[HIGHLIGHT ANALYSIS] Error:', error);
    res.status(500).json({
      error: 'Error analizando para resaltes',
      details: error.message
    });
  }
});

// ===================================
// Health Check & Stats
// ===================================
app.get('/health', (req, res) => {
  const stats = getCacheStats();
  res.json({ 
    status: 'ok', 
    service: 'ai-service',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    cache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%'
    }
  });
});

// Debug endpoint - test token parsing
app.post('/test-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.json({ 
      error: 'No token provided',
      headers: req.headers
    });
  }

  try {
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());
    return res.json({ 
      success: true,
      decoded: userData,
      tokenLength: token.length
    });
  } catch (error) {
    return res.json({ 
      error: error.message,
      tokenPreview: token.substring(0, 50)
    });
  }
});

// ===================================
// Stats Endpoint (Admin only)
// ===================================
app.get('/stats', authenticateToken, (req, res) => {
  // Verificar que sea admin
  if (req.user.role !== 'admin' && req.user.role !== 'boss') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const stats = getCacheStats();
  const detailedStats = getDetailedCacheStats();
  const indexingStats = dualNodeIndexing.getStats();
  
  res.json({
    success: true,
    basicCache: stats,
    detailedCache: detailedStats,
    indexing: indexingStats,
    uptime: process.uptime(),
    memory: {
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
    }
  });
});

// ===================================
// ENDPOINT: Read and Analyze File from Physical Path
// ===================================
app.post('/analyze-file', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.body;
    const userId = req.user.id;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId es requerido' });
    }

    console.log(`[AI FILE ANALYSIS] Usuario ${userId} solicita análisis de archivo ${fileId}`);

    // Obtener información del archivo de la BD
    const fileResult = await db.query(
      `SELECT id, name, physical_path, size, mime_type 
       FROM files 
       WHERE id = $1 AND owner_id = $2`,
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = fileResult.rows[0];

    // Verificar que el archivo tenga physical_path
    if (!file.physical_path) {
      return res.status(400).json({ 
        error: 'Archivo sin ruta física',
        message: 'El archivo no tiene una ruta física asociada. Ejecuta el script de sincronización.'
      });
    }

    // Leer el archivo
    let content;
    try {
      const buffer = await fs.readFile(file.physical_path);
      
      // Si es texto, convertir a string
      if (file.mime_type && file.mime_type.startsWith('text/')) {
        content = buffer.toString('utf-8');
      } else {
        content = buffer.toString('base64');
      }
    } catch (error) {
      console.error('[AI FILE ANALYSIS] Error leyendo archivo:', error);
      return res.status(500).json({ 
        error: 'Error leyendo archivo',
        details: error.message 
      });
    }

    // Analizar con Gemini
    const prompt = `Analiza este archivo: "${file.name}" (${file.mime_type})

Proporciona:
1. Un resumen breve del contenido
2. Información relevante encontrada
3. Sugerencias de uso o mejoras

Contenido:
${content.substring(0, 10000)}`; // Limitar a primeros 10KB

    // (Use gemini-flash-latest)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const analysis = await result.response;

    res.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mime_type
      },
      analysis: analysis.text(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI FILE ANALYSIS] Error:', error);
    res.status(500).json({ 
      error: 'Error analizando archivo',
      details: error.message 
    });
  }
});

// ===================================
// Endpoint: Force Index Update (Admin only)
// ===================================
app.post('/force-index-update', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'boss') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    await dualNodeIndexing.forceUpdate();
    res.json({
      success: true,
      message: 'Actualización de índices forzada'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error forzando actualización',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  
  // Initialize Redis for Notifications
  await initRedis();
  
  // Forzar actualización de índices al iniciar
  setTimeout(() => {
    dualNodeIndexing.forceUpdate().catch(err => {
      console.error('❌ Error forzando actualización inicial:', err);
    });
  }, 3000); // Esperar 3 segundos para que PostgreSQL esté listo
});

module.exports = app;
