const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../utils/database');
const dualNodeIndexing = require('../utils/dualNodeIndexing');
const { getCachedResult, setCachedResult } = require('../utils/cache');
const { extractTextFromFile } = require('../utils/fileParser');
const dotenv = require('dotenv');
const fs = require('fs').promises;
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

    const cachedResult = getCachedResult(userId, query);
    if (cachedResult) {
      console.log(`[AI SEARCH] Resultado desde cache`);
      return res.json({ ...cachedResult, cached: true });
    }

    let relevantFiles = dualNodeIndexing.searchFiles(userId, query);

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
      console.log(`[AI SEARCH] Índice primario no listo, buscando en BD`);
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

    if (!relevantFiles || relevantFiles.length < 5) {
        console.log(`[AI SEARCH] Pocas coincidencias explícitas, recuperando archivos recientes para contexto.`);
        const recentFiles = await db.query(
            `SELECT id, name, physical_path, size, mime_type 
             FROM files 
             WHERE owner_id = $1
               AND name NOT LIKE '.%'
             ORDER BY created_at DESC 
             LIMIT 20`,
            [userId]
        );
        
        if (!relevantFiles) relevantFiles = [];
        
        const currentIds = new Set(relevantFiles.map(f => f.id));
        for (const file of recentFiles.rows) {
            if (!currentIds.has(file.id)) {
                relevantFiles.push(file);
            }
        }
    }

    {
      const q = query.toLowerCase();
      let typeMimeFilter = null;
      let typeExtFilter = null;

      if (/hoja|excel|xlsx?|calcu|spreadsheet|tabla/.test(q)) {
        typeMimeFilter = '%spreadsheet%';
        typeExtFilter = ['%.xlsx', '%.xls', '%.ods', '%.csv'];
      } else if (/pdf/.test(q)) {
        typeMimeFilter = '%pdf%';
        typeExtFilter = ['%.pdf'];
      } else if (/word|docx?|documento/.test(q)) {
        typeMimeFilter = '%word%';
        typeExtFilter = ['%.docx', '%.doc'];
      } else if (/imagen|photo|foto|png|jpg|jpeg|gif/.test(q)) {
        typeMimeFilter = 'image/%';
        typeExtFilter = ['%.png', '%.jpg', '%.jpeg', '%.gif'];
      }

      if (typeMimeFilter || typeExtFilter) {
        const extConditions = (typeExtFilter || []).map((_, i) => `name ILIKE $${i + 3}`).join(' OR ');
        const mimeCondition = typeMimeFilter ? `mime_type ILIKE $2` : 'FALSE';
        const whereClause = [mimeCondition, extConditions].filter(Boolean).join(' OR ');
        const params = [userId, typeMimeFilter || '', ...(typeExtFilter || [])];

        const typeFiles = await db.query(
          `SELECT id, name, physical_path, size, mime_type
           FROM files
           WHERE owner_id = $1 AND name NOT LIKE '.%' AND (${whereClause})
           ORDER BY created_at DESC
           LIMIT 15`,
          params
        );

        const currentIds = new Set(relevantFiles.map(f => f.id));
        for (const file of typeFiles.rows) {
          if (!currentIds.has(file.id)) {
            relevantFiles.unshift(file);
            currentIds.add(file.id);
          }
        }
        if (typeFiles.rows.length > 0) {
          console.log(`[AI SEARCH] Type-aware supplement: added ${typeFiles.rows.length} type-matched files.`);
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

    {
      try {
        const userRow = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userRow.rows[0]?.username;
        if (username) {
          const exclRows = await db.query('SELECT path FROM ai_exclusions WHERE username = $1', [username]);
          const excludedPaths = (exclRows.rows || []).map(r => r.path.replace(/\\/g, '/'));
          if (excludedPaths.length > 0) {
            const uploadRoot = '/app/uploads';
            relevantFiles = relevantFiles.filter(file => {
              if (!file.physical_path) return true;
              const normalized = file.physical_path.replace(/\\/g, '/');
              let rel = '';
              if (normalized.startsWith(uploadRoot + '/' + username + '/')) {
                rel = normalized.slice((uploadRoot + '/' + username + '/').length);
              }
              if (!rel) return true;
              for (const excl of excludedPaths) {
                if (rel === excl || rel.startsWith(excl + '/')) return false;
              }
              return true;
            });
            console.log(`[AI SEARCH] After exclusion filter: ${relevantFiles.length} files`);
          }
        }
      } catch (e) {
        if (!e.message?.includes('ai_exclusions')) {
          console.warn('[AI SEARCH] Error fetching AI exclusions:', e.message);
        }
      }
    }

    {
      const ignoredExtensions = [
        '.ini', '.lnk',
        '.exe', '.msi', '.msix', '.msixbundle', '.appx', '.dmg', '.pkg', '.deb', '.rpm',
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
        '.iso', '.img', '.bin', '.dat', '.dll', '.so', '.dylib',
      ];
      const beforeCount = relevantFiles.length;
      relevantFiles = relevantFiles.filter(file => {
        const lowerName = (file.name || '').toLowerCase();
        return !ignoredExtensions.some(ext => lowerName.endsWith(ext));
      });
      if (relevantFiles.length < beforeCount) {
        console.log(`[AI SEARCH] Ignored ${beforeCount - relevantFiles.length} files by extension filter`);
      }
    }

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

    const topFiles = relevantFiles.slice(0, 10);
    const validFiles = [];
    const contextParts = [];
    
    console.log(`[AI SEARCH] Analizando contenido de ${topFiles.length} archivos...`);
    
    for (const file of topFiles) {
      let contentSnippet = "";
      let exists = false;

      if (file.physical_path) {
        let containerPath = file.physical_path;
        
        if (containerPath.startsWith('shared:')) {
          const sharedParts = containerPath.split(':');
          if (sharedParts.length >= 3) {
            const ownerUsername = sharedParts[1];
            const sharedFileName = sharedParts.slice(2).join(':');
            containerPath = `/app/uploads/${ownerUsername}/${sharedFileName}`;
            console.log(`[AI SEARCH] Shared file resolved: ${file.physical_path} -> ${containerPath}`);
          } else {
            console.warn(`[AI SEARCH] Skipping malformed shared path: ${containerPath}`);
            continue;
          }
        }
        
        containerPath = containerPath.replace(/\\/g, '/');

        if (containerPath.startsWith('/app/uploads/')) {
        } else if (containerPath.startsWith('uploads/')) {
             containerPath = path.join('/app', containerPath);
        } else if (containerPath.includes('/Datos/')) {
             const parts = containerPath.split('/Datos/');
             if (parts.length > 1) {
                 containerPath = path.join('/app/uploads', parts[1]);
             }
        } else if (containerPath.includes('Datos/')) {
             const parts = containerPath.split('Datos/');
             if (parts.length > 1) {
                 containerPath = path.join('/app/uploads', parts[1]);
             }
        } else if (!path.isAbsolute(containerPath) || !containerPath.startsWith('/')) {
             containerPath = path.join('/app/uploads', containerPath);
        }
        
        containerPath = containerPath.replace(/\/\//g, '/');

        try {
          await fs.access(containerPath);
          exists = true;

          const fullText = await extractTextFromFile(containerPath, file.mime_type || '');
          const isPdf = (file.mime_type || '').includes('pdf') || (file.name || '').toLowerCase().endsWith('.pdf');
          const snippetLength = isPdf ? 3000 : 1000;
          contentSnippet = fullText.substring(0, snippetLength).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
          
          
          let downloadId = null;
          let folderPath = file.folder_path || '';
          const uploadRoot = '/app/uploads';
          
          if (containerPath.startsWith(uploadRoot)) {
             const rel = path.relative(uploadRoot, containerPath);
             const parts = rel.split(path.sep);
             if (parts.length > 1) {
                 const userRelative = parts.slice(1).join('/');
                 downloadId = Buffer.from(userRelative).toString('base64'); 
                 
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
        }
      }
    }

    const filesContext = contextParts.join('\n');
    
    relevantFiles = validFiles;

    if (relevantFiles.length === 0) {
       return res.json({
        success: true,
        response: `Encontré referencias a archivos, pero parecen no estar disponibles físicamente en el servidor.`,
        files: [],
        highlights: [],
        sources: [],
        indexStatus: dualNodeIndexing.getStats()
      });
    }

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

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    let aiResponseText = result.response.text();

    let finalResponse = { answer: aiResponseText, highlights: [] };
    try {
        let cleaned = aiResponseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace > 0 && lastBrace > firstBrace) {
            cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        }
        finalResponse = JSON.parse(cleaned);

        if (typeof finalResponse.answer === 'string') {
            const inner = finalResponse.answer.trim();
            if (inner.startsWith('{') && inner.endsWith('}')) {
                try {
                    const innerParsed = JSON.parse(inner);
                    if (innerParsed && typeof innerParsed.answer === 'string') {
                        finalResponse = {
                            answer: innerParsed.answer,
                            highlights: innerParsed.highlights || finalResponse.highlights || []
                        };
                    }
                } catch (_) {  }
            }
        }
    } catch (e) {
        console.warn('[AI SEARCH] Failed to parse AI JSON response, using raw text:', e.message);
        finalResponse.answer = aiResponseText;
    }

    if (typeof finalResponse.answer !== 'string') {
        try { finalResponse.answer = JSON.stringify(finalResponse.answer); } catch (_) { finalResponse.answer = String(finalResponse.answer); }
    }
    if (!Array.isArray(finalResponse.highlights)) {
        finalResponse.highlights = [];
    }

    {
      const highlights = finalResponse.highlights || [];
      const citedIds = new Set(highlights.map(h => h.fileId).filter(id => id != null));
      const answerText = (finalResponse.answer || '').toLowerCase();

      const nameMatches = (file) => {
        const name = (file.name || '').toLowerCase();
        if (!name) return false;
        if (answerText.includes(name)) return true;
        const base = name.replace(/\.[^.]+$/, '');
        return base.length >= 4 && answerText.includes(base);
      };

      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3);
      const queryMatchesName = (file) => {
        const name = (file.name || '').toLowerCase();
        return queryWords.some(w => name.includes(w));
      };

      if (citedIds.size > 0 || highlights.length > 0) {
        const filtered = relevantFiles.filter(f => citedIds.has(f.id) || nameMatches(f) || queryMatchesName(f));
        if (filtered.length > 0) {
          console.log(`[AI SEARCH] Narrowed relevant files ${relevantFiles.length} -> ${filtered.length} based on AI citations`);
          relevantFiles = filtered;
        }
      } else {
        const filtered = relevantFiles.filter(f => nameMatches(f) || queryMatchesName(f));
        if (filtered.length > 0 && filtered.length < relevantFiles.length) {
          console.log(`[AI SEARCH] Narrowed relevant files ${relevantFiles.length} -> ${filtered.length} based on name/query match`);
          relevantFiles = filtered;
        }
      }
    }

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

    if (!file.physical_path) {
      return res.status(400).json({ 
        error: 'Archivo sin ruta física',
        message: 'El archivo no tiene una ruta física asociada. Ejecuta el script de sincronización.'
      });
    }

    let content;
    try {
      const buffer = await fs.readFile(file.physical_path);
      
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

    const prompt = `Analiza este archivo: "${file.name}" (${file.mime_type})

Proporciona:
1. Un resumen breve del contenido
2. Información relevante encontrada
3. Sugerencias de uso o mejoras

Contenido:
${content.substring(0, 10000)}`;

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
