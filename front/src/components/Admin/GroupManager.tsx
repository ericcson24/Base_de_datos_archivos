'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FiUsers, FiPlus, FiTrash2, FiUserPlus, FiX } from 'react-icons/fi';
import './GroupManager.css';

const GroupManager = () => {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');


  useEffect(() => {
    loadData();
  }, []);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }
      return res.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetchWithAuth('/api/users/users');
      if (usersRes.success) setUsers(usersRes.users);

      const groupsRes = await fetchWithAuth('/api/users/groups');
      if (groupsRes.success) {
        setGroups(groupsRes.groups);
        await Promise.allSettled(groupsRes.groups.map((g: any) => loadGroupMembers(g.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: any) => {
    try {
      const res = await fetchWithAuth(`/api/users/groups/${groupId}/members`);
      if (res.success) {
        setGroups(prev => prev.map(g =>
          g.id === groupId ? { ...g, members: res.members } : g
        ));
      }
    } catch (error) {
      console.error(`Error loading members for group ${groupId}:`, error);
    }
  };

  const handleCreateGroup = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    const name = (newGroup.name || '').trim();
    const description = (newGroup.description || '').trim();
    if (!name) {
      setErrorMsg(t('admin.groupNameRequired') || 'El nombre del grupo es obligatorio');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/users/groups', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });

      if (res.success) {
        setNewGroup({ name: '', description: '' });
        setSuccessMsg(t('admin.groupCreated') || 'Grupo creado correctamente');
        setTimeout(() => setSuccessMsg(''), 3000);
        await loadData();
      } else {
        setErrorMsg(res.message || t('admin.errorCreatingGroup') || 'Error creating group');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      setErrorMsg(error.message || t('admin.errorCreatingGroup') || 'Error creating group');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleDeleteGroup = async (groupId: any) => {
    if (!window.confirm(t('admin.confirmDeleteGroup') || 'Are you sure you want to delete this group?')) return;

    try {
      const res = await fetchWithAuth(`/api/users/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleAddMember = async (groupId: any) => {
    const userId = selectedUsers[groupId];
    if (!userId) return;

    try {
      const res = await fetchWithAuth(`/api/users/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });

      if (res.success) {
        loadGroupMembers(groupId);
        setSelectedUsers(prev => ({ ...prev, [groupId]: '' }));
      } else {
        setErrorMsg(res.message || t('admin.errorAddingMember') || 'Error adding member');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (groupId: any, userId: any) => {
    try {
      const res = await fetchWithAuth(`/api/users/groups/${groupId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        loadGroupMembers(groupId);
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <div className="group-manager-container">
      <div className="group-manager-header">
        <h2 className="group-manager-title">
          <FiUsers style={{ marginRight: '10px' }} />
          {t('admin.groupManagement') || 'Gestión de Grupos'}
        </h2>
      </div>

      <div className="create-group-form">
        <form onSubmit={handleCreateGroup} autoComplete="off">
          <div className="form-row">
            <div className="form-group">
              <label>{t('admin.groupName') || 'Nombre del Grupo'}</label>
              <input
                type="text"
                className="form-input"
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGroup(e); } }}
                placeholder={t('admin.groupNamePlaceholder') || 'Ej: Montadores'}
              />
            </div>
            <div className="form-group">
              <label>{t('admin.description') || 'Descripción'}</label>
              <input
                type="text"
                className="form-input"
                value={newGroup.description}
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGroup(e); } }}
                placeholder={t('admin.descriptionPlaceholder') || 'Descripción opcional'}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreateGroup}
            >
              <FiPlus /> {t('admin.createGroup') || 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontWeight: 500,
          fontSize: '14px',
          background: 'rgba(52, 199, 89, 0.12)',
          color: '#34c759',
          border: '1px solid rgba(52, 199, 89, 0.25)'
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontWeight: 500,
          fontSize: '14px',
          background: 'rgba(255, 59, 48, 0.1)',
          color: '#ff3b30',
          border: '1px solid rgba(255, 59, 48, 0.2)'
        }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 0',
          color: 'var(--text-secondary)',
          fontSize: '15px',
          gap: '10px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></span>
          {t('common.loading') || 'Loading...'}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <FiUsers size={48} />
          <p>{t('admin.noGroups') || 'No hay grupos creados'}</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-card-header">
                <div className="group-info">
                  <h3>{group.name}</h3>
                  <p className="group-desc">{group.description}</p>
                </div>
                <div className="group-actions">
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDeleteGroup(group.id)}
                    title={t('common.delete')}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className="group-card-body">
                <div className="members-section">
                  <div className="members-header">
                    <h4>{t('admin.members') || 'Miembros'} ({group.members?.length || 0})</h4>
                  </div>

                  <div className="members-list">
                    {group.members && group.members.map((member: any) => (
                      <div key={member.id} className="member-item">
                        <div className="member-info">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.username} className="member-avatar" />
                          ) : (
                            <div className="member-avatar-placeholder">
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{member.username}</span>
                        </div>
                        <button
                          className="icon-btn delete"
                          onClick={() => handleRemoveMember(group.id, member.id)}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                    {(!group.members || group.members.length === 0) && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {t('admin.noMembers') || 'Sin miembros'}
                      </p>
                    )}
                  </div>

                  <div className="add-member-form">
                    <select
                      className="member-select"
                      value={selectedUsers[group.id] || ''}
                      onChange={e => setSelectedUsers({ ...selectedUsers, [group.id]: e.target.value })}
                    >
                      <option value="">{t('admin.selectUser') || 'Seleccionar usuario...'}</option>
                      {users
                        .filter(u => !group.members?.some((m: any) => m.id === u.id))
                        .filter(u => u.role !== 'guest')
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))
                      }
                    </select>
                    <button
                      className="btn-primary btn-small"
                      onClick={() => handleAddMember(group.id)}
                      disabled={!selectedUsers[group.id]}
                    >
                      <FiUserPlus />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupManager;
