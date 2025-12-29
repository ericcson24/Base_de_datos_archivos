import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css';
import EventModal from '../Modals/EventModal';
import SettingsModal from '../Modals/SettingsModal';

const Calendar = ({ user, onLogout, onBackToPanel, onThemeToggle, isDarkMode }) => {
  const calendarRef = useRef(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'view',
    event: null,
    selectedDates: null
  });

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/events/categories', { credentials: 'include' });
      if (response.ok) {
        const categoriesData = await response.json();
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

  const loadEvents = useCallback(async (startDate = null, endDate = null) => {
    if (isLoadingEvents) return;
    setIsLoadingEvents(true);
    try {
      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        const now = new Date();
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() + 1, 11, 31);
      }
      const response = await fetch(`/api/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const eventsData = await response.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [isLoadingEvents]);

  useEffect(() => {
    loadCategories();
    loadEvents();
  }, [loadCategories, loadEvents]);

  const toggleCategory = (categoryName) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const filteredEvents = events.filter(event => {
    if (categories.length === 0 || selectedCategories.size === 0) return true;
    if (!event.extendedProps?.categories || event.extendedProps.categories.length === 0) {
      return selectedCategories.has('Sin categoría');
    }
    return event.extendedProps.categories.some(category => selectedCategories.has(category));
  });

  const handleEventClick = (clickInfo) => {
    clickInfo.jsEvent.preventDefault(); // Prevent default behavior (like following links)
    setModalState({ isOpen: true, mode: 'view', event: clickInfo.event });
  };

  const handleDateSelect = (selectInfo) => {
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: event.title,
          start: newStart.toISOString(),
          end: newEnd ? newEnd.toISOString() : null,
          allDay: event.allDay
        })
      });
      if (!response.ok) throw new Error('Error updating event');
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      if (revertFunc) revertFunc();
    }
  };

  return (
    <div className="calendar-layout">
      {/* Sidebar */}
      <div className={`calendar-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/icons/nube.svg" alt="Logo" className="logo-icon" />
            <span>Calendario</span>
          </div>
        </div>

        <div className="sidebar-content">
          <button className="create-event-btn" onClick={() => setModalState({ isOpen: true, mode: 'create', selectedDates: { start: new Date(), end: new Date(), allDay: true } })}>
            <span>+</span> Nuevo Evento
          </button>

          <div className="sidebar-section">
            <div className="section-title">Categorías</div>
            <div className="category-list">
              <div className="category-item" onClick={() => setSelectedCategories(new Set(categories.map(c => c.name)))}>
                <span style={{fontSize: '0.8rem'}}> Ver todas</span>
              </div>
              {categories.map(category => (
                <div key={category.id} className="category-item" onClick={() => toggleCategory(category.name)}>
                  <input
                    type="checkbox"
                    className="category-checkbox"
                    checked={selectedCategories.has(category.name)}
                    onChange={() => {}}
                  />
                  <div className="category-dot" style={{ backgroundColor: category.hexColor }}></div>
                  <span>{category.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
             Ajustes
          </button>
          <button className="sidebar-btn" onClick={onBackToPanel}>
             Volver al Panel
          </button>
          <button className="sidebar-btn" onClick={onLogout}>
             Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="calendar-main">
        <div className="main-header">
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              {calendarRef.current?.getApi()?.view?.title || 'Calendario'}
            </h2>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={onThemeToggle}>
              {isDarkMode ? '' : ''}
            </button>
          </div>
        </div>

        <div className="calendar-view">
          <div className="calendar-card">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="es"
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
              height="100%"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              events={filteredEvents}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={(dateInfo) => {
                // Force update title
              }}
            />
          </div>
        </div>
      </div>

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
        />
      )}

      {modalState.isOpen && (
        <EventModal
          isOpen={modalState.isOpen}
          event={modalState.event}
          mode={modalState.mode}
          categories={categories}
          selectedDates={modalState.selectedDates}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={async (eventData, mode) => {
            try {
              const url = mode === 'create' ? '/api/events' : `/api/events/${modalState.event.id}`;
              const method = mode === 'create' ? 'POST' : 'PUT';
              
              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(eventData)
              });

              if (!response.ok) throw new Error('Error saving event');
              
              setModalState({ ...modalState, isOpen: false });
              loadEvents();
            } catch (error) {
              console.error('Error saving event:', error);
            }
          }}
          onDelete={async (eventId) => {
            try {
              const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              if (!response.ok) throw new Error('Error deleting event');
              setModalState({ ...modalState, isOpen: false });
              loadEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
            }
          }}
        />
      )}
    </div>
  );
};

export default Calendar;
