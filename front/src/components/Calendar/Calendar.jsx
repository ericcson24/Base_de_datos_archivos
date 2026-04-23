import React, { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css';
import './CalendarDesktop.css';
import './CalendarMobile.css';
import EventModal from '../Modals/EventModal';
import AITaskModal from '../Modals/AITaskModal';
import SettingsModal from '../Modals/SettingsModal';
import RDPConnectionModal from '../Modals/RDPConnectionModal';
import NotificationCenter from '../Common/NotificationCenter';
import DayPanel from './DayPanel';
import { FiArrowLeft, FiLayout, FiMonitor, FiSettings, FiLogOut, FiMap, FiChevronDown } from 'react-icons/fi';
import { FiArrowLeft, FiLayout, FiMonitor, FiSettings, FiLogOut, FiMenu } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';

const DailyTimeline = ({ events, headerActions }) => {
  const { t, language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const minutes = new Date().getHours() * 60 + new Date().getMinutes();
      const percent = minutes / 1440;
      const scrollWidth = containerRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      const targetScroll = (scrollWidth * percent) - (clientWidth / 2);
      
      containerRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const todaysEvents = events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end || event.start);
    return eventStart < endOfDay && eventEnd > startOfDay;
  });

  const allDayEvents = todaysEvents.filter(e => e.allDay);
  const timedEvents = todaysEvents.filter(e => !e.allDay);

  const getPosition = (date) => {
    const d = new Date(date);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return (minutes / 1440) * 100;
  };

  const currentTimePos = getPosition(currentTime);

  return (
    <div className="daily-timeline-wrapper">
      <div className="daily-timeline-header daily-timeline-header-sticky">
        <h3>{t('calendar.todayDate', { date: today.toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }) })}</h3>
        {headerActions && <div className="daily-timeline-actions">{headerActions}</div>}
      </div>
      
      {allDayEvents.length > 0 && (
        <div className="timeline-allday-bar">
          {allDayEvents.map((event, idx) => (
            <span
              key={event.id || idx}
              className="timeline-allday-tag"
              style={{ backgroundColor: event.backgroundColor || '#3788d8' }}
              title={event.title}
            >
              {event.title}
            </span>
          ))}
        </div>
      )}
      <div 
        className="daily-timeline-container" 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="daily-timeline-track">
        
        <div className="timeline-past-overlay" style={{ width: `${currentTimePos}%` }}></div>

        {Array.from({ length: 25 }).map((_, i) => (
           <div key={i} className="timeline-hour-marker" style={{ left: `${(i / 24) * 100}%` }}>
             <span className="timeline-hour-label">{i}:00</span>
           </div>
        ))}
        
        {timedEvents.map((event, idx) => {
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
                    title={`${event.title} (${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                >
                  {event.title}
                </div>
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
  </div>
  );
};

const Calendar = ({ user, onLogout, onBackToPanel, onBackToFolders, onGoToRemote, onGoToRoadmap, onThemeToggle, isDarkMode }) => {
  const { t, language } = useLanguage();
  const calendarRef = useRef(null);
  const { addToast } = useToast();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRDPModal, setShowRDPModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const isFetchingRef = useRef(false);
  const eventsCacheRef = useRef(new Map());
  const loadedRangesRef = useRef([]);
  
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [viewUserId, setViewUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [calendarViewMode, setCalendarViewMode] = useState('mine');
  const [expandedGroups, setExpandedGroups] = useState({});

  // Roadmap layer state
  const [showRoadmapLayer, setShowRoadmapLayer] = useState(false);
  const [roadmapTasks, setRoadmapTasks] = useState([]);
  const [roadmapProjects, setRoadmapProjects] = useState([]);
  const [selectedRoadmapProjects, setSelectedRoadmapProjects] = useState(new Set());
  const [showRoadmapPicker, setShowRoadmapPicker] = useState(false);
  const [roadmapSprints, setRoadmapSprints] = useState([]);
  const [selectedRoadmapSprints, setSelectedRoadmapSprints] = useState(new Set());
  const [showSprintPicker, setShowSprintPicker] = useState(false);

  // Load roadmap projects + tasks when layer is toggled on
  useEffect(() => {
    if (!showRoadmapLayer) return;
    const fetchRoadmapTasks = async () => {
      try {
        const token = getAuthToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        // Fetch all projects first
        const projRes = await fetch('/api/roadmap/projects', { headers });
        if (!projRes.ok) return;
        const projects = await projRes.json();
        setRoadmapProjects(projects);
        
        // Select all projects by default if none selected
        if (selectedRoadmapProjects.size === 0) {
          setSelectedRoadmapProjects(new Set(projects.map(p => p.id)));
        }
        
        // Fetch sprints for all projects
        const allSprints = [];
        for (const proj of projects) {
          try {
            const spRes = await fetch(`/api/roadmap/projects/${proj.id}/sprints`, { headers });
            if (spRes.ok) {
              const sprints = await spRes.json();
              sprints.forEach(s => allSprints.push({ ...s, projectId: proj.id, projectName: proj.name }));
            }
          } catch (e) { /* ignore */ }
        }
        setRoadmapSprints(allSprints);
        // Select all sprints by default if none selected
        if (selectedRoadmapSprints.size === 0) {
          setSelectedRoadmapSprints(new Set(allSprints.map(s => s.id)));
        }
        
        // Fetch issues for all projects
        const allTasks = [];
        for (const proj of projects) {
          const issRes = await fetch(`/api/roadmap/projects/${proj.id}/issues`, { headers });
          if (issRes.ok) {
            const issues = await issRes.json();
            issues.filter(i => i.due_date || i.start_date).forEach(issue => {
              allTasks.push({
                id: `roadmap-${issue.id}`,
                title: `📋 [${issue.issue_key || ''}] ${issue.title}`,
                start: issue.start_date || issue.due_date,
                end: issue.due_date || issue.start_date,
                allDay: true,
                backgroundColor: issue.priority === 'critical' ? '#dc2626' : issue.priority === 'high' ? '#f59e0b' : issue.priority === 'low' ? '#22c55e' : '#6366f1',
                borderColor: issue.priority === 'critical' ? '#dc2626' : issue.priority === 'high' ? '#f59e0b' : issue.priority === 'low' ? '#22c55e' : '#6366f1',
                display: 'block',
                extendedProps: {
                  isRoadmap: true,
                  roadmapIssueId: issue.id,
                  projectId: proj.id,
                  projectName: proj.name,
                  priority: issue.priority,
                  status: issue.status,
                  issueKey: issue.issue_key,
                  issueType: issue.issue_type,
                  assignedUsername: issue.assigned_username,
                  description: issue.description,
                  sprintId: issue.sprint_id
                }
              });
            });
          }
        }
        setRoadmapTasks(allTasks);
      } catch (err) {
        console.error('Error loading roadmap tasks:', err);
      }
    };
    fetchRoadmapTasks();
  }, [showRoadmapLayer]);

  const toggleRoadmapProject = (projId) => {
    setSelectedRoadmapProjects(prev => {
      const next = new Set(prev);
      if (next.has(projId)) next.delete(projId);
      else next.add(projId);
      return next;
    });
  };

  const toggleRoadmapSprint = (sprintId) => {
    setSelectedRoadmapSprints(prev => {
      const next = new Set(prev);
      if (next.has(sprintId)) next.delete(sprintId);
      else next.add(sprintId);
      return next;
    });
  };

  // Filter roadmap tasks by selected projects AND sprints
  const filteredRoadmapTasks = roadmapTasks.filter(t => {
    if (!selectedRoadmapProjects.has(t.extendedProps?.projectId)) return false;
    // If no sprints selected, show all; otherwise filter by sprint
    if (selectedRoadmapSprints.size > 0) {
      const taskSprintId = t.extendedProps?.sprintId;
      // Show tasks with no sprint OR tasks whose sprint is selected
      if (taskSprintId && !selectedRoadmapSprints.has(taskSprintId)) return false;
    }
    return true;
  });

  // Handle creating a calendar event from a roadmap task
  const handleCreateFromRoadmap = async (roadmapIssueId) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/roadmap/issue-to-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ issue_id: roadmapIssueId })
      });
      if (res.ok) {
        const eventData = await res.json();
        // Open the event modal with pre-filled data from the roadmap task
        setModalState({
          isOpen: true,
          mode: 'create',
          event: null,
          selectedDates: {
            start: new Date(eventData.start),
            end: new Date(eventData.end),
            allDay: true
          },
          prefill: {
            title: eventData.title,
            description: eventData.description,
            roadmapIssueId: roadmapIssueId
          }
        });
      }
    } catch (err) {
      console.error('Error preparing roadmap event:', err);
    }
  };

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'boss') {
      const fetchData = async () => {
        try {
          const token = getAuthToken();
          const headers = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const usersRes = await fetch('/api/users/users', { headers });
          if (usersRes.ok) {
            const data = await usersRes.json();
            if (data.success) setUsers(data.users);
          }

          const groupsRes = await fetch('/api/users/groups', { headers });
          if (groupsRes.ok) {
            const data = await groupsRes.json();
            if (data.success) {
              const groupsWithMembers = await Promise.all(data.groups.map(async (group) => {
                const membersRes = await fetch(`/api/users/groups/${group.id}/members`, { headers });
                const membersData = await membersRes.json();
                return { ...group, members: membersData.success ? membersData.members : [] };
              }));
              setGroups(groupsWithMembers);
            }
          }
        } catch (e) {
          console.error('Error fetching admin data:', e);
        }
      };
      fetchData();
    }
  }, [user.role]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleUserSelect = (targetUserId) => {
    setViewUserId(targetUserId);
    setSelectedGroupId('');
  };

  const handleGroupSelect = (group) => {
    if (!group.members || group.members.length === 0) {
      addToast(t('calendar.noMembersInGroup') || 'El grupo no tiene miembros', 'warning');
      return;
    }
    const memberIds = group.members.map(m => m.id).join(',');
    setViewUserId(memberIds);
    setSelectedGroupId(group.id);
  };

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'view',
    event: null,
    selectedDates: null
  });
  const [microsoftStatus, setMicrosoftStatus] = useState({ linked: false, email: null });

  const fetchStatus = useCallback(async () => {
    try {
      const token = getAuthToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/events/status', { 
        headers,
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMicrosoftStatus({
            linked: data.linked,
            email: data.email
          });
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
      const token = getAuthToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = '/api/events/categories';
      if (viewUserId) {
        url += `?userId=${viewUserId}`;
      }

      const response = await fetch(url, { 
        headers,
        credentials: 'include' 
      });
      if (response.ok) {
        const categoriesData = await response.json();
        const safeCategoriesData = Array.isArray(categoriesData) ? categoriesData : [];
        const allCategories = [...safeCategoriesData, ...defaultCategories];
        setCategories(allCategories);
        
        setSelectedCategories(new Set(allCategories.map(cat => cat.name)));
      } else {
        console.warn('Failed to load categories, using defaults');
        setCategories(defaultCategories);
        if (selectedCategories.size === 0) {
             setSelectedCategories(new Set(defaultCategories.map(cat => cat.name)));
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(defaultCategories);
      if (selectedCategories.size === 0) {
           setSelectedCategories(new Set(defaultCategories.map(cat => cat.name)));
      }
    }
  }, [t, viewUserId]);

  useEffect(() => {
    if (events.length > 0) {
      const eventCategories = new Set();
      events.forEach(e => {
        const cats = e.categories || e.extendedProps?.categories;
        if (cats) {
          cats.forEach(c => eventCategories.add(c));
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
  }, [events]);

  const isRangeCovered = useCallback((start, end) => {
    return loadedRangesRef.current.some(r => r.start <= start && r.end >= end);
  }, []);

  const loadEvents = useCallback(async (startDate = null, endDate = null) => {
    if (isFetchingRef.current) return;
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    }

    if (isRangeCovered(start.getTime(), end.getTime())) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoadingEvents(true);
    
    try {
      const token = getAuthToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `/api/events/?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
      if (viewUserId) {
        url += `&userId=${viewUserId}`;
      }

      const response = await fetch(url, {
        headers,
        credentials: 'include'
      });
      if (response.ok) {
        const eventsData = await response.json();
        
        eventsData.forEach(ev => {
          eventsCacheRef.current.set(ev.id, ev);
        });

        loadedRangesRef.current.push({ start: start.getTime(), end: end.getTime() });

        setEvents(Array.from(eventsCacheRef.current.values()));
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoadingEvents(false);
      isFetchingRef.current = false;
    }
  }, [viewUserId, isRangeCovered, user.username]);

  const reloadEvents = useCallback(async () => {
    eventsCacheRef.current.clear();
    loadedRangesRef.current = [];
    isFetchingRef.current = false;

    const api = calendarRef.current?.getApi();
    if (api) {
      const view = api.view;
      const bufferStart = new Date(view.activeStart);
      bufferStart.setMonth(bufferStart.getMonth() - 1);
      const bufferEnd = new Date(view.activeEnd);
      bufferEnd.setMonth(bufferEnd.getMonth() + 1);
      await loadEvents(bufferStart, bufferEnd);
    } else {
      await loadEvents();
    }
  }, [loadEvents]);

  useEffect(() => {
    eventsCacheRef.current.clear();
    loadedRangesRef.current = [];
    loadCategories();
    loadEvents();
  }, [loadCategories, loadEvents, user.username]);

  const hasSyncRetried = useRef(false);
  useEffect(() => {
    if (hasSyncRetried.current) return;
    if (microsoftStatus.linked && events.length === 0 && !isLoadingEvents && !isFetchingRef.current && !viewUserId) {
      hasSyncRetried.current = true;
      const doSync = async () => {
        try {
          const token = getAuthToken();
          const headers = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const syncRes = await fetch('/api/events/sync', { method: 'POST', headers, credentials: 'include' });
          if (syncRes.ok) {
            await reloadEvents();
          }
        } catch (err) {
          console.error('Auto-sync retry failed:', err);
        }
      };
      doSync();
    }
  }, [microsoftStatus.linked, events.length, isLoadingEvents, viewUserId, reloadEvents]);

  useEffect(() => {
    hasSyncRetried.current = false;
  }, [user.username]);

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
    if (selectedCategories.size === 0) return true;
    
    const eventCats = event.categories || event.extendedProps?.categories;
    
    if (!eventCats || eventCats.length === 0) {
      return selectedCategories.has(t('calendar.noCategory')) || selectedCategories.has('no-category');
    }
    
    return eventCats.some(category => selectedCategories.has(category));
  }).map(event => {
    let eventColor = '#3788d8';
    let eventBorderColor = '#3788d8';

    const eventCats = event.categories || event.extendedProps?.categories;

    if (eventCats && eventCats.length > 0) {
      const categoryName = eventCats[0];
      const category = categories.find(c => c.name === categoryName);
      if (category && category.hexColor) {
        eventColor = category.hexColor;
        eventBorderColor = category.hexColor;
      }
    } else {
       const noCat = categories.find(c => c.id === 'no-category');
       if (noCat) {
         eventColor = noCat.hexColor;
         eventBorderColor = noCat.hexColor;
       }
    }

    return {
      ...event,
      backgroundColor: eventColor,
      borderColor: eventBorderColor,
      display: 'block'
    };
  });

  // Merge roadmap tasks into calendar events when layer is active
  const calendarDisplayEvents = showRoadmapLayer 
    ? [...filteredEvents, ...filteredRoadmapTasks] 
    : filteredEvents;

  const handleEventClick = (clickInfo) => {
    clickInfo.jsEvent.preventDefault();
    // For roadmap events, show a tooltip or allow creating a calendar event from it
    if (clickInfo.event.extendedProps?.isRoadmap) {
      const issueId = clickInfo.event.extendedProps?.roadmapIssueId;
      if (issueId) {
        handleCreateFromRoadmap(issueId);
      }
      return;
    }
    setModalState({ isOpen: true, mode: 'view', event: clickInfo.event });
  };

  const handleDateSelect = (selectInfo) => {
    if (selectInfo.view.type === 'dayGridMonth' && selectInfo.allDay) {
      setSelectedDay(selectInfo.start);
      setIsDayPanelOpen(true);
      calendarRef.current.getApi().unselect();
      return;
    }

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
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: event.title,
          start: newStart.toISOString(),
          end: newEnd ? newEnd.toISOString() : null,
          allDay: event.allDay
        })
      });
      if (!response.ok) throw new Error('Error updating event');
      await reloadEvents();
      addToast(t('calendar.eventUpdated'), 'success');
    } catch (error) {
      console.error('Error updating event:', error);
      addToast(t('calendar.errorUpdatingEvent'), 'error');
      if (revertFunc) revertFunc();
    }
  };

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="calendar-layout">
      
      <div className="mobile-header">
        <div className="logo-container">
          <img src="/icons/nube.svg" alt="Logo" className="logo-icon" />
          <span>{t('calendar.title')}</span>
        </div>
        <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          <FiMenu />
        </button>
      </div>

      
      <div 
        className={`sidebar-overlay ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      
      <div className={`calendar-sidebar ${isSidebarOpen ? 'open' : ''} ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/icons/nube.svg" alt="Logo" className="logo-icon" />
            <span>{t('calendar.title')}</span>
          </div>
          
          <button 
            className="mobile-close-btn" 
            onClick={() => setMobileSidebarOpen(false)}
          >
            x
          </button>
        </div>

        <div className="sidebar-content">
          <button className="create-event-btn" onClick={() => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            setModalState({ isOpen: true, mode: 'create', selectedDates: { start: now, end: tomorrow, allDay: true } });
          }}>
            <span>+</span> {t('calendar.newEvent')}
          </button>
          
          <button 
            className="create-event-btn ai-assistant-btn" 
            onClick={() => setShowAIModal(true)}
          >
            <svg
              style={{ width: '16px', height: '16px', flexShrink: 0, marginRight: '8px' }}
              fill="none"
              stroke="url(#calAiIconGrad)"
              viewBox="0 0 24 24"
            >
              <defs>
                <linearGradient id="calAiIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {t('calendar.aiAssistant')}
          </button>

          {(user.role === 'admin' || user.role === 'boss') && (
            <div className="sidebar-section">
              <div className="section-title">{t('calendar.viewCalendar') || 'Ver Calendario'}</div>
              
              <div className="calendar-view-toggle" style={{ display: 'flex', marginBottom: '10px', background: 'var(--cal-surface)', borderRadius: '6px', padding: '2px', border: '1px solid var(--cal-border)' }}>
                <button 
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    border: 'none', 
                    background: calendarViewMode === 'mine' ? 'var(--primary-color)' : 'transparent', 
                    color: calendarViewMode === 'mine' ? '#fff' : 'var(--cal-text)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onClick={() => {
                    setCalendarViewMode('mine');
                    setViewUserId('');
                  }}
                >
                  {t('calendar.myCalendar') || 'Mi Calendario'}
                </button>
                <button 
                  style={{ 
                    flex: 1, 
                    padding: '6px', 
                    border: 'none', 
                    background: calendarViewMode === 'others' ? 'var(--primary-color)' : 'transparent', 
                    color: calendarViewMode === 'others' ? '#fff' : 'var(--cal-text)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onClick={() => setCalendarViewMode('others')}
                >
                  {t('calendar.teamCalendars') || 'Equipos'}
                </button>
              </div>

              {calendarViewMode === 'others' && (
                <div className="groups-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {groups.map(group => (
                    <div key={group.id} className="group-accordion-item" style={{ marginBottom: '5px' }}>
                      <div 
                        className="group-header" 
                        onClick={() => toggleGroup(group.id)}
                        style={{ 
                          padding: '8px', 
                          background: 'var(--cal-surface)', 
                          border: '1px solid var(--cal-border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        <span>{group.name}</span>
                        <span>{expandedGroups[group.id] ? '▼' : '▶'}</span>
                      </div>
                      
                      {expandedGroups[group.id] && (
                        <div className="group-members" style={{ paddingLeft: '10px', marginTop: '5px', borderLeft: '2px solid var(--border-color)' }}>
                          
                          <button 
                            className="view-all-btn"
                            style={{ 
                              width: '100%', 
                              textAlign: 'left', 
                              padding: '6px', 
                              background: selectedGroupId === group.id ? 'var(--primary-color-light)' : 'transparent', 
                              border: 'none', 
                              color: selectedGroupId === group.id ? 'var(--primary-color)' : 'var(--cal-text)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontStyle: 'italic',
                              fontWeight: selectedGroupId === group.id ? 'bold' : 'normal'
                            }}
                            onClick={() => handleGroupSelect(group)}
                          >
                            {t('calendar.viewAllSchedules') || 'Ver todos los horarios'}
                          </button>

                          {group.members && group.members.map(member => (
                            <div 
                              key={member.id} 
                              className={`member-item ${viewUserId === member.id ? 'selected' : ''}`}
                              onClick={() => handleUserSelect(member.id)}
                              style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                background: viewUserId === member.id ? 'var(--primary-color-light)' : 'transparent',
                                color: viewUserId === member.id ? 'var(--primary-color)' : 'var(--cal-text)',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: viewUserId === member.id ? 'var(--primary-color)' : '#ccc' }}></div>
                               {member.username}
                            </div>
                          ))}
                          {(!group.members || group.members.length === 0) && (
                            <div style={{ padding: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {t('calendar.noMembers') || 'Sin miembros'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {t('calendar.noGroups') || 'No hay grupos disponibles'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="sidebar-section">
            <div className="section-title">{t('calendar.categories')}</div>
            <div className="category-list">
              <div className="category-item" onClick={() => setSelectedCategories(new Set(categories.map(c => c.name)))}>
                <span className="category-view-all"> {t('calendar.viewAll')}</span>
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

          <div className="sidebar-section roadmap-sidebar-section">
             <div className="roadmap-section-header">
               <span className="roadmap-section-title" onClick={() => setShowRoadmapPicker(!showRoadmapPicker)}>
                 <FiMap size={14} /> Roadmap
                 <FiChevronDown size={12} className={`roadmap-chevron ${showRoadmapPicker ? 'open' : ''}`} />
               </span>
               <label className="roadmap-toggle-label">
                 <input 
                   type="checkbox" 
                   checked={showRoadmapLayer} 
                   onChange={() => setShowRoadmapLayer(!showRoadmapLayer)}
                   className="roadmap-toggle-input"
                 />
                 <span className="roadmap-toggle-slider"></span>
               </label>
             </div>
             {showRoadmapLayer && showRoadmapPicker && (
               <div className="roadmap-project-picker">
                 <div className="roadmap-picker-section-label">{t('roadmap.projects') || 'Proyectos'}</div>
                 {roadmapProjects.length === 0 && (
                   <div className="roadmap-picker-empty">
                     {t('roadmap.noProjects') || 'Sin proyectos disponibles'}
                   </div>
                 )}
                 {roadmapProjects.map(proj => (
                   <div key={proj.id} className="roadmap-picker-item" onClick={() => toggleRoadmapProject(proj.id)}>
                     <input
                       type="checkbox"
                       checked={selectedRoadmapProjects.has(proj.id)}
                       onChange={() => {}}
                       className="roadmap-picker-checkbox"
                     />
                     <span className="roadmap-picker-icon">
                       {proj.project_type === 'general' ? '🌐' : '🔒'}
                     </span>
                     <span className="roadmap-picker-name">{proj.name}</span>
                     <span className="roadmap-picker-count">{proj.issue_count || 0}</span>
                   </div>
                 ))}
                 <div className="roadmap-picker-actions">
                   <button className="roadmap-picker-btn" onClick={() => setSelectedRoadmapProjects(new Set(roadmapProjects.map(p => p.id)))}>
                     {t('roadmap.filters.all') || 'Todos'}
                   </button>
                   <button className="roadmap-picker-btn" onClick={() => setSelectedRoadmapProjects(new Set())}>
                     {t('roadmap.filters.clear') || 'Ninguno'}
                   </button>
                 </div>

                 {/* Sprint Filter */}
                 {roadmapSprints.length > 0 && (
                   <>
                     <div className="roadmap-picker-section-label" onClick={() => setShowSprintPicker(!showSprintPicker)} style={{ cursor: 'pointer' }}>
                       🏃 {t('roadmap.filters.sprint') || 'Sprints'}
                       <FiChevronDown size={11} className={`roadmap-chevron ${showSprintPicker ? 'open' : ''}`} />
                     </div>
                     {showSprintPicker && (
                       <>
                         {roadmapSprints.map(sprint => (
                           <div key={sprint.id} className="roadmap-picker-item" onClick={() => toggleRoadmapSprint(sprint.id)}>
                             <input
                               type="checkbox"
                               checked={selectedRoadmapSprints.has(sprint.id)}
                               onChange={() => {}}
                               className="roadmap-picker-checkbox"
                             />
                             <span className={`roadmap-sprint-status ${sprint.status}`}>
                               {sprint.status === 'active' ? '🟢' : sprint.status === 'completed' ? '✅' : '⏳'}
                             </span>
                             <span className="roadmap-picker-name">{sprint.name}</span>
                           </div>
                         ))}
                         <div className="roadmap-picker-actions">
                           <button className="roadmap-picker-btn" onClick={() => setSelectedRoadmapSprints(new Set(roadmapSprints.map(s => s.id)))}>
                             {t('roadmap.filters.all') || 'Todos'}
                           </button>
                           <button className="roadmap-picker-btn" onClick={() => setSelectedRoadmapSprints(new Set())}>
                             {t('roadmap.filters.clear') || 'Ninguno'}
                           </button>
                         </div>
                       </>
                     )}
                   </>
                 )}
               </div>
             )}
             {showRoadmapLayer && filteredRoadmapTasks.length > 0 && (
               <div className="roadmap-task-summary">
                 <span>📋 {filteredRoadmapTasks.length} {t('roadmap.filters.tasks') || 'tareas'}</span>
                 <span className="roadmap-task-hint">{t('calendar.clickToCreate') || 'Click en una tarea para crear evento'}</span>
               </div>
             )}
          </div>

          <div className="sidebar-section mt-auto">
             <div className="section-title connection-status-section">{t('calendar.connectionStatus')}</div>
             <div className="connection-status-container">
                <div 
                  className={`connection-status-dot ${microsoftStatus.linked ? 'connected' : 'disconnected'}`}
                ></div>
                <span className="connection-status-text">
                  {microsoftStatus.linked ? t('calendar.connected') : t('calendar.disconnected')}
                </span>
             </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={onBackToFolders}>
            <FiArrowLeft className="sidebar-btn-icon" /> {t('common.back')}
          </button>
          <button className="sidebar-btn" onClick={onBackToPanel}>
            <FiLayout className="sidebar-btn-icon" /> {t('calendar.panel')}
          </button>
          <button className="sidebar-btn" onClick={() => {
            if (onGoToRemote) {
              onGoToRemote();
            }
          }}>
            <FiMonitor className="sidebar-btn-icon" /> {t('common.remoteDesktop')}
          </button>
          <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
            <FiSettings className="sidebar-btn-icon" /> {t('common.settings')}
          </button>
          <button className="sidebar-btn sidebar-btn-logout" onClick={onLogout}>
            <FiLogOut className="sidebar-btn-icon" /> {t('common.logout')}
          </button>
        </div>
      </div>

      
      <div className="calendar-main">
        {!microsoftStatus.linked && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 m-4 rounded shadow-sm flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200 font-medium">
                  {t('calendar.disconnectedMessage')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="ml-4 px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100 text-sm font-medium rounded-md hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {t('calendar.connectButton')}
            </button>
          </div>
        )}

        <DailyTimeline events={filteredEvents} headerActions={<NotificationCenter />} />

        <div className="calendar-view">
          <div className="calendar-card">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={language}
              firstDay={1}
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
              eventDisplay="block"
              events={calendarDisplayEvents}
              eventClick={handleEventClick}
              select={handleDateSelect}
              unselectAuto={false}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={(dateInfo) => {
                const bufferStart = new Date(dateInfo.start);
                bufferStart.setMonth(bufferStart.getMonth() - 1);
                const bufferEnd = new Date(dateInfo.end);
                bufferEnd.setMonth(bufferEnd.getMonth() + 1);
                loadEvents(bufferStart, bufferEnd);
              }}
            />
          </div>
        </div>
      </div>

      
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
          onClose={() => {
            setShowSettingsModal(false);
            fetchStatus();
          }}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
          isCalendar={true}
        />
      )}

      {modalState.isOpen && (
        <EventModal
          isOpen={modalState.isOpen}
          event={modalState.event}
          mode={modalState.mode}
          categories={categories}
          selectedDates={modalState.selectedDates}
          prefill={modalState.prefill || null}
          onClose={() => {
            setModalState({ ...modalState, isOpen: false });
            calendarRef.current?.getApi()?.unselect();
          }}
          user={user}
          roadmapProjects={roadmapProjects}
          onGoToRoadmap={onGoToRoadmap}
          initialAssignMode={selectedGroupId ? 'group' : (viewUserId ? 'user' : 'me')}
          initialTargetUserId={viewUserId}
          initialGroupId={selectedGroupId}
          onSave={async (eventData, mode) => {
            try {
              let url = mode === 'create' ? '/api/events/' : `/api/events/${modalState.event.id}`;
              let method = mode === 'create' ? 'POST' : 'PUT';
              
              if (eventData.assignMode === 'group' && eventData.groupId) {
                url = '/api/events/group';
                method = 'POST';
              }

              if (eventData.assignMode === 'user' && eventData.targetUserId) {
                url = '/api/events/assign-user';
                method = 'POST';
              }

              if (mode === 'create' && (eventData.assignMode === 'group' || eventData.assignMode === 'user')) {
                 const createdByText = `\n\n(Tarea creada por ${user.username})`;
                 if (eventData.description) {
                    eventData.description += createdByText;
                 } else {
                    eventData.description = createdByText.trim();
                 }
              }

              const token = getAuthToken();
              const headers = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const response = await fetch(url, {
                method,
                headers,
                credentials: 'include',
                body: JSON.stringify(eventData)
              });

              if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Error saving event');
              }
              
              const result = await response.json();

              // If this event was created from a roadmap task, link them
              if (modalState.prefill?.roadmapIssueId && result.id) {
                try {
                  await fetch('/api/roadmap/calendar-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                    body: JSON.stringify({
                      calendar_event_id: result.id,
                      issue_id: modalState.prefill.roadmapIssueId,
                      link_direction: 'roadmap_to_calendar'
                    })
                  });
                } catch (linkErr) {
                  console.warn('Could not link roadmap issue to calendar event:', linkErr);
                }
              }

              setModalState({ ...modalState, isOpen: false });
              calendarRef.current?.getApi()?.unselect();
              await reloadEvents();
              
              if (eventData.assignMode === 'group') {
                 addToast(t('calendar.groupEventCreated', { 
                   success: result.results?.success || 0, 
                   failed: result.results?.failed || 0 
                 }) || `Event assigned to group: ${result.results?.success} success, ${result.results?.failed} failed`, 'success');
              } else if (eventData.assignMode === 'user') {
                 addToast(t('calendar.userEventCreated') || 'Evento asignado al usuario correctamente', 'success');
              } else {
                 addToast(mode === 'create' ? t('calendar.eventCreated') : t('calendar.eventUpdated'), 'success');
              }
            } catch (error) {
              console.error('Error saving event:', error);
              addToast(error.message || t('calendar.errorSavingEvent'), 'error');
            }
          }}
          onDelete={async (eventId) => {
            try {
              const token = getAuthToken();
              const headers = {};
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
              });
              if (!response.ok) throw new Error('Error deleting event');
              setModalState({ ...modalState, isOpen: false });
              calendarRef.current?.getApi()?.unselect();
              await reloadEvents();
              addToast(t('calendar.eventDeleted'), 'success');
            } catch (error) {
              console.error('Error deleting event:', error);
              addToast(t('calendar.errorDeletingEvent'), 'error');
            }
          }}
        />
      )}

      {showRDPModal && (
        <RDPConnectionModal 
          isOpen={showRDPModal} 
          onClose={() => setShowRDPModal(false)} 
        />
      )}

      {showAIModal && (
        <AITaskModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onTaskCreated={() => reloadEvents()}
          user={user}
        />
      )}
    </div>
  );
};

export default Calendar;
