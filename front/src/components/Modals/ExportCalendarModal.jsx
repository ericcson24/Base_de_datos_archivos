import React, { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import Button from '../Common/Button';
import { getAuthToken } from '../../utils/fileUtils';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import './ExportCalendarModal.css';

const ExportCalendarModal = ({ onClose }) => {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return d.toISOString().split('T')[0];
  });
  const [format, setFormat] = useState('pdf');

  const fetchEvents = async () => {
    const response = await fetch(`/api/events/?start=${startDate}T00:00:00&end=${endDate}T23:59:59`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    const data = await response.json();
    return data.events || data;
  };

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const events = await fetchEvents();
      const exportData = events.map(ev => ({
        title: ev.title || ev.subject,
        start: ev.start,
        end: ev.end,
        allDay: ev.allDay || ev.is_all_day || false,
        location: ev.location || '',
        description: ev.description || ev.body_preview || '',
        categories: ev.categories || [],
        assignedBy: ev.assignedBy || ev.assigned_by || null
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendar_${startDate}_${endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(t('export.success'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast(t('export.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categories) => {
    if (!categories || categories.length === 0) return '#6b7280';
    const colorMap = {
      'Preset0': '#dc2626', 'Red category': '#dc2626',
      'Preset1': '#f97316', 'Orange category': '#f97316',
      'Preset2': '#92400e', 'Brown category': '#92400e',
      'Preset3': '#eab308', 'Yellow category': '#eab308',
      'Preset4': '#16a34a', 'Green category': '#16a34a',
      'Preset5': '#0d9488', 'Teal category': '#0d9488',
      'Preset6': '#2563eb', 'Blue category': '#2563eb',
      'Preset7': '#0284c7', 'Purple category': '#0284c7',
      'Preset8': '#db2777', 'Pink category': '#db2777',
      'Preset9': '#64748b', 'Steel category': '#64748b',
    };
    const cat = categories[0];
    return colorMap[cat] || '#2563eb';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const handleExportPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast(t('export.popupBlocked') || 'Please allow popups to export as PDF, or try JSON format.', 'warning');
      setLoading(false);
      return;
    }
    printWindow.document.write(`<html><head><title>${t('export.documentTitle')}</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#6b7280;"><p style="font-size:18px;">⏳ ${t('export.exporting') || 'Exporting...'}...</p></body></html>`);
    printWindow.document.close();

    setLoading(true);
    try {
      const events = await fetchEvents();
      
      const grouped = {};
      events.forEach(ev => {
        const start = ev.start || ev.start_time;
        if (!start) return;
        const dateKey = new Date(start).toISOString().split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(ev);
      });

      const sortedDates = Object.keys(grouped).sort();

      sortedDates.forEach(date => {
        grouped[date].sort((a, b) => new Date(a.start || a.start_time) - new Date(b.start || b.start_time));
      });

      const totalEvents = events.length;
      const allDayCount = events.filter(e => e.allDay || e.is_all_day).length;

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${t('export.documentTitle')} — ${startDate} / ${endDate}</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  body { 
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
    color: #1f2937; 
    background: #fff;
    line-height: 1.5;
    padding: 40px;
  }
  .header { 
    text-align: center; 
    margin-bottom: 32px; 
    padding-bottom: 24px;
    border-bottom: 3px solid #2563eb;
  }
  .header h1 { 
    font-size: 28px; 
    font-weight: 700; 
    color: #111827; 
    margin-bottom: 4px;
  }
  .header .subtitle { 
    font-size: 14px; 
    color: #6b7280; 
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-top: 16px;
  }
  .stat { text-align: center; }
  .stat-value { 
    font-size: 24px; 
    font-weight: 700; 
    color: #2563eb; 
  }
  .stat-label { 
    font-size: 11px; 
    color: #9ca3af; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
  }
  .day-section { 
    margin-bottom: 24px; 
    page-break-inside: avoid;
  }
  .day-header { 
    font-size: 16px; 
    font-weight: 600; 
    color: #111827; 
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 6px;
    margin-bottom: 8px;
    border-left: 4px solid #2563eb;
  }
  .event-card { 
    display: flex; 
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid #f3f4f6;
    page-break-inside: avoid;
  }
  .event-card:last-child { border-bottom: none; }
  .event-time { 
    min-width: 80px; 
    font-size: 13px; 
    color: #6b7280; 
    font-weight: 500;
    padding-top: 2px;
  }
  .event-dot { 
    width: 10px; height: 10px; 
    border-radius: 50%; 
    margin-top: 6px; 
    flex-shrink: 0;
  }
  .event-details { flex: 1; }
  .event-title { 
    font-size: 14px; 
    font-weight: 600; 
    color: #1f2937; 
  }
  .event-meta { 
    font-size: 12px; 
    color: #9ca3af; 
    margin-top: 2px;
  }
  .event-location { 
    display: inline-flex; 
    align-items: center; 
    gap: 4px; 
  }
  .all-day-badge { 
    font-size: 11px; 
    background: #dbeafe; 
    color: #1e40af; 
    padding: 1px 8px; 
    border-radius: 10px;
    font-weight: 500;
  }
  .footer { 
    margin-top: 40px; 
    text-align: center; 
    font-size: 11px; 
    color: #d1d5db;
    border-top: 1px solid #f3f4f6;
    padding-top: 16px;
  }
  @media print {
    body { padding: 0; }
    .day-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📅 ${t('export.documentTitle')}</h1>
    <div class="subtitle">${formatDate(startDate)} — ${formatDate(endDate)}</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalEvents}</div>
        <div class="stat-label">${t('export.totalEvents')}</div>
      </div>
      <div class="stat">
        <div class="stat-value">${sortedDates.length}</div>
        <div class="stat-label">${t('export.daysWithEvents')}</div>
      </div>
      <div class="stat">
        <div class="stat-value">${allDayCount}</div>
        <div class="stat-label">${t('export.allDayEvents')}</div>
      </div>
    </div>
  </div>

  ${sortedDates.map(dateKey => `
    <div class="day-section">
      <div class="day-header">${formatDate(dateKey)}</div>
      ${grouped[dateKey].map(ev => {
        const title = ev.title || ev.subject || t('calendar.noTitle');
        const isAllDay = ev.allDay || ev.is_all_day;
        const location = ev.location || '';
        const description = ev.description || ev.body_preview || '';
        const cats = ev.categories || [];
        const color = getCategoryColor(cats);
        const startTime = ev.start || ev.start_time;
        const endTime = ev.end || ev.end_time;

        let timeDisplay;
        if (isAllDay) {
          const startD = new Date(startTime);
          const endD = new Date(endTime);
          endD.setDate(endD.getDate() - 1);
          const isMultiDay = startD.toISOString().split('T')[0] !== endD.toISOString().split('T')[0];
          if (isMultiDay) {
            timeDisplay = '<span class="all-day-badge">' + formatShortDate(startTime) + ' — ' + formatShortDate(endD) + '</span>';
          } else {
            timeDisplay = '<span class="all-day-badge">' + t('calendar.allDay') + '</span>';
          }
        } else {
          timeDisplay = formatTime(startTime) + ' - ' + formatTime(endTime);
        }

        return `
        <div class="event-card">
          <div class="event-time">
            ${timeDisplay}
          </div>
          <div class="event-dot" style="background-color: ${color}"></div>
          <div class="event-details">
            <div class="event-title">${title}</div>
            <div class="event-meta">
              ${location ? `<span class="event-location">[Location] ${location}</span>` : ''}
              ${cats.length > 0 ? ` · ${cats.join(', ')}` : ''}
              ${description ? `<br/>${description.substring(0, 120)}${description.length > 120 ? '...' : ''}` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('')}

  ${sortedDates.length === 0 ? `<div style="text-align:center; padding:60px 0; color:#9ca3af; font-size:16px;">${t('export.noEvents')}</div>` : ''}

  <div class="footer">
    ${t('export.generatedAt')} ${new Date().toLocaleString()} · ${t('export.documentTitle')}
  </div>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      addToast(t('export.pdfReady'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      if (printWindow && !printWindow.closed) printWindow.close();
      addToast(t('export.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (format === 'json') {
      handleExportJSON();
    } else {
      handleExportPDF();
    }
  };

  const setThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(sunday.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(first.toISOString().split('T')[0]);
    setEndDate(last.toISOString().split('T')[0]);
  };

  const setNextMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    setStartDate(first.toISOString().split('T')[0]);
    setEndDate(last.toISOString().split('T')[0]);
  };

  const setLast30Days = () => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(now.getDate() - 30);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  return (
    <div className="modal-overlay export-modal-overlay" onClick={onClose}>
      <div className="modal-content export-modal" onClick={e => e.stopPropagation()}>
        
        <div className="export-header">
          <div className="export-header-icon"><FiDownload /></div>
          <div>
            <h2 className="export-title">{t('export.title')}</h2>
            <p className="export-subtitle">{t('export.subtitle')}</p>
          </div>
          <button onClick={onClose} className="export-close-btn">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        
        <div className="export-quick-ranges">
          <button className="export-quick-btn" onClick={setThisWeek}>{t('export.thisWeek')}</button>
          <button className="export-quick-btn" onClick={setThisMonth}>{t('export.thisMonth')}</button>
          <button className="export-quick-btn" onClick={setNextMonth}>{t('export.nextMonth')}</button>
          <button className="export-quick-btn" onClick={setLast30Days}>{t('export.last30Days')}</button>
        </div>

        
        <div className="export-date-range">
          <div className="export-date-field">
            <label className="export-label">{t('export.from')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="export-date-input"
            />
          </div>
          <div className="export-date-separator">→</div>
          <div className="export-date-field">
            <label className="export-label">{t('export.to')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="export-date-input"
            />
          </div>
        </div>

        
        <div className="export-format-section">
          <label className="export-label">{t('export.format')}</label>
          <div className="export-format-options">
            <button
              className={`export-format-btn ${format === 'pdf' ? 'active' : ''}`}
              onClick={() => setFormat('pdf')}
            >
              <div className="export-format-icon">📄</div>
              <div className="export-format-info">
                <span className="export-format-name">PDF</span>
                <span className="export-format-desc">{t('export.pdfDesc')}</span>
              </div>
            </button>
            <button
              className={`export-format-btn ${format === 'json' ? 'active' : ''}`}
              onClick={() => setFormat('json')}
            >
              <div className="export-format-icon">{ '{ }' }</div>
              <div className="export-format-info">
                <span className="export-format-name">JSON</span>
                <span className="export-format-desc">{t('export.jsonDesc')}</span>
              </div>
            </button>
          </div>
        </div>

        
        <div className="export-footer">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={loading || !startDate || !endDate}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('export.exporting')}
              </span>
            ) : (
              <span className="flex items-center gap-2"><FiDownload /> {t('export.exportBtn')}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportCalendarModal;
