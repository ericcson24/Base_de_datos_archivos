import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useLanguage } from '../../context/LanguageContext';

const DayPanel = ({ isOpen, date, events, onClose, onTimeSelect, onEventClick }) => {
  const { t, language } = useLanguage();
  const calendarRef = useRef(null);

  useEffect(() => {
    if (isOpen && calendarRef.current && date) {
      calendarRef.current.getApi().gotoDate(date);
    }
  }, [isOpen, date]);

  if (!isOpen) return null;

  return (
    <div className={`day-panel ${isOpen ? 'open' : ''}`}>
      <div className="day-panel-header">
        <h3>{date?.toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <button className="close-panel-btn" onClick={onClose}>x</button>
      </div>
      <div className="day-panel-content">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={date}
          headerToolbar={false}
          events={events}
          selectable={true}
          select={onTimeSelect}
          eventClick={onEventClick}
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          height="100%"
          locale={language}
          nowIndicator={true}
        />
      </div>
    </div>
  );
};

export default DayPanel;
