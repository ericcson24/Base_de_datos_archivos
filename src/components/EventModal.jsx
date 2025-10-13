import React, { useState, useEffect } from 'react';
import './EventModal.css';

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
  const [currentMode, setCurrentMode] = useState(mode);
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

  // Initialize form data when modal opens or event/mode changes
  useEffect(() => {
    if (isOpen && event && (mode === 'view' || mode === 'edit')) {
      const startDate = event.start;
      const endDate = event.end;

      setFormData({
        title: event.title || '',
        start: event.allDay ? startDate.split('T')[0] : startDate,
        end: event.allDay ? endDate.split('T')[0] : endDate,
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
          : selectedDates.start.toISOString().slice(0, 16);
        const endDate = selectedDates.allDay
          ? selectedDates.end.toISOString().split('T')[0]
          : selectedDates.end.toISOString().slice(0, 16);

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
          start: now.toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
          end: tomorrow.toISOString().slice(0, 16),
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }

    if (!formData.start) {
      newErrors.start = 'La fecha de inicio es obligatoria';
    }

    if (!formData.allDay && !formData.end) {
      newErrors.end = 'La fecha de fin es obligatoria para eventos con hora';
    }

    if (formData.start && formData.end && !formData.allDay) {
      const startDate = new Date(formData.start);
      const endDate = new Date(formData.end);
      if (endDate <= startDate) {
        newErrors.end = 'La fecha de fin debe ser posterior a la fecha de inicio';
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
      setErrors({ general: 'Error al guardar el evento' });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setErrors({ general: 'Error al eliminar el evento' });
    }
  };

  const formatDateTime = (dateStr, allDay) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (allDay) {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return date.toLocaleString('es-ES', {
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
      case 'view': return '📅 Ver Evento';
      case 'edit': return '✏️ Editar Evento';
      case 'create': return '➕ Nuevo Evento';
      default: return 'Evento';
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
                  <label className="detail-label">📝 Título:</label>
                  <div className="detail-value">{event?.title || 'Sin título'}</div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">📅 Inicio:</label>
                  <div className="detail-value">
                    {formatDateTime(event?.start, event?.allDay)}
                  </div>
                </div>

                {!event?.allDay && (
                  <div className="detail-group">
                    <label className="detail-label">🏁 Fin:</label>
                    <div className="detail-value">
                      {formatDateTime(event?.end, false)}
                    </div>
                  </div>
                )}

                {event?.allDay && (
                  <div className="detail-group">
                    <label className="detail-label">⏰ Tipo:</label>
                    <div className="detail-value">Todo el día</div>
                  </div>
                )}

                {event?.extendedProps?.location && (
                  <div className="detail-group">
                    <label className="detail-label">📍 Ubicación:</label>
                    <div className="detail-value">{event.extendedProps.location}</div>
                  </div>
                )}

                {event?.extendedProps?.description && (
                  <div className="detail-group">
                    <label className="detail-label">📄 Descripción:</label>
                    <div className="detail-value">{event.extendedProps.description}</div>
                  </div>
                )}

                {event?.extendedProps?.attendeesEmails && (
                  <div className="detail-group">
                    <label className="detail-label">👥 Asistentes:</label>
                    <div className="detail-value">{event.extendedProps.attendeesEmails}</div>
                  </div>
                )}

                {event?.extendedProps?.categories && event.extendedProps.categories.length > 0 && (
                  <div className="detail-group">
                    <label className="detail-label">🏷️ Categorías:</label>
                    <div className="detail-value">
                      <div className="categories-tags">
                        {event.extendedProps.categories.map((category, index) => (
                          <span key={index} className="category-tag">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {event?.extendedProps?.calendarName && (
                  <div className="detail-group">
                    <label className="detail-label">📊 Calendario:</label>
                    <div className="detail-value">{event.extendedProps.calendarName}</div>
                  </div>
                )}
              </div>
            ) : (
              // EDIT/CREATE MODE
              <form className="event-form">
                <div className="form-group">
                  <label className="form-label required">📝 Título</label>
                  <input
                    type="text"
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Título del evento"
                  />
                  {errors.title && <div className="error-message">{errors.title}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={formData.allDay}
                      onChange={(e) => handleInputChange('allDay', e.target.checked)}
                    />
                    <span className="form-checkbox-label">Todo el día</span>
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">
                      📅 {formData.allDay ? 'Fecha de inicio' : 'Fecha y hora de inicio'}
                    </label>
                    <input
                      type={formData.allDay ? 'date' : 'datetime-local'}
                      className={`form-input ${errors.start ? 'error' : ''}`}
                      value={formData.start}
                      onChange={(e) => handleInputChange('start', e.target.value)}
                    />
                    {errors.start && <div className="error-message">{errors.start}</div>}
                  </div>

                  {!formData.allDay && (
                    <div className="form-group">
                      <label className="form-label required">🏁 Fecha y hora de fin</label>
                      <input
                        type="datetime-local"
                        className={`form-input ${errors.end ? 'error' : ''}`}
                        value={formData.end}
                        onChange={(e) => handleInputChange('end', e.target.value)}
                      />
                      {errors.end && <div className="error-message">{errors.end}</div>}
                    </div>
                  )}

                  {formData.allDay && (
                    <div className="form-group">
                      <label className="form-label required">🏁 Fecha de fin</label>
                      <input
                        type="date"
                        className={`form-input ${errors.end ? 'error' : ''}`}
                        value={formData.end}
                        onChange={(e) => handleInputChange('end', e.target.value)}
                      />
                      {errors.end && <div className="error-message">{errors.end}</div>}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">📍 Ubicación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Lugar del evento (opcional)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📄 Descripción</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción del evento (opcional)"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">👥 Asistentes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.attendees}
                    onChange={(e) => handleInputChange('attendees', e.target.value)}
                    placeholder="Correos electrónicos separados por comas (opcional)"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🏷️ Categorías</label>
                  <select
                    multiple
                    className="form-select"
                    value={formData.categories}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      handleInputChange('categories', selectedOptions);
                    }}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <small className="form-help">Mantén Ctrl (Cmd en Mac) para seleccionar múltiples categorías</small>
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
                  ✏️ Editar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                >
                  🗑️ Eliminar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  ✅ Cerrar
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  ❌ Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  💾 {currentMode === 'create' ? 'Crear' : 'Guardar'}
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
              <h3>🗑️ Confirmar eliminación</h3>
              <button
                className="close-modal"
                onClick={() => setShowDeleteConfirm(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que quieres eliminar el evento "{event?.title}"?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                ❌ Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isLoading}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventModal;