import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { FaTimes, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import './OrderModal.css';

function OrderModal({ order, stages, workmen, onClose, onSave, onDelete, userRole }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    client_name: '',
    description: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    stage_id: stages[0]?.id || 1,
    workman_id: '',
    priority: 0,
    status: 'active',
  });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setFormData({
        client_name: order.client_name || '',
        description: order.description || '',
        received_date: order.received_date || format(new Date(), 'yyyy-MM-dd'),
        due_date: order.due_date || format(new Date(), 'yyyy-MM-dd'),
        stage_id: order.stage_id || stages[0]?.id || 1,
        workman_id: order.workman_id || '',
        priority: order.priority || 0,
        status: order.status || 'active',
      });
      fetchNotes();
    }
  }, [order]);

  const fetchNotes = async () => {
    if (!order) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/orders/${order.id}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...formData,
    };
    if (order) {
      onSave(order.id, data);
    } else {
      onSave(data);
    }
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !order) return;
    try {
      await axios.post(`${API_BASE_URL}/api/orders/${order.id}/notes`, {
        content: newNote,
      });
      setNewNote('');
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Αποτυχία προσθήκης σημείωσης');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Διαγραφή αυτής της σημείωσης;')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/notes/${noteId}`);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Αποτυχία διαγραφής σημείωσης');
    }
  };

  const isReadOnly = userRole !== 'admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{order ? 'Επεξεργασία Παραγγελίας' : 'Νέα Παραγγελία'}</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-row">
            <div className="form-group">
              <label>Όνομα Πελάτη *</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="form-group">
              <label>Προτεραιότητα</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                disabled={isReadOnly}
              >
                <option value={0}>Χαμηλή</option>
                <option value={1}>Μέτρια</option>
                <option value={2}>Υψηλή</option>
                <option value={3}>Επείγουσα</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Περιγραφή *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              disabled={isReadOnly}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ημερομηνία Παραλαβής *</label>
              <input
                type="date"
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="form-group">
              <label>Ημερομηνία Παράδοσης *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Φάση *</label>
              <select
                value={formData.stage_id}
                onChange={(e) => setFormData({ ...formData, stage_id: parseInt(e.target.value) })}
                required
                disabled={isReadOnly}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Υπεύθυνος Έργου</label>
              <select
                value={formData.workman_id}
                onChange={(e) => setFormData({ ...formData, workman_id: e.target.value || '' })}
                disabled={isReadOnly}
              >
                <option value="">Κανένας</option>
                {workmen.map((workman) => (
                  <option key={workman.id} value={workman.id}>
                    {workman.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {order && (
            <div className="form-group">
              <label>Κατάσταση</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isReadOnly}
              >
                <option value="active">Ενεργή</option>
                <option value="on-hold">Σε Αναμονή</option>
                <option value="completed">Ολοκληρωμένη</option>
                <option value="cancelled">Ακυρωμένη</option>
              </select>
            </div>
          )}

          {order && order.alert && (
            <div className="alert-warning">
              <FaExclamationTriangle /> Χωρίς πρόοδο για 5+ ημέρες
            </div>
          )}

          {!isReadOnly && (
            <div className="form-actions">
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? 'Αποθήκευση...' : order ? 'Ενημέρωση Παραγγελίας' : 'Δημιουργία Παραγγελίας'}
              </button>
              {order && onDelete && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => onDelete(order.id)}
                >
                  <FaTrash /> Διαγραφή Παραγγελίας
                </button>
              )}
            </div>
          )}
        </form>

        {order && (
          <div className="notes-section">
            <h3>Σημειώσεις</h3>
            <div className="notes-list">
              {notes.map((note) => (
                <div key={note.id} className="note-item">
                  <div className="note-content">{note.content}</div>
                  <div className="note-meta">
                    <span>{note.created_by_name || 'Άγνωστος'}</span>
                    <span>{format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    {(userRole === 'admin' || note.created_by === user?.id) && (
                      <button
                        className="delete-note-button"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notes.length === 0 && <p className="no-notes">Δεν υπάρχουν σημειώσεις ακόμα</p>}
            </div>
            <div className="add-note">
              <textarea
                placeholder="Προσθέστε μια σημείωση..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <button onClick={handleAddNote} disabled={!newNote.trim()}>
                Προσθήκη Σημείωσης
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderModal;
