const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const officeParser = require('office-text-extractor');

/**
async function extractTextFromFile(filePath, mimeType) {
  try {
    try {
      await fs.access(filePath);
    } catch (e) {
      console.warn(`[FILE PARSER] Archivo no encontrado: ${filePath}`);
      return "";
    }

    const ext = path.extname(filePath).toLowerCase();

    const textExtensions = [
        '.txt', '.md', '.js', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', 
        '.json', '.html', '.css', '.xml', '.yml', '.yaml', '.csv', '.sql', 
        '.log', '.ini', '.bat', '.sh', '.env', '.dockerfile', '.conf'
    ];
    
    if (mimeType.startsWith('text/') || textExtensions.includes(ext)) {
      try {
          const content = await fs.readFile(filePath, 'utf8');
          return content;
      } catch (err) {
          console.warn(`[FILE PARSER] Falló lectura UTF-8 para ${filePath}, intentando latin1`);
          return "";
      }
    }

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      try {
          const dataBuffer = await fs.readFile(filePath);
          const data = await pdf(dataBuffer);
          let text = data.text || '';
          
          const words = text.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 10) {
            const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / words.length;
            if (avgWordLen < 2.5) {
              text = text.replace(/(\S)\n(\S)/g, '$1$2');
              text = text.replace(/(\S)\r\n(\S)/g, '$1$2');
            }
          }
          
          text = text.replace(/\n{3,}/g, '\n\n');
          text = text.replace(/[ \t]+/g, ' ');
          text = text.replace(/\n /g, '\n');
          
          return text;
      } catch (pdfError) {
          console.error(`[FILE PARSER] PDF Error en ${filePath}:`, pdfError.message);
          return "";
      }
    }

    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.value && result.value.trim().length > 0) {
            return result.value;
        }
        throw new Error("Empty result from mammoth");
      } catch (err) {
        console.warn(`[FILE PARSER] Mammoth failed for ${filePath}, trying raw text fallback.`);
        try {
            const rawContent = await fs.readFile(filePath, 'utf8');
            if (rawContent.includes('<html') || rawContent.includes('<!DOCTYPE') || rawContent.length > 0) {
                 return rawContent;
            }
        } catch (readErr) {
        }
        return ""; 
      }
    }

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

    if (['.pptx', '.odp'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      const text = await officeParser.getText(filePath);
      return text;
    }

    return "";

  } catch (error) {
    console.error(`[FILE PARSER] Error leyendo ${filePath}:`, error.message);
    return "";
  }
}

module.exports = { extractTextFromFile };
