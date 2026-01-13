import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { FaTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import './WorkmenManagement.css';

function WorkmenManagement({ onClose, onUpdate }) {
  const [workmen, setWorkmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkman, setEditingWorkman] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchWorkmen();
  }, []);

  const fetchWorkmen = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/workmen`);
      setWorkmen(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workmen:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkman) {
        await axios.put(`${API_BASE_URL}/api/workmen/${editingWorkman.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/workmen`, formData);
      }
      setFormData({ name: '', email: '', phone: '' });
      setEditingWorkman(null);
      setShowForm(false);
      fetchWorkmen();
      onUpdate();
    } catch (error) {
      console.error('Error saving workman:', error);
      alert('Αποτυχία αποθήκευσης εργάτη');
    }
  };

  const handleEdit = (workman) => {
    setEditingWorkman(workman);
    setFormData({
      name: workman.name,
      email: workman.email || '',
      phone: workman.phone || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον εργάτη;')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/workmen/${id}`);
      fetchWorkmen();
      onUpdate();
    } catch (error) {
      console.error('Error deleting workman:', error);
      alert('Αποτυχία διαγραφής εργάτη');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', phone: '' });
    setEditingWorkman(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Φόρτωση...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content workmen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Διαχείριση Εργατών</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="workmen-content">
          <div className="workmen-header">
            <h3>Λίστα Εργατών</h3>
            <button className="add-button" onClick={() => setShowForm(true)}>
              <FaPlus /> Προσθήκη Εργάτη
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="workman-form">
              <h4>{editingWorkman ? 'Επεξεργασία Εργάτη' : 'Νέος Εργάτης'}</h4>
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
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Τηλέφωνο</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-button">
                  {editingWorkman ? 'Ενημέρωση' : 'Δημιουργία'}
                </button>
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Ακύρωση
                </button>
              </div>
            </form>
          )}

          <div className="workmen-list">
            {workmen.length === 0 ? (
              <p className="no-items">Δεν έχουν προστεθεί εργάτες ακόμα</p>
            ) : (
              workmen.map((workman) => (
                <div key={workman.id} className="workman-item">
                  <div className="workman-info">
                    <h4>{workman.name}</h4>
                    {workman.email && <p>{workman.email}</p>}
                    {workman.phone && <p>{workman.phone}</p>}
                  </div>
                  <div className="workman-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(workman)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(workman.id)}
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

export default WorkmenManagement;
