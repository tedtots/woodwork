import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { format } from 'date-fns';
import API_BASE_URL from '../config/api';
import './UserManagement.css';

function UserManagement({ onClose }) {
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    name: '',
    visibleStages: [],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stages`);
      setStages(response.data.sort((a, b) => a.position - b.position));
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`);
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate client users have at least one visible stage
    if (formData.role === 'client' && (!formData.visibleStages || formData.visibleStages.length === 0)) {
      setError('Οι πελάτες πρέπει να έχουν τουλάχιστον μία ορατή φάση');
      return;
    }
    
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare data to send - ensure visibleStages is an array of numbers
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        name: formData.name,
        visibleStages: Array.isArray(formData.visibleStages) 
          ? formData.visibleStages.map(id => parseInt(id)).filter(id => !isNaN(id))
          : [],
      };

      // Only include password if it's provided (for new users or when updating)
      if (formData.password && formData.password.trim().length > 0) {
        dataToSend.password = formData.password;
      }

      if (editingUser) {
        const response = await axios.put(`${API_BASE_URL}/api/users/${editingUser.id}`, dataToSend);
        setSuccess('Ο χρήστης ενημερώθηκε επιτυχώς!');
      } else {
        // For new users, password is required
        if (!formData.password || formData.password.trim().length < 6) {
          setError('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
          setFormLoading(false);
          return;
        }
        const response = await axios.post(`${API_BASE_URL}/api/auth/register`, dataToSend);
        setSuccess('Ο χρήστης δημιουργήθηκε επιτυχώς!');
      }
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        name: '',
        visibleStages: [],
      });
      setEditingUser(null);
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || error.message || (editingUser ? 'Αποτυχία ενημέρωσης χρήστη' : 'Αποτυχία δημιουργίας χρήστη');
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      name: user.name,
      visibleStages: user.visibleStages || [],
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον χρήστη;')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Αποτυχία διαγραφής χρήστη');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      name: '',
      visibleStages: [],
    });
    setEditingUser(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleStageToggle = (stageId) => {
    const currentStages = formData.visibleStages || [];
    if (currentStages.includes(stageId)) {
      setFormData({
        ...formData,
        visibleStages: currentStages.filter(id => id !== stageId),
      });
    } else {
      setFormData({
        ...formData,
        visibleStages: [...currentStages, stageId],
      });
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Διαχειριστής',
      client: 'Πελάτης',
      user: 'Χρήστης',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Φόρτωση...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Διαχείριση Χρηστών</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="users-content">
          <div className="users-header">
            <h3>Λίστα Χρηστών</h3>
            <button className="add-button" onClick={() => setShowForm(true)}>
              <FaPlus /> Προσθήκη Χρήστη
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="user-form">
              <h4>{editingUser ? 'Επεξεργασία Χρήστη' : 'Νέος Χρήστης'}</h4>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label>Όνομα *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Όνομα Χρήστη *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Κωδικός {editingUser ? '(αφήστε κενό για να παραμείνει ο ίδιος)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={editingUser ? 0 : 6}
                />
              </div>

              <div className="form-group">
                <label>Ρόλος *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="admin">Διαχειριστής</option>
                  <option value="client">Πελάτης</option>
                  <option value="user">Χρήστης</option>
                </select>
              </div>

              {formData.role === 'client' && (
                <div className="form-group">
                  <label>Ορατές Φάσεις *</label>
                  <div className="stages-checkbox-group">
                    {stages.map((stage) => (
                      <label key={stage.id} className="stage-checkbox-label">
                        <input
                          type="checkbox"
                          checked={(formData.visibleStages || []).includes(stage.id)}
                          onChange={() => handleStageToggle(stage.id)}
                        />
                        <span>{stage.title}</span>
                      </label>
                    ))}
                  </div>
                  {stages.length === 0 && (
                    <p className="form-hint">Δεν υπάρχουν διαθέσιμες φάσεις</p>
                  )}
                  {formData.role === 'client' && (!formData.visibleStages || formData.visibleStages.length === 0) && (
                    <p className="error-message">Οι πελάτες πρέπει να έχουν τουλάχιστον μία ορατή φάση.</p>
                  )}
                  <p className="form-hint">Οι πελάτες πρέπει να επιλέξουν τουλάχιστον μία φάση που μπορούν να δουν.</p>
                </div>
              )}

              {formData.role === 'user' && (
                <div className="form-group">
                  <label>Ορατές Φάσεις</label>
                  <div className="stages-checkbox-group">
                    {stages.map((stage) => (
                      <label key={stage.id} className="stage-checkbox-label">
                        <input
                          type="checkbox"
                          checked={(formData.visibleStages || []).includes(stage.id)}
                          onChange={() => handleStageToggle(stage.id)}
                        />
                        <span>{stage.title}</span>
                      </label>
                    ))}
                  </div>
                  {stages.length === 0 && (
                    <p className="form-hint">Δεν υπάρχουν διαθέσιμες φάσεις</p>
                  )}
                  <p className="form-hint">Επιλέξτε τις φάσεις που ο χρήστης μπορεί να δει. Αν δεν επιλεγεί καμία, ο χρήστης θα βλέπει όλες τις φάσεις.</p>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button" disabled={formLoading}>
                  {formLoading ? 'Αποθήκευση...' : editingUser ? 'Ενημέρωση' : 'Δημιουργία'}
                </button>
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Ακύρωση
                </button>
              </div>
            </form>
          )}

          <div className="users-list">
            {users.length === 0 ? (
              <p className="no-items">Δεν υπάρχουν χρήστες</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p><strong>Όνομα Χρήστη:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Ρόλος:</strong> {getRoleLabel(user.role)}</p>
                    {user.visibleStages && user.visibleStages.length > 0 && (
                      <p><strong>Ορατές Φάσεις:</strong> {
                        stages
                          .filter(s => user.visibleStages.includes(s.id))
                          .map(s => s.title)
                          .join(', ')
                      }</p>
                    )}
                    <p><strong>Δημιουργήθηκε:</strong> {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <div className="user-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(user)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(user.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
