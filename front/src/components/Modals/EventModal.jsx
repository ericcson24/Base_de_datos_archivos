import React, { useState, useEffect, useCallback, useRef } from 'react';
import './EventModal.css';
import LocationPickerModal from './LocationPickerModal';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken, formatFileSize, getFileType } from '../../utils/fileUtils';
import FileTypeIcon from '../Common/FileTypeIcon';

const EventModal = ({
  isOpen,
  onClose,
  event,
  mode, // 'view', 'edit', 'create'
  onSave,
  onDelete,
  categories = [],
  isLoading = false,
  selectedDates = null, // Para modo create
  user, // Add user prop
  initialAssignMode = 'me',
  initialTargetUserId = '',
  initialGroupId = ''
}) => {
  const { t, language } = useLanguage();
  const [currentMode, setCurrentMode] = useState(mode);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Group Assignment State
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignMode, setAssignMode] = useState(initialAssignMode); // 'me', 'group', 'user'
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [selectedUserId, setSelectedUserId] = useState(initialTargetUserId);

  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    allDay: false,
    location: '',
    description: '',
    attendees: '',
    categories: []
  });

  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Attachment State
  const [attachments, setAttachments] = useState([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');

  // AI File Suggestions State
  const [suggestedFiles, setSuggestedFiles] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsShown, setSuggestionsShown] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const suggestionsTimerRef = useRef(null);

  // Load attachments when viewing/editing an event
  const loadAttachments = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/attachments`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (err) {
      console.error('Error loading attachments:', err);
    }
  }, []);

  // Load user files for the file picker
  const loadUserFiles = useCallback(async (search = '') => {
    setFilesLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`/api/files/user-files?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error loading user files:', err);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Fetch AI-suggested files for the current event
  const fetchSuggestions = useCallback(async (eventTitle, eventDescription, eventLocation, eventCategories) => {
    if (!eventTitle || eventTitle.trim().length < 3) {
      setSuggestedFiles([]);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDescription || '',
          location: eventLocation || '',
          categories: eventCategories || []
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions?.length > 0) {
          setSuggestedFiles(data.suggestions);
          setSuggestionsShown(true);
        } else {
          setSuggestedFiles([]);
        }
      }
    } catch (err) {
      console.error('Error fetching file suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // Attach file to event
  const attachFile = async (file, eventId) => {
    try {
      const response = await fetch('/api/events/attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          eventId: eventId,
          fileName: file.name,
          filePath: file.path,
          fileOwner: file.owner || '',
          fileSize: file.size || 0
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => [...prev, data.attachment]);
        setShowFilePicker(false);
      }
    } catch (err) {
      console.error('Error attaching file:', err);
    }
  };

  // Remove attachment
  const removeAttachment = async (attachmentId) => {
    try {
      const response = await fetch(`/api/events/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Error removing attachment:', err);
    }
  };

  // Open attachment in new tab (preview); auth token sent via query for images, etc.
  const openAttachment = (att) => {
    try {
      // file-service download endpoint accepts ?token= for inline browser previews
      const owner = att.fileOwner || '';
      const path = att.filePath || '';
      // shared IDs: shared:<owner>:<path>  ; owned IDs: <path>
      const idRaw = owner && owner !== '' && att.attachedBy && owner !== att.attachedBy
        ? `shared:${owner}:${path}`
        : path;
      const fileId = btoa(unescape(encodeURIComponent(idRaw)));
      const token = getAuthToken();
      const url = `/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('Error opening attachment:', e);
    }
  };

  // Update state when props change
  useEffect(() => {
    setAssignMode(initialAssignMode);
  }, [initialAssignMode]);

  useEffect(() => {
    setSelectedUserId(initialTargetUserId);
  }, [initialTargetUserId]);

  useEffect(() => {
    setSelectedGroupId(initialGroupId);
  }, [initialGroupId]);

  // Load groups and users for admin/boss
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'boss')) {
      const token = localStorage.getItem('auth_token');
      
      // Fetch Groups
      fetch('/api/users/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) setGroups(data.groups);
      })
      .catch(err => console.error('Error loading groups:', err));

      // Fetch Users
      fetch('/api/users/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) setUsers(data.users);
      })
      .catch(err => console.error('Error loading users:', err));
    }
  }, [user]);

  // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Adjust for timezone to keep local time in ISO string
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d - offset)).toISOString().slice(0, 16);
  };

  // Helper for date input (YYYY-MM-DD)
  const formatDateForDateInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d - offset)).toISOString().split('T')[0];
  };

  // Initialize form data when modal opens or event/mode changes
  useEffect(() => {
    if (isOpen && event && (mode === 'view' || mode === 'edit')) {
      const startDate = event.start;
      let displayEndDate = event.end;

      // FullCalendar uses exclusive end for allDay events;
      // subtract 1 day to show the inclusive end date to the user
      if (event.allDay && displayEndDate) {
        const d = new Date(displayEndDate);
        d.setDate(d.getDate() - 1);
        displayEndDate = d;
      }

      setFormData({
        title: event.title || '',
        start: event.allDay ? formatDateForDateInput(startDate) : formatDateForInput(startDate),
        end: event.allDay ? formatDateForDateInput(displayEndDate) : formatDateForInput(event.end),
        allDay: event.allDay || false,
        location: event.extendedProps?.location || '',
        description: event.extendedProps?.description || '',
        attendees: event.extendedProps?.attendeesEmails || '',
        categories: event.extendedProps?.categories || []
      });
      setCurrentMode(mode);
    } else if (isOpen && mode === 'create') {
      // Initialize with default values for create mode
      if (selectedDates) {
        // Use selected dates from calendar
        const startDate = selectedDates.allDay
          ? formatDateForDateInput(selectedDates.start)
          : formatDateForInput(selectedDates.start);
        let endDate;
        if (selectedDates.allDay) {
          // FullCalendar uses exclusive end for allDay; subtract 1 day for inclusive display
          const inclusiveEnd = new Date(selectedDates.end);
          inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
          endDate = formatDateForDateInput(inclusiveEnd);
        } else {
          endDate = formatDateForInput(selectedDates.end);
        }

        setFormData({
          title: '',
          start: startDate,
          end: endDate,
          allDay: selectedDates.allDay,
          location: '',
          description: '',
          attendees: '',
          categories: []
        });
      } else {
        // Fallback to current time
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setFormData({
          title: '',
          start: formatDateForInput(now),
          end: formatDateForInput(tomorrow),
          allDay: false,
          location: '',
          description: '',
          attendees: '',
          categories: []
        });
      }
      setCurrentMode(mode);
      // Reset assignment state for create mode
      setAssignMode(initialAssignMode);
      setSelectedUserId(initialTargetUserId);
      setSelectedGroupId('');
    }
    setErrors({});
    setShowDeleteConfirm(false);
    setShowFilePicker(false);
    setAttachments([]);
    setSuggestedFiles([]);
    setSuggestionsShown(false);
    setDismissedSuggestions(new Set());
    
    // Load attachments for existing events
    if (isOpen && event && (mode === 'view' || mode === 'edit')) {
      loadAttachments(event.id);
    }
  }, [isOpen, event, mode, selectedDates, initialAssignMode, initialTargetUserId, loadAttachments]);

  const handleInputChange = (field, value) => {
    // Lógica especial para el cambio de "Todo el día"
    if (field === 'allDay') {
      const isAllDay = value;
      const now = new Date();
      
      // Si activamos "Todo el día", solo guardamos la fecha (YYYY-MM-DD)
      if (isAllDay) {
        setFormData(prev => ({
          ...prev,
          allDay: true,
          start: prev.start ? prev.start.split('T')[0] : formatDateForDateInput(now),
          end: prev.end ? prev.end.split('T')[0] : formatDateForDateInput(now)
        }));
      } else {
        // Si desactivamos "Todo el día", añadimos hora por defecto (ej: hora actual o 09:00)
        // Intentamos preservar la fecha que ya estaba seleccionada
        const currentStartDate = formData.start || formatDateForDateInput(now);
        const currentEndDate = formData.end || formatDateForDateInput(now);
        
        // Añadimos hora actual para inicio y +1 hora para fin
        const startTime = now.toTimeString().slice(0, 5); // HH:mm
        const endTime = new Date(now.getTime() + 60*60*1000).toTimeString().slice(0, 5);

        setFormData(prev => ({
          ...prev,
          allDay: false,
          start: `${currentStartDate}T${startTime}`,
          end: `${currentEndDate}T${endTime}`
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Debounced AI suggestions when title or description changes
    if (field === 'title' || field === 'description') {
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
      suggestionsTimerRef.current = setTimeout(() => {
        const updatedForm = { ...formData, [field]: value };
        if (updatedForm.title && updatedForm.title.trim().length >= 3) {
          fetchSuggestions(updatedForm.title, updatedForm.description, updatedForm.location, updatedForm.categories);
        }
      }, 1500);
    }
  };

  const toggleCategory = (categoryName) => {
    setFormData(prev => {
      const currentCats = prev.categories || [];
      if (currentCats.includes(categoryName)) {
        return { ...prev, categories: currentCats.filter(c => c !== categoryName) };
      } else {
        return { ...prev, categories: [...currentCats, categoryName] };
      }
    });
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    return category ? (category.hexColor || category.color) : 'var(--cal-primary)';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('calendar.titleRequired');
    }

    if (!formData.start) {
      newErrors.start = t('calendar.startDateRequired');
    }

    if (!formData.allDay && !formData.end) {
      newErrors.end = t('calendar.endDateRequired');
    }

    if (formData.start && formData.end && !formData.allDay) {
      const startDate = new Date(formData.start);
      const endDate = new Date(formData.end);
      if (endDate <= startDate) {
        newErrors.end = t('calendar.endDateInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let finalStart = formData.start;
      let finalEnd = formData.end;

      if (formData.allDay) {
          // Convert inclusive end date back to exclusive for backend/Graph API (add 1 day)
          const [y, m, d] = formData.end.split('-').map(Number);
          const nextDay = new Date(y, m - 1, d + 1);
          finalEnd = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      } else {
          // Fix timezone issue: Convert local input time to ISO UTC
          if (formData.start && formData.start.includes('T')) {
              finalStart = new Date(formData.start).toISOString();
          }
          if (formData.end && formData.end.includes('T')) {
              finalEnd = new Date(formData.end).toISOString();
          }
      }

      const eventData = {
        ...formData,
        start: finalStart,
        end: finalEnd,
        assignMode,
        groupId: selectedGroupId,
        targetUserId: selectedUserId
      };

      await onSave(eventData, currentMode);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setErrors({ general: t('calendar.errorSavingEvent') });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setErrors({ general: t('calendar.errorDeletingEvent') });
    }
  };

  const formatDateTime = (dateStr, allDay) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (allDay) {
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return date.toLocaleString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModalTitle = () => {
    switch (currentMode) {
      case 'view': return t('calendar.viewEvent');
      case 'edit': return t('calendar.editEvent');
      case 'create': return t('calendar.newEvent');
      default: return t('calendar.viewEvent');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop show" onClick={onClose}>
        <div className="event-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{getModalTitle()}</h2>
            <button className="close-modal" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-body">
            {errors.general && (
              <div className="message error">
                ⚠️ {errors.general}
              </div>
            )}

            {currentMode === 'view' ? (
              // VIEW MODE
              <div className="event-details">
                <div className="detail-group">
                  <label className="detail-label">{t('calendar.eventTitle')}</label>
                  <div className="detail-value title-value">{event?.title || t('calendar.noTitle')}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.eventStart')}</label>
                    <div className="detail-value">
                      {formatDateTime(event?.start, event?.allDay)}
                    </div>
                  </div>

                  {!event?.allDay && (
                    <div className="detail-group">
                      <label className="detail-label">{t('calendar.eventEnd')}</label>
                      <div className="detail-value">
                        {formatDateTime(event?.end, false)}
                      </div>
                    </div>
                  )}
                </div>

                {event?.allDay && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.eventType')}</label>
                    <div className="detail-value">{t('calendar.allDay')}</div>
                  </div>
                )}

                {event?.extendedProps?.location && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.location')}</label>
                    <div className="detail-value location-detail">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.extendedProps.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-link"
                      >
                        <span className="location-link-icon">📍</span>
                        <span className="location-link-text">{event.extendedProps.location}</span>
                        <span className="location-link-arrow">↗</span>
                      </a>
                    </div>
                  </div>
                )}

                {event?.extendedProps?.assignedBy && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.assignedBy') || 'Asignado por'}</label>
                    <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>👤</span>
                      <span style={{ fontWeight: 500, color: '#3b82f6' }}>{event.extendedProps.assignedBy}</span>
                    </div>
                  </div>
                )}

                {event?.extendedProps?.description && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.description')}</label>
                    <div className="detail-value description-value">{event.extendedProps.description}</div>
                  </div>
                )}

                {event?.extendedProps?.attendeesEmails && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.attendees')}</label>
                    <div className="detail-value">{event.extendedProps.attendeesEmails}</div>
                  </div>
                )}

                {event?.extendedProps?.categories && event.extendedProps.categories.length > 0 && (
                  <div className="detail-group">
                    <label className="detail-label">{t('calendar.categories')}</label>
                    <div className="detail-value">
                      <div className="categories-tags">
                        {event.extendedProps.categories.map((categoryName, index) => (
                          <span 
                            key={index} 
                            className="category-tag"
                            style={{ 
                              backgroundColor: getCategoryColor(categoryName)
                            }}
                          >
                            {categoryName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments Section - View Mode */}
                <div className="detail-group">
                  <label className="detail-label">{t('calendar.attachments') || 'Adjuntos'}</label>
                  <div className="detail-value">
                    {attachments.length > 0 ? (
                      <div className="attachments-list">
                        {attachments.map(att => (
                          <div key={att.id} className="attachment-item" onClick={() => openAttachment(att)} style={{ cursor: 'pointer' }} title={t('calendar.openAttachment') || 'Abrir adjunto'}>
                            <span className="attachment-icon"><FileTypeIcon type={getFileType(att.fileName)} size={20} /></span>
                            <div className="attachment-info">
                              <span className="attachment-name">{att.fileName}</span>
                              <span className="attachment-meta">{formatFileSize(att.fileSize)} • {att.attachedBy}</span>
                            </div>
                            <button 
                              className="attachment-remove-btn"
                              onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                              title={t('calendar.removeAttachment') || 'Quitar adjunto'}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">{t('calendar.noAttachments') || 'Sin adjuntos'}</span>
                    )}
                    <button 
                      className="btn btn-sm btn-secondary mt-2"
                      onClick={() => { setShowFilePicker(true); loadUserFiles(); }}
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      📎 {t('calendar.attachFile') || 'Adjuntar archivo'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // EDIT/CREATE MODE
              <form className="event-form">
                <div className="form-group">
                  <label className="form-label required">{t('calendar.eventTitle')}</label>
                  <input
                    type="text"
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder={t('calendar.titlePlaceholder')}
                  />
                  {errors.title && <div className="error-message">{errors.title}</div>}
                </div>

                <div className="form-group checkbox-group">
                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={formData.allDay}
                      onChange={(e) => handleInputChange('allDay', e.target.checked)}
                    />
                    {t('calendar.allDay')}
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">
                      {formData.allDay ? t('calendar.eventStart') : t('calendar.eventStart')}
                    </label>
                    <input
                      type={formData.allDay ? 'date' : 'datetime-local'}
                      className={`form-input ${errors.start ? 'error' : ''}`}
                      value={formData.start}
                      onChange={(e) => handleInputChange('start', e.target.value)}
                    />
                    {errors.start && <div className="error-message">{errors.start}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">
                      {formData.allDay ? t('calendar.eventEnd') : t('calendar.eventEnd')}
                    </label>
                    <input
                      type={formData.allDay ? 'date' : 'datetime-local'}
                      className={`form-input ${errors.end ? 'error' : ''}`}
                      value={formData.end}
                      onChange={(e) => handleInputChange('end', e.target.value)}
                    />
                    {errors.end && <div className="error-message">{errors.end}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('calendar.location')}</label>
                  <div className="location-input-container">
                    <input
                      type="text"
                      className="form-input location-input"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder={t('calendar.locationPlaceholder')}
                    />
                    <button 
                      type="button"
                      className="btn btn-secondary location-picker-btn"
                      onClick={() => setShowLocationPicker(true)}
                      title={t('calendar.searchMap')}
                    >
                      📍
                    </button>
                  </div>
                </div>

                {/* Assignment Section */}
                {currentMode === 'create' && (user?.role === 'admin' || user?.role === 'boss') && (
                  <div className="form-group" style={{ marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                    <label className="form-label" style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                      {t('calendar.assignTo') || 'Asignar a:'}
                    </label>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="assignMode"
                          value="me"
                          checked={assignMode === 'me'}
                          onChange={(e) => setAssignMode(e.target.value)}
                        />
                        {t('calendar.assignMe') || 'Mí mismo'}
                      </label>
                      <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="assignMode"
                          value="group"
                          checked={assignMode === 'group'}
                          onChange={(e) => setAssignMode(e.target.value)}
                        />
                        {t('calendar.assignGroup') || 'Grupo'}
                      </label>
                      <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="assignMode"
                          value="user"
                          checked={assignMode === 'user'}
                          onChange={(e) => setAssignMode(e.target.value)}
                        />
                        {t('calendar.assignUser') || 'Usuario'}
                      </label>
                    </div>
                    
                    {assignMode === 'group' && (
                      <div style={{ marginTop: '10px', animation: 'fadeIn 0.3s' }}>
                        <select
                          className="form-input"
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                        >
                          <option value="">{t('calendar.selectGroupPlaceholder') || 'Seleccionar Grupo...'}</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.memberCount || 0} miembros)</option>
                          ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                          {t('calendar.groupEventNote') || 'Se creará un evento en el calendario de cada miembro del grupo.'}
                        </p>
                      </div>
                    )}

                    {assignMode === 'user' && (
                      <div style={{ marginTop: '10px', animation: 'fadeIn 0.3s' }}>
                        <select
                          className="form-input"
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                          <option value="">{t('calendar.selectUserPlaceholder') || 'Seleccionar Usuario...'}</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                          ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                          {t('calendar.userEventNote') || 'Se creará un evento en el calendario de este usuario.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('calendar.description')}</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={t('calendar.descriptionPlaceholder')}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('calendar.attendees')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.attendees}
                    onChange={(e) => handleInputChange('attendees', e.target.value)}
                    placeholder={t('calendar.attendeesPlaceholder')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('calendar.categories')}</label>
                  <div className="category-selector">
                    {categories.length > 0 ? categories.map(cat => (
                      <div
                        key={cat.id}
                        className={`category-option ${formData.categories.includes(cat.name) ? 'selected' : ''}`}
                        style={{
                          '--cat-color': cat.hexColor || cat.color,
                          backgroundColor: formData.categories.includes(cat.name) ? (cat.hexColor || cat.color) : 'transparent',
                          borderColor: cat.hexColor || cat.color
                        }}
                        onClick={() => toggleCategory(cat.name)}
                      >
                        {cat.name}
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 italic">{t('calendar.noCategories')}</div>
                    )}
                  </div>
                </div>

                {/* AI File Suggestions */}
                {(currentMode === 'create' || currentMode === 'edit') && (suggestionsLoading || (suggestedFiles.length > 0 && suggestionsShown)) && (
                  <div className="form-group ai-suggestions-section">
                    <label className="form-label ai-suggestions-label">
                      <span className="ai-sparkle">✨</span>
                      {t('calendar.suggestedFiles') || 'Archivos sugeridos por IA'}
                      {!suggestionsLoading && suggestedFiles.length > 0 && (
                        <button 
                          className="ai-suggestions-dismiss"
                          onClick={() => setSuggestionsShown(false)}
                          title={t('common.close') || 'Cerrar'}
                        >✕</button>
                      )}
                    </label>
                    {suggestionsLoading ? (
                      <div className="ai-suggestions-loading">
                        <div className="ai-suggestions-spinner" />
                        <span>{t('calendar.analyzingFiles') || 'Analizando tus archivos...'}</span>
                      </div>
                    ) : (
                      <div className="ai-suggestions-list">
                        {suggestedFiles
                          .filter(f => !dismissedSuggestions.has(f.id))
                          .map(file => (
                          <div key={file.id} className="ai-suggestion-item">
                            <div className="ai-suggestion-main">
                              <span className="attachment-icon"><FileTypeIcon type={getFileType(file.name)} size={20} /></span>
                              <div className="ai-suggestion-info">
                                <span className="attachment-name">{file.name.split('/').pop()}</span>
                                <span className="ai-suggestion-reason">{file.reason}</span>
                              </div>
                            </div>
                            <div className="ai-suggestion-actions">
                              <button
                                className="ai-suggestion-attach-btn"
                                onClick={() => {
                                  if (event?.id) {
                                    attachFile(file, event.id);
                                    setDismissedSuggestions(prev => new Set([...prev, file.id]));
                                  }
                                }}
                                disabled={!event?.id && currentMode === 'create'}
                                title={currentMode === 'create' 
                                  ? (t('calendar.saveFirstToAttach') || 'Guarda el evento primero para adjuntar') 
                                  : (t('calendar.attachFile') || 'Adjuntar')}
                              >
                                📎 {t('calendar.attach') || 'Adjuntar'}
                              </button>
                              <button
                                className="ai-suggestion-dismiss-btn"
                                onClick={() => setDismissedSuggestions(prev => new Set([...prev, file.id]))}
                              >✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments Section - Edit/Create Mode */}
                {currentMode === 'edit' && event?.id && (
                  <div className="form-group">
                    <label className="form-label">📎 {t('calendar.attachments') || 'Adjuntos'}</label>
                    <div className="attachments-list">
                      {attachments.map(att => (
                        <div key={att.id} className="attachment-item" onClick={() => openAttachment(att)} style={{ cursor: 'pointer' }} title={t('calendar.openAttachment') || 'Abrir adjunto'}>
                          <span className="attachment-icon"><FileTypeIcon type={getFileType(att.fileName)} size={20} /></span>
                          <div className="attachment-info">
                            <span className="attachment-name">{att.fileName}</span>
                            <span className="attachment-meta">{formatFileSize(att.fileSize)}</span>
                          </div>
                          <button 
                            className="attachment-remove-btn"
                            onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                            title={t('calendar.removeAttachment') || 'Quitar'}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button"
                      className="btn btn-sm btn-secondary mt-1"
                      onClick={() => { setShowFilePicker(true); loadUserFiles(); }}
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      + {t('calendar.attachFile') || 'Adjuntar archivo'}
                    </button>
                    <button 
                      type="button"
                      className="btn btn-sm mt-1 ai-suggest-btn"
                      onClick={() => fetchSuggestions(formData.title, formData.description, formData.location, formData.categories)}
                      disabled={suggestionsLoading || !formData.title || formData.title.trim().length < 3}
                      style={{ fontSize: '0.8rem', padding: '4px 10px', marginLeft: '6px' }}
                    >
                      ✨ {t('calendar.suggestFiles') || 'Sugerir archivos'}
                    </button>
                  </div>
                )}

                {/* Create mode: hint to save first before attaching */}
                {currentMode === 'create' && (
                  <div className="form-group">
                    <label className="form-label" style={{ opacity: 0.7 }}>📎 {t('calendar.attachments') || 'Adjuntos'}</label>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      💡 {t('calendar.saveToAttach') || 'Guarda el evento primero y luego ábrelo para adjuntar archivos.'}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="modal-footer">
            {currentMode === 'view' ? (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentMode('edit')}
                  disabled={isLoading}
                >
                  {t('calendar.edit')}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  {t('calendar.delete')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  {t('calendar.close')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {t('calendar.cancel')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {currentMode === 'create' ? t('calendar.create') : t('calendar.save')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop show" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('calendar.confirmDelete')}</h3>
              <button
                className="close-modal"
                onClick={() => setShowDeleteConfirm(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>{t('calendar.deleteConfirmation', { title: event?.title })}</p>
              <p className="warning-text">{t('calendar.irreversibleAction')}</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                {t('calendar.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {t('calendar.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Picker Modal for Attachments */}
      {showFilePicker && (
        <div className="modal-backdrop show" style={{ zIndex: 1100 }} onClick={() => setShowFilePicker(false)}>
          <div className="event-modal file-picker-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">📎 {t('calendar.selectFile') || 'Seleccionar archivo'}</h2>
              <button className="close-modal" onClick={() => setShowFilePicker(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={fileSearch}
                  onChange={(e) => { setFileSearch(e.target.value); loadUserFiles(e.target.value); }}
                  placeholder={t('calendar.searchFiles') || 'Buscar archivos...'}
                  autoFocus
                />
              </div>
              {filesLoading ? (
                <div className="text-center text-gray-400 py-4">{t('common.loading') || 'Cargando...'}</div>
              ) : userFiles.length === 0 ? (
                <div className="text-center text-gray-400 py-4">{t('calendar.noFilesFound') || 'No se encontraron archivos'}</div>
              ) : (
                <div className="file-picker-list">
                  {userFiles.map(file => (
                    <div 
                      key={file.id} 
                      className="file-picker-item"
                      onClick={() => attachFile(file, event?.id)}
                    >
                      <span className="attachment-icon"><FileTypeIcon type={getFileType(file.name)} size={20} /></span>
                      <div className="attachment-info">
                        <span className="attachment-name">
                          {file.name}
                          {file.shared && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                              🔗 {file.owner}
                            </span>
                          )}
                        </span>
                        <span className="attachment-meta">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(location) => handleInputChange('location', location)}
        initialLocation={formData.location}
      />
    </>
  );
};

export default EventModal;