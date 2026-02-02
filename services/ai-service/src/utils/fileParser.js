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

    // 1. Text / Markdown / Code
    if (mimeType.startsWith('text/') || ['.txt', '.md', '.js', '.py', '.json', '.html', '.css', '.xml', '.yml', '.csv'].includes(ext)) {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    }

    // 2. PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    }

    // 3. Word (.docx)
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    // 4. Excel (.xlsx, .xls)
    if (['.xlsx', '.xls'].includes(ext) || mimeType.includes('spreadsheet')) {
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

    // 5. PowerPoint (.pptx)
    if (ext === '.pptx' || mimeType.includes('presentation')) {
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
