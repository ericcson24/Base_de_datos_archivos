import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../../context/LanguageContext';
import { getAuthToken } from '../../../utils/fileUtils';
import './ExcelEditor.css';

const ExcelEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved }) => {
  const { t } = useLanguage();
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellStyles, setCellStyles] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [formulaValue, setFormulaValue] = useState('');
  const inputRef = useRef(null);

  const loadFile = useCallback(async () => {
    try {
      setLoading(true);
      let arrayBuffer;
      let isEmpty = false;

      if (fileBlob) {
        console.log('📊 [ExcelEditor] Loading from blob, size:', fileBlob.size);
        if (fileBlob.size === 0) {
          isEmpty = true;
        } else {
          arrayBuffer = await fileBlob.arrayBuffer();
        }
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
        if (blob.size === 0) {
          isEmpty = true;
        } else {
          arrayBuffer = await blob.arrayBuffer();
        }
      } else {
        isEmpty = true;
      }

      if (isEmpty) {
        console.log('📊 [ExcelEditor] Empty file - creating new workbook');
        const newWb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([['']]);
        XLSX.utils.book_append_sheet(newWb, ws, 'Hoja1');
        setWorkbook(newWb);
        setActiveSheet('Hoja1');
        parseSheet(ws);
        setLoading(false);
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
  }, [fileUrl, fileBlob, t]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  const parseSheet = (sheet) => {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const minRows = 30;
    const minCols = 15;
    
    while (jsonData.length < minRows) {
      jsonData.push([]);
    }
    
    jsonData.forEach(row => {
      while (row.length < minCols) {
        row.push('');
      }
    });
    
    setData(jsonData);
    saveToHistory(jsonData);
  };

  const saveToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const handleSheetChange = (sheetName) => {
    // Guardar los datos de la hoja actual antes de cambiar
    const currentSheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[activeSheet] = currentSheet;
    
    setActiveSheet(sheetName);
    parseSheet(workbook.Sheets[sheetName]);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const newData = [...data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    setData(newData);
    saveToHistory(newData);
  };

  const handleCellClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
    setFormulaValue(data[rowIndex]?.[colIndex] || '');
  };

  const addRow = () => {
    const newData = [...data];
    const newRow = new Array(data[0]?.length || 15).fill('');
    newData.push(newRow);
    setData(newData);
    saveToHistory(newData);
  };

  const deleteRow = (rowIndex) => {
    if (data.length <= 1) return;
    const newData = data.filter((_, idx) => idx !== rowIndex);
    setData(newData);
    saveToHistory(newData);
  };

  const addColumn = () => {
    const newData = data.map(row => [...row, '']);
    setData(newData);
    saveToHistory(newData);
  };

  const deleteColumn = (colIndex) => {
    if (data[0]?.length <= 1) return;
    const newData = data.map(row => row.filter((_, idx) => idx !== colIndex));
    setData(newData);
    saveToHistory(newData);
  };

  const addSheet = () => {
    const newSheetName = `Hoja${workbook.SheetNames.length + 1}`;
    const newSheet = XLSX.utils.aoa_to_sheet([['']]);
    XLSX.utils.book_append_sheet(workbook, newSheet, newSheetName);
    setWorkbook({ ...workbook });
    setActiveSheet(newSheetName);
    parseSheet(newSheet);
  };

  const deleteSheet = () => {
    if (workbook.SheetNames.length <= 1) {
      alert(t('excelEditor.cannotDeleteLastSheet') || 'No puedes eliminar la última hoja');
      return;
    }
    const sheetIndex = workbook.SheetNames.indexOf(activeSheet);
    delete workbook.Sheets[activeSheet];
    workbook.SheetNames.splice(sheetIndex, 1);
    setWorkbook({ ...workbook });
    setActiveSheet(workbook.SheetNames[0]);
    parseSheet(workbook.Sheets[workbook.SheetNames[0]]);
  };

  const renameSheet = () => {
    const newName = prompt(t('excelEditor.enterSheetName') || 'Nombre de la hoja:', activeSheet);
    if (newName && newName !== activeSheet && !workbook.SheetNames.includes(newName)) {
      const sheetIndex = workbook.SheetNames.indexOf(activeSheet);
      workbook.Sheets[newName] = workbook.Sheets[activeSheet];
      delete workbook.Sheets[activeSheet];
      workbook.SheetNames[sheetIndex] = newName;
      setWorkbook({ ...workbook });
      setActiveSheet(newName);
    }
  };

  const applyCellStyle = (style, value) => {
    if (!selectedCell) return;
    const key = `${selectedCell.row}-${selectedCell.col}`;
    setCellStyles({
      ...cellStyles,
      [key]: { ...cellStyles[key], [style]: value }
    });
  };

  const getCellStyle = (rowIndex, colIndex) => {
    const key = `${rowIndex}-${colIndex}`;
    return cellStyles[key] || {};
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const handleSave = async () => {
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || getAuthToken();
      if (!token) {
        alert(t('excelEditor.noSession'));
        return;
      }

      setSaving(true);
      
      const newSheet = XLSX.utils.aoa_to_sheet(data);
      workbook.Sheets[activeSheet] = newSheet;

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const formData = new FormData();
      formData.append('file', blob, file.name);

      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert(t('excelEditor.saveSuccess'));
      
      console.log('[ExcelEditor] Save successful, calling onFileSaved callback');
      if (onFileSaved) {
        console.log('[ExcelEditor] Executing onFileSaved callback');
        onFileSaved();
      } else {
        console.warn('[ExcelEditor] No onFileSaved callback provided');
      }
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
        <div className="toolbar-group">
          <button onClick={handleSave} disabled={saving} className="toolbar-btn save-btn">
            💾 {saving ? t('excelEditor.saving') : t('excelEditor.save')}
          </button>
          <button onClick={undo} disabled={historyIndex <= 0} className="toolbar-btn" title="Deshacer (Ctrl+Z)">↶</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="toolbar-btn" title="Rehacer (Ctrl+Y)">↷</button>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button 
            onClick={() => applyCellStyle('fontWeight', selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontWeight === 'bold' ? 'active' : ''}`}
            disabled={!selectedCell}
            title="Negrita"
          ><strong>B</strong></button>
          
          <button 
            onClick={() => applyCellStyle('fontStyle', selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontStyle === 'italic' ? 'normal' : 'italic')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontStyle === 'italic' ? 'active' : ''}`}
            disabled={!selectedCell}
            title="Cursiva"
          ><em>I</em></button>
          
          <label className="color-picker-label" title="Color de texto">
            <span className="color-icon">A</span>
            <input type="color" onChange={(e) => applyCellStyle('color', e.target.value)} disabled={!selectedCell} className="color-picker" />
          </label>
          
          <label className="color-picker-label" title="Color de fondo">
            <span className="color-icon">🎨</span>
            <input type="color" onChange={(e) => applyCellStyle('backgroundColor', e.target.value)} disabled={!selectedCell} className="color-picker" />
          </label>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button onClick={addRow} className="toolbar-btn">➕ Fila</button>
          <button onClick={addColumn} className="toolbar-btn">➕ Col</button>
          {selectedCell && (
            <>
              <button onClick={() => deleteRow(selectedCell.row)} className="toolbar-btn danger-btn">➖ Fila</button>
              <button onClick={() => deleteColumn(selectedCell.col)} className="toolbar-btn danger-btn">➖ Col</button>
            </>
          )}
        </div>

        <div className="flex-spacer"></div>
        <span className="file-name">{file.name}</span>
      </div>

      {showFormulaBar && (
        <div className="formula-bar">
          <span className="cell-reference">
            {selectedCell ? `${XLSX.utils.encode_col(selectedCell.col)}${selectedCell.row + 1}` : '—'}
          </span>
          <input 
            type="text"
            className="formula-input"
            value={formulaValue}
            onChange={(e) => {
              setFormulaValue(e.target.value);
              if (selectedCell) {
                handleCellChange(selectedCell.row, selectedCell.col, e.target.value);
              }
            }}
            placeholder="Escribe aquí..."
            disabled={!selectedCell}
          />
        </div>
      )}

      <div className="excel-grid">
        <table className="excel-table">
          <thead>
            <tr>
              <th className="corner-cell">
                <button onClick={() => setShowFormulaBar(!showFormulaBar)} className="corner-btn">ƒₓ</button>
              </th>
              {data[0]?.map((_, index) => (
                <th key={index}>{XLSX.utils.encode_col(index)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="row-header">{rowIndex + 1}</td>
                {row.map((cell, colIndex) => {
                  const style = getCellStyle(rowIndex, colIndex);
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  
                  return (
                    <td key={colIndex} className={isSelected ? 'selected' : ''} onClick={() => handleCellClick(rowIndex, colIndex)}>
                      <input
                        ref={isSelected ? inputRef : null}
                        type="text"
                        value={cell}
                        onChange={(e) => {
                          handleCellChange(rowIndex, colIndex, e.target.value);
                          setFormulaValue(e.target.value);
                        }}
                        style={style}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sheet-tabs-bar">
        <div className="sheet-tabs">
          {workbook?.SheetNames.map(sheet => (
            <button
              key={sheet}
              className={`sheet-tab ${activeSheet === sheet ? 'active' : ''}`}
              onClick={() => handleSheetChange(sheet)}
              onDoubleClick={renameSheet}
            >{sheet}</button>
          ))}
          <button onClick={addSheet} className="add-sheet-btn">+</button>
        </div>
        <div className="sheet-actions">
          <button onClick={deleteSheet} className="action-btn">��️</button>
          <button onClick={renameSheet} className="action-btn">✏️</button>
        </div>
      </div>
    </div>
  );
};

export default ExcelEditor;
