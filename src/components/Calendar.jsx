import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css';
import EventModal from './EventModal';

const Calendar = ({ user, onLogout, onBackToPanel, onThemeToggle, isDarkMode }) => {
  const calendarRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set()); // Inicializar como Set vacío
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [events, setEvents] = useState([]);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'view', // 'view', 'edit', 'create'
    event: null,
    selectedDates: null // Para modo create: { start, end, allDay }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/events/categories', {
        credentials: 'include'
      });

      if (response.ok) {
        const categoriesData = await response.json();
        // Add "Sin categoría" category
        categoriesData.push({
          id: 'no-category',
          name: 'Sin categoría',
          color: 'preset8',
          hexColor: '#c0c0c0'
        });

        setCategories(categoriesData);
        setSelectedCategories(new Set(categoriesData.map(cat => cat.name)));
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Si falla la carga de categorías, mostrar todos los eventos
      setCategories([]);
      setSelectedCategories(new Set());
    }
  }, []);

  const loadEvents = useCallback(async (startDate = null, endDate = null) => {
    // Evitar llamadas simultáneas
    if (isLoadingEvents) {
      console.log('⚠️ Ya se están cargando eventos, ignorando llamada...');
      return;
    }

    setIsLoadingEvents(true);
    try {
      let start, end;

      if (startDate && endDate) {
        // Usar las fechas proporcionadas (del calendario visible)
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Usar el rango por defecto basado en la fecha actual - AMPLIADO A TODO EL AÑO PASADO Y PRÓXIMO
        const now = new Date();
        start = new Date(now.getFullYear() - 1, 0, 1); // Enero 1 del año pasado
        end = new Date(now.getFullYear() + 1, 11, 31); // Diciembre 31 del próximo año
      }

      console.log('Loading events for range:', start.toISOString(), 'to', end.toISOString());

      const response = await fetch(`/api/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const eventsData = await response.json();
        console.log(`✅ Eventos cargados: ${eventsData.length}`);
        console.log('📋 Primeros 3 eventos:', eventsData.slice(0, 3));
        setEvents(eventsData);
      } else {
        console.error('❌ Error en respuesta de eventos:', response.status);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [isLoadingEvents]);

  const handleDatesSet = useCallback((dateInfo) => {
    console.log('Calendar dates changed:', dateInfo.start, dateInfo.end);
    // No recargar eventos automáticamente al cambiar de mes
  }, []);

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });

      if (response.ok) {
        const statusData = await response.json();
        setIsAuthenticated(statusData.authenticated);
        if (statusData.authenticated) {
          await loadCategories(); // Esperar a que se carguen las categorías
          loadEvents(); // Luego cargar eventos
        } else {
          // Si no está autenticado con Outlook, redirigir automáticamente al login
          console.log('No autenticado con Outlook, redirigiendo al login...');
          window.location.href = 'http://localhost:5000/api/auth/login';
        }
      } else {
        // Si hay error en la petición, también redirigir al login
        console.log('Error verificando autenticación, redirigiendo al login...');
        window.location.href = 'http://localhost:5000/api/auth/login';
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // En caso de error, redirigir al login
      window.location.href = 'http://localhost:5000/api/auth/login';
    }
  }, [loadCategories, loadEvents]);

  const handleEventClick = (clickInfo) => {
    console.log('Event clicked:', clickInfo.event);
    setModalState({
      isOpen: true,
      mode: 'view',
      event: clickInfo.event
    });
  };

  const handleDateSelect = (selectInfo) => {
    console.log('Date selected:', selectInfo);
    setModalState({
      isOpen: true,
      mode: 'create',
      event: null,
      selectedDates: {
        start: selectInfo.start,
        end: selectInfo.end,
        allDay: selectInfo.allDay
      }
    });
    calendarRef.current.getApi().unselect();
  };

  const handleEventDrop = async (dropInfo) => {
    await updateEventDates(dropInfo.event, dropInfo.event.start, dropInfo.event.end, dropInfo.revert);
  };

  const handleEventResize = async (resizeInfo) => {
    await updateEventDates(resizeInfo.event, resizeInfo.event.start, resizeInfo.event.end, resizeInfo.revert);
  };

  const updateEventDates = async (event, newStart, newEnd, revertFunc) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: event.title,
          start: newStart.toISOString(),
          end: newEnd ? newEnd.toISOString() : null,
          allDay: event.allDay
        })
      });

      if (!response.ok) {
        throw new Error('Error updating event');
      }

      console.log('Event updated:', event.title);
      // Recargar con rango amplio en lugar de rango actual
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      if (typeof revertFunc === 'function') {
        revertFunc();
      }
    }
  };

  const toggleCategory = (categoryName) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(categories.map(cat => cat.name)));
  };

  const deselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const toggleCategoriesPanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const filteredEvents = events.filter(event => {
    // Si aún no se han cargado las categorías, mostrar todos los eventos
    if (categories.length === 0) {
      return true;
    }

    // Si no hay categorías seleccionadas, mostrar todos los eventos
    if (selectedCategories.size === 0) {
      return true;
    }

    // Si el evento no tiene categorías, solo mostrar si "Sin categoría" está seleccionada
    if (!event.extendedProps?.categories || event.extendedProps.categories.length === 0) {
      return selectedCategories.has('Sin categoría');
    }

    // Si el evento tiene categorías, mostrar si al menos una coincide con las seleccionadas
    return event.extendedProps.categories.some(category => selectedCategories.has(category));
  });

  // Log resumen del filtrado (solo cuando cambian las categorías o eventos)
  const selectedCount = categories.length === 0 ? 'cargando' : selectedCategories.size;
  console.log(`📊 Filtrado: ${events.length} eventos → ${filteredEvents.length} mostrados (${selectedCount} categorías seleccionadas)`);

  useEffect(() => {
    // Aplicar el tema al body del documento
    console.log('🎨 Cambiando tema:', isDarkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    // También aplicar directamente al body para asegurar
    document.body.style.background = isDarkMode 
      ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
      : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
  }, [isDarkMode]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    // Solo cargar eventos inicialmente cuando se autentica
    // Los eventos se recargan automáticamente cuando cambias de mes (handleDatesSet)
    if (isAuthenticated && events.length === 0) {
      loadEvents();
    }
  }, [isAuthenticated, events.length, loadEvents]);

  console.log('🎯 Eventos que se pasan al calendario:', filteredEvents.length);

  if (!isAuthenticated) {
    return (
      <div className="main-content">
        <div className="auth-card">
          <h2>🔐 Conectando con Outlook...</h2>
          <p>Redirigiendo a Microsoft para autenticación automática...</p>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #3498db', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <img className="logo-img" src="/icons/nube.svg" alt="Nube" />
            <span>Calendario Outlook</span>
          </div>
        </div>
        <div className="nav-buttons">
          <button className="nav-btn secondary" onClick={onBackToPanel}>
            ⬅️ Volver al Panel
          </button>
          <button 
            className="theme-toggle-btn"
            onClick={onThemeToggle}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button className="nav-btn" onClick={onLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      <div className="calendar-wrapper">
        <div className="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="es"
            timeZone="Europe/Madrid"
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día'
            }}
            height="auto"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            eventResizableFromStart={true}
            events={filteredEvents}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventClick={handleEventClick}
            select={handleDateSelect}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={handleDatesSet}
          />
        </div>
      </div>

      <button className={`categories-toggle ${isPanelOpen ? 'panel-open' : ''}`} onClick={toggleCategoriesPanel}>
        🏷️
      </button>

      <div className={`categories-panel ${isPanelOpen ? 'open' : ''}`}>
        <div className="categories-header">
          <h3>🏷️ Categorías</h3>
        </div>

        <div className="categories-actions">
          <button className="category-action-btn" onClick={selectAllCategories}>✅ Todas</button>
          <button className="category-action-btn" onClick={deselectAllCategories}>❌ Ninguna</button>
        </div>

        <div className="categories-list">
          {categories.map(category => (
            <div key={category.id} className={`category-item ${selectedCategories.has(category.name) ? 'selected' : ''}`}>
              <input
                type="checkbox"
                id={`cat-${category.id}`}
                checked={selectedCategories.has(category.name)}
                onChange={() => toggleCategory(category.name)}
                disabled={categories.length === 0}
              />
              <div className="category-color" style={{ backgroundColor: category.hexColor }}></div>
              <label htmlFor={`cat-${category.id}`} className="category-label">{category.name}</label>
            </div>
          ))}
        </div>
      </div>

      {modalState.isOpen && (
        <EventModal
          isOpen={modalState.isOpen}
          event={modalState.event}
          mode={modalState.mode}
          categories={categories}
          selectedDates={modalState.selectedDates}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={async (eventData, mode) => {
            setIsLoading(true);
            try {
              if (mode === 'create') {
                // Create new event
                const response = await fetch('/api/events', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                  throw new Error('Error creating event');
                }

                console.log('Event created:', eventData.title);
              } else if (mode === 'edit') {
                // Update existing event
                const response = await fetch(`/api/events/${modalState.event.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                  throw new Error('Error updating event');
                }

                console.log('Event updated:', eventData.title);
              }

              // Close modal and reload events
              setModalState({ ...modalState, isOpen: false });
              // Recargar con rango amplio
              loadEvents();
            } catch (error) {
              console.error('Error saving event:', error);
              throw error; // Re-throw to let modal handle error display
            } finally {
              setIsLoading(false);
            }
          }}
          onDelete={async (eventId) => {
            setIsLoading(true);
            try {
              const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include'
              });

              if (!response.ok) {
                throw new Error('Error deleting event');
              }

              console.log('Event deleted:', eventId);
              setModalState({ ...modalState, isOpen: false });
              // Recargar con rango amplio
              loadEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              throw error; // Re-throw to let modal handle error display
            } finally {
              setIsLoading(false);
            }
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default Calendar;