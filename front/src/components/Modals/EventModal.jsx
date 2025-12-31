import React, { useState, useEffect } from 'react';
import './EventModal.css';
import LocationPickerModal from './LocationPickerModal';
import { useLanguage } from '../../context/LanguageContext';

const EventModal = ({
  isOpen,
  onClose,
  event,
  mode, // 'view', 'edit', 'create'
  onSave,
  onDelete,
  categories = [],
  isLoading = false,
  selectedDates = null // Para modo create
}) => {
  const { t, language } = useLanguage();
  const [currentMode, setCurrentMode] = useState(mode);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
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
      const endDate = event.end;

      setFormData({
        title: event.title || '',
        start: event.allDay ? formatDateForDateInput(startDate) : formatDateForInput(startDate),
        end: event.allDay ? formatDateForDateInput(endDate) : formatDateForInput(endDate),
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
          ? selectedDates.start.toISOString().split('T')[0]
          : formatDateForInput(selectedDates.start);
        const endDate = selectedDates.allDay
          ? selectedDates.end.toISOString().split('T')[0]
          : formatDateForInput(selectedDates.end);

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
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [isOpen, event, mode, selectedDates]);

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
      const eventData = {
        ...formData,
        // Convert to proper format for API
        start: formData.allDay ? formData.start : formData.start + ':00',
        end: formData.allDay ? formData.end : formData.end + ':00'
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
                    <div className="detail-value">{event.extendedProps.location}</div>
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
                              backgroundColor: getCategoryColor(categoryName),
                              color: '#fff' // Asumimos texto blanco para contraste
                            }}
                          >
                            {categoryName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder={t('calendar.locationPlaceholder')}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowLocationPicker(true)}
                      title={t('calendar.searchMap')}
                      style={{ padding: '0 12px' }}
                    >
                      📍
                    </button>
                  </div>
                </div>

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
                          borderColor: cat.hexColor || cat.color,
                          color: formData.categories.includes(cat.name) ? '#fff' : 'var(--cal-text)'
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