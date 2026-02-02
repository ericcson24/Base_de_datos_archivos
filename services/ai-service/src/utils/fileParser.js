const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const officeParser = require('office-text-extractor');

/**
 * Extract text from various file formats
 * @param {string} filePath - Physical path to the file
 * @param {string} mimeType - Mime type of the file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromFile(filePath, mimeType) {
  try {
    // Verificar si el archivo existe
    try {
      await fs.access(filePath);
    } catch (e) {
      console.warn(`[FILE PARSER] Archivo no encontrado: ${filePath}`);
      return "";
    }

    const ext = path.extname(filePath).toLowerCase();

    // 1. Text / Markdown / Code / Config
    // Added more extensions like .sql, .log, .ini, .bat, .sh, .rtf (simple)
    const textExtensions = [
        '.txt', '.md', '.js', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', 
        '.json', '.html', '.css', '.xml', '.yml', '.yaml', '.csv', '.sql', 
        '.log', '.ini', '.bat', '.sh', '.env', '.dockerfile', '.conf'
    ];
    
    if (mimeType.startsWith('text/') || textExtensions.includes(ext)) {
      try {
          // Intentar leer como UTF-8
          const content = await fs.readFile(filePath, 'utf8');
          return content;
      } catch (err) {
          console.warn(`[FILE PARSER] Falló lectura UTF-8 para ${filePath}, intentando latin1`);
          // Fallback para otros encodings si es necesario, 
          // pero por ahora devolvemos vacío o lo que se pudo
          return "";
      }
    }

    // 2. PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      try {
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdf(dataBuffer);
          return data.text;
      } catch (pdfError) {
          console.error(`[FILE PARSER] PDF Error en ${filePath}:`, pdfError.message);
          return ""; // PDF corrupto o encriptado
      }
    }

    // 3. Word (.docx)
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.value && result.value.trim().length > 0) {
            return result.value;
        }
        // If empty, it might be a disguised text/html file
        throw new Error("Empty result from mammoth");
      } catch (err) {
        console.warn(`[FILE PARSER] Mammoth failed for ${filePath}, trying raw text fallback.`);
        // Fallback: Read as text to check if it's actually HTML/Text
        try {
            const rawContent = await fs.readFile(filePath, 'utf8');
            // Basic heuristic: contains typical text chars or html tags 
            if (rawContent.includes('<html') || rawContent.includes('<!DOCTYPE') || rawContent.length > 0) {
                 return rawContent;
            }
        } catch (readErr) {
            // Ignore fallback error
        }
        return ""; 
      }
    }

    // 4. Excel (.xlsx, .xls, .csv, .ods)
    if (['.xlsx', '.xls', '.csv', '.ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      const workbook = xlsx.readFile(filePath);
      let text = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `--- Hoja: ${sheetName} ---\n`;
        text += xlsx.utils.sheet_to_txt(sheet);
        text += "\n";
      });
      return text;
    }

    // 5. PowerPoint (.pptx, .odp)
    if (['.pptx', '.odp'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      // office-text-extractor requires the file path
      const text = await officeParser.getText(filePath);
      return text;
    }

    return ""; // Formato no soportado

  } catch (error) {
    console.error(`[FILE PARSER] Error leyendo ${filePath}:`, error.message);
    return ""; // Retornar vacío en error para no romper el flujo
  }
}

module.exports = { extractTextFromFile };
