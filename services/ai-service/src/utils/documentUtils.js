/**
 * Document Analysis Utilities
 * Helper functions for document processing and analysis
 */

/**
 * Generate cache key for document analysis
 */
function generateDocumentCacheKey(userId, documentId, analysisType, customQuery = null) {
  const normalized = customQuery 
    ? customQuery.toLowerCase().replace(/\s+/g, '_')
    : analysisType.toLowerCase();
  return `doc_${userId}_${documentId}_${normalized}`;
}

/**
 * Extract text excerpt from document
 */
function extractExcerpt(content, startPosition, length = 200) {
  if (startPosition < 0 || startPosition >= content.length) {
    return content.substring(0, Math.min(length, content.length));
  }
  return content.substring(startPosition, Math.min(startPosition + length, content.length));
}

/**
 * Split content into chunks for analysis
 */
function splitContentIntoChunks(content, maxChunkSize = 5000) {
  const chunks = [];
  let currentPosition = 0;

  while (currentPosition < content.length) {
    const chunk = content.substring(currentPosition, currentPosition + maxChunkSize);
    chunks.push({
      content: chunk,
      startPosition: currentPosition,
      endPosition: currentPosition + chunk.length
    });
    currentPosition += maxChunkSize;
  }

  return chunks;
}

/**
 * Validate document content
 */
function validateDocumentContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid document content');
  }
  
  if (content.trim().length === 0) {
    throw new Error('Document is empty');
  }
  
  // Maximum content size: 50KB
  if (content.length > 50000) {
    throw new Error('Document too large (max 50KB)');
  }

  return true;
}

/**
 * Normalize content for comparison
 */
