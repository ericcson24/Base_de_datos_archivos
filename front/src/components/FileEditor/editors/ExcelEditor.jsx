import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../../context/LanguageContext';
import { getAuthToken } from '../../../utils/fileUtils';
import './ExcelEditor.css';

const ExcelEditor = ({ fileUrl, fileBlob, file, onClose }) => {
  const { t } = useLanguage();
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadFile = useCallback(async () => {
    try {
      setLoading(true);
      let arrayBuffer;

      if (fileBlob) {
        console.log('📊 [ExcelEditor] Loading from blob, size:', fileBlob.size);
        if (fileBlob.size === 0) {
          throw new Error(t('excelEditor.emptyFile'));
        }
        arrayBuffer = await fileBlob.arrayBuffer();
      } else if (fileUrl) {
        console.log('📊 [ExcelEditor] Loading from URL');
        const token = getAuthToken();
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error(t('excelEditor.loadError'));
        const blob = await response.blob();
        arrayBuffer = await blob.arrayBuffer();
      } else {
        return;
      }

      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error(t('excelEditor.noSheets'));
      }

      setWorkbook(wb);
      const firstSheet = wb.SheetNames[0];
      setActiveSheet(firstSheet);
      parseSheet(wb.Sheets[firstSheet]);
    } catch (err) {
      console.error('Error loading Excel file:', err);
      setError(`${t('excelEditor.loadErrorGeneric')}${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fileUrl, fileBlob]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  const parseSheet = (sheet) => {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    setData(jsonData);
  };

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    parseSheet(workbook.Sheets[sheetName]);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const newData = [...data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };

  const handleSave = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert(t('excelEditor.noSession'));
        return;
      }

      setSaving(true);
      
      // Actualizar hoja actual en el workbook
      const newSheet = XLSX.utils.aoa_to_sheet(data);
      workbook.Sheets[activeSheet] = newSheet;

      // Generar archivo
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Subir
      const formData = new FormData();
      formData.append('file', blob, file.name);
      formData.append('path', file.path.substring(0, file.path.lastIndexOf('/'))); // Parent folder path
      
      // Usamos el endpoint de upload existente, que sobrescribirá si el nombre es igual
      // Pero necesitamos asegurarnos de que vaya a la ruta correcta.
      // El endpoint /api/files/upload espera 'path' como la carpeta destino.
      
      // Extraer el directorio del path del archivo
      const pathParts = file.path.split('/');
      pathParts.pop(); // Quitar nombre de archivo
      const dirPath = pathParts.join('/');

      const uploadFormData = new FormData();
      uploadFormData.append('files', blob, file.name);
      uploadFormData.append('path', dirPath);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: uploadFormData
      });

      if (!response.ok) throw new Error(t('excelEditor.saveError'));

      alert(t('excelEditor.saveSuccess'));
    } catch (err) {
      console.error('Error saving Excel file:', err);
      alert(t('excelEditor.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">{t('excelEditor.loading')}</div>;
  if (error) return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;

  return (
    <div className="excel-editor">
      <div className="excel-toolbar">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center"
        >
          {saving ? t('excelEditor.saving') : `💾 ${t('excelEditor.save')}`}
        </button>
        <span className="text-sm text-gray-500 ml-2">{file.name}</span>
      </div>

      <div className="excel-grid-container">
        <table className="excel-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              {data[0]?.map((_, index) => (
                <th key={index}>{XLSX.utils.encode_col(index)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="row-header">{rowIndex + 1}</td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sheet-tabs">
        {workbook?.SheetNames.map(sheet => (
          <button
            key={sheet}
            className={`sheet-tab ${activeSheet === sheet ? 'active' : ''}`}
            onClick={() => handleSheetChange(sheet)}
          >
            {sheet}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExcelEditor;
