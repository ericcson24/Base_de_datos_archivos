import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FiUsers, FiPlus, FiTrash2, FiUserPlus, FiX } from 'react-icons/fi';
import './GroupManager.css';

const GroupManager = () => {
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [selectedUsers, setSelectedUsers] = useState({}); // { groupId: userId }
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupId: boolean } to load members on demand if needed, but I'll load them with the group or separately.

  // Actually, the list groups endpoint returns member count. 
  // I should probably fetch members when a group is expanded or just fetch all for now if not too many.
  // Let's fetch members for a group when we want to see them.

  useEffect(() => {
    loadData();
  }, []);

  const fetchWithAuth = async (url, options = {}) => {
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
      // Load users first to ensure we have them for the select
      const usersRes = await fetchWithAuth('/api/users/users');
      if (usersRes.success) setUsers(usersRes.users);

      const groupsRes = await fetchWithAuth('/api/users/groups');
      if (groupsRes.success) {
        setGroups(groupsRes.groups);
        // Pre-load members for all groups
        // Use Promise.allSettled to avoid one failure blocking others
        await Promise.allSettled(groupsRes.groups.map(g => loadGroupMembers(g.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId) => {
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

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    try {
      const res = await fetchWithAuth('/api/users/groups', {
        method: 'POST',
        body: JSON.stringify(newGroup)
      });

      if (res.success) {
        setNewGroup({ name: '', description: '' });
        // Reload groups only
        const groupsRes = await fetchWithAuth('/api/users/groups');
        if (groupsRes.success) {
           setGroups(groupsRes.groups);
           // Load members for the new group (empty initially but consistent)
           // Actually we can just append the new group if the API returned it, 
           // but the API returns { success: true, message: ... }
           // So reloading is safer.
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert(error.message || 'Error creating group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm(t('confirmDeleteGroup') || 'Are you sure you want to delete this group?')) return;

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

  const handleAddMember = async (groupId) => {
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
        alert(res.message);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (groupId, userId) => {
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
          {t('groupManagement') || 'Gestión de Grupos'}
        </h2>
      </div>

      <div className="create-group-form">
        <form onSubmit={handleCreateGroup}>
          <div className="form-row">
            <div className="form-group">
              <label>{t('groupName') || 'Nombre del Grupo'}</label>
              <input
                type="text"
                className="form-input"
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Ej: Montadores"
              />
            </div>
            <div className="form-group">
              <label>{t('description') || 'Descripción'}</label>
              <input
                type="text"
                className="form-input"
                value={newGroup.description}
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <button type="submit" className="btn-primary">
              <FiPlus /> {t('createGroup') || 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <FiUsers size={48} />
          <p>{t('noGroups') || 'No hay grupos creados'}</p>
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
                    title="Eliminar grupo"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              
              <div className="group-card-body">
                <div className="members-section">
                  <div className="members-header">
                    <h4>{t('members') || 'Miembros'} ({group.members?.length || 0})</h4>
                  </div>
                  
                  <div className="members-list">
                    {group.members && group.members.map(member => (
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
                        {t('noMembers') || 'Sin miembros'}
                      </p>
                    )}
                  </div>

                  <div className="add-member-form">
                    <select 
                      className="member-select"
                      value={selectedUsers[group.id] || ''}
                      onChange={e => setSelectedUsers({ ...selectedUsers, [group.id]: e.target.value })}
                    >
                      <option value="">{t('selectUser') || 'Seleccionar usuario...'}</option>
                      {users
                        .filter(u => !group.members?.some(m => m.id === u.id))
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
