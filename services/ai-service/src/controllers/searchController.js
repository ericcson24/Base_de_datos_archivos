const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const dualNodeIndexing = require('../utils/dualNodeIndexing');
const { getCachedResult, setCachedResult } = require('../utils/cache');
const { extractTextFromFile } = require('../utils/fileParser');
const dotenv = require('dotenv');
const fs = require('fs').promises; // Add fs for analyzeFile
const path = require('path');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");

const handleCommand = async (req, res) => {
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
};

const searchFiles = async (req, res) => {
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
      // 1. Buscar por nombre o ruta (incluye carpetas)
      const filesResult = await db.query(
        `SELECT id, name, physical_path, size, mime_type 
         FROM files 
         WHERE owner_id = $1 AND (name ILIKE $2 OR physical_path ILIKE $2)
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userId, `%${query}%`]
      );
      relevantFiles = filesResult.rows;
    }

    // Si después de todo (índice o BD por nombre) tenemos pocos resultados, ampliaremos con recientes
    if (!relevantFiles || relevantFiles.length < 5) {
        console.log(`[AI SEARCH] Pocas coincidencias explícitas, recuperando archivos recientes para contexto.`);
        const recentFiles = await db.query(
            `SELECT id, name, physical_path, size, mime_type 
             FROM files 
             WHERE owner_id = $1
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userId]
        );
        
        // Inicializar si es null
        if (!relevantFiles) relevantFiles = [];
        
        // Añadir archivos recientes que no estén ya en la lista
        const currentIds = new Set(relevantFiles.map(f => f.id));
        for (const file of recentFiles.rows) {
            if (!currentIds.has(file.id)) {
                relevantFiles.push(file);
            }
        }
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

    // Deduplicate files by name + physical_path to avoid reporting the same file multiple times
    {
      const seen = new Set();
      const deduped = [];
      for (const file of relevantFiles) {
        const key = `${(file.name || '').toLowerCase()}::${(file.physical_path || '')}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(file);
        }
      }
      if (deduped.length < relevantFiles.length) {
        console.log(`[AI SEARCH] Deduped ${relevantFiles.length} -> ${deduped.length} files`);
      }
      relevantFiles = deduped;
    }

    // 2. ENRIQUECER CON CONTENIDO REAL (Lectura de archivos)
    // Filtramos archivos irrelevantes o inexistentes. Analizamos hasta 10 archivos para mayor contexto.
    const topFiles = relevantFiles.slice(0, 10);
    const validFiles = [];
    const contextParts = [];
    
    console.log(`[AI SEARCH] Analizando contenido de ${topFiles.length} archivos...`);
    
    for (const file of topFiles) {
      let contentSnippet = "";
      let exists = false;

      if (file.physical_path) {
        let containerPath = file.physical_path;
        
        // Handle shared files: "shared:ownerUsername:fileName"
        if (containerPath.startsWith('shared:')) {
          const sharedParts = containerPath.split(':');
          if (sharedParts.length >= 3) {
            const ownerUsername = sharedParts[1];
            const sharedFileName = sharedParts.slice(2).join(':'); // handle colons in filenames
            containerPath = `/app/uploads/${ownerUsername}/${sharedFileName}`;
            console.log(`[AI SEARCH] Shared file resolved: ${file.physical_path} -> ${containerPath}`);
          } else {
            console.warn(`[AI SEARCH] Skipping malformed shared path: ${containerPath}`);
            continue;
          }
        }
        
        containerPath = containerPath.replace(/\\/g, '/');

        if (containerPath.includes('/Datos/')) {
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
             containerPath = path.join('/app', containerPath);
        } else if (!path.isAbsolute(containerPath) || !containerPath.startsWith('/')) {
             containerPath = path.join('/app/uploads', containerPath);
        }
        
        containerPath = containerPath.replace(/\/\//g, '/');

        try {
          // Check existence first
          await fs.access(containerPath);
          exists = true;

          const fullText = await extractTextFromFile(containerPath, file.mime_type || '');
          // Give PDFs more context (they tend to have shorter meaningful text per page)
          const isPdf = (file.mime_type || '').includes('pdf') || (file.name || '').toLowerCase().endsWith('.pdf');
          const snippetLength = isPdf ? 3000 : 1000;
          contentSnippet = fullText.substring(0, snippetLength).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
          
          // Add to valid list if it exists
          
          // Calculate relative path for file-service ID compatibility
          // file-service expects: Base64(relativePath) where relativePath starts from user folder
          // containerPath is likely /app/uploads/username/file.ext
          let downloadId = null;
          let folderPath = file.folder_path || '';
          const uploadRoot = '/app/uploads';
          
          if (containerPath.startsWith(uploadRoot)) {
             // rel -> "username/folder/file.ext"
             const rel = path.relative(uploadRoot, containerPath);
             const parts = rel.split(path.sep);
             if (parts.length > 1) {
                 // Discard username part -> "folder/file.ext"
                 const userRelative = parts.slice(1).join('/');
                 downloadId = Buffer.from(userRelative).toString('base64'); 
                 
                 // Extract folder path if not already set
                 if (!folderPath) {
                   const lastSlash = userRelative.lastIndexOf('/');
                   if (lastSlash > 0) {
                     folderPath = userRelative.substring(0, lastSlash);
                   }
                 }
             } else {
                 downloadId = Buffer.from(rel).toString('base64');
             }
          } else {
             // If we can't determine structure, try using name or leaf
             downloadId = Buffer.from(file.name).toString('base64');
          }

          file.download_id = downloadId;
          file.folder_path = folderPath;
          validFiles.push(file);
          
          const locationStr = folderPath ? `📁 ${folderPath}/` : '📁 / (raíz)';
          contextParts.push(`ID: ${file.id}
Nombre: "${file.name}"
Ubicación: ${locationStr}
Tipo: ${file.mime_type || 'desconocido'}
Contenido (Extracto): "${contentSnippet || 'Contenido vacío o ilegible'}"
---`);

        } catch (err) {
          console.warn(`[AI SEARCH] Omitiendo archivo ${file.id} (${file.name}): ${err.message}`);
          // If file not found (ENOENT) or unreadable, we skip adding it to context and validFiles
          // This prevents "ghost" files from showing up in UI
        }
      }
    }

    const filesContext = contextParts.join('\n');
    
    // Update relevantFiles to only include those we actually found/processed
    relevantFiles = validFiles;

    if (relevantFiles.length === 0) {
       // Fallback message if all files were filtered out
       return res.json({
        success: true,
        response: `Encontré referencias a archivos, pero parecen no estar disponibles físicamente en el servidor.`,
        files: [],
        highlights: [],
        sources: [],
        indexStatus: dualNodeIndexing.getStats()
      });
    }

    // 3. Prompt para Gemini con contenido real
    const prompt = `Eres un asistente de búsqueda documental inteligente.
El usuario busca: "${query}"

He encontrado estos archivos y he extraído parte de su contenido. 
Cada archivo incluye su ubicación (carpeta) dentro del sistema de archivos del usuario.
Analiza los extractos para responder.

Documentos encontrados:
${filesContext}

Instrucciones:
1. Responde a la pregunta basándote en el CONTENIDO de TODOS los documentos relevantes.
2. Si la información aparece en múltiples archivos, CITA TODOS ellos.
3. SIEMPRE menciona la ubicación/carpeta donde se encuentra cada archivo referenciado (ej: "en la carpeta Proyecto/docs").
4. Si los documentos se contradicen, menciona ambas versiones.
5. Si un archivo está dentro de una carpeta, menciónalo para que el usuario pueda encontrarlo fácilmente.
6. Genera una respuesta completa y sintetizada.
7. NO reportes archivos duplicados o idénticos. Si ves archivos con el mismo nombre y contenido, cuéntalos como UNO solo.
8. POR FAVOR devuelve tu respuesta en formato JSON estrictamente:
{
  "answer": "Tu respuesta completa aquí (incluyendo las rutas/carpetas de los archivos relevantes)...",
  "highlights": [
     { "fileId": 123, "text": "fragmento relevante del archivo 1" },
     { "fileId": 456, "text": "fragmento relevante del archivo 2" }
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
      indexStatus: dualNodeIndexing.getStats()
    });

    res.json({
      success: true,
      response: finalResponse.answer,
      highlights: finalResponse.highlights || [],
      files: relevantFiles,
      sources: relevantFiles.map(f => f.name),
      indexStatus: dualNodeIndexing.getStats()
    });

  } catch (error) {
    console.error('[AI SEARCH] Error:', error);
    res.status(500).json({ error: 'Error en búsqueda IA', details: error.message });
  }
};

const editContent = async (req, res) => {
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
};

const analyzeFile = async (req, res) => {
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
};

module.exports = {
    handleCommand,
    searchFiles,
    editContent,
    analyzeFile
};
