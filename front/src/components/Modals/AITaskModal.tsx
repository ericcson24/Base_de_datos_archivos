'use client';

import React, { useState, useEffect } from 'react';
import FrostedContainer from '../common/FrostedContainer';
import Button from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getAuthToken } from '../../utils/fileUtils';
import './AITaskModal.css';

interface AITaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  user: any;
}

const AITaskModal = ({ isOpen, onClose, onTaskCreated, user }: AITaskModalProps) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [assignMode, setAssignMode] = useState('me');
  const [targetUserId, setTargetUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user && (user.role === 'admin' || user.role === 'boss')) {
      const fetchData = async () => {
        try {
          const token = getAuthToken();
          const headers = { 'Authorization': `Bearer ${token}` };

          const fetchOptions = { headers };

          const [usersRes, groupsRes] = await Promise.all([
            fetch('/api/users/users', fetchOptions),
            fetch('/api/users/groups', fetchOptions)
          ]);

          if (usersRes.ok) {
            const data = await usersRes.json();
            if (data.success) setUsers(data.users);
          }
          if (groupsRes.ok) {
            const data = await groupsRes.json();
            if (data.success) setGroups(data.groups);
          }
        } catch (error) {
          console.error('Error fetching users/groups:', error);
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      addToast(t('common.required'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/ai/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: prompt,
          assignMode,
          targetUserId,
          groupId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast(data.message || t('calendar.eventCreated'), 'success');
        setPrompt('');
        onTaskCreated();
        onClose();
      } else if (response.status === 429) {
        const retryAfter = data.retryAfter || 10;
        addToast(
          data.error || t('ai.rateLimitError', { seconds: retryAfter }),
          'warning'
        );
      } else {
        addToast(data.error || t('common.error'), 'error');
      }
    } catch (error) {
      console.error('AI Task Error:', error);
      addToast(t('common.networkError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <FrostedContainer
        variant="modal"
        className="ai-task-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <span style={{ marginRight: '10px' }}>✨</span>
            {t('calendar.aiTaskBuilder') || 'Asistente IA de Tareas'}
          </h2>
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <div className="modal-body">
          <div className="ai-task-input-section">
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              {t('calendar.aiTaskHelper') || 'Describe lo que quieres hacer en lenguaje natural. Ej: "Reunión de equipo mañana a las 10am", "Cambia la reunión al viernes", "Elimina el evento de mañana", "Crea una categoría llamada Urgente en rojo".'}
            </p>
            <textarea
              className="ai-prompt-textarea"
              placeholder={t('calendar.aiTaskPlaceholder') || 'Escribe aquí tu tarea...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {(user?.role === 'admin' || user?.role === 'boss') && (
            <div className="ai-task-options">
               <label>{t('calendar.assignTo') || 'Asignar a:'}</label>
               <div className="ai-assign-selector">
                 <select
                    value={assignMode}
                    onChange={(e) => setAssignMode(e.target.value)}
                    disabled={isLoading}
                 >
                   <option value="me">{t('calendar.myself') || 'Mí mismo'}</option>
                   <option value="user">{t('calendar.specificUser') || 'Usuario específico'}</option>
                   <option value="group">{t('calendar.group') || 'Grupo'}</option>
                 </select>
               </div>

               {assignMode === 'user' && (
                 <div className="ai-assign-selector">
                   <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      disabled={isLoading}
                   >
                     <option value="">{t('common.selectUser') || 'Seleccionar usuario'}</option>
                     {users.map(u => (
                       <option key={u.id} value={u.id}>{u.username}</option>
                     ))}
                   </select>
                 </div>
               )}

               {assignMode === 'group' && (
                 <div className="ai-assign-selector">
                   <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      disabled={isLoading}
                   >
                     <option value="">{t('common.selectGroup') || 'Seleccionar grupo'}</option>
                     {groups.map(g => (
                       <option key={g.id} value={g.id}>{g.name}</option>
                     ))}
                   </select>
                 </div>
               )}
            </div>
          )}

          {isLoading && (
            <div className="ai-loading-indicator">
              <div className="ai-loading-spinner"></div>
              <span>{t('calendar.aiProcess') || 'Procesando con IA...'}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>
            {isLoading ? t('common.processing') : (t('calendar.aiSend') || 'Enviar')}
          </Button>
        </div>
      </FrostedContainer>
    </div>
  );
};

export default AITaskModal;