function normalizeContent(content) {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get document statistics
 */
function getDocumentStats(content) {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const chars = content.length;

  return {
    lines: lines.length,
    words: words.length,
    characters: chars,
    averageWordsPerLine: Math.round(words.length / lines.length),
    readingTimeMinutes: Math.ceil(words.length / 200) // Average reading speed: 200 words/min
  };
}

/**
 * Build system prompt for document analysis
 */
function buildAnalysisPrompt(analysisType, documentTitle, documentStats) {
  const basePrompt = `You are a professional document analyst with expertise in content evaluation, business analysis, and technical documentation.
You are analyzing a document titled "${documentTitle}".
Document statistics: ${documentStats.words} words, ${documentStats.lines} lines, estimated ${documentStats.readingTimeMinutes} minute read.

Respond in Spanish (español) unless the document is in English.
Be concise, professional, and structured.
Use clear formatting with headers and bullet points where appropriate.`;

  const typePrompts = {
    summary: `${basePrompt}\n\nProvide a comprehensive executive summary with:
1. Document purpose and scope
2. Main topics covered (3-5 key points)
3. Key findings or conclusions
4. Recommended actions or takeaways
Format: Use headers and bullet points for clarity.`,
    
    explanation: `${basePrompt}\n\nProvide a detailed explanation including:
1. Overall objective and context
2. Main concepts and their relationships
3. Structure and logical flow
4. Target audience and use case
5. Key takeaways
Be accessible but thorough.`,
    
    suggestions: `${basePrompt}\n\nAnalyze the document and provide 5-8 actionable improvement suggestions covering:
1. Content clarity and comprehension
2. Structure and organization
3. Completeness and gaps
4. Tone and audience engagement
5. Visual presentation (if applicable)
6. Actionability and call-to-action
For each suggestion, briefly explain the benefit and impact.`,
    
    highlights: `${basePrompt}\n\nIdentify and explain the most important sections and key points:
1. Critical concepts or findings
2. High-impact statements or conclusions
3. Essential supporting evidence
4. Actionable recommendations
5. Unique or notable insights
Format as a structured list with brief explanations of why each point is important.`,
    
    readability: `${basePrompt}\n\nProvide a detailed readability analysis including:
1. Overall readability score (1-10) with reasoning
2. Sentence and paragraph structure assessment
3. Vocabulary complexity and technical level
4. Logical flow and coherence
5. Specific recommendations for improvement
6. Target audience assessment
Include examples from the document to illustrate points.`,
  };

  return typePrompts[analysisType] || basePrompt;
}

/**
 * Build system prompt for text fragment explanation
 */
function buildFragmentExplanationPrompt(documentTitle) {
  return `You are a professional document analyst with expertise in detailed content analysis.
You are analyzing a specific passage from a document titled "${documentTitle}".

Provide a comprehensive explanation that includes:
1. Core meaning and primary message
2. Key concepts and terminology defined
3. Context and relevance to the broader document
4. Connections to related ideas
5. Practical implications or applications
6. Potential questions or points of confusion

Explain in clear, accessible language suitable for a general audience.
Respond in Spanish (español) unless the text is in English.
Be thorough and detailed.`;
}

/**
 * Build system prompt for edit suggestions
 */
function buildEditSuggestionPrompt() {
  return `You are a professional editor and writing consultant with expertise in business, technical, and academic writing.
Review the provided text and provide specific improvement suggestions in these areas:

1. Grammar, syntax, and language correctness
2. Clarity and simplicity (avoid jargon where possible)
3. Tone and voice consistency
4. Structure and logical progression
5. Impact and persuasiveness
6. Conciseness (eliminate redundancy)
7. Reader engagement and interest

For each suggestion:
- Identify the specific issue
- Explain why it matters
- Provide a concrete before/after example
- Explain the improvement

Format suggestions as a structured list.
Respond in Spanish (español) unless the text is in English.
Prioritize high-impact changes.`;
}

/**
 * Build system prompt for text highlighting analysis
 */
function buildHighlightingPrompt() {
  return `You are a document analyst helping to identify the most important content for highlighting.
Analyze the text and identify sections that should be highlighted based on:
- Core concepts and definitions
- Critical findings or conclusions
- Supporting evidence and statistics
- Actionable recommendations
- Surprising or important insights
- Definitions of key terms

Provide highlights with clear importance levels.
Format response as a JSON array with objects: 
{ 
  "text": "highlighted text", 
  "reason": "explanation of importance", 
  "importance": "high|medium|low",
  "category": "concept|finding|recommendation|evidence|insight|definition"
}

Sort by importance (high to low).
Include 3-5 high importance highlights, 2-4 medium importance highlights.`;
}

/**
 * Parse highlights from AI response (improved version)
 */
function parseHighlightsFromResponse(response, fullText = '', maxHighlights = 10) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const highlights = JSON.parse(jsonMatch[0]);
    
    // Validate and process results
    const processedHighlights = highlights
      .filter(h => h.text || (typeof h.start === 'number' && typeof h.end === 'number'))
      .map((h, idx) => ({
        id: idx,
        text: h.text || (fullText ? fullText.substring(h.start, h.end) : ''),
        reason: h.reason || 'Important content',
        importance: h.importance || 'medium',
        category: h.category || 'general',
        start: h.start,
        end: h.end
      }))
      .sort((a, b) => {
        // Sort by importance level
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = importanceOrder[a.importance] || 2;
        const bPriority = importanceOrder[b.importance] || 2;
        return aPriority - bPriority;
      })
      .slice(0, maxHighlights);

    return processedHighlights;
  } catch (error) {
    console.error('[PARSE_HIGHLIGHTS] Error parsing:', error.message);
    return [];
  }
}

/**
 * Validate file extension for document analysis
 */
function isDocumentFile(filename) {
  const documentExtensions = ['.txt', '.md', '.pdf', '.docx', '.doc', '.rtf', '.csv', '.json', '.xml'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return documentExtensions.includes(ext);
}

/**
 * Get document type from filename
 */
function getDocumentType(filename) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const typeMap = {
    '.txt': 'text',
    '.md': 'markdown',
    '.pdf': 'pdf',
    '.docx': 'word',
    '.doc': 'word',
    '.rtf': 'rich-text',
    '.csv': 'csv',
    '.json': 'json',
    '.xml': 'xml'
  };
  return typeMap[ext] || 'unknown';
}

module.exports = {
  generateDocumentCacheKey,
  extractExcerpt,
  splitContentIntoChunks,
  validateDocumentContent,
  normalizeContent,
  getDocumentStats,
  buildAnalysisPrompt,
  buildFragmentExplanationPrompt,
  buildEditSuggestionPrompt,
  buildHighlightingPrompt,
  parseHighlightsFromResponse,
  isDocumentFile,
  getDocumentType
};
