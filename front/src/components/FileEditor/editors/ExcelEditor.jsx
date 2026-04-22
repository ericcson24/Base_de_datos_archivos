import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { getAuthToken } from '../../../utils/fileUtils';
import './ExcelEditor.css';

const MIN_ROWS = 50;
const MIN_COLS = 26;

const ExcelEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCell, setSelectedCell] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [cellStyles, setCellStyles] = useState({});
  const [mergedCells, setMergedCells] = useState({});

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [formulaValue, setFormulaValue] = useState('');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});

  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(-1);

  const [contextMenu, setContextMenu] = useState(null);

  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const editInputRef = useRef(null);
  const findInputRef = useRef(null);


  const selectionRange = useMemo(() => {
    if (!selectedCell) return null;
    const end = selectionEnd || selectedCell;
    return {
      startRow: Math.min(selectedCell.row, end.row),
      endRow: Math.max(selectedCell.row, end.row),
      startCol: Math.min(selectedCell.col, end.col),
      endCol: Math.max(selectedCell.col, end.col),
    };
  }, [selectedCell, selectionEnd]);

  const isInSelection = useCallback((row, col) => {
    if (!selectionRange) return false;
    return row >= selectionRange.startRow && row <= selectionRange.endRow &&
           col >= selectionRange.startCol && col <= selectionRange.endCol;
  }, [selectionRange]);

  const selectionStats = useMemo(() => {
    if (!selectionRange) return null;
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const cellCount = (endRow - startRow + 1) * (endCol - startCol + 1);
    if (cellCount <= 1) return null;
    const values = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const val = data[r]?.[c];
        const num = parseFloat(val);
        if (!isNaN(num) && val !== '' && val !== null && val !== undefined) {
          values.push(num);
        }
      }
    }
    if (values.length === 0) return { count: cellCount, numCount: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: cellCount,
      numCount: values.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round((sum / values.length) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [selectionRange, data]);

  const findMatchSet = useMemo(() => {
    const s = new Set();
    findMatches.forEach(m => s.add(`${m.row}-${m.col}`));
    return s;
  }, [findMatches]);


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);


  const parseSheet = (sheet, wbParam) => {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    while (jsonData.length < MIN_ROWS) jsonData.push([]);
    jsonData.forEach(row => { while (row.length < MIN_COLS) row.push(''); });
    setData(jsonData);

    const styles = {};
    try {
      const wbRef = wbParam || workbook;
      if (wbRef && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[addr];
            if (!cell || cell.s === undefined || cell.s === null) continue;
            const css = {};
            let sObj = cell.s;
            if (typeof sObj === 'number' && wbRef.Styles) {
              const xf = wbRef.Styles.CellXf?.[sObj];
              if (xf) {
                const fid = xf.fontId;
                if (fid !== undefined && wbRef.Styles.Fonts?.[fid]) {
                  const f = wbRef.Styles.Fonts[fid];
                  if (f.bold) css.fontWeight = 'bold';
                  if (f.italic) css.fontStyle = 'italic';
                  if (f.underline) css.textDecoration = 'underline';
                  if (f.sz) css.fontSize = `${f.sz}px`;
                  if (f.color?.rgb) {
                    const rgb = f.color.rgb;
                    if (rgb.slice(-6) !== '000000') css.color = `#${rgb.slice(-6)}`;
                  }
                  if (f.name && f.name !== 'Calibri') css.fontFamily = f.name;
                }
                const fillIdx = xf.fillId;
                if (fillIdx > 1 && wbRef.Styles.Fills?.[fillIdx]) {
                  const fill = wbRef.Styles.Fills[fillIdx];
                  const fgRgb = fill.fgColor?.rgb;
                  if (fgRgb) {
                    const hex = fgRgb.slice(-6);
                    if (hex.toUpperCase() !== 'FFFFFF' && hex !== '000000') {
                      css.backgroundColor = `#${hex}`;
                    }
                  }
                }
                if (xf.alignment) {
                  if (xf.alignment.horizontal) css.textAlign = xf.alignment.horizontal;
                  if (xf.alignment.vertical) {
                    css.verticalAlign = xf.alignment.vertical === 'center' ? 'middle' : xf.alignment.vertical;
                  }
                  if (xf.alignment.wrapText) css.whiteSpace = 'pre-wrap';
                }
              }
            } else if (typeof sObj === 'object') {
              if (sObj.font) {
                if (sObj.font.bold) css.fontWeight = 'bold';
                if (sObj.font.italic) css.fontStyle = 'italic';
                if (sObj.font.underline) css.textDecoration = 'underline';
                if (sObj.font.sz) css.fontSize = `${sObj.font.sz}px`;
                if (sObj.font.color?.rgb) {
                  const rgb = sObj.font.color.rgb;
                  if (rgb.slice(-6) !== '000000') css.color = `#${rgb.slice(-6)}`;
                }
              }
              if (sObj.fill?.fgColor?.rgb) {
                const hex = sObj.fill.fgColor.rgb.slice(-6);
                if (hex.toUpperCase() !== 'FFFFFF' && hex !== '000000') {
                  css.backgroundColor = `#${hex}`;
                }
              }
              if (sObj.alignment) {
                if (sObj.alignment.horizontal) css.textAlign = sObj.alignment.horizontal;
                if (sObj.alignment.vertical) {
                  css.verticalAlign = sObj.alignment.vertical === 'center' ? 'middle' : sObj.alignment.vertical;
                }
              }
            }
            if (Object.keys(css).length > 0) styles[`${r}-${c}`] = css;
          }
        }
      }
    } catch (e) {
      console.log('[ExcelEditor] Style extraction:', e.message);
    }
    setCellStyles(styles);

    const merges = {};
    if (sheet['!merges'] && sheet['!merges'].length > 0) {
      sheet['!merges'].forEach(merge => {
        const { s, e } = merge;
        merges[`${s.r}-${s.c}`] = { rowSpan: e.r - s.r + 1, colSpan: e.c - s.c + 1 };
        for (let mr = s.r; mr <= e.r; mr++) {
          for (let mc = s.c; mc <= e.c; mc++) {
            if (mr !== s.r || mc !== s.c) {
              merges[`${mr}-${mc}`] = { hidden: true };
            }
          }
        }
      });
    }
    setMergedCells(merges);

    if (sheet['!cols']) {
      const widths = {};
      sheet['!cols'].forEach((col, idx) => {
        if (!col) return;
        if (col.wpx) widths[idx] = Math.max(40, Math.round(col.wpx));
        else if (col.wch) widths[idx] = Math.max(40, Math.round(col.wch * 7.5));
        else if (col.width) widths[idx] = Math.max(40, Math.round(col.width * 7.5));
      });
      if (Object.keys(widths).length > 0) setColumnWidths(widths);
    } else {
      setColumnWidths({});
    }

    setHistory([JSON.parse(JSON.stringify(jsonData))]);
    setHistoryIndex(0);
  };

  const loadFile = useCallback(async () => {
    try {
      setLoading(true);
      let arrayBuffer;
      let isEmpty = false;

      if (fileBlob) {
        if (fileBlob.size === 0) isEmpty = true;
        else arrayBuffer = await fileBlob.arrayBuffer();
      } else if (fileUrl) {
        const token = getAuthToken();
        const response = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) {
          throw new Error(`${t('excelEditor.loadError')} (HTTP ${response.status})`);
        }
        const blob = await response.blob();
        if (blob.size === 0) isEmpty = true;
        else arrayBuffer = await blob.arrayBuffer();
      } else {
        isEmpty = true;
      }

      if (isEmpty) {
        const newWb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([['']]);
        XLSX.utils.book_append_sheet(newWb, ws, 'Sheet1');
        setWorkbook(newWb);
        setActiveSheet('Sheet1');
        parseSheet(ws);
        setLoading(false);
        return;
      }

      const wb = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true, cellDates: true, cellNF: true });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error(t('excelEditor.noSheets'));
      }
      setWorkbook(wb);
      const firstSheet = wb.SheetNames[0];
      setActiveSheet(firstSheet);
      parseSheet(wb.Sheets[firstSheet], wb);
    } catch (err) {
      console.error('[ExcelEditor] Load error:', err);
      setError(`${t('excelEditor.loadErrorGeneric')}${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fileUrl, fileBlob]);

  useEffect(() => { loadFile(); }, [loadFile]);


  const saveToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setData(JSON.parse(JSON.stringify(history[idx])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setData(JSON.parse(JSON.stringify(history[idx])));
    }
  };


  const handleCellChange = (rowIndex, colIndex, value) => {
    const newData = data.map(row => [...row]);
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    setData(newData);
    saveToHistory(newData);
  };

  const handleCellClick = (rowIndex, colIndex, e) => {
    if (editingCell) {
      handleCellChange(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
    if (e.shiftKey && selectedCell) {
      setSelectionEnd({ row: rowIndex, col: colIndex });
    } else {
      setSelectedCell({ row: rowIndex, col: colIndex });
      setSelectionEnd(null);
      setFormulaValue(data[rowIndex]?.[colIndex] ?? '');
    }
  };

  const handleCellDoubleClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
    setSelectionEnd(null);
    setEditingCell({ row: rowIndex, col: colIndex });
    const val = String(data[rowIndex]?.[colIndex] ?? '');
    setEditValue(val);
    setFormulaValue(val);
  };

  const confirmEdit = () => {
    if (editingCell) {
      handleCellChange(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const navigate = (dr, dc, extend) => {
    if (!selectedCell) return;
    if (extend) {
      const end = selectionEnd || selectedCell;
      const newRow = Math.max(0, Math.min(data.length - 1, end.row + dr));
      const newCol = Math.max(0, Math.min((data[0]?.length || 1) - 1, end.col + dc));
      setSelectionEnd({ row: newRow, col: newCol });
    } else {
      const newRow = Math.max(0, Math.min(data.length - 1, selectedCell.row + dr));
      const newCol = Math.max(0, Math.min((data[0]?.length || 1) - 1, selectedCell.col + dc));
      setSelectedCell({ row: newRow, col: newCol });
      setSelectionEnd(null);
      setFormulaValue(data[newRow]?.[newCol] ?? '');
    }
  };

  const clearSelection = () => {
    if (!selectionRange) return;
    const newData = data.map(row => [...row]);
    for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
      for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
        newData[r][c] = '';
      }
    }
    setData(newData);
    saveToHistory(newData);
  };

  const selectAll = () => {
    setSelectedCell({ row: 0, col: 0 });
    setSelectionEnd({ row: data.length - 1, col: (data[0]?.length || 1) - 1 });
    setEditingCell(null);
  };

  const selectColumn = (colIndex) => {
    setSelectedCell({ row: 0, col: colIndex });
    setSelectionEnd({ row: data.length - 1, col: colIndex });
    setEditingCell(null);
  };

  const selectRow = (rowIndex) => {
    setSelectedCell({ row: rowIndex, col: 0 });
    setSelectionEnd({ row: rowIndex, col: (data[0]?.length || 1) - 1 });
    setEditingCell(null);
  };


  const addRow = () => {
    const newData = [...data, new Array(data[0]?.length || MIN_COLS).fill('')];
    setData(newData);
    saveToHistory(newData);
  };

  const insertRowAbove = (rowIndex) => {
    const newData = [...data];
    newData.splice(rowIndex, 0, new Array(data[0]?.length || MIN_COLS).fill(''));
    setData(newData);
    saveToHistory(newData);
  };

  const insertRowBelow = (rowIndex) => {
    const newData = [...data];
    newData.splice(rowIndex + 1, 0, new Array(data[0]?.length || MIN_COLS).fill(''));
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

  const insertColumnLeft = (colIndex) => {
    const newData = data.map(row => { const r = [...row]; r.splice(colIndex, 0, ''); return r; });
    setData(newData);
    saveToHistory(newData);
  };

  const insertColumnRight = (colIndex) => {
    const newData = data.map(row => { const r = [...row]; r.splice(colIndex + 1, 0, ''); return r; });
    setData(newData);
    saveToHistory(newData);
  };

  const deleteColumn = (colIndex) => {
    if ((data[0]?.length || 0) <= 1) return;
    const newData = data.map(row => row.filter((_, idx) => idx !== colIndex));
    setData(newData);
    saveToHistory(newData);
  };


  const buildSheet = () => {
    const newSheet = XLSX.utils.aoa_to_sheet(data);
    if (Object.keys(mergedCells).length > 0) {
      const mergesList = [];
      Object.entries(mergedCells).forEach(([key, info]) => {
        if (info.hidden) return;
        const [r, c] = key.split('-').map(Number);
        mergesList.push({ s: { r, c }, e: { r: r + (info.rowSpan || 1) - 1, c: c + (info.colSpan || 1) - 1 } });
      });
      if (mergesList.length > 0) newSheet['!merges'] = mergesList;
    }
    if (Object.keys(columnWidths).length > 0) {
      const cols = [];
      Object.entries(columnWidths).forEach(([idx, w]) => { cols[parseInt(idx)] = { wpx: w }; });
      newSheet['!cols'] = cols;
    }
    Object.entries(cellStyles).forEach(([key, style]) => {
      const [r, c] = key.split('-').map(Number);
      const addr = XLSX.utils.encode_cell({ r, c });
      if (newSheet[addr]) {
        if (!newSheet[addr].s) newSheet[addr].s = {};
        if (style.fontWeight === 'bold') newSheet[addr].s.bold = true;
        if (style.fontStyle === 'italic') newSheet[addr].s.italic = true;
      }
    });
    return newSheet;
  };


  const formatCellValue = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return String(val);
      return val.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    return String(val);
  };


  const handleSheetChange = (sheetName) => {
    workbook.Sheets[activeSheet] = buildSheet();
    setActiveSheet(sheetName);
    parseSheet(workbook.Sheets[sheetName], workbook);
    setSelectedCell(null);
    setSelectionEnd(null);
    setEditingCell(null);
  };

  const addSheet = () => {
    const newName = `Sheet${workbook.SheetNames.length + 1}`;
    const ws = XLSX.utils.aoa_to_sheet([['']]);
    XLSX.utils.book_append_sheet(workbook, ws, newName);
    setWorkbook({ ...workbook });
    setActiveSheet(newName);
    parseSheet(ws);
  };

  const deleteSheet = () => {
    if (workbook.SheetNames.length <= 1) {
      addToast(t('excelEditor.cannotDeleteLastSheet'), 'warning');
      return;
    }
    const idx = workbook.SheetNames.indexOf(activeSheet);
    delete workbook.Sheets[activeSheet];
    workbook.SheetNames.splice(idx, 1);
    setWorkbook({ ...workbook });
    const next = workbook.SheetNames[Math.min(idx, workbook.SheetNames.length - 1)];
    setActiveSheet(next);
    parseSheet(workbook.Sheets[next]);
  };

  const renameSheet = () => {
    const newName = prompt(t('excelEditor.enterSheetName'), activeSheet);
    if (newName && newName !== activeSheet && !workbook.SheetNames.includes(newName)) {
      const idx = workbook.SheetNames.indexOf(activeSheet);
      workbook.Sheets[newName] = workbook.Sheets[activeSheet];
      delete workbook.Sheets[activeSheet];
      workbook.SheetNames[idx] = newName;
      setWorkbook({ ...workbook });
      setActiveSheet(newName);
    }
  };


  const applyCellStyle = (style, value) => {
    if (!selectionRange) return;
    const newStyles = { ...cellStyles };
    for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
      for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
        const key = `${r}-${c}`;
        newStyles[key] = { ...newStyles[key], [style]: value };
      }
    }
    setCellStyles(newStyles);
  };

  const getCellStyle = (rowIndex, colIndex) => cellStyles[`${rowIndex}-${colIndex}`] || {};

  const toggleStyle = (prop, onVal, offVal) => {
    if (!selectedCell) return;
    const current = getCellStyle(selectedCell.row, selectedCell.col)[prop];
    applyCellStyle(prop, current === onVal ? offVal : onVal);
  };

  const handleApplyBorders = (type) => {
    if (!selectionRange) return;
    const BORDER_THIN = '1px solid #555';
    const BORDER_THICK = '2px solid #111';
    const newStyles = { ...cellStyles };
    for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
      for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
        const key = `${r}-${c}`;
        const current = { ...(newStyles[key] || {}) };
        delete current.borderTop;
        delete current.borderBottom;
        delete current.borderLeft;
        delete current.borderRight;
        if (type === 'all') {
          current.borderTop = BORDER_THIN;
          current.borderBottom = BORDER_THIN;
          current.borderLeft = BORDER_THIN;
          current.borderRight = BORDER_THIN;
        } else if (type === 'outside') {
          if (r === selectionRange.startRow) current.borderTop = BORDER_THIN;
          if (r === selectionRange.endRow)   current.borderBottom = BORDER_THIN;
          if (c === selectionRange.startCol) current.borderLeft = BORDER_THIN;
          if (c === selectionRange.endCol)   current.borderRight = BORDER_THIN;
        } else if (type === 'thick') {
          current.borderTop = BORDER_THICK;
          current.borderBottom = BORDER_THICK;
          current.borderLeft = BORDER_THICK;
          current.borderRight = BORDER_THICK;
        }
        newStyles[key] = current;
      }
    }
    setCellStyles(newStyles);
  };


  const sortColumn = (colIndex, ascending = true) => {
    const newData = [...data].sort((a, b) => {
      const va = a[colIndex] ?? '';
      const vb = b[colIndex] ?? '';
      if (va === '' && vb === '') return 0;
      if (va === '') return 1;
      if (vb === '') return -1;
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return ascending ? na - nb : nb - na;
      return ascending ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    setData(newData);
    saveToHistory(newData);
    addToast(ascending ? t('excelEditor.sortedAsc') : t('excelEditor.sortedDesc'), 'info', 2000);
  };


  const findInSheet = (text) => {
    if (!text) { setFindMatches([]); setCurrentMatch(-1); return; }
    const matches = [];
    const lower = text.toLowerCase();
    data.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (String(cell).toLowerCase().includes(lower)) matches.push({ row: r, col: c });
      });
    });
    setFindMatches(matches);
    setCurrentMatch(matches.length > 0 ? 0 : -1);
    if (matches.length > 0) {
      setSelectedCell(matches[0]);
      setSelectionEnd(null);
    }
  };

  const findNext = () => {
    if (findMatches.length === 0) return;
    const next = (currentMatch + 1) % findMatches.length;
    setCurrentMatch(next);
    setSelectedCell(findMatches[next]);
    setSelectionEnd(null);
  };

  const findPrev = () => {
    if (findMatches.length === 0) return;
    const prev = (currentMatch - 1 + findMatches.length) % findMatches.length;
    setCurrentMatch(prev);
    setSelectedCell(findMatches[prev]);
    setSelectionEnd(null);
  };

  const replaceOne = () => {
    if (currentMatch < 0 || !findMatches[currentMatch]) return;
    const { row, col } = findMatches[currentMatch];
    const val = String(data[row][col]);
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    handleCellChange(row, col, val.replace(new RegExp(escaped, 'i'), replaceText));
    findInSheet(findText);
  };

  const replaceAll = () => {
    if (!findText) return;
    const lower = findText.toLowerCase();
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let count = 0;
    const newData = data.map(row => row.map(cell => {
      const s = String(cell);
      if (s.toLowerCase().includes(lower)) {
        count++;
        return s.replace(new RegExp(escaped, 'gi'), replaceText);
      }
      return cell;
    }));
    setData(newData);
    saveToHistory(newData);
    setFindMatches([]);
    setCurrentMatch(-1);
    addToast(`${count} ${t('excelEditor.replacements')}`, 'success', 2000);
  };


  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    let html = '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;">';
    html += '<thead><tr><th style="background:#f1f3f5"></th>';
    data[0]?.forEach((_, c) => { html += `<th style="background:#f1f3f5;font-weight:600">${XLSX.utils.encode_col(c)}</th>`; });
    html += '</tr></thead><tbody>';
    data.forEach((row, r) => {
      if (row.every(c => c === '' || c === null || c === undefined)) return;
      html += `<tr><td style="background:#f1f3f5;font-weight:600;text-align:center">${r + 1}</td>`;
      row.forEach((cell, c) => {
        const style = getCellStyle(r, c);
        const s = Object.entries(style).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');
        html += `<td style="${s}">${cell instanceof Date ? cell.toLocaleDateString() : (cell ?? '')}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    printWin.document.write(`<html><head><title>${file.name}</title></head><body style="margin:20px">${html}</body></html>`);
    printWin.document.close();
    setTimeout(() => printWin.print(), 300);
  };

  const handleDownload = () => {
    workbook.Sheets[activeSheet] = buildSheet();
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'spreadsheet.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    addToast(t('excelEditor.downloaded'), 'success', 2000);
  };

  const autoSum = () => {
    if (!selectionRange) return;
    let sum = 0;
    for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
      for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
        const num = parseFloat(data[r]?.[c]);
        if (!isNaN(num)) sum += num;
      }
    }
    const targetRow = selectionRange.endRow + 1;
    const targetCol = selectionRange.startCol;
    if (targetRow < data.length) {
      handleCellChange(targetRow, targetCol, Math.round(sum * 100) / 100);
      setSelectedCell({ row: targetRow, col: targetCol });
      setSelectionEnd(null);
      setFormulaValue(String(Math.round(sum * 100) / 100));
    }
  };


  const handleContextMenu = (e, rowIndex, colIndex) => {
    e.preventDefault();
    if (!selectedCell || selectedCell.row !== rowIndex || selectedCell.col !== colIndex) {
      setSelectedCell({ row: rowIndex, col: colIndex });
      setSelectionEnd(null);
    }
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 380);
    setContextMenu({ x, y, row: rowIndex, col: colIndex });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const copySelection = () => {
    if (!selectionRange) return;
    let text = '';
    for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
      const row = [];
      for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
        row.push(data[r]?.[c] ?? '');
      }
      text += row.join('\t') + '\n';
    }
    navigator.clipboard.writeText(text).then(() => {
      addToast(t('excelEditor.copied'), 'success', 1500);
    }).catch(() => {});
  };

  const pasteFromClipboard = async () => {
    if (!selectedCell) return;
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').filter(r => r.length > 0);
      const newData = data.map(row => [...row]);
      rows.forEach((rowText, ri) => {
        const cells = rowText.split('\t');
        cells.forEach((val, ci) => {
          const r = selectedCell.row + ri;
          const c = selectedCell.col + ci;
          if (r < newData.length && c < (newData[0]?.length || 0)) {
            newData[r][c] = val;
          }
        });
      });
      setData(newData);
      saveToHistory(newData);
    } catch (e) {  }
  };


  const handleColumnResize = (colIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colIndex] || 100;

    const onMove = (me) => {
      const diff = me.clientX - startX;
      setColumnWidths(prev => ({ ...prev, [colIndex]: Math.max(40, startWidth + diff) }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };


  useEffect(() => {
    const handleKeyDown = (e) => {
      const isFindBar = e.target.closest('.excel-find-bar');
      const isFormulaInput = e.target.classList?.contains('formula-input');

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFind(prev => !prev);
        setTimeout(() => findInputRef.current?.focus(), 100);
        return;
      }

      if (e.key === 'Escape') {
        if (showFind) { setShowFind(false); return; }
        if (editingCell) { cancelEdit(); return; }
        if (contextMenu) { setContextMenu(null); return; }
        return;
      }

      if (isFindBar) return;

      if (isFormulaInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedCell) {
            handleCellChange(selectedCell.row, selectedCell.col, formulaValue);
          }
          e.target.blur();
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (e.key === 'y' || (e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(); return; }
        if (e.key === 'c' && !editingCell) { e.preventDefault(); copySelection(); return; }
        if (e.key === 'v' && !editingCell) { e.preventDefault(); pasteFromClipboard(); return; }
        if (e.key === 'b' && !editingCell) { e.preventDefault(); toggleStyle('fontWeight', 'bold', 'normal'); return; }
        if (e.key === 'i' && !editingCell) { e.preventDefault(); toggleStyle('fontStyle', 'italic', 'normal'); return; }
        if (e.key === 'u' && !editingCell) { e.preventDefault(); toggleStyle('textDecoration', 'underline', 'none'); return; }
        if (e.key === 'a') { e.preventDefault(); selectAll(); return; }
      }

      if (!selectedCell) return;

      if (editingCell) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmEdit();
          const newRow = Math.min(selectedCell.row + 1, data.length - 1);
          setSelectedCell({ row: newRow, col: selectedCell.col });
          setSelectionEnd(null);
          setFormulaValue(data[newRow]?.[selectedCell.col] ?? '');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          confirmEdit();
          const dc = e.shiftKey ? -1 : 1;
          const newCol = Math.max(0, Math.min((data[0]?.length || 1) - 1, selectedCell.col + dc));
          setSelectedCell({ row: selectedCell.row, col: newCol });
          setSelectionEnd(null);
          setFormulaValue(data[selectedCell.row]?.[newCol] ?? '');
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        handleCellDoubleClick(selectedCell.row, selectedCell.col);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearSelection();
        return;
      }

      const arrowMap = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (arrowMap[e.key]) {
        e.preventDefault();
        navigate(...arrowMap[e.key], e.shiftKey);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        navigate(0, e.shiftKey ? -1 : 1, false);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        navigate(1, 0, false);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setEditingCell({ ...selectedCell });
        setEditValue(e.key);
        setFormulaValue(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, selectionEnd, editingCell, editValue, data, history, historyIndex,
      cellStyles, showFind, selectionRange, formulaValue, contextMenu]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      const el = editInputRef.current;
      setTimeout(() => {
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }, 0);
    }
  }, [editingCell]);


  const handleSave = async () => {
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || getAuthToken();
      if (!token) { addToast(t('excelEditor.noSession'), 'error'); return; }

      setSaving(true);
      workbook.Sheets[activeSheet] = buildSheet();
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const formData = new FormData();
      formData.append('file', blob, file.name);
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addToast(t('excelEditor.saveSuccess'), 'success');
      if (onFileSaved) onFileSaved();
    } catch (err) {
      console.error('[ExcelEditor] Save error:', err);
      addToast(t('excelEditor.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };


  if (loading) return (
    <div className="excel-editor">
      <div className="excel-loading">
        <div className="excel-spinner"></div>
        <p>{t('excelEditor.loading')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="excel-editor">
      <div className="excel-loading">
        <p className="excel-error-text">❌ {error}</p>
      </div>
    </div>
  );

  return (
    <div className={`excel-editor ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      
      <div className="excel-toolbar">
        <div className="toolbar-group">
          <button onClick={handleSave} disabled={saving} className="toolbar-btn save-btn" title={t('excelEditor.save')}>
            💾 {saving ? t('excelEditor.saving') : t('excelEditor.save')}
          </button>
        </div>
        <div className="toolbar-separator" />
        <div className="toolbar-group">
          <button onClick={undo} disabled={historyIndex <= 0} className="toolbar-btn" title={`${t('excelEditor.undo')} (Ctrl+Z)`}>↶</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="toolbar-btn" title={`${t('excelEditor.redo')} (Ctrl+Y)`}>↷</button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button
            onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontWeight === 'bold' ? 'active' : ''}`}
            disabled={!selectedCell} title={`${t('excelEditor.bold')} (Ctrl+B)`}
          ><strong>B</strong></button>
          <button
            onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).fontStyle === 'italic' ? 'active' : ''}`}
            disabled={!selectedCell} title={`${t('excelEditor.italic')} (Ctrl+I)`}
          ><em>I</em></button>
          <button
            onClick={() => toggleStyle('textDecoration', 'underline', 'none')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).textDecoration === 'underline' ? 'active' : ''}`}
            disabled={!selectedCell} title={`${t('excelEditor.underline')} (Ctrl+U)`}
          ><u>U</u></button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <select
            className="toolbar-select"
            disabled={!selectedCell}
            value={selectedCell ? (getCellStyle(selectedCell.row, selectedCell.col).fontSize || '13px') : '13px'}
            onChange={(e) => applyCellStyle('fontSize', e.target.value)}
            title={t('excelEditor.fontSize')}
          >
            {['10px','11px','12px','13px','14px','16px','18px','20px','24px','28px','32px'].map(s => (
              <option key={s} value={s}>{parseInt(s)}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <label className="color-picker-label" title={t('excelEditor.textColor')}>
            <span className="color-icon">A</span>
            <input type="color" onChange={(e) => applyCellStyle('color', e.target.value)} disabled={!selectedCell} className="color-picker" />
          </label>
          <label className="color-picker-label" title={t('excelEditor.bgColor')}>
            <span className="color-icon">🎨</span>
            <input type="color" onChange={(e) => applyCellStyle('backgroundColor', e.target.value)} disabled={!selectedCell} className="color-picker" />
          </label>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button
            onClick={() => applyCellStyle('textAlign', 'left')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).textAlign === 'left' ? 'active' : ''}`}
            disabled={!selectedCell} title={t('excelEditor.alignLeft')}
          >
            <span className="align-icon align-left"><span></span><span></span><span></span></span>
          </button>
          <button
            onClick={() => applyCellStyle('textAlign', 'center')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).textAlign === 'center' ? 'active' : ''}`}
            disabled={!selectedCell} title={t('excelEditor.alignCenter')}
          >
            <span className="align-icon align-center"><span></span><span></span><span></span></span>
          </button>
          <button
            onClick={() => applyCellStyle('textAlign', 'right')}
            className={`toolbar-btn ${selectedCell && getCellStyle(selectedCell.row, selectedCell.col).textAlign === 'right' ? 'active' : ''}`}
            disabled={!selectedCell} title={t('excelEditor.alignRight')}
          >
            <span className="align-icon align-right"><span></span><span></span><span></span></span>
          </button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button onClick={() => handleApplyBorders('all')} className="toolbar-btn" disabled={!selectedCell} title="Todos los bordes">
            <span className="border-icon all-borders"></span>
          </button>
          <button onClick={() => handleApplyBorders('outside')} className="toolbar-btn" disabled={!selectedCell} title="Bordes exteriores">
            <span className="border-icon outside-borders"></span>
          </button>
          <button onClick={() => handleApplyBorders('thick')} className="toolbar-btn" disabled={!selectedCell} title="Bordes gruesos">
            <span className="border-icon thick-borders"></span>
          </button>
          <button onClick={() => handleApplyBorders('none')} className="toolbar-btn" disabled={!selectedCell} title="Sin bordes">
            <span className="border-icon no-borders"></span>
          </button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button onClick={autoSum} className="toolbar-btn" disabled={!selectedCell} title={t('excelEditor.autoSum')}>Σ</button>
          <button onClick={() => selectedCell && sortColumn(selectedCell.col, true)} className="toolbar-btn" disabled={!selectedCell} title={t('excelEditor.sortAsc')}>
            <span className="sort-label">A→Z</span>
          </button>
          <button onClick={() => selectedCell && sortColumn(selectedCell.col, false)} className="toolbar-btn" disabled={!selectedCell} title={t('excelEditor.sortDesc')}>
            <span className="sort-label">Z→A</span>
          </button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button onClick={addRow} className="toolbar-btn" title={t('excelEditor.insertRowBelow')}>➕ {t('excelEditor.row')}</button>
          <button onClick={addColumn} className="toolbar-btn" title={t('excelEditor.insertColRight')}>➕ {t('excelEditor.col')}</button>
        </div>
        <div className="toolbar-separator" />

        
        <div className="toolbar-group">
          <button onClick={() => { setShowFind(!showFind); if (!showFind) setTimeout(() => findInputRef.current?.focus(), 100); }} className={`toolbar-btn ${showFind ? 'active' : ''}`} title={`${t('excelEditor.find')} (Ctrl+F)`}>[Search]</button>
          <button onClick={handlePrint} className="toolbar-btn" title={t('common.print') || 'Print'}>🖨️</button>
          <button onClick={handleDownload} className="toolbar-btn" title={t('common.download') || 'Download'}>⬇️</button>
          <button onClick={toggleFullscreen} className="toolbar-btn" title={isFullscreen ? (t('common.exitFullscreen') || 'Exit Fullscreen') : (t('common.fullscreen') || 'Fullscreen')}>
            {isFullscreen ? '🗗' : '🖵'}
          </button>
        </div>

        <div className="flex-spacer" />
        <span className="file-name">{file.name}</span>
      </div>

      
      {showFind && (
        <div className="excel-find-bar">
          <div className="find-group">
            <label className="find-label">[Search]</label>
            <input
              ref={findInputRef}
              type="text"
              className="find-input"
              placeholder={t('excelEditor.findPlaceholder')}
              value={findText}
              onChange={(e) => { setFindText(e.target.value); findInSheet(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') findNext(); if (e.key === 'Escape') setShowFind(false); }}
            />
            <span className="find-count">
              {findMatches.length > 0 ? `${currentMatch + 1}/${findMatches.length}` : '0'}
            </span>
            <button onClick={findPrev} className="find-nav-btn" disabled={findMatches.length === 0}>◀</button>
            <button onClick={findNext} className="find-nav-btn" disabled={findMatches.length === 0}>▶</button>
          </div>
          <div className="find-group">
            <label className="find-label">↔</label>
            <input
              type="text"
              className="find-input"
              placeholder={t('excelEditor.replacePlaceholder')}
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') replaceOne(); }}
            />
            <button onClick={replaceOne} className="find-action-btn" disabled={findMatches.length === 0}>{t('excelEditor.replaceOne')}</button>
            <button onClick={replaceAll} className="find-action-btn" disabled={findMatches.length === 0}>{t('excelEditor.replaceAll')}</button>
          </div>
          <button onClick={() => setShowFind(false)} className="find-close-btn">x</button>
        </div>
      )}

      
      <div className="formula-bar">
        <span className="cell-reference">
          {selectedCell ? `${XLSX.utils.encode_col(selectedCell.col)}${selectedCell.row + 1}` : '—'}
        </span>
        <span className="formula-fx">ƒₓ</span>
        <input
          type="text"
          className="formula-input"
          value={formulaValue}
          onChange={(e) => {
            setFormulaValue(e.target.value);
            if (editingCell) {
              setEditValue(e.target.value);
            } else if (selectedCell) {
              handleCellChange(selectedCell.row, selectedCell.col, e.target.value);
            }
          }}
          placeholder={t('excelEditor.typingPlaceholder')}
          disabled={!selectedCell}
        />
      </div>

      
      <div className="excel-grid" ref={gridRef} style={{ zoom: zoom / 100 }}>
        <table className="excel-table">
          <thead>
            <tr>
              <th className="corner-cell" onClick={selectAll} title={t('excelEditor.selectAll')}>
                <span className="corner-icon">☐</span>
              </th>
              {data[0]?.map((_, index) => (
                <th
                  key={index}
                  className={selectedCell?.col === index ? 'col-active' : ''}
                  style={{
                    width: columnWidths[index] ? `${columnWidths[index]}px` : undefined,
                    minWidth: columnWidths[index] ? `${columnWidths[index]}px` : '80px',
                  }}
                  onClick={() => selectColumn(index)}
                >
                  <span>{XLSX.utils.encode_col(index)}</span>
                  <div
                    className="col-resize-handle"
                    onMouseDown={(e) => handleColumnResize(index, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td
                  className={`row-header ${selectedCell?.row === rowIndex ? 'row-active' : ''}`}
                  onClick={() => selectRow(rowIndex)}
                >
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => {
                  const mergeInfo = mergedCells[`${rowIndex}-${colIndex}`];
                  if (mergeInfo?.hidden) return null;
                  const style = getCellStyle(rowIndex, colIndex);
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const inRange = isInSelection(rowIndex, colIndex) && !isSelected;
                  const isEdit = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const isFindMatch = findMatchSet.has(`${rowIndex}-${colIndex}`);

                  const { borderTop, borderBottom, borderLeft, borderRight, ...innerStyle } = style;
                  const tdBorderStyle = {};
                  if (borderTop)    tdBorderStyle.borderTop    = borderTop;
                  if (borderBottom) tdBorderStyle.borderBottom = borderBottom;
                  if (borderLeft)   tdBorderStyle.borderLeft   = borderLeft;
                  if (borderRight)  tdBorderStyle.borderRight  = borderRight;

                  return (
                    <td
                      key={colIndex}
                      className={`${isSelected ? 'selected' : ''} ${inRange ? 'in-range' : ''} ${isFindMatch ? 'find-match' : ''} ${mergeInfo?.colSpan ? 'merged-cell' : ''}`}
                      colSpan={mergeInfo?.colSpan || undefined}
                      rowSpan={mergeInfo?.rowSpan || undefined}
                      onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                      style={{ width: columnWidths[colIndex] ? `${columnWidths[colIndex]}px` : undefined, ...tdBorderStyle }}
                    >
                      {isEdit ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          className="cell-edit-input"
                          value={editValue}
                          onChange={(e) => { setEditValue(e.target.value); setFormulaValue(e.target.value); }}
                          onBlur={() => confirmEdit()}
                          style={innerStyle}
                        />
                      ) : (
                        <div className="cell-display" style={innerStyle}>
                          {formatCellValue(cell)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
      {contextMenu && (
        <div className="excel-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => { insertRowAbove(contextMenu.row); setContextMenu(null); }}>
            ⬆️ {t('excelEditor.insertRowAbove')}
          </button>
          <button onClick={() => { insertRowBelow(contextMenu.row); setContextMenu(null); }}>
            ⬇️ {t('excelEditor.insertRowBelow')}
          </button>
          <button onClick={() => { insertColumnLeft(contextMenu.col); setContextMenu(null); }}>
            ⬅️ {t('excelEditor.insertColLeft')}
          </button>
          <button onClick={() => { insertColumnRight(contextMenu.col); setContextMenu(null); }}>
            ➡️ {t('excelEditor.insertColRight')}
          </button>
          <div className="context-separator" />
          <button className="context-danger" onClick={() => { deleteRow(contextMenu.row); setContextMenu(null); }}>
            [Delete] {t('excelEditor.deleteRow')}
          </button>
          <button className="context-danger" onClick={() => { deleteColumn(contextMenu.col); setContextMenu(null); }}>
            [Delete] {t('excelEditor.deleteCol')}
          </button>
          <div className="context-separator" />
          <button onClick={() => { sortColumn(contextMenu.col, true); setContextMenu(null); }}>
            ↑ {t('excelEditor.sortAsc')}
          </button>
          <button onClick={() => { sortColumn(contextMenu.col, false); setContextMenu(null); }}>
            ↓ {t('excelEditor.sortDesc')}
          </button>
          <div className="context-separator" />
          <button onClick={() => { copySelection(); setContextMenu(null); }}>
            📋 {t('excelEditor.copy')}
          </button>
          <button onClick={() => { pasteFromClipboard(); setContextMenu(null); }}>
            [Pin] {t('excelEditor.paste')}
          </button>
          <button onClick={() => { clearSelection(); setContextMenu(null); }}>
            🧹 {t('excelEditor.clearContents')}
          </button>
        </div>
      )}

      
      <div className="excel-bottom-bar">
        <div className="sheet-tabs-bar">
          <div className="sheet-tabs">
            {workbook?.SheetNames.map(sheet => (
              <button
                key={sheet}
                className={`sheet-tab ${activeSheet === sheet ? 'active' : ''}`}
                onClick={() => handleSheetChange(sheet)}
                onDoubleClick={renameSheet}
              >
                {sheet}
              </button>
            ))}
            <button onClick={addSheet} className="add-sheet-btn" title={t('excelEditor.addSheet')}>+</button>
          </div>
          <div className="sheet-actions">
            <button onClick={deleteSheet} className="action-btn" title={t('excelEditor.deleteSheet')}>[Delete]</button>
            <button onClick={renameSheet} className="action-btn" title={t('excelEditor.renameSheet')}>✏️</button>
          </div>
        </div>

        <div className="excel-status-bar">
          <div className="status-left">
            {selectionStats && selectionStats.numCount > 0 && (
              <>
                <span className="stat-item">Σ {t('excelEditor.sum')}: <strong>{selectionStats.sum}</strong></span>
                <span className="stat-item">x̄ {t('excelEditor.average')}: <strong>{selectionStats.avg}</strong></span>
                <span className="stat-item">⬇ Min: <strong>{selectionStats.min}</strong></span>
                <span className="stat-item">⬆ Max: <strong>{selectionStats.max}</strong></span>
                <span className="stat-item"># {t('excelEditor.count')}: <strong>{selectionStats.numCount}</strong></span>
              </>
            )}
            {selectionStats && selectionStats.numCount === 0 && (
              <span className="stat-item">{selectionStats.count} {t('excelEditor.cellsSelected')}</span>
            )}
            {!selectionStats && (
              <span className="stat-item">{t('excelEditor.ready')}</span>
            )}
          </div>
          <div className="status-right">
            <span className="stat-item">{data.length} {t('excelEditor.rows')} × {data[0]?.length || 0} {t('excelEditor.columns')}</span>
            <div className="zoom-controls">
              <button onClick={handleZoomOut} title="Zoom Out">−</button>
              <span onClick={handleZoomReset} className="zoom-label" title="Reset Zoom">{zoom}%</span>
              <button onClick={handleZoomIn} title="Zoom In">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelEditor;
