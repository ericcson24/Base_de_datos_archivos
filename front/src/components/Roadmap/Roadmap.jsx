import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus, FiMoreVertical, FiTrash2, FiEdit2, FiUser, FiCalendar,
  FiFileText, FiAlertTriangle, FiCpu, FiChevronRight,
  FiFlag, FiClock, FiMessageSquare, FiLink, FiSearch, FiX, FiCheck,
  FiArrowLeft, FiSettings, FiLayout, FiLogOut, FiActivity, FiTarget,
  FiChevronDown, FiPaperclip, FiSend, FiMonitor, FiStar,
  FiList, FiColumns, FiZap, FiEye, FiEyeOff, FiPlay, FiSquare,
  FiCheckSquare, FiTrendingUp, FiHash, FiBookmark, FiCheckCircle,
  FiCircle, FiRepeat, FiCornerDownRight,
  FiMenu, FiMap, FiGlobe, FiLock, FiBarChart2, FiExternalLink, FiFolder,
  FiRefreshCw
} from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import NotificationCenter from '../Common/NotificationCenter';
import SettingsModal from '../Modals/SettingsModal';
import './Roadmap.css';

// ============================================
// PRIORITY CONFIG
// ============================================
const PRIORITIES = {
  critical: { labelKey: 'critical', color: '#fd0606ff', icon: <FiCircle size={10} fill="#ef4444" stroke="#ef4444" /> },
  high: { labelKey: 'high', color: '#fd6900ff', icon: <FiCircle size={10} fill="#f97316" stroke="#f97316" /> },
  medium: { labelKey: 'medium', color: '#ffd506ff', icon: <FiCircle size={10} fill="#eab308" stroke="#eab308" /> },
  low: { labelKey: 'low', color: '#22c55e', icon: <FiCircle size={10} fill="#22c55e" stroke="#22c55e" /> }
};

// ============================================
// ISSUE TYPE CONFIG
// ============================================
const ISSUE_TYPES = {
  task: { labelKey: 'task', icon: <FiCheckSquare size={14} />, color: '#4b9cdb' },
  bug: { labelKey: 'bug', icon: <FiAlertTriangle size={14} />, color: '#e5493a' },
  story: { labelKey: 'story', icon: <FiBookmark size={14} />, color: '#63ba3c' },
  epic: { labelKey: 'epic', icon: <FiZap size={14} />, color: '#904ee2' },
  subtask: { labelKey: 'subtask', icon: <FiCornerDownRight size={14} />, color: '#4b9cdb' },
  improvement: { labelKey: 'improvement', icon: <FiTrendingUp size={14} />, color: '#2dcccd' }
};

const LINK_TYPES = {
  blocks: { labelKey: 'blocks', reverseKey: 'blockedBy' },
  relates_to: { labelKey: 'relatesTo', reverseKey: 'relatesTo' },
  duplicates: { labelKey: 'duplicates', reverseKey: 'duplicatedBy' },
  clones: { labelKey: 'clones', reverseKey: 'clonedBy' }
};

