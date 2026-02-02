const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const { getCachedResult, setCachedResult } = require('../utils/cache');
const {
  getCachedAnalysis,
  cacheAnalysis,
  recordQueryTime
} = require('../utils/indexingOptimizations');
const {
  validateDocumentContent,
  getDocumentStats,
  buildAnalysisPrompt,
  buildFragmentExplanationPrompt,
  buildEditSuggestionPrompt,
  buildHighlightingPrompt,
  parseHighlightsFromResponse
} = require('../utils/documentUtils');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_startup");

const analyzeDocument = async (req, res) => {
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
};

const explainText = async (req, res) => {
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
};

const editSuggestion = async (req, res) => {
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
};

const highlightAnalysis = async (req, res) => {
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
};

module.exports = {
    analyzeDocument,
    explainText,
    editSuggestion,
    highlightAnalysis
};
