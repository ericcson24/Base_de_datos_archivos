import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css';

const Calendar = ({ user, onLogout, onBackToPanel, onThemeToggle, isDarkMode }) => {
  const calendarRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [events, setEvents] = useState([]);

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
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const response = await fetch(`/api/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const eventsData = await response.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
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
          loadCategories();
          loadEvents();
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
    // TODO: Open event modal
  };

  const handleDateSelect = (selectInfo) => {
    console.log('Date selected:', selectInfo);
    // TODO: Open create event modal
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
      loadEvents(); // Reload events
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
    if (selectedCategories.size === 0) return false;
    if (!event.extendedProps?.categories || event.extendedProps.categories.length === 0) {
      return selectedCategories.has('Sin categoría');
    }
    return event.extendedProps.categories.some(category => selectedCategories.has(category));
  });

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    // Reload events when categories change
    if (isAuthenticated) {
      loadEvents();
    }
  }, [selectedCategories, isAuthenticated, loadEvents]);

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
              />
              <div className="category-color" style={{ backgroundColor: category.hexColor }}></div>
              <label htmlFor={`cat-${category.id}`} className="category-label">{category.name}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;