// ============================================
// KANBAN CARD
// ============================================
const KanbanCard = ({ issue, onEdit, onDelete, onDragStart, onDragEnd, isDragging, t }) => {
  const [showMenu, setShowMenu] = useState(false);
  const priority = PRIORITIES[issue.priority] || PRIORITIES.medium;
  const issueType = ISSUE_TYPES[issue.issue_type] || ISSUE_TYPES.task;
  const isOverdue = issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== 'done';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ issueId: issue.id, fromColumnId: issue.column_id }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(issue.id);
  };

  return (
    <div
      className={`rm-card ${isDragging ? 'dragging' : ''} ${isOverdue ? 'overdue' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="rm-card-top">
        <div className="rm-card-type-key">
          <span className="rm-card-type-icon" style={{ color: issueType.color }} title={issueType.labelKey ? t(`roadmap.issueTypes.${issueType.labelKey}`) : ''}>
            {issueType.icon}
          </span>
          {issue.issue_key && <span className="rm-card-key">{issue.issue_key}</span>}
        </div>
        <div className="rm-card-labels">
          {(issue.labels || []).slice(0, 2).map((label, i) => (
            <span key={i} className="rm-card-label">{label}</span>
          ))}
        </div>
        <div className="rm-card-menu-wrap">
          <button className="rm-card-menu-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
            <FiMoreVertical size={14} />
          </button>
          {showMenu && (
            <div className="rm-card-dropdown" onMouseLeave={() => setShowMenu(false)}>
              <button onClick={() => { onEdit(issue); setShowMenu(false); }}><FiEdit2 size={12} /> {t('roadmap.actions.edit')}</button>
              <button className="danger" onClick={() => { onDelete(issue.id); setShowMenu(false); }}><FiTrash2 size={12} /> {t('roadmap.actions.delete')}</button>
            </div>
          )}
        </div>
      </div>

      <h4 className="rm-card-title" onClick={() => onEdit(issue)}>{issue.title}</h4>

      {issue.description && (
        <p className="rm-card-desc">{issue.description.substring(0, 80)}{issue.description.length > 80 ? '...' : ''}</p>
      )}

      {issue.subtask_progress != null && (
        <div className="rm-card-subtask-bar">
          <div className="rm-progress-bar">
            <div className="rm-progress-fill" style={{ width: `${issue.subtask_progress}%`, background: issue.subtask_progress === 100 ? '#22c55e' : '#4b9cdb' }} />
          </div>
          <span>{issue.subtask_progress}%</span>
        </div>
      )}

      <div className="rm-card-footer">
        <span className="rm-card-priority" style={{ color: priority.color }}>{priority.icon}</span>
        <div className="rm-card-meta">
          {issue.story_points > 0 && <span className="rm-story-pts" title="Story Points">{issue.story_points}</span>}
          {issue.watchers?.length > 0 && (
            <span className="rm-watchers-count" title="Observadores"><FiEye size={11} /> {issue.watchers.length}</span>
          )}
          {issue.due_date && (
            <span className={`rm-card-due ${isOverdue ? 'overdue' : ''}`}>
              <FiClock size={11} /> {new Date(issue.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      {issue.assigned_username && (
        <div className="rm-card-assignee">
          {issue.assigned_avatar ? (
            <img src={issue.assigned_avatar} alt={issue.assigned_username} className="rm-avatar-img" />
          ) : (
            <div className="rm-avatar-sm">{issue.assigned_username.charAt(0).toUpperCase()}</div>
          )}
          <span>{issue.assigned_username}</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// KANBAN COLUMN
// ============================================
const KanbanColumn = ({ column, issues, onAddIssue, onEditIssue, onDeleteIssue, onDrop, onDragStart, onDragEnd, draggingIssueId, t }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const columnIssues = issues.filter(i => i.column_id === column.id);
  const isOverWip = column.wip_limit > 0 && columnIssues.length >= column.wip_limit;

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.fromColumnId !== column.id) onDrop(data.issueId, column.id, data.fromColumnId);
    } catch (err) { /* ignore */ }
  };

  return (
    <div
      className={`rm-column ${isDragOver ? 'drag-over' : ''} ${isOverWip ? 'wip-exceeded' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="rm-col-header" style={{ borderTopColor: column.color }}>
        <div className="rm-col-title-row">
          <h3 className="rm-col-title">{column.name}</h3>
          <span className="rm-col-count">{columnIssues.length}{column.wip_limit > 0 ? `/${column.wip_limit}` : ''}</span>
        </div>
        <button className="rm-col-add-btn" onClick={() => onAddIssue(column.id)} title={t('roadmap.sidebar.newTask')}>
          <FiPlus size={16} />
        </button>
      </div>
      <div className="rm-col-body">
        {columnIssues.map(issue => (
          <KanbanCard key={issue.id} issue={issue} onEdit={onEditIssue} onDelete={onDeleteIssue}
            onDragStart={onDragStart} onDragEnd={onDragEnd} isDragging={draggingIssueId === issue.id} t={t} />
        ))}
        {columnIssues.length === 0 && <div className="rm-col-empty"><span>{t('roadmap.messages.noTasks')}</span></div>}
      </div>
    </div>
  );
};

// ============================================
// ISSUE MODAL (Create/Edit) — Jira-like with tabs
// ============================================
const IssueModal = ({ issue, columns, members, sprints, epics, onSave, onUpdate, onClose, onLinkDocument, onUnlinkDocument, projectId, initialIssueType }) => {
  const { t } = useLanguage();
  
  // Helper to format date for input (YYYY-MM-DD) avoiding timezone shifts
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    title: issue?.title || '', description: issue?.description || '',
    priority: issue?.priority || 'medium', issue_type: issue?.issue_type || initialIssueType || 'task',
    assigned_to: issue?.assigned_to || '',
    due_date: formatDateForInput(issue?.due_date),
    start_date: issue?.start_date ? formatDateForInput(issue.start_date) : '',
    column_id: issue?.column_id || '', labels: issue?.labels || [],
    estimated_hours: issue?.estimated_hours || 0, remaining_hours: issue?.remaining_hours || 0,
    story_points: issue?.story_points || '', sprint_id: issue?.sprint_id || '',
    epic_id: issue?.epic_id || '', environment: issue?.environment || '',
    acceptance_criteria: issue?.acceptance_criteria || '', 
    syncCalendar: issue?.sync_calendar !== false // Default to true unless explicitly false
  });
  const [activeTab, setActiveTab] = useState('details');
  const [newLabel, setNewLabel] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [docResults, setDocResults] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [subtasks, setSubtasks] = useState(issue?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [timeLogs, setTimeLogs] = useState([]);
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [watchers, setWatchers] = useState(issue?.watchers || []);
  const [links, setLinks] = useState(issue?.links || []);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkType, setLinkType] = useState('relates_to');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [history, setHistory] = useState([]);
  const token = getAuthToken();

  // Sync state if issue prop updates (e.g. from parent refresh)
  useEffect(() => {
    if (issue) {
      setSubtasks(issue.subtasks || []);
      setLinks(issue.links || []);
      setWatchers(issue.watchers || []);
      setForm(prev => ({
        ...prev,
        labels: issue.labels || [],
        story_points: issue.story_points || ''
      }));
    }
  }, [issue]);

  useEffect(() => {
    if (!issue?.id) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    setLoadingComments(true);
    fetch(`/api/roadmap/issues/${issue.id}/comments`, { headers }).then(r => r.json()).then(d => setComments(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingComments(false));
    fetch(`/api/roadmap/issues/${issue.id}/time-logs`, { headers }).then(r => r.json()).then(d => setTimeLogs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/roadmap/issues/${issue.id}/history`, { headers }).then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }, [issue?.id, token]);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, due_date: form.due_date || null, start_date: form.start_date || null,
      assigned_to: form.assigned_to || null, column_id: form.column_id || null,
      sprint_id: form.sprint_id || null, epic_id: form.epic_id || null,
      story_points: form.story_points ? parseInt(form.story_points) : null });
  };

  const addLabel = () => { if (newLabel.trim() && !form.labels.includes(newLabel.trim())) { setForm(f => ({ ...f, labels: [...f.labels, newLabel.trim()] })); setNewLabel(''); } };
  const removeLabel = (label) => setForm(f => ({ ...f, labels: f.labels.filter(l => l !== label) }));

  const addComment = async () => {
    if (!newComment.trim() || !issue?.id) return;
    try {
      const res = await fetch(`/api/roadmap/issues/${issue.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ content: newComment }) });
      if (res.ok) { const c = await res.json(); setComments(prev => [...prev, c]); setNewComment(''); onUpdate?.(); }
    } catch (e) { /* ignore */ }
  };

  const addSubtask = async () => {
    if (!newSubtask.trim() || !issue?.id) return;
    try {
      const res = await fetch(`/api/roadmap/issues/${issue.id}/subtasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: newSubtask }) });
      if (res.ok) { const st = await res.json(); setSubtasks(prev => [...prev, st]); setNewSubtask(''); onUpdate?.(); }
    } catch (e) { /* ignore */ }
  };

  const toggleSubtask = async (id, completed) => {
    try {
      const res = await fetch(`/api/roadmap/subtasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ is_completed: !completed }) });
      if (res.ok) { const up = await res.json(); setSubtasks(prev => prev.map(s => s.id === id ? up : s)); onUpdate?.(); }
    } catch (e) { /* ignore */ }
  };

  const deleteSubtask = async (id) => {
    try { await fetch(`/api/roadmap/subtasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); setSubtasks(prev => prev.filter(s => s.id !== id)); onUpdate?.(); } catch (e) { /* ignore */ }
  };

  const addTimeLog = async () => {
    if (!logHours || parseFloat(logHours) <= 0 || !issue?.id) return;
    try {
      const res = await fetch(`/api/roadmap/issues/${issue.id}/time-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ hours: parseFloat(logHours), description: logDesc, work_date: logDate }) });
      if (res.ok) { const tl = await res.json(); setTimeLogs(prev => [tl, ...prev]); setLogHours(''); setLogDesc(''); onUpdate?.(); }
    } catch (e) { /* ignore */ }
  };

  const toggleWatcher = async () => {
    if (!issue?.id) return;
    const uid = parseInt(localStorage.getItem('userId'));
    const isWatching = watchers.some(w => w.user_id === uid);
    if (isWatching) {
      await fetch(`/api/roadmap/issues/${issue.id}/watchers/${uid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setWatchers(prev => prev.filter(w => w.user_id !== uid));
    } else {
      await fetch(`/api/roadmap/issues/${issue.id}/watchers`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({}) });
      setWatchers(prev => [...prev, { user_id: uid, username: 'Tú' }]);
    }
  };

  const searchForLink = async () => {
    if (!linkSearch.trim() || !projectId) return;
    try {
      const res = await fetch(`/api/roadmap/projects/${projectId}/search?q=${encodeURIComponent(linkSearch)}&limit=10`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setLinkResults(d.filter(i => i.id !== issue?.id)); }
    } catch (e) { /* ignore */ }
  };

  const createLink = async (targetId) => {
    if (!issue?.id) return;
    try {
      const res = await fetch(`/api/roadmap/issues/${issue.id}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ target_issue_id: targetId, link_type: linkType }) });
      if (res.ok) { const l = await res.json(); setLinks(prev => [...prev, l]); setShowLinkForm(false); setLinkSearch(''); setLinkResults([]); onUpdate?.(); }
    } catch (e) { /* ignore */ }
  };

  const deleteLink = async (linkId) => {
    try { await fetch(`/api/roadmap/links/${linkId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); setLinks(prev => prev.filter(l => l.id !== linkId)); onUpdate?.(); } catch (e) { /* ignore */ }
  };

  const searchDocuments = async (queryOverride) => {
    const query = queryOverride !== undefined ? queryOverride : docSearch;
    
    setLoadingDocs(true);
    try {
      if (!query.trim()) {
        // Cargar archivos recientes si no hay búsqueda
        const r = await fetch(`/api/files/recent`, { headers: { 'Authorization': `Bearer ${token}` } });
        const d = await r.json();
        setDocResults(Array.isArray(d) ? d : (d.files || []));
      } else {
        // Búsqueda inteligente via AI service
        const r = await fetch(`/api/ai/search`, { 
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ query })
        });
        const d = await r.json();
        const results = Array.isArray(d) ? d : (d.matches || d.files || []);
        setDocResults(results);
      }
    } catch (e) { 
      setDocResults([]); 
    } finally {
      setLoadingDocs(false);
    }
  };

  const issueType = ISSUE_TYPES[form.issue_type] || ISSUE_TYPES.task;
  const subDone = subtasks.filter(s => s.is_completed).length;
  const subTotal = subtasks.length;
  const subProgress = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;
  const totalLogged = timeLogs.reduce((a, t) => a + (t.hours || 0), 0);
  const uid = parseInt(localStorage.getItem('userId'));

  const tabs = [
    { id: 'details', label: t('roadmap.tabs.details'), icon: <FiFileText size={13} /> },
    ...(issue?.id ? [
      { id: 'subtasks', label: `${t('roadmap.tabs.subtasks')} (${subTotal})`, icon: <FiCheckSquare size={13} /> },
      { id: 'time', label: t('roadmap.tabs.time'), icon: <FiClock size={13} /> },
      { id: 'links', label: `${t('roadmap.tabs.links')} (${links.length})`, icon: <FiLink size={13} /> },
      { id: 'comments', label: `${t('roadmap.tabs.comments')} (${comments.length})`, icon: <FiMessageSquare size={13} /> },
      { id: 'history', label: t('roadmap.tabs.history'), icon: <FiActivity size={13} /> }
    ] : [])
  ];

  return (
    <div className="rm-modal-overlay" onClick={onClose}>
      <div className="rm-modal glassmorphism-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-modal-header">
          <div className="rm-modal-header-left">
            <span style={{ color: issueType.color }}>{issueType.icon}</span>
            <h2>{issue ? (issue.issue_key || t('roadmap.modal.editTask')) : t('roadmap.modal.newTask')}</h2>
            {issue?.id && (
              <button className="rm-icon-btn" onClick={toggleWatcher} title={watchers.some(w => w.user_id === uid) ? t('roadmap.modal.unwatchTask') : t('roadmap.modal.watchTask')} style={{ width: 28, height: 28 }}>
                {watchers.some(w => w.user_id === uid) ? <FiEye size={14} /> : <FiEyeOff size={14} />}
              </button>
            )}
          </div>
          <button className="rm-modal-close" onClick={onClose}><FiX size={20} /></button>
        </div>

        {tabs.length > 1 && (
          <div className="rm-modal-tabs">
            {tabs.map(tab => (
              <button key={tab.id} className={`rm-modal-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="rm-modal-body">
          <div className="rm-modal-main">
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <>
                <input className="rm-input-title" placeholder={t('roadmap.modal.taskTitle')} value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                <textarea className="rm-textarea" placeholder={t('roadmap.modal.taskDescription')} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />

                <div className="rm-field-group">
                  <label><FiCheckCircle size={14} /> {t('roadmap.fields.acceptanceCriteria')}</label>
                  <textarea className="rm-textarea" placeholder={t('roadmap.modal.acceptanceCriteriaPlaceholder')}
                    value={form.acceptance_criteria} onChange={e => setForm(f => ({ ...f, acceptance_criteria: e.target.value }))} rows={3} />
                </div>

                <div className="rm-field-group">
                  <label><FiMonitor size={14} /> {t('roadmap.fields.environment')}</label>
                  <input type="text" placeholder={t('roadmap.modal.environmentPlaceholder')}
                    value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))} />
                </div>

                <div className="rm-field-group">
                  <label><FiFlag size={14} /> {t('roadmap.fields.labels')}</label>
                  <div className="rm-labels-row">
                    {form.labels.map((l, i) => (
                      <span key={i} className="rm-label-tag" onClick={() => removeLabel(l)}>{l} ×</span>
                    ))}
                    <input className="rm-label-input" placeholder={t('roadmap.modal.addLabel')} value={newLabel}
                      onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLabel()} />
                  </div>
                </div>

                {issue?.id && (
                  <div className="rm-docs-section">
                    <div className="rm-docs-header">
                      <h3><FiPaperclip size={14} /> {t('roadmap.documents.title')}</h3>
                      <button className="rm-action-link" onClick={() => {
                        const ns = !showDocPicker;
                        setShowDocPicker(ns);
                        if (ns) { setDocSearch(''); searchDocuments(''); }
                      }}>
                        {showDocPicker ? t('roadmap.actions.cancel') : `+ ${t('roadmap.actions.linkFromPanel')}`}
                      </button>
                    </div>

                    <div className="rm-docs-list">
                      {(issue.documents || []).map(doc => (
                        <div key={doc.id} className="rm-doc-item">
                          <FiFileText size={14} className="rm-doc-icon" />
                          <div className="rm-doc-info">
                            <span className="rm-doc-name" onClick={() => window.open(`/api/files/download?path=${encodeURIComponent(doc.file_path)}`, '_blank')}>
                              {doc.file_name}
                            </span>
                            <span className="rm-doc-meta">{doc.file_path && doc.file_path.split('/').slice(0, -1).join('/') || t('roadmap.documents.root')}</span>
                          </div>
                          <button className="rm-doc-unlink" onClick={() => onUnlinkDocument?.(doc.id)} title={t('roadmap.actions.unlinkTask')}>
                            <FiX size={14} />
                          </button>
                        </div>
                      ))}
                      {(!issue.documents || issue.documents.length === 0) && !showDocPicker && (
                        <p className="rm-empty-text">{t('roadmap.documents.noDocuments')}</p>
                      )}
                    </div>

                    {showDocPicker && (
                      <div className="rm-doc-picker modal-style-picker">
                        <div className="rm-doc-search-box">
                          <FiSearch className="search-icon" />
                          <input 
                            placeholder={t('roadmap.documents.searchFiles')} 
                            value={docSearch}
                            autoFocus
                            onChange={e => {
                              const val = e.target.value;
                              setDocSearch(val);
                              if (val.length > 2 || val.length === 0) {
                                searchDocuments(val);
                              }
                            }} 
                            onKeyDown={e => e.key === 'Enter' && searchDocuments()} 
                          />
                          {loadingDocs && <div className="rm-spinner-xs" />}
                        </div>
                        
                        <div className="rm-doc-results-list custom-scrollbar">
                          {docResults.length > 0 ? (
                            docResults.map(doc => (
                              <div key={doc.id || doc.name} className="rm-doc-result-item" onClick={() => {
                                onLinkDocument?.(issue.id, { 
                                  file_id: doc.id, 
                                  file_path: doc.physical_path || doc.path, 
                                  file_name: doc.name 
                                });
                                setShowDocPicker(false);
                                setDocSearch('');
                                setDocResults([]);
                              }}>
                                <div className="result-icon-bg">
                                  <FiFileText size={14} />
                                </div>
                                <div className="result-details">
                                  <span className="result-name">{doc.name}</span>
                                  <span className="result-path">{doc.path || t('roadmap.documents.root')}</span>
                                </div>
                                <FiPlus className="add-icon" />
                              </div>
                            ))
                          ) : (
                            <p className="rm-no-results">
                              {loadingDocs ? t('roadmap.documents.searching') : (docSearch ? t('roadmap.documents.noResults') : t('roadmap.documents.startTyping'))}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* SUBTASKS TAB */}
            {activeTab === 'subtasks' && issue?.id && (
              <div className="rm-subtasks-section">
                <div className="rm-subtasks-header">
                  <h3><FiCheckSquare size={14} /> {t('roadmap.subtasks.title')}</h3>
                  {subTotal > 0 && (
                    <div className="rm-subtask-progress-info">
                      <div className="rm-subtask-progress-bar">
                        <div className="rm-progress-fill" style={{ width: `${subProgress}%`, background: subProgress === 100 ? '#22c55e' : '#4b9cdb' }} />
                      </div>
                      <span>{subDone}/{subTotal} ({subProgress}%)</span>
                    </div>
                  )}
                </div>
                <div className="rm-subtask-list">
                  {subtasks.map(st => (
                    <div key={st.id} className={`rm-subtask-item ${st.is_completed ? 'completed' : ''}`}>
                      <button className="rm-subtask-check" onClick={() => toggleSubtask(st.id, st.is_completed)}>
                        {st.is_completed ? <FiCheckSquare size={16} className="checked" /> : <FiSquare size={16} />}
                      </button>
                      <span className="rm-subtask-title">{st.title}</span>
                      <button className="rm-subtask-delete" onClick={() => deleteSubtask(st.id)}><FiTrash2 size={12} /></button>
                    </div>
                  ))}
                  {subtasks.length === 0 && <p className="rm-loading-text">{t('roadmap.subtasks.noSubtasks')}</p>}
                </div>
                <div className="rm-subtask-add">
                  <input placeholder={t('roadmap.subtasks.addPlaceholder')} value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
                  <button onClick={addSubtask}><FiPlus size={14} /></button>
                </div>
              </div>
            )}

            {/* TIME TRACKING TAB */}
            {activeTab === 'time' && issue?.id && (
              <div className="rm-time-tracking-section">
                <div className="rm-time-summary">
                  <div className="rm-time-stat"><label>{t('roadmap.time.estimated')}</label><span>{form.estimated_hours || 0}h</span></div>
                  <div className="rm-time-stat"><label>{t('roadmap.time.logged')}</label><span>{totalLogged.toFixed(1)}h</span></div>
                  <div className="rm-time-stat"><label>{t('roadmap.time.remaining')}</label><span>{Math.max(0, (form.estimated_hours || 0) - totalLogged).toFixed(1)}h</span></div>
                </div>
                
                <div className="rm-time-log-form">
                  <h4>{t('roadmap.time.logNew')}</h4>
                  <div className="rm-time-log-inputs">
                    <input type="number" min="0.25" step="0.25" placeholder={t('roadmap.time.hoursPlaceholder')} value={logHours} onChange={e => setLogHours(e.target.value)} />
                    <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                    <input placeholder={t('roadmap.time.whatWorked')} value={logDesc} onChange={e => setLogDesc(e.target.value)} />
                    <button onClick={addTimeLog}><FiPlus size={14} /> {t('roadmap.actions.register')}</button>
                  </div>
                </div>

                <div className="rm-time-logs-list" style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '12px' }}>{t('roadmap.time.recentLogs')}</h4>
                  {timeLogs.map(tl => (
                    <div key={tl.id} className="rm-time-log-entry">
                      <strong>{tl.username || 'Usuario'}</strong>
                      <span className="rm-time-log-hours">{tl.hours}h</span>
                      <span className="rm-time-log-date">{new Date(tl.work_date).toLocaleDateString('es-ES')}</span>
                      {tl.description && <span style={{ opacity: 0.8 }}> — {tl.description}</span>}
                    </div>
                  ))}
                  {timeLogs.length === 0 && <p className="rm-loading-text">{t('roadmap.time.noLogs')}</p>}
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === 'links' && issue?.id && (
              <div className="rm-links-section">
                <div className="rm-links-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3><FiLink size={14} /> {t('roadmap.links.title')}</h3>
                  <button className="rm-action-btn" onClick={() => setShowLinkForm(!showLinkForm)}>
                    <FiPlus size={12} /> {showLinkForm ? t('roadmap.actions.cancel') : t('roadmap.actions.linkTask')}
                  </button>
                </div>

                {showLinkForm && (
                  <div className="rm-link-create-form">
                    <select value={linkType} onChange={e => setLinkType(e.target.value)}>
                      {Object.entries(LINK_TYPES).map(([k, v]) => <option key={k} value={k}>{t(`roadmap.links.${v.labelKey}`)}</option>)}
                    </select>
                    <div className="rm-link-search-row">
                      <input placeholder={t('roadmap.links.searchPlaceholder')} value={linkSearch}
                        onChange={e => setLinkSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchForLink()} />
                      <button onClick={searchForLink}><FiSearch size={14} /></button>
                    </div>
                    {linkResults.length > 0 && (
                      <div className="rm-link-results custom-scrollbar">
                        {linkResults.map(r => (
                          <div key={r.id} className="rm-link-result-item" onClick={() => createLink(r.id)}>
                            <span style={{ color: (ISSUE_TYPES[r.issue_type] || ISSUE_TYPES.task).color }}>{(ISSUE_TYPES[r.issue_type] || ISSUE_TYPES.task).icon}</span>
                            <span className="rm-link-result-key">{r.issue_key}</span>
                            <span className="rm-link-result-title">{r.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="rm-links-list">
                  {links.map(l => {
                    const isSource = l.source_issue_id === issue.id;
                    const linkedTitle = isSource ? l.target_title : l.source_title;
                    const linkedKey = isSource ? l.target_key : l.source_key;
                    const linkedStatus = isSource ? l.target_status : l.source_status;
                    const typeLabel = isSource ? t(`roadmap.links.${LINK_TYPES[l.link_type]?.labelKey || l.link_type}`) : t(`roadmap.links.${LINK_TYPES[l.link_type]?.reverseKey || l.link_type}`);
                    return (
                      <div key={l.id} className="rm-link-item">
                        <span className="rm-link-type-label">{typeLabel || l.link_type}</span>
                        <span className="rm-link-key">{linkedKey}</span>
                        <span className="rm-link-title">{linkedTitle}</span>
                        <span className="rm-link-status">{linkedStatus}</span>
                        <button className="rm-link-delete" onClick={() => deleteLink(l.id)} title={t('roadmap.actions.delete')}><FiTrash2 size={12} /></button>
                      </div>
                    );
                  })}
                  {links.length === 0 && <p className="rm-loading-text">{t('roadmap.links.noLinks')}</p>}
                </div>
              </div>
            )}

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && issue?.id && (
              <div className="rm-comments-section">
                <h3><FiMessageSquare size={14} /> {t('roadmap.comments.title')} ({comments.length})</h3>
                <div className="rm-comments-list">
                  {comments.map(c => (
                    <div key={c.id} className="rm-comment">
                      <div className="rm-comment-header">
                        <strong>{c.username}</strong>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <div className="rm-comment-body" dangerouslySetInnerHTML={{ __html: c.content }} />
                    </div>
                  ))}
                  {loadingComments && <p className="rm-loading-text">{t('roadmap.comments.loading')}</p>}
                </div>
                <div className="rm-comment-editor">
                  <div className="rm-comment-toolbar">
                    <button type="button" title={t('roadmap.comments.bold')} onClick={() => {
                      setNewComment(prev => prev + '<b></b>');
                    }}><strong>B</strong></button>
                    <button type="button" title={t('roadmap.comments.italic')} onClick={() => {
                      setNewComment(prev => prev + '<i></i>');
                    }}><em>I</em></button>
                    <button type="button" title={t('roadmap.comments.bulletList')} onClick={() => {
                      setNewComment(prev => prev + '<ul><li></li></ul>');
                    }}><FiList size={14} /></button>
                    <button type="button" title={t('roadmap.comments.codeBlock')} onClick={() => {
                      setNewComment(prev => prev + '<pre><code></code></pre>');
                    }}>{'</>'}</button>
                    <label className="rm-comment-image-btn" title={t('roadmap.comments.addImage')}>
                      <FiPaperclip size={14} />
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch('/api/files/upload-image', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const imgUrl = data.url || `/api/files/download?path=${encodeURIComponent(data.path)}`;
                            setNewComment(prev => prev + `<img src="${imgUrl}" alt="${file.name}" style="max-width:100%;border-radius:6px;margin:8px 0;" />`);
                          }
                        } catch (err) { /* ignore */ }
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                  <div className="rm-comment-input-row">
                    <textarea className="rm-comment-textarea" placeholder={t('roadmap.comments.writeComment')} value={newComment}
                      onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addComment(); }} rows={3} />
                    <button onClick={addComment}><FiSend size={14} /></button>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && issue?.id && (
              <div className="rm-history-section">
                <div className="rm-history-header">
                  <h3><FiActivity size={14} /> {t('roadmap.history.title')}</h3>
                  <span className="rm-history-count">{history.length} {t('roadmap.history.events')}</span>
                </div>
                <div className="rm-history-timeline">
                  {history.map((h, idx) => (
                    <div key={h.id || idx} className="rm-history-item">
                      <div className="rm-history-marker">
                        <div className="rm-history-dot" />
                        {idx !== history.length - 1 && <div className="rm-history-line" />}
                      </div>
                      <div className="rm-history-content">
                        <div className="rm-history-top">
                          <span className="rm-history-user">{h.username || 'Sistema'}</span>
                          <span className="rm-history-time">
                            {new Date(h.created_at).toLocaleString('es-ES', { 
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="rm-history-details">
                          <span className="rm-history-field-badge">{h.field_name}</span>
                          <div className="rm-history-values">
                            {h.old_value && <span className="rm-history-val old">{h.old_value}</span>}
                            {h.old_value && <FiChevronRight className="rm-history-arrow" />}
                            <span className="rm-history-val new">{h.new_value}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="rm-empty-state">
                      <FiActivity size={24} />
                      <p>{t('roadmap.history.noHistory')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Sidebar Fields */}
          <div className="rm-modal-sidebar">
            <div className="rm-field-group">
              <label>{t('roadmap.fields.type')}</label>
              <select value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}>
                {Object.entries(ISSUE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{t(`roadmap.issueTypes.${v.labelKey}`)}</option>
                ))}
              </select>
            </div>
            <div className="rm-field-group">
              <label>{t('roadmap.fields.status')}</label>
              <select value={form.column_id} onChange={e => setForm(f => ({ ...f, column_id: parseInt(e.target.value) }))}>
                <option value="">{t('roadmap.modal.select')}</option>
                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label>{t('roadmap.fields.priority')}</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{t(`roadmap.priorities.${v.labelKey}`)}</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label><FiUser size={14} /> {t('roadmap.fields.assignee')}</label>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: parseInt(e.target.value) || '' }))}>
                <option value="">{t('roadmap.modal.unassigned')}</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label><FiZap size={14} /> {t('roadmap.fields.sprint')}</label>
              <select value={form.sprint_id} onChange={e => setForm(f => ({ ...f, sprint_id: parseInt(e.target.value) || '' }))}>
                <option value="">{t('roadmap.modal.noSprint')}</option>
                {(sprints || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label><FiBookmark size={14} /> {t('roadmap.fields.epic')}</label>
              <select value={form.epic_id} onChange={e => setForm(f => ({ ...f, epic_id: parseInt(e.target.value) || '' }))}>
                <option value="">{t('roadmap.modal.noEpic')}</option>
                {(epics || []).map(ep => <option key={ep.id} value={ep.id}>{ep.issue_key} - {ep.title}</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label><FiHash size={14} /> {t('roadmap.fields.storyPoints')}</label>
              <select value={form.story_points} onChange={e => setForm(f => ({ ...f, story_points: e.target.value }))}>
                <option value="">-</option>
                {[1, 2, 3, 5, 8, 13, 21].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="rm-field-group">
              <label><FiCalendar size={14} /> {t('roadmap.fields.startDate')}</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="rm-field-group">
              <label><FiCalendar size={14} /> {t('roadmap.fields.dueDate')}</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="rm-field-group">
              <label><FiClock size={14} /> {t('roadmap.fields.estimated')}</label>
              <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="rm-field-group checkbox-field">
              <label className="rm-outlook-sync-label">
                <input type="checkbox" checked={form.syncCalendar} onChange={e => setForm(f => ({ ...f, syncCalendar: e.target.checked }))} />
                <span className="rm-outlook-text"><FiRefreshCw size={14} /> {t('roadmap.fields.syncCalendar')}</span>
              </label>
              {issue?.calendar_event_id && (
                <div className="rm-sync-status">
                  <FiLink size={12} /> {t('roadmap.messages.linkedToCalendar')}
                  <button className="rm-link-btn" onClick={() => window.location.href = '/calendar'} title="Ver en Calendario">
                    <FiExternalLink size={12} />
                  </button>
                </div>
              )}
            </div>
            <button className="rm-save-btn" onClick={handleSubmit}>
              <FiCheck size={16} /> {issue ? t('roadmap.actions.save') : t('roadmap.actions.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TIMELINE / GANTT VIEW
// ============================================
const ZOOM_LEVELS = ['hours', 'days', 'weeks', 'months'];
const TimelineView = ({ issues, columns, sprints, epics, onEditIssue, t }) => {
  const [zoomIndex, setZoomIndex] = useState(2); // default to 'weeks'
  const timelineScale = ZOOM_LEVELS[zoomIndex];
  const [groupBy, setGroupBy] = useState('column');
  const scrollRef = React.useRef(null);

  // Mouse wheel zoom (with debounce for trackpad)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastZoomTime = 0;
    let accumulatedDelta = 0;
    const ZOOM_COOLDOWN = 300; // ms between zoom level changes
    const DELTA_THRESHOLD = 50; // accumulated delta needed to trigger zoom
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastZoomTime < ZOOM_COOLDOWN) {
          accumulatedDelta = 0;
          return;
        }
        accumulatedDelta += e.deltaY;
        if (Math.abs(accumulatedDelta) < DELTA_THRESHOLD) return;
        lastZoomTime = now;
        const direction = accumulatedDelta > 0 ? 1 : -1; // positive = zoom in, negative = zoom out
        accumulatedDelta = 0;
        setZoomIndex(prev => {
          if (direction < 0) return Math.min(prev + 1, ZOOM_LEVELS.length - 1);
          return Math.max(prev - 1, 0);
        });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Calculate the date range for the timeline
  const timelineData = useMemo(() => {
    const issuesWithDates = issues.filter(i => i.start_date || i.due_date);
    if (issuesWithDates.length === 0) {
      // Default: show current month range
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return { rangeStart: start, rangeEnd: end, slots: generateSlots(start, end, 'weeks'), groups: [] };
    }

    const allDates = [];
    issuesWithDates.forEach(i => {
      if (i.start_date) allDates.push(new Date(i.start_date));
      if (i.due_date) allDates.push(new Date(i.due_date));
    });
    // Also include issues without dates for grouping
    const today = new Date();
    allDates.push(today);

    let rangeStart = new Date(Math.min(...allDates));
    let rangeEnd = new Date(Math.max(...allDates));
    // Add padding
    rangeStart.setDate(rangeStart.getDate() - 7);
    rangeEnd.setDate(rangeEnd.getDate() + 14);

    const slots = generateSlots(rangeStart, rangeEnd, timelineScale);

    // Group issues
    let groups = [];
    if (groupBy === 'column') {
      groups = columns.map(col => ({
        id: col.id, name: col.name, color: col.color || '#6b7280',
        items: issues.filter(i => i.column_id === col.id)
      }));
    } else if (groupBy === 'sprint') {
      groups = sprints.map(s => ({
        id: s.id, name: s.name, color: s.status === 'active' ? '#22c55e' : s.status === 'completed' ? '#6b7280' : '#3b82f6',
        items: issues.filter(i => i.sprint_id === s.id)
      }));
      const noSprint = issues.filter(i => !i.sprint_id);
      if (noSprint.length > 0) groups.push({ id: 'none', name: t('roadmap.timeline.noSprint'), color: '#9ca3af', items: noSprint });
    } else if (groupBy === 'epic') {
      groups = epics.map(ep => ({
        id: ep.id, name: ep.title, color: '#904ee2',
        items: issues.filter(i => i.epic_id === ep.id)
      }));
      const noEpic = issues.filter(i => !i.epic_id);
      if (noEpic.length > 0) groups.push({ id: 'none', name: t('roadmap.timeline.noEpic'), color: '#9ca3af', items: noEpic });
    } else if (groupBy === 'assignee') {
      const byAssignee = {};
      issues.forEach(i => {
        const key = i.assigned_to || 'unassigned';
        const name = i.assigned_username || t('roadmap.timeline.unassigned');
        if (!byAssignee[key]) byAssignee[key] = { id: key, name, color: '#4b9cdb', items: [] };
        byAssignee[key].items.push(i);
      });
      groups = Object.values(byAssignee);
    }

    return { rangeStart, rangeEnd, slots, groups };
  }, [issues, columns, sprints, epics, timelineScale, groupBy]);

  function generateSlots(start, end, scale) {
    const slots = [];
    const current = new Date(start);
    const maxSlots = 500; // safety limit
    let count = 0;
    while (current <= end && count < maxSlots) {
      count++;
      if (scale === 'hours') {
        slots.push({
          date: new Date(current),
          label: current.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          subLabel: current.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          width: 50
        });
        current.setHours(current.getHours() + 1);
      } else if (scale === 'days') {
        const isWeekend = current.getDay() === 0 || current.getDay() === 6;
        slots.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('es-ES', { day: '2-digit' }),
          subLabel: current.toLocaleDateString('es-ES', { weekday: 'short' }),
          type: isWeekend ? 'weekend' : 'weekday',
          width: 60 
        });
        current.setDate(current.getDate() + 1);
      } else if (scale === 'weeks') {
        slots.push({ 
          date: new Date(current), 
          label: `${t('roadmap.timeline.week')} ${Math.ceil(current.getDate() / 7)}`,
          subLabel: current.toLocaleDateString('es-ES', { month: 'short' }),
          width: 100 
        });
        current.setDate(current.getDate() + 7);
      } else {
        slots.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('es-ES', { month: 'long' }),
          subLabel: current.getFullYear(),
          width: 180 
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    return slots;
  }

  function getBarPosition(item, rangeStart, totalWidth, totalDays) {
    const start = item.start_date ? new Date(item.start_date) : (item.due_date ? new Date(new Date(item.due_date).getTime() - 3 * 86400000) : new Date());
    const end = item.due_date ? new Date(item.due_date) : new Date(start.getTime() + 3 * 86400000);

    const startDiff = Math.max(0, (start - rangeStart) / 86400000);
    const duration = Math.max(1, (end - start) / 86400000);

    const left = (startDiff / totalDays) * totalWidth;
    const width = Math.max(24, (duration / totalDays) * totalWidth);

    return { left, width };
  }

  const totalWidth = timelineData.slots.reduce((sum, s) => sum + s.width, 0);
  const totalDays = Math.max(1, (timelineData.rangeEnd - timelineData.rangeStart) / 86400000);

  // Today marker position
  const today = new Date();
  const todayOffset = Math.max(0, (today - timelineData.rangeStart) / 86400000);
  const todayLeft = (todayOffset / totalDays) * totalWidth;

  const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
  const TYPE_COLORS = { task: '#4b9cdb', bug: '#e5493a', story: '#63ba3c', epic: '#904ee2', subtask: '#4b9cdb', improvement: '#2dcccd' };

  return (
    <div className="rm-timeline-container">
      {/* Timeline Toolbar */}
      <div className="rm-timeline-toolbar">
        <h2><FiBarChart2 size={20} /> {t('roadmap.timeline.title')}</h2>
        <div className="rm-timeline-controls">
          <div className="rm-timeline-zoom-controls">
            <button className="rm-zoom-btn" onClick={() => setZoomIndex(i => Math.max(i - 1, 0))} disabled={zoomIndex === 0} title="Zoom in">
              <FiPlus size={14} />
            </button>
            <span className="rm-zoom-level">{timelineScale === 'hours' ? t('roadmap.timeline.hours') : timelineScale === 'days' ? t('roadmap.timeline.days') : timelineScale === 'weeks' ? t('roadmap.timeline.weeks') : t('roadmap.timeline.months')}</span>
            <button className="rm-zoom-btn" onClick={() => setZoomIndex(i => Math.min(i + 1, ZOOM_LEVELS.length - 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} title="Zoom out">
              <FiSearch size={14} />
            </button>
          </div>
          <div className="rm-timeline-control-group">
            <label>{t('roadmap.timeline.scale')}:</label>
            <select value={timelineScale} onChange={e => setZoomIndex(ZOOM_LEVELS.indexOf(e.target.value))}>
              <option value="hours">{t('roadmap.timeline.hours')}</option>
              <option value="days">{t('roadmap.timeline.days')}</option>
              <option value="weeks">{t('roadmap.timeline.weeks')}</option>
              <option value="months">{t('roadmap.timeline.months')}</option>
            </select>
          </div>
          <div className="rm-timeline-control-group">
            <label>{t('roadmap.timeline.groupBy')}:</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="column">{t('roadmap.timeline.byColumn')}</option>
              <option value="sprint">{t('roadmap.timeline.bySprint')}</option>
              <option value="epic">{t('roadmap.timeline.byEpic')}</option>
              <option value="assignee">{t('roadmap.timeline.byAssignee')}</option>
            </select>
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="rm-empty">
          <FiBarChart2 size={48} />
          <h2>{t('roadmap.messages.noTimeline')}</h2>
          <p>{t('roadmap.messages.noTimelineDesc')}</p>
        </div>
      ) : (
        <div className="rm-timeline-scroll" ref={scrollRef}>
          <div className="rm-timeline-grid" style={{ minWidth: totalWidth + 220 }}>
            {/* Header Row - Dates */}
            <div className="rm-timeline-header">
              <div className="rm-timeline-label-col">{t('roadmap.timeline.task')}</div>
              <div className="rm-timeline-dates-row">
                {timelineData.slots.map((slot, i) => (
                  <div key={i} className={`rm-timeline-date-cell ${slot.type || ''}`} style={{ width: slot.width, minWidth: slot.width }}>
                    <div className="date-label">{slot.label}</div>
                    <div className="date-sublabel">{slot.subLabel}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups */}
            {timelineData.groups.map(group => (
              <div key={group.id} className="rm-timeline-group">
                {/* Group Header */}
                <div className="rm-timeline-group-header">
                  <div className="rm-timeline-label-col">
                    <span className="rm-timeline-group-dot" style={{ background: group.color }} />
                    <span className="rm-timeline-group-name">{group.name}</span>
                    <span className="rm-timeline-group-count">{group.items.length}</span>
                  </div>
                  <div className="rm-timeline-dates-row" style={{ position: 'relative' }}>
                    {/* Sprint date range overlay */}
                    {groupBy === 'sprint' && group.id !== 'none' && (() => {
                      const sprint = sprints.find(s => s.id === group.id);
                      if (sprint?.start_date && sprint?.end_date) {
                        const sStart = new Date(sprint.start_date);
                        const sEnd = new Date(sprint.end_date);
                        const sOff = Math.max(0, (sStart - timelineData.rangeStart) / 86400000);
                        const sDur = Math.max(1, (sEnd - sStart) / 86400000);
                        const sLeft = (sOff / totalDays) * totalWidth;
                        const sWidth = (sDur / totalDays) * totalWidth;
                        return <div className="rm-timeline-sprint-range" style={{ left: sLeft, width: sWidth }} />;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Items */}
                {group.items.map(item => {
                  const bar = getBarPosition(item, timelineData.rangeStart, totalWidth, totalDays);
                  const barColor = TYPE_COLORS[item.issue_type] || '#4b9cdb';
                  const hasDates = item.start_date || item.due_date;
                  const isOverdue = item.due_date && new Date(item.due_date) < today && item.status !== 'done';

                  return (
                    <div key={item.id} className="rm-timeline-row" onClick={() => onEditIssue(item)}>
                      <div className="rm-timeline-label-col rm-timeline-item-label">
                        <span className="rm-timeline-item-type" style={{ color: TYPE_COLORS[item.issue_type] || '#4b9cdb' }}>
                          {item.issue_key}
                        </span>
                        <span className="rm-timeline-item-title">{item.title}</span>
                        {item.assigned_username && (
                          item.assigned_avatar ? (
                            <img src={item.assigned_avatar} alt={item.assigned_username} className="rm-avatar-xs-img" />
                          ) : (
                            <div className="rm-avatar-xs">{item.assigned_username.charAt(0).toUpperCase()}</div>
                          )
                        )}
                      </div>
                      <div className="rm-timeline-dates-row" style={{ position: 'relative' }}>
                        {hasDates ? (
                          <div
                            className={`rm-timeline-bar ${isOverdue ? 'overdue' : ''}`}
                            style={{ left: bar.left, width: bar.width, background: barColor }}
                            title={`${item.title}\n${item.start_date ? new Date(item.start_date).toLocaleDateString('es-ES') : '?'} → ${item.due_date ? new Date(item.due_date).toLocaleDateString('es-ES') : '?'}`}
                          >
                            <span className="rm-timeline-bar-label">{item.title.substring(0, Math.floor(bar.width / 7))}</span>
                            <span className="rm-timeline-bar-priority" style={{ background: PRIORITY_COLORS[item.priority] || '#eab308' }} />
                          </div>
                        ) : (
                          <div className="rm-timeline-no-dates">{t('roadmap.timeline.noDates')}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Today marker */}
            {todayLeft > 0 && todayLeft < totalWidth && (
              <div className="rm-timeline-today" style={{ left: todayLeft + 220 }}>
                <div className="rm-timeline-today-label">{t('roadmap.timeline.today')}</div>
                <div className="rm-timeline-today-line" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN ROADMAP COMPONENT
// ============================================
const Roadmap = ({ user, onLogout, onBackToFolders, onGoToCalendar, onGoToPanel, onGoToRemote, onThemeToggle, isDarkMode }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Core state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [activeView, setActiveView] = useState('board');

  // Sprint management
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '' });
  const [burndownData, setBurndownData] = useState(null);
  const [showBurndown, setShowBurndown] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [preselectedColumnId, setPreselectedColumnId] = useState(null);
  const [preselectedIssueType, setPreselectedIssueType] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  
  const editingIssue = useMemo(() => {
    if (!editingIssueId) return null;
    // Map of all issues
    const allIssues = [...issues, ...backlog, ...epics];
    return allIssues.find(i => i.id === editingIssueId) || null;
  }, [editingIssueId, issues, backlog, epics]);

  const [insights, setInsights] = useState(null);
  const [insightsSummary, setInsightsSummary] = useState(null);
  const [draggingIssueId, setDraggingIssueId] = useState(null);

  // Share
  const [showShareModal, setShowShareModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [shareSearch, setShareSearch] = useState('');

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectType, setNewProjectType] = useState('personal');

  // Access control
  const [myAccess, setMyAccess] = useState({ access_level: 'none', can_create_projects: false, is_admin: false });

  // AI
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Delete Project State
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  const getToken = useCallback(() => getAuthToken(), []);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (filterType && i.issue_type !== filterType) return false;
      if (filterPriority && i.priority !== filterPriority) return false;
      if (filterAssignee && String(i.assigned_to) !== filterAssignee) return false;
      if (filterSprint && String(i.sprint_id) !== filterSprint) return false;
      if (searchQuery && !i.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !i.issue_key?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [issues, filterType, filterPriority, filterAssignee, filterSprint, searchQuery]);

  const hasFilters = filterType || filterPriority || filterAssignee || filterSprint || searchQuery;
  const clearFilters = () => { setFilterType(''); setFilterPriority(''); setFilterAssignee(''); setFilterSprint(''); setSearchQuery(''); };

  // ===== FETCH ACCESS LEVEL =====
  const fetchMyAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/roadmap/admin/access/me', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { const data = await res.json(); setMyAccess(data); }
    } catch (e) { console.warn('Could not fetch access:', e); }
  }, [getToken]);

  const canCreate = myAccess.is_admin || myAccess.can_create_projects || myAccess.access_level === 'manager' || myAccess.access_level === 'admin';
  const isViewer = myAccess.access_level === 'viewer' && !myAccess.is_admin;

  // ===== FETCH PROJECTS =====
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/roadmap/projects', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (e) { 
      console.error('Error fetching projects:', e); 
      setLoading(false);
    }
  }, [getToken, selectedProjectId]);

  // ===== FETCH PROJECT DATA =====
  const fetchProjectData = useCallback(async (projectId) => {
    if (!projectId) return;
    setLoading(true);
    const token = getToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [colsRes, issuesRes, membersRes, milestonesRes, sprintsRes, epicsRes, backlogRes] = await Promise.all([
        fetch(`/api/roadmap/projects/${projectId}/columns`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/issues`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/members`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/milestones`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/sprints`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/epics`, { headers }),
        fetch(`/api/roadmap/projects/${projectId}/backlog`, { headers })
      ]);
      if (colsRes.ok) setColumns(await colsRes.json());
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      if (milestonesRes.ok) setMilestones(await milestonesRes.json());
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
      if (epicsRes.ok) setEpics(await epicsRes.json());
      if (backlogRes.ok) setBacklog(await backlogRes.json());
    } catch (e) { console.error('Error fetching project data:', e); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchMyAccess(); fetchProjects(); }, [fetchMyAccess, fetchProjects]);
  useEffect(() => { if (selectedProjectId) fetchProjectData(selectedProjectId); }, [selectedProjectId, fetchProjectData]);

  // ===== HANDLERS =====
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/roadmap/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc, project_type: newProjectType })
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [...prev, project]);
        setSelectedProjectId(project.id);
        setNewProjectName(''); setNewProjectDesc(''); setNewProjectType('personal'); setShowNewProject(false);
        showToast(t('roadmap.messages.projectCreated', { name: newProjectName }), 'success');
      } else {
        const err = await res.json();
        showToast(err.error || t('roadmap.messages.errorCreateProject'), 'error');
      }
    } catch (e) { showToast(t('roadmap.messages.errorCreateProject'), 'error'); }
  };

  const handleSaveIssue = async (formData) => {
    const token = getToken();
    try {
      if (editingIssue) {
        const res = await fetch(`/api/roadmap/issues/${editingIssue.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(formData) });
        if (res.ok) { const updated = await res.json(); setIssues(prev => prev.map(i => i.id === updated.id ? updated : i)); showToast(t('roadmap.messages.issueUpdated'), 'success'); }
        else { const err = await res.json().catch(() => ({})); showToast(err.error || t('roadmap.messages.errorUpdating'), 'error'); return; }
      } else {
        const payload = { ...formData, column_id: formData.column_id || preselectedColumnId };
        const res = await fetch(`/api/roadmap/projects/${selectedProjectId}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (res.ok) { const created = await res.json(); setIssues(prev => [...prev, created]); showToast(t('roadmap.messages.issueCreated'), 'success'); }
        else { const err = await res.json().catch(() => ({})); showToast(err.error || t('roadmap.messages.errorCreating'), 'error'); return; }
      }
    } catch (e) { showToast(t('roadmap.messages.errorSaving'), 'error'); return; }
    setShowIssueModal(false); setEditingIssueId(null); setPreselectedColumnId(null); setPreselectedIssueType(null);
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      const res = await fetch(`/api/roadmap/issues/${issueId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { setIssues(prev => prev.filter(i => i.id !== issueId)); showToast(t('roadmap.messages.issueDeleted'), 'success'); }
    } catch (e) { showToast(t('roadmap.messages.errorDeleting'), 'error'); }
  };

  const handleDrop = async (issueId, targetColumnId, fromColumnId) => {
    setDraggingIssueId(null);
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, column_id: targetColumnId } : i));
    try {
      await fetch(`/api/roadmap/issues/${issueId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ column_id: targetColumnId }) });
      fetchProjectData(selectedProjectId);
    } catch (e) { setIssues(prev => prev.map(i => i.id === issueId ? { ...i, column_id: fromColumnId } : i)); }
  };

  const handleLinkDocument = async (issueId, doc) => {
    try {
      const res = await fetch(`/api/roadmap/issues/${issueId}/documents`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
        body: JSON.stringify(doc) 
      });
      if (res.ok) { 
        fetchProjectData(selectedProjectId); 
        showToast(t('roadmap.messages.docLinked'), 'success'); 
      }
    } catch (e) { showToast(t('roadmap.messages.errorLinkDoc'), 'error'); }
  };

  const handleUnlinkDocument = async (docLinkId) => {
    try { 
      const res = await fetch(`/api/roadmap/documents/${docLinkId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
      if (res.ok) {
        fetchProjectData(selectedProjectId); 
      }
    } catch (e) { /* ignore */ }
  };

  const handleFetchInsights = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/roadmap/projects/${selectedProjectId}/insights`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { const data = await res.json(); setInsights(data.insights); setInsightsSummary(data.summary); setShowInsights(true); }
    } catch (e) { showToast(t('roadmap.messages.errorInsights'), 'error'); }
  };

  // ===== SHARE HANDLERS =====
  const handleOpenShare = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch('/api/roadmap/users', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { setAllUsers(await res.json()); }
    } catch (e) { /* ignore */ }
    setShareSearch('');
    setShowShareModal(true);
  };

  const handleAddMember = async (userId) => {
    try {
      const res = await fetch(`/api/roadmap/projects/${selectedProjectId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ user_id: userId, role: 'member' })
      });
      if (res.ok) { 
        fetchProjectData(selectedProjectId); 
        showToast(t('roadmap.messages.memberAdded'), 'success'); 
      }
    } catch (e) { showToast(t('roadmap.messages.errorAddMember'), 'error'); }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const res = await fetch(`/api/roadmap/projects/${selectedProjectId}/members/${userId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) { 
        fetchProjectData(selectedProjectId); 
        showToast(t('roadmap.messages.memberRemoved'), 'success'); 
      }
    } catch (e) { showToast(t('roadmap.messages.errorRemoveMember'), 'error'); }
  };

  const handleAICommand = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/roadmap-command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ query: aiInput, projectId: selectedProjectId }) });
      if (res.ok) { const data = await res.json(); showToast(data.message || t('roadmap.ai.commandProcessed'), 'success'); setAiInput(''); fetchProjectData(selectedProjectId); fetchProjects(); }
      else { const err = await res.json(); showToast(err.error || t('roadmap.messages.errorUpdating'), 'error'); }
    } catch (e) { showToast(t('roadmap.ai.connectionError'), 'error'); }
    finally { setAiLoading(false); }
  };

  // Sprint handlers
  const handleCreateSprint = async () => {
    if (!sprintForm.name.trim()) return;
    try {
      const res = await fetch(`/api/roadmap/projects/${selectedProjectId}/sprints`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(sprintForm) });
      if (res.ok) { const sprint = await res.json(); setSprints(prev => [sprint, ...prev]); setSprintForm({ name: '', goal: '', start_date: '', end_date: '' }); setShowSprintForm(false); showToast(t('roadmap.messages.sprintCreated', { name: sprint.name }), 'success'); }
      else { const err = await res.json().catch(() => ({})); showToast(err.error || t('roadmap.messages.errorSprint'), 'error'); }
    } catch (e) { showToast(t('roadmap.messages.errorSprint'), 'error'); }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      const res = await fetch(`/api/roadmap/sprints/${sprintId}/start`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { const updated = await res.json(); setSprints(prev => prev.map(s => s.id === sprintId ? { ...updated, issue_count: s.issue_count, done_count: s.done_count } : s)); showToast(t('roadmap.messages.sprintStarted'), 'success'); }
      else { const err = await res.json(); showToast(err.error || t('roadmap.messages.errorUpdating'), 'error'); }
    } catch (e) { showToast(t('roadmap.messages.errorUpdating'), 'error'); }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      const res = await fetch(`/api/roadmap/sprints/${sprintId}/complete`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({}) });
      if (res.ok) { showToast(t('roadmap.messages.sprintCompleted'), 'success'); fetchProjectData(selectedProjectId); }
      else { const err = await res.json().catch(() => ({})); showToast(err.error || t('roadmap.messages.errorUpdating'), 'error'); }
    } catch (e) { showToast(t('roadmap.messages.errorUpdating'), 'error'); }
  };

  const handleDeleteSprint = async (sprintId) => {
    try {
      await fetch(`/api/roadmap/sprints/${sprintId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      setSprints(prev => prev.filter(s => s.id !== sprintId)); showToast(t('roadmap.messages.sprintDeleted'), 'success'); fetchProjectData(selectedProjectId);
    } catch (e) { showToast(t('roadmap.messages.errorDeleting'), 'error'); }
  };

  const handleFetchBurndown = async (sprintId) => {
    try {
      const res = await fetch(`/api/roadmap/sprints/${sprintId}/burndown`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) { const data = await res.json(); setBurndownData(data); setShowBurndown(true); }
    } catch (e) { showToast(t('roadmap.messages.errorBurndown'), 'error'); }
  };

  const handleMoveToSprint = async (issueIds, sprintId) => {
    try {
      await fetch(`/api/roadmap/projects/${selectedProjectId}/issues/bulk`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify({ issue_ids: issueIds, updates: { sprint_id: sprintId } }) });
      fetchProjectData(selectedProjectId); showToast(t('roadmap.messages.tasksMoved'), 'success');
    } catch (e) { showToast(t('roadmap.messages.errorUpdating'), 'error'); }
  };

  const handleDeleteProjectConfirm = async () => {
    if (!selectedProjectId || deleteConfirmationName !== selectedProject.name) return;
    try {
      const res = await fetch(`/api/roadmap/projects/${selectedProjectId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== selectedProjectId));
        setSelectedProjectId(null);
        setShowDeleteProjectModal(false);
        setDeleteConfirmationName('');
        showToast(t('roadmap.messages.projectDeleted'), 'success');
      } else {
        const err = await res.json();
        showToast(err.error || t('roadmap.messages.errorDeleteProject'), 'error');
      }
    } catch (e) { showToast(t('roadmap.messages.errorDeleteProject'), 'error'); }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const currentUserId = user?.id || parseInt(localStorage.getItem('userId'));
  const isOwner = selectedProject && selectedProject.owner_id === currentUserId;
  const activeSprint = sprints.find(s => s.status === 'active');

  const closeMobileSidebar = () => setMobileSidebar(false);

  // ===== RENDER =====
  return (
    <div className="roadmap-layout">
      {/* Mobile Header */}
      <div className="roadmap-mobile-header">
        <div className="roadmap-logo-container">
          <FiMap size={20} />
          <span>Roadmap</span>
        </div>
        <button className="roadmap-hamburger-btn" onClick={() => setMobileSidebar(true)}>
          <FiMenu size={20} />
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      <div className={`roadmap-sidebar-overlay ${mobileSidebar ? 'visible' : ''}`} onClick={closeMobileSidebar} />

      {/* ========== SIDEBAR ========== */}
      <div className={`roadmap-sidebar ${sidebarOpen || mobileSidebar ? 'open' : ''}`}>
        <div className="roadmap-sidebar-header">
          <div className="roadmap-logo-container">
            <FiMap size={24} className="roadmap-logo-icon" />
            <span>Roadmap</span>
          </div>
          <button className="roadmap-mobile-close-btn" onClick={closeMobileSidebar}><FiX size={18} /></button>
        </div>

        <div className="roadmap-sidebar-content">
          {/* AI Assistant Button */}
          <button className="rm-create-btn" onClick={() => setShowAIModal(true)}>
            <FiCpu size={16} /> {t('roadmap.sidebar.aiAssistant')}
          </button>

          {/* New Issue Button */}
          {selectedProjectId && (
            <button className="rm-create-btn" onClick={() => { setPreselectedColumnId(columns[0]?.id); setEditingIssueId(null); setShowIssueModal(true); }}>
              <FiPlus size={16} /> {t('roadmap.sidebar.newTask')}
            </button>
          )}

          {/* Views Navigation */}
          <div className="rm-sidebar-section">
            <div className="rm-section-title">{t('roadmap.sidebar.views')}</div>
            <div className="rm-nav-list">
              <button className={`rm-nav-item ${activeView === 'board' ? 'active' : ''}`} onClick={() => setActiveView('board')}>
                <FiColumns size={16} className="nav-icon" /> {t('roadmap.views.board')}
                <span className="rm-nav-count">{filteredIssues.length}</span>
              </button>
              <button className={`rm-nav-item ${activeView === 'backlog' ? 'active' : ''}`} onClick={() => setActiveView('backlog')}>
                <FiList size={16} className="nav-icon" /> {t('roadmap.views.backlog')}
                <span className="rm-nav-count">{backlog.length}</span>
              </button>
              <button className={`rm-nav-item ${activeView === 'sprints' ? 'active' : ''}`} onClick={() => setActiveView('sprints')}>
                <FiRepeat size={16} className="nav-icon" /> {t('roadmap.views.sprints')}
                <span className="rm-nav-count">{sprints.length}</span>
              </button>
              <button className={`rm-nav-item ${activeView === 'epics' ? 'active' : ''}`} onClick={() => setActiveView('epics')}>
                <FiZap size={16} className="nav-icon" /> {t('roadmap.views.epics')}
                <span className="rm-nav-count">{epics.length}</span>
              </button>
              <button className={`rm-nav-item ${activeView === 'timeline' ? 'active' : ''}`} onClick={() => setActiveView('timeline')}>
                <FiBarChart2 size={16} className="nav-icon" /> {t('roadmap.views.timeline')}
              </button>
            </div>
          </div>

          {/* Projects */}
          <div className="rm-sidebar-section">
            <div className="rm-section-title">{t('roadmap.project.projects')}</div>
            <div className="rm-project-list">
              {/* General (company) projects */}
              {projects.filter(p => p.project_type === 'general').length > 0 && projects.filter(p => p.project_type !== 'general').length > 0 && (
                <div className="rm-project-group-label"><FiGlobe size={11} /> {t('roadmap.project.generalProjects')}</div>
              )}
              {projects.filter(p => p.project_type === 'general').map(p => (
                <button key={p.id} className={`rm-project-item ${p.id === selectedProjectId ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(p.id)}>
                  <span className="rm-project-dot" style={{ background: '#3b82f6' }} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span className="rm-project-count">{p.issue_count || 0}</span>
                </button>
              ))}
              {/* Personal projects — only show label when both types exist */}
              {projects.filter(p => p.project_type !== 'general').length > 0 && projects.filter(p => p.project_type === 'general').length > 0 && (
                <div className="rm-project-group-label"><FiLock size={11} /> {t('roadmap.project.myProjects')}</div>
              )}
              {projects.filter(p => p.project_type !== 'general').map(p => (
                <button key={p.id} className={`rm-project-item ${p.id === selectedProjectId ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(p.id)}>
                  <span className="rm-project-dot" />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span className="rm-project-count">{p.issue_count || 0}</span>
                </button>
              ))}
              {canCreate && (
                <button className="rm-nav-item" onClick={() => setShowNewProject(!showNewProject)}>
                  <FiPlus size={14} className="nav-icon" /> {t('roadmap.project.newProject')}
                </button>
              )}
            </div>

          </div>

          {/* Active Sprint */}
          {activeSprint && (
            <div className="rm-sidebar-section">
              <div className="rm-section-title">{t('roadmap.sidebar.activeSprint')}</div>
              <div className="rm-sprint-card">
                <strong>{activeSprint.name}</strong>
                {activeSprint.goal && <p className="rm-sprint-goal">{activeSprint.goal}</p>}
                <div className="rm-sprint-progress">
                  <div className="rm-progress-bar">
                    <div className="rm-progress-fill" style={{ width: `${activeSprint.issue_count > 0 ? (activeSprint.done_count / activeSprint.issue_count) * 100 : 0}%`, background: '#22c55e' }} />
                  </div>
                  <span>{activeSprint.done_count}/{activeSprint.issue_count}</span>
                </div>
                {activeSprint.end_date && (
                  <div className="rm-sprint-date"><FiCalendar size={11} /> {new Date(activeSprint.end_date).toLocaleDateString('es-ES')}</div>
                )}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="rm-sidebar-section">
              <div className="rm-section-title"><FiStar size={12} /> {t('roadmap.sidebar.milestones')}</div>
              {milestones.map(m => (
                <div key={m.id} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.title}</div>
                  {m.due_date && <div style={{ fontSize: '0.7rem', color: 'var(--rm-text-secondary)' }}>{new Date(m.due_date).toLocaleDateString('es-ES')}</div>}
                  {m.total_issues > 0 && (
                    <div className="rm-sprint-progress" style={{ marginTop: '0.2rem' }}>
                      <div className="rm-progress-bar">
                        <div className="rm-progress-fill" style={{ width: `${(m.completed_issues / m.total_issues) * 100}%`, background: '#f59e0b' }} />
                      </div>
                      <span>{m.completed_issues}/{m.total_issues}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer - Navigation */}
        <div className="roadmap-sidebar-footer">
          <button className="roadmap-sidebar-btn" onClick={onBackToFolders}>
            <FiArrowLeft size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.back')}
          </button>
          <button className="roadmap-sidebar-btn" onClick={onGoToPanel}>
            <FiLayout size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.panel')}
          </button>
          <button className="roadmap-sidebar-btn" onClick={onGoToCalendar}>
            <FiCalendar size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.calendar')}
          </button>
          {onGoToRemote && (
            <button className="roadmap-sidebar-btn" onClick={onGoToRemote}>
              <FiMonitor size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.remote')}
            </button>
          )}
          <button className="roadmap-sidebar-btn" onClick={() => setShowSettingsModal(true)}>
            <FiSettings size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.settings')}
          </button>
          <button className="roadmap-sidebar-btn roadmap-sidebar-btn-logout" onClick={onLogout}>
            <FiLogOut size={16} className="roadmap-sidebar-btn-icon" /> {t('roadmap.sidebar.logout')}
          </button>
        </div>
      </div>

      {/* ========== MAIN PANEL ========== */}
      <div className="roadmap-main">
        {/* Main Header */}
        <div className="rm-main-header">
          <div className="rm-header-left">
            <button className="rm-toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}>
              {sidebarOpen ? <FiChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /> : <FiChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />}
            </button>
            <h1 className="rm-header-title">{selectedProject?.name || 'Roadmap'}</h1>
            {selectedProject?.project_key && <span className="rm-header-project-key">{selectedProject.project_key}</span>}
            {selectedProject?.project_type === 'general' && <span className="rm-type-badge general"><FiGlobe size={12} /> {t('roadmap.project.general')}</span>}
            {selectedProject?.project_type === 'personal' && <span className="rm-type-badge personal"><FiLock size={12} /> {t('roadmap.project.personal')}</span>}
            {isViewer && <span className="rm-type-badge viewer"><FiEye size={12} /> {t('roadmap.project.readOnly')}</span>}
          </div>
          <div className="rm-header-right">
            {selectedProjectId && isOwner && (
              <button className="rm-icon-btn" onClick={handleOpenShare} title={t('roadmap.project.shareProject')}>
                <FiUser size={16} />
              </button>
            )}
            {isOwner && (
              <button className="rm-icon-btn danger" onClick={() => setShowDeleteProjectModal(true)} title={t('roadmap.project.deleteProject')}>
                <FiTrash2 size={16} />
              </button>
            )}
            <button className={`rm-icon-btn ${showInsights ? 'active' : ''}`} onClick={handleFetchInsights} title={t('roadmap.ai.insights')}>
              <FiCpu size={16} />
            </button>
            <NotificationCenter user={user} />
          </div>
        </div>

        {/* Toolbar / Filters */}
        {selectedProjectId && (
          <div className="rm-toolbar">
            <div className="rm-search-box">
              <FiSearch size={14} />
              <input placeholder={t('roadmap.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="rm-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">{t('roadmap.filters.type')}</option>
              {Object.entries(ISSUE_TYPES).map(([k, v]) => <option key={k} value={k}>{t(`roadmap.issueTypes.${v.labelKey}`)}</option>)}
            </select>
            <select className="rm-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">{t('roadmap.filters.priority')}</option>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{t(`roadmap.priorities.${v.labelKey}`)}</option>)}
            </select>
            <select className="rm-filter-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">{t('roadmap.filters.assignee')}</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
            </select>
            <select className="rm-filter-select" value={filterSprint} onChange={e => setFilterSprint(e.target.value)}>
              <option value="">{t('roadmap.filters.sprint')}</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {hasFilters && (
              <button className="rm-filter-clear" onClick={clearFilters}><FiX size={12} /> {t('roadmap.filters.clear')}</button>
            )}
            <div className="rm-toolbar-spacer" />
            <span className="rm-filter-count">{filteredIssues.length} {t('roadmap.filters.tasks')}</span>
          </div>
        )}

        {/* ========== VIEW CONTENT ========== */}
        <div className="rm-content">
          {/* NO PROJECT SELECTED — show empty state for all views */}
          {!selectedProjectId && !loading ? (
            <div className="rm-empty">
              <FiTarget size={48} />
              <h2>{t('roadmap.messages.noProjects')}</h2>
              <p>{t('roadmap.messages.noProjectsDesc')}</p>
              <button onClick={() => setShowNewProject(true)}><FiPlus size={16} /> {t('roadmap.project.createProject')}</button>
            </div>
          ) : (
          <>
          {/* BOARD VIEW */}
          {activeView === 'board' && (
            loading ? (
              <div className="rm-loading"><div className="rm-loading-spinner" /><p>{t('roadmap.messages.loadingProject')}</p></div>
            ) : columns.length === 0 ? (
              <div className="rm-empty">
                <FiColumns size={48} />
                <h2>{t('roadmap.messages.noColumns')}</h2>
                <p>{t('roadmap.messages.noColumnsDesc')}</p>
              </div>
            ) : (
              <div className="rm-board">
                {columns.map(col => (
                  <KanbanColumn key={col.id} column={col} issues={filteredIssues}
                    onAddIssue={(colId) => { setPreselectedColumnId(colId); setEditingIssueId(null); setShowIssueModal(true); }}
                    onEditIssue={(issue) => { setEditingIssueId(issue.id); setShowIssueModal(true); }}
                    onDeleteIssue={handleDeleteIssue} onDrop={handleDrop}
                    onDragStart={(id) => setDraggingIssueId(id)} onDragEnd={() => setDraggingIssueId(null)}
                    draggingIssueId={draggingIssueId} t={t} />
                ))}
              </div>
            )
          )}

          {/* BACKLOG VIEW */}
          {activeView === 'backlog' && (
            <div className="rm-backlog">
              {/* Active Sprint */}
              {activeSprint && (
                <div className="rm-backlog-section">
                  <div className="rm-backlog-header">
                    <div className="rm-backlog-header-left">
                      <h3>{activeSprint.name}</h3>
                      <span className="rm-status-badge active">Activo</span>
                      <span className="rm-issue-count">{issues.filter(i => i.sprint_id === activeSprint.id).length} {t('roadmap.filters.tasks')}</span>
                    </div>
                    <div className="rm-backlog-header-right">
                      <button className="rm-action-btn" onClick={() => handleCompleteSprint(activeSprint.id)}><FiCheck size={12} /> {t('roadmap.actions.complete')}</button>
                      <button className="rm-action-btn" onClick={() => handleFetchBurndown(activeSprint.id)}><FiTrendingUp size={12} /> {t('roadmap.actions.burndown')}</button>
                    </div>
                  </div>
                  <div className="rm-backlog-issues">
                    {issues.filter(i => i.sprint_id === activeSprint.id).map(issue => {
                      const it = ISSUE_TYPES[issue.issue_type] || ISSUE_TYPES.task;
                      const pr = PRIORITIES[issue.priority] || PRIORITIES.medium;
                      return (
                        <div key={issue.id} className="rm-backlog-row" onClick={() => { setEditingIssueId(issue.id); setShowIssueModal(true); }}>
                          <span className="rm-backlog-type" style={{ color: it.color }}>{it.icon}</span>
                          <span className="rm-backlog-key">{issue.issue_key}</span>
                          <span className="rm-backlog-title">{issue.title}</span>
                          <span className="rm-backlog-priority" style={{ color: pr.color }}>{pr.icon}</span>
                          {issue.story_points > 0 && <span className="rm-story-pts">{issue.story_points}</span>}
                          {issue.assigned_username && (
                            <div className="rm-assigned-user" title={issue.assigned_username}>
                              {issue.assigned_avatar ? (
                                <img src={issue.assigned_avatar} alt={issue.assigned_username} className="rm-avatar-img" />
                              ) : (
                                <div className="rm-avatar-sm">{issue.assigned_username.charAt(0).toUpperCase()}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Planning Sprints */}
              {sprints.filter(s => s.status === 'planning').map(sprint => (
                <div key={sprint.id} className="rm-backlog-section">
                  <div className="rm-backlog-header">
                    <div className="rm-backlog-header-left">
                      <h3>{sprint.name}</h3>
                      <span className="rm-status-badge planning">Planificación</span>
                      <span className="rm-issue-count">{issues.filter(i => i.sprint_id === sprint.id).length} tareas</span>
                    </div>
                    <div className="rm-backlog-header-right">
                      <button className="rm-action-btn" onClick={() => handleStartSprint(sprint.id)}><FiPlay size={12} /> Iniciar</button>
                      <button className="rm-action-btn danger" onClick={() => handleDeleteSprint(sprint.id)}><FiTrash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="rm-backlog-issues"
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                    onDragLeave={e => {
                      if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) {
                        e.currentTarget.classList.remove('drag-over');
                      }
                    }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over');
                      try { const data = JSON.parse(e.dataTransfer.getData('text/plain')); if (data.backlogIssueId) handleMoveToSprint([data.backlogIssueId], sprint.id); } catch (err) { /* */ } }}>
                    {issues.filter(i => i.sprint_id === sprint.id).map(issue => {
                      const it = ISSUE_TYPES[issue.issue_type] || ISSUE_TYPES.task;
                      const pr = PRIORITIES[issue.priority] || PRIORITIES.medium;
                      return (
                        <div key={issue.id} className="rm-backlog-row" onClick={() => { setEditingIssueId(issue.id); setShowIssueModal(true); }}>
                          <span className="rm-backlog-type" style={{ color: it.color }}>{it.icon}</span>
                          <span className="rm-backlog-key">{issue.issue_key}</span>
                          <span className="rm-backlog-title">{issue.title}</span>
                          <span className="rm-backlog-priority" style={{ color: pr.color }}>{pr.icon}</span>
                          {issue.story_points > 0 && <span className="rm-story-pts">{issue.story_points}</span>}
                          {issue.assigned_username && (
                            <div className="rm-assigned-user" title={issue.assigned_username}>
                              {issue.assigned_avatar ? (
                                <img src={issue.assigned_avatar} alt={issue.assigned_username} className="rm-avatar-img" />
                              ) : (
                                <div className="rm-avatar-sm">{issue.assigned_username.charAt(0).toUpperCase()}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {issues.filter(i => i.sprint_id === sprint.id).length === 0 && <p className="rm-backlog-empty">Arrastra tareas aquí desde el backlog</p>}
                  </div>
                </div>
              ))}

              {/* Backlog (unassigned) */}
              <div className="rm-backlog-section">
                <div className="rm-backlog-header">
                  <div className="rm-backlog-header-left">
                    <h3>Backlog</h3>
                    <span className="rm-issue-count">{backlog.length} tareas</span>
                  </div>
                  <div className="rm-backlog-header-right">
                    <button className="rm-action-btn" onClick={() => { setPreselectedColumnId(columns[0]?.id); setEditingIssueId(null); setShowIssueModal(true); }}>
                      <FiPlus size={12} /> Nueva Tarea
                    </button>
                    <button className="rm-action-btn" onClick={() => setShowSprintForm(true)}><FiPlus size={12} /> Nuevo Sprint</button>
                  </div>
                </div>

                {showSprintForm && (
                  <div className="rm-sprint-form">
                    <input placeholder="Nombre del sprint" value={sprintForm.name} onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                    <input placeholder="Objetivo (opcional)" value={sprintForm.goal} onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))} />
                    <div className="rm-sprint-form-dates">
                      <label>Inicio: <input type="date" value={sprintForm.start_date} onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))} /></label>
                      <label>Fin: <input type="date" value={sprintForm.end_date} onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))} /></label>
                    </div>
                    <div className="rm-sprint-form-btns">
                      <button className="rm-btn-primary" onClick={handleCreateSprint}><FiCheck size={12} /> Crear</button>
                      <button className="rm-btn-secondary" onClick={() => setShowSprintForm(false)}><FiX size={12} /></button>
                    </div>
                  </div>
                )}

                <div className="rm-backlog-issues">
                  {backlog.map(issue => {
                    const it = ISSUE_TYPES[issue.issue_type] || ISSUE_TYPES.task;
                    const pr = PRIORITIES[issue.priority] || PRIORITIES.medium;
                    return (
                      <div key={issue.id} className="rm-backlog-row" draggable
                        onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ backlogIssueId: issue.id }))}
                        onClick={() => { setEditingIssueId(issue.id); setShowIssueModal(true); }}>
                        <span className="rm-backlog-type" style={{ color: it.color }}>{it.icon}</span>
                        <span className="rm-backlog-key">{issue.issue_key}</span>
                        <span className="rm-backlog-title">{issue.title}</span>
                        <span className="rm-backlog-priority" style={{ color: pr.color }}>{pr.icon}</span>
                        {issue.story_points > 0 && <span className="rm-story-pts">{issue.story_points}</span>}
                        {issue.assigned_username && (
                          <div className="rm-assigned-user" title={issue.assigned_username}>
                           {issue.assigned_avatar ? (
                             <img src={issue.assigned_avatar} alt={issue.assigned_username} className="rm-avatar-img" />
                           ) : (
                             <div className="rm-avatar-sm">{issue.assigned_username.charAt(0).toUpperCase()}</div>
                           )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {backlog.length === 0 && <p className="rm-backlog-empty">No hay tareas en el backlog</p>}
                </div>
              </div>
            </div>
          )}

          {/* SPRINTS VIEW */}
          {activeView === 'sprints' && (
            <div>
              <div className="rm-sprints-header">
                <h2><FiRepeat size={20} /> Gestión de Sprints</h2>
                <button className="rm-action-btn" onClick={() => setShowSprintForm(true)}><FiPlus size={14} /> Nuevo Sprint</button>
              </div>
              {showSprintForm && (
                <div className="rm-sprint-form standalone">
                  <input placeholder="Nombre del sprint" value={sprintForm.name} onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  <input placeholder="Objetivo" value={sprintForm.goal} onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))} />
                  <div className="rm-sprint-form-dates">
                    <label>Inicio: <input type="date" value={sprintForm.start_date} onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))} /></label>
                    <label>Fin: <input type="date" value={sprintForm.end_date} onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))} /></label>
                  </div>
                  <div className="rm-sprint-form-btns">
                    <button className="rm-btn-primary" onClick={handleCreateSprint}><FiCheck size={14} /> Crear Sprint</button>
                    <button className="rm-btn-secondary" onClick={() => setShowSprintForm(false)}><FiX size={14} /> Cancelar</button>
                  </div>
                </div>
              )}
              <div className="rm-sprints-grid">
                {sprints.map(sprint => {
                  const progress = sprint.issue_count > 0 ? Math.round((sprint.done_count / sprint.issue_count) * 100) : 0;
                  return (
                    <div key={sprint.id} className={`rm-sprint-card-view sprint-${sprint.status}`}>
                      <div className="rm-sprint-card-header">
                        <h3>{sprint.name}</h3>
                        <span className={`rm-status-badge ${sprint.status}`}>{sprint.status}</span>
                      </div>
                      {sprint.goal && <p className="rm-sprint-goal">{sprint.goal}</p>}
                      <div className="rm-sprint-card-stats">
                        <div className="rm-sprint-stat"><label>Tareas</label><span>{sprint.done_count}/{sprint.issue_count}</span></div>
                        <div className="rm-sprint-stat"><label>Puntos</label><span>{sprint.done_points}/{sprint.total_points}</span></div>
                        {sprint.velocity > 0 && <div className="rm-sprint-stat"><label>Velocidad</label><span>{sprint.velocity} pts</span></div>}
                      </div>
                      <div className="rm-sprint-card-progress">
                        <div className="rm-progress-bar"><div className="rm-progress-fill" style={{ width: `${progress}%`, background: '#22c55e' }} /></div>
                        <span>{progress}%</span>
                      </div>
                      {(sprint.start_date || sprint.end_date) && (
                        <div className="rm-sprint-card-dates">
                          {sprint.start_date && <span><FiCalendar size={11} /> {new Date(sprint.start_date).toLocaleDateString('es-ES')}</span>}
                          {sprint.end_date && <span>→ {new Date(sprint.end_date).toLocaleDateString('es-ES')}</span>}
                        </div>
                      )}
                      <div className="rm-sprint-card-actions">
                        {sprint.status === 'planning' && (
                          <>
                            <button onClick={() => handleStartSprint(sprint.id)}><FiPlay size={12} /> Iniciar</button>
                            <button className="danger" onClick={() => handleDeleteSprint(sprint.id)}><FiTrash2 size={12} /></button>
                          </>
                        )}
                        {sprint.status === 'active' && (
                          <>
                            <button onClick={() => handleCompleteSprint(sprint.id)}><FiCheck size={12} /> Completar</button>
                            <button onClick={() => handleFetchBurndown(sprint.id)}><FiTrendingUp size={12} /> Burndown</button>
                          </>
                        )}
                        {sprint.status === 'completed' && sprint.velocity > 0 && (
                          <button onClick={() => handleFetchBurndown(sprint.id)}><FiTrendingUp size={12} /> Ver Burndown</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sprints.length === 0 && (
                  <div className="rm-empty"><FiRepeat size={48} /><h2>Sin sprints</h2><p>Crea un sprint para organizar el trabajo</p></div>
                )}
              </div>
            </div>
          )}

          {/* TIMELINE VIEW */}
          {activeView === 'timeline' && (
            <TimelineView issues={issues} columns={columns} sprints={sprints} epics={epics}
              onEditIssue={(issue) => { setEditingIssueId(issue.id); setShowIssueModal(true); }}
              t={t} />
          )}

          {/* EPICS VIEW */}
          {activeView === 'epics' && (
            <div>
              <div className="rm-epics-header">
                <h2><FiZap size={20} /> Epics</h2>
                <button className="rm-action-btn" onClick={() => { setEditingIssueId(null); setPreselectedColumnId(columns[0]?.id); setPreselectedIssueType('epic'); setShowIssueModal(true); }}>
                  <FiPlus size={14} /> Nuevo Epic
                </button>
              </div>
              <div className="rm-epics-grid">
                {epics.map(epic => {
                  const progress = epic.child_count > 0 ? epic.progress : 0;
                  return (
                    <div key={epic.id} className="rm-epic-card" onClick={() => { setEditingIssueId(epic.id); setShowIssueModal(true); }}>
                      <div className="rm-epic-card-header">
                        <span className="rm-epic-key">{epic.issue_key}</span>
                        <h3>{epic.title}</h3>
                      </div>
                      {epic.description && <p className="rm-epic-desc">{epic.description?.substring(0, 120)}</p>}
                      <div className="rm-epic-stats">
                        <span>{epic.child_count || 0} tareas</span>
                        <span>{epic.done_count || 0} completadas</span>
                        <span>{epic.total_points || 0} puntos</span>
                      </div>
                      <div className="rm-epic-progress-bar">
                        <div className="rm-progress-fill" style={{ width: `${progress}%`, background: '#904ee2' }} />
                      </div>
                      <span className="rm-epic-progress-text">{progress}% completado</span>
                    </div>
                  );
                })}
                {epics.length === 0 && (
                  <div className="rm-empty"><FiZap size={48} /><h2>Sin epics</h2><p>Crea un epic para agrupar tareas relacionadas</p></div>
                )}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
      {showInsights && insights && (
        <div className="rm-modal-overlay" onClick={() => setShowInsights(false)}>
          <div className="rm-modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div className="rm-modal-header-left"><FiCpu size={16} /><h2>AI Insights</h2></div>
              <button className="rm-modal-close" onClick={() => setShowInsights(false)}><FiX size={20} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              {insightsSummary && (
                <div className="rm-time-summary" style={{ marginBottom: '1rem' }}>
                  <div className="rm-time-stat"><label>Total</label><span>{insightsSummary.total}</span></div>
                  <div className="rm-time-stat"><label>Hechas</label><span style={{ color: '#22c55e' }}>{insightsSummary.done}</span></div>
                  <div className="rm-time-stat"><label>Vencidas</label><span style={{ color: '#f59e0b' }}>{insightsSummary.overdue}</span></div>
                  <div className="rm-time-stat"><label>En riesgo</label><span style={{ color: '#ef4444' }}>{insightsSummary.atRisk}</span></div>
                </div>
              )}
              {insights.length === 0 && <p style={{ textAlign: 'center', color: 'var(--rm-text-secondary)' }}><FiCheckCircle size={14} style={{ color: '#22c55e' }} /> Todo al día. Sin alertas.</p>}
              {insights.map((ins, i) => (
                <div key={i} style={{ padding: '0.5rem 0.75rem', borderLeft: `3px solid ${ins.severity === 'high' ? '#ef4444' : ins.severity === 'medium' ? '#f59e0b' : '#6b7280'}`, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {ins.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== AI COMMAND MODAL ========== */}
      {showAIModal && (
        <div className="rm-modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="rm-modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div className="rm-modal-header-left"><FiCpu size={16} /><h2>AI Assistant</h2></div>
              <button className="rm-modal-close" onClick={() => setShowAIModal(false)}><FiX size={20} /></button>
            </div>
            <div className="rm-ai-modal-content">
              <p style={{ fontSize: '0.85rem', color: 'var(--rm-text-secondary)', marginBottom: '1rem' }}>
                Usa comandos naturales: "Crea un epic para el rediseño", "Añade 3 historias de usuario", "Mueve la tarea X a done"...
              </p>
              <div className="rm-ai-input-row">
                <input placeholder="Escribe un comando..." value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAICommand()} disabled={aiLoading} autoFocus />
                <button onClick={handleAICommand} disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? <div className="rm-ai-spinner" /> : <FiSend size={16} />} Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== BURNDOWN MODAL ========== */}
      {showBurndown && burndownData && (
        <div className="rm-modal-overlay" onClick={() => setShowBurndown(false)}>
          <div className="rm-modal rm-burndown-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div className="rm-modal-header-left"><FiTrendingUp size={16} /><h2>Burndown - {burndownData.sprint?.name}</h2></div>
              <button className="rm-modal-close" onClick={() => setShowBurndown(false)}><FiX size={20} /></button>
            </div>
            <div className="rm-burndown-content">
              {burndownData.burndown.length > 0 ? (
                <div className="rm-burndown-chart">
                  <svg viewBox={`0 0 ${burndownData.burndown.length * 80} 200`} className="rm-burndown-svg">
                    <line x1="20" y1="20" x2={burndownData.burndown.length * 80 - 20} y2="180" stroke="var(--rm-text-secondary)" strokeWidth="1" strokeDasharray="5,5" />
                    <polyline fill="none" stroke="#4b9cdb" strokeWidth="2"
                      points={burndownData.burndown.map((d, i) => {
                        const maxPts = Math.max(...burndownData.burndown.map(b => b.remaining_points + b.completed_points), 1);
                        const x = 20 + i * (burndownData.burndown.length > 1 ? (burndownData.burndown.length * 80 - 40) / (burndownData.burndown.length - 1) : 0);
                        const y = 180 - (d.remaining_points / maxPts) * 160;
                        return `${x},${y}`;
                      }).join(' ')} />
                    {burndownData.burndown.map((d, i) => {
                      const maxPts = Math.max(...burndownData.burndown.map(b => b.remaining_points + b.completed_points), 1);
                      const x = 20 + i * (burndownData.burndown.length > 1 ? (burndownData.burndown.length * 80 - 40) / (burndownData.burndown.length - 1) : 0);
                      const y = 180 - (d.remaining_points / maxPts) * 160;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="4" fill="#4b9cdb" />
                          <text x={x} y="198" textAnchor="middle" fontSize="10" fill="var(--rm-text-secondary)">
                            {new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </text>
                          <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="var(--rm-text)">{d.remaining_points}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <p className="rm-loading-text">Sin datos de burndown. Se generan diariamente durante el sprint.</p>
              )}
              <div className="rm-burndown-stats">
                <div className="rm-burndown-stat">
                  <label>Estado</label>
                  <span className={`rm-status-badge ${burndownData.sprint?.status}`}>{burndownData.sprint?.status}</span>
                </div>
                {burndownData.sprint?.velocity > 0 && (
                  <div className="rm-burndown-stat"><label>Velocidad</label><span>{burndownData.sprint.velocity} puntos</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <IssueModal
          issue={editingIssue} columns={columns} members={members} sprints={sprints} epics={epics}
          onSave={handleSaveIssue} 
          onUpdate={() => fetchProjectData(selectedProjectId)}
          onClose={() => { setShowIssueModal(false); setEditingIssueId(null); setPreselectedIssueType(null); }}
          onLinkDocument={handleLinkDocument} onUnlinkDocument={handleUnlinkDocument} projectId={selectedProjectId}
          initialIssueType={preselectedIssueType} />
      )}

      {/* Delete Project Modal */}
      {showDeleteProjectModal && (
        <div className="rm-modal-overlay">
          <div className="rm-modal" style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh', padding: '24px' }}>
            <div className="rm-modal-header" style={{ borderBottom: '1px solid var(--rm-border)', marginBottom: '16px', paddingBottom: '16px' }}>
              <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0 }}>
                <FiAlertTriangle /> Eliminar Proyecto
              </h2>
              <button className="rm-modal-close" onClick={() => setShowDeleteProjectModal(false)}><FiX /></button>
            </div>
            <div className="rm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--rm-text-primary)' }}>
                Esta acción es <strong>irreversible</strong>. Se eliminarán todas las tareas, columnas, sprints y configuraciones asociadas al proyecto <strong>{selectedProject?.name}</strong>.
              </p>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--rm-text-secondary)', fontSize: '0.9rem' }}>
                  Para confirmar, escribe <strong>{selectedProject?.name}</strong> a continuación:
                </label>
                <input 
                  type="text"
                  value={deleteConfirmationName}
                  onChange={e => setDeleteConfirmationName(e.target.value)}
                  placeholder="Nombre del proyecto"
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    background: 'var(--rm-input-bg)', 
                    border: '1px solid var(--rm-input-border)', 
                    color: 'var(--rm-text-primary)',
                    borderRadius: '6px'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  onClick={() => setShowDeleteProjectModal(false)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    background: 'transparent', 
                    border: '1px solid var(--rm-border)', 
                    color: 'var(--rm-text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteProjectConfirm}
                  disabled={deleteConfirmationName !== selectedProject?.name}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    background: deleteConfirmationName === selectedProject?.name ? '#ef4444' : 'var(--rm-border)', 
                    color: 'white',
                    border: 'none',
                    cursor: deleteConfirmationName === selectedProject?.name ? 'pointer' : 'not-allowed',
                    opacity: deleteConfirmationName === selectedProject?.name ? 1 : 0.5
                  }}
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {showShareModal && selectedProjectId && (
        <div className="rm-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="rm-modal rm-share-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div className="rm-modal-header-left"><FiUser size={16} /><h2>Compartir proyecto</h2></div>
              <button className="rm-modal-close" onClick={() => setShowShareModal(false)}><FiX size={20} /></button>
            </div>
            <div className="rm-share-content">
              <div className="rm-share-search-box">
                <FiSearch size={14} />
                <input placeholder="Buscar usuarios..." value={shareSearch} onChange={e => setShareSearch(e.target.value)} autoFocus />
              </div>

              {/* Current Members */}
              <div className="rm-share-section">
                <h3 className="rm-share-section-title">Miembros actuales ({members.length})</h3>
                <div className="rm-share-list">
                  {members.map(m => (
                    <div key={m.user_id} className="rm-share-user-item">
                      <div className="rm-avatar-sm">{(m.username || '?').charAt(0).toUpperCase()}</div>
                      <div className="rm-share-user-info">
                        <span className="rm-share-username">{m.username}</span>
                        <span className="rm-share-role">{m.role === 'owner' ? 'Propietario' : m.role === 'admin' ? 'Admin' : 'Miembro'}</span>
                      </div>
                      {m.role !== 'owner' && m.user_id !== currentUserId && (
                        <button className="rm-share-remove-btn" onClick={() => handleRemoveMember(m.user_id)} title="Eliminar">
                          <FiX size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Members */}
              <div className="rm-share-section">
                <h3 className="rm-share-section-title">Añadir personas</h3>
                <div className="rm-share-list">
                  {allUsers
                    .filter(u => !members.some(m => m.user_id === u.id))
                    .filter(u => !shareSearch || u.username.toLowerCase().includes(shareSearch.toLowerCase()) || (u.email && u.email.toLowerCase().includes(shareSearch.toLowerCase())))
                    .map(u => (
                      <div key={u.id} className="rm-share-user-item">
                        <div className="rm-avatar-sm">{u.username.charAt(0).toUpperCase()}</div>
                        <div className="rm-share-user-info">
                          <span className="rm-share-username">{u.username}</span>
                          {u.email && <span className="rm-share-email">{u.email}</span>}
                        </div>
                        <button className="rm-share-add-btn" onClick={() => handleAddMember(u.id)} title="Añadir">
                          <FiPlus size={14} />
                        </button>
                      </div>
                    ))}
                  {allUsers.filter(u => !members.some(m => m.user_id === u.id)).filter(u => !shareSearch || u.username.toLowerCase().includes(shareSearch.toLowerCase())).length === 0 && (
                    <p className="rm-share-empty">No hay usuarios disponibles</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          isDarkMode={isDarkMode}
          onThemeToggle={onThemeToggle}
        />
      )}

      {/* ========== NEW PROJECT MODAL ========== */}
      {showNewProject && canCreate && (
        <div className="rm-modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="rm-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div className="rm-modal-header-left"><FiFolder size={16} /><h2>Nuevo Proyecto</h2></div>
              <button className="rm-modal-close" onClick={() => setShowNewProject(false)}><FiX size={20} /></button>
            </div>
            <div className="rm-new-project-modal-content">
              <div className="rm-form-group">
                <label>Nombre del proyecto</label>
                <input placeholder="Mi proyecto" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} autoFocus />
              </div>
              <div className="rm-form-group">
                <label>Descripción (opcional)</label>
                <input placeholder="Breve descripción..." value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
              </div>
              <div className="rm-form-group">
                <label>Tipo de proyecto</label>
                <div className="rm-project-type-selector">
                  <label className={`rm-type-option ${newProjectType === 'personal' ? 'active' : ''}`}
                    onClick={() => setNewProjectType('personal')}>
                    <input type="radio" name="projectType" checked={newProjectType === 'personal'} onChange={() => setNewProjectType('personal')} />
                    <FiLock size={14} /> Personal
                  </label>
                  <label className={`rm-type-option ${newProjectType === 'general' ? 'active' : ''}`}
                    onClick={() => setNewProjectType('general')}>
                    <input type="radio" name="projectType" checked={newProjectType === 'general'} onChange={() => setNewProjectType('general')} />
                    <FiGlobe size={14} /> General
                  </label>
                </div>
              </div>
              <div className="rm-form-actions" style={{ marginTop: '1rem' }}>
                <button className="rm-btn-secondary" onClick={() => setShowNewProject(false)}><FiX size={14} /> Cancelar</button>
                <button className="rm-btn-primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                  <FiCheck size={14} /> Crear Proyecto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
