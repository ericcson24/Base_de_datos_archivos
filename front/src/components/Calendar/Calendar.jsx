import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css';
import EventModal from '../Modals/EventModal';
import SettingsModal from '../Modals/SettingsModal';
import DayPanel from './DayPanel';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const DailyTimeline = ({ events }) => {
  const { t, language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const todaysEvents = events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end || event.start);
    return eventStart < endOfDay && eventEnd > startOfDay;
  });

  const getPosition = (date) => {
    const d = new Date(date);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return (minutes / 1440) * 100;
  };

  const currentTimePos = getPosition(currentTime);

  return (
    <div className="daily-timeline-container">
      <div className="daily-timeline-header">
        <h3>{t('calendar.todayDate', { date: today.toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }) })}</h3>
      </div>
      <div className="daily-timeline-track">
        {/* Overlay para el pasado */}
        <div className="timeline-past-overlay" style={{ width: `${currentTimePos}%` }}></div>

        {Array.from({ length: 25 }).map((_, i) => (
           <div key={i} className="timeline-hour-marker" style={{ left: `${(i / 24) * 100}%` }}>
             {i % 2 === 0 && <span className="timeline-hour-label">{i}:00</span>}
           </div>
        ))}
        
        {todaysEvents.map((event, idx) => {
            const start = new Date(event.start);
            const end = new Date(event.end || event.start);
            
            const effectiveStart = start < startOfDay ? startOfDay : start;
            const effectiveEnd = end > endOfDay ? endOfDay : end;

            const left = getPosition(effectiveStart);
            const width = getPosition(effectiveEnd) - left;
            
            return (
                <div 
                    key={event.id || idx} 
                    className="timeline-event-block"
                    style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 0.5)}%`,
                        backgroundColor: event.backgroundColor || '#3788d8'
                    }}
                    title={`${event.title}`}
                />
            );
        })}

        <div 
            className="current-time-line"
            style={{ left: `${currentTimePos}%` }}
        >
            <div className="current-time-dot" />
        </div>
      </div>
    </div>
  );
};

const Calendar = ({ user, onLogout, onBackToPanel, onBackToFolders, onThemeToggle, isDarkMode }) => {
  const { t, language } = useLanguage();
  const calendarRef = useRef(null);
  const { addToast } = useToast();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const isFetchingRef = useRef(false);
  
  // Estado para el panel lateral del día
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'view',
    event: null,
    selectedDates: null
  });

  // Helper to generate consistent color from string (Fallback for missing categories)
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const loadCategories = useCallback(async () => {
    const defaultCategories = [{
      id: 'no-category',
      name: t('calendar.noCategory'),
      color: 'preset8',
      hexColor: '#c0c0c0'
    }];

    try {
      const response = await fetch('/api/events/categories', { credentials: 'include' });
      if (response.ok) {
        const categoriesData = await response.json();
        // Ensure we have an array
        const safeCategoriesData = Array.isArray(categoriesData) ? categoriesData : [];
        const allCategories = [...safeCategoriesData, ...defaultCategories];
        setCategories(allCategories);
        
        // Update selected categories if it's the first load
        if (selectedCategories.size === 0) {
            setSelectedCategories(new Set(allCategories.map(cat => cat.name)));
        }
      } else {
        console.warn('Failed to load categories, using defaults');
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(defaultCategories);
    }
  }, [t]);

  // Effect to sync categories from events (Fallback)
  useEffect(() => {
    if (events.length > 0) {
      const eventCategories = new Set();
      events.forEach(e => {
        if (e.extendedProps?.categories) {
          e.extendedProps.categories.forEach(c => eventCategories.add(c));
        }
      });

      setCategories(prevCategories => {
        const existingNames = new Set(prevCategories.map(c => c.name));
        const missing = Array.from(eventCategories).filter(catName => !existingNames.has(catName));

        if (missing.length > 0) {
          const newCategories = missing.map(name => ({
            id: `generated-${name.replace(/\s+/g, '-')}`,
            name: name,
            color: 'preset8',
            hexColor: stringToColor(name)
          }));
          return [...prevCategories, ...newCategories];
        }
        return prevCategories;
      });
    }
  }, [events]); // Run when events change

  const loadEvents = useCallback(async (startDate = null, endDate = null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
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
      isFetchingRef.current = false;
    }
  }, []);

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
      return selectedCategories.has(t('calendar.noCategory'));
    }
    return event.extendedProps.categories.some(category => selectedCategories.has(category));
  }).map(event => {
    // Assign color based on the first category found
    let eventColor = '#3788d8'; // Default blue
    let eventBorderColor = '#3788d8';

    if (event.extendedProps?.categories && event.extendedProps.categories.length > 0) {
      const categoryName = event.extendedProps.categories[0];
      const category = categories.find(c => c.name === categoryName);
      if (category && category.hexColor) {
        eventColor = category.hexColor;
        eventBorderColor = category.hexColor;
      }
    } else {
       // Check for "Sin categoría" color
       const noCat = categories.find(c => c.id === 'no-category');
       if (noCat) {
         eventColor = noCat.hexColor;
         eventBorderColor = noCat.hexColor;
       }
    }

    return {
      ...event,
      backgroundColor: eventColor,
      borderColor: eventBorderColor
    };
  });

  const handleEventClick = (clickInfo) => {
    clickInfo.jsEvent.preventDefault(); // Prevent default behavior (like following links)
    setModalState({ isOpen: true, mode: 'view', event: clickInfo.event });
  };

  const handleDateSelect = (selectInfo) => {
    // Si se selecciona un día completo en la vista mensual -> Abrir panel lateral
    if (selectInfo.view.type === 'dayGridMonth' && selectInfo.allDay) {
      setSelectedDay(selectInfo.start);
      setIsDayPanelOpen(true);
      calendarRef.current.getApi().unselect();
      return;
    }

    // Si es una selección de hora (en el panel lateral o vista semanal) -> Crear evento
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
    
    // Deseleccionar en el calendario principal si es necesario
    if (calendarRef.current) {
        calendarRef.current.getApi().unselect();
    }
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
      addToast(t('calendar.eventUpdated'), 'success');
    } catch (error) {
      console.error('Error updating event:', error);
      addToast(t('calendar.errorUpdatingEvent'), 'error');
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
            <span>{t('calendar.title')}</span>
          </div>
        </div>

        <div className="sidebar-content">
          <button className="create-event-btn" onClick={() => setModalState({ isOpen: true, mode: 'create', selectedDates: { start: new Date(), end: new Date(), allDay: true } })}>
            <span>+</span> {t('calendar.newEvent')}
          </button>

          <div className="sidebar-section">
            <div className="section-title">{t('calendar.categories')}</div>
            <div className="category-list">
              <div className="category-item" onClick={() => setSelectedCategories(new Set(categories.map(c => c.name)))}>
                <span style={{fontSize: '0.8rem'}}> {t('calendar.viewAll')}</span>
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
          <button className="sidebar-btn" onClick={onBackToFolders}>
             {t('common.back')}
          </button>
          <button className="sidebar-btn" onClick={onBackToPanel}>
             {t('calendar.panel')}
          </button>
          <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
             {t('common.settings')}
          </button>
          <button className="sidebar-btn" onClick={onLogout}>
             {t('common.logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="calendar-main">
        <DailyTimeline events={filteredEvents} />

        <div className="calendar-view">
          <div className="calendar-card">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={language}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              buttonText={{
                today: t('calendar.today'),
                month: t('calendar.month'),
                week: t('calendar.week'),
                day: t('calendar.day')
              }}
              height="100%"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              events={filteredEvents}
              eventClick={handleEventClick}
              select={handleDateSelect}
              unselectAuto={false} // Keep selection visible when modal opens
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={(dateInfo) => {
                // Force update title
              }}
            />
          </div>
        </div>
      </div>

      {/* Panel Lateral del Día */}
      <DayPanel 
        isOpen={isDayPanelOpen} 
        date={selectedDay} 
        events={filteredEvents}
        onClose={() => setIsDayPanelOpen(false)}
        onTimeSelect={handleDateSelect}
        onEventClick={handleEventClick}
      />

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
          onClose={() => {
            setModalState({ ...modalState, isOpen: false });
            calendarRef.current?.getApi()?.unselect(); // Clear selection when modal closes
          }}
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
              calendarRef.current?.getApi()?.unselect(); // Clear selection
              loadEvents();
              addToast(mode === 'create' ? t('calendar.eventCreated') : t('calendar.eventUpdated'), 'success');
            } catch (error) {
              console.error('Error saving event:', error);
              addToast(t('calendar.errorSavingEvent'), 'error');
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
              calendarRef.current?.getApi()?.unselect(); // Clear selection
              loadEvents();
              addToast(t('calendar.eventDeleted'), 'success');
            } catch (error) {
              console.error('Error deleting event:', error);
              addToast(t('calendar.errorDeletingEvent'), 'error');
            }
          }}
        />
      )}
    </div>
  );
};

export default Calendar;
