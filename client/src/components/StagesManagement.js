import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaTimes, FaPlus, FaEdit, FaTrash, FaGripVertical } from 'react-icons/fa';
import './StagesManagement.css';

function SortableStageItem({ stage, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="stage-item">
      <div className="stage-drag-handle" {...attributes} {...listeners}>
        <FaGripVertical />
      </div>
      <div className="stage-info">
        <h4>{stage.title}</h4>
        <span className="stage-position">Θέση: {stage.position}</span>
      </div>
      <div className="stage-actions">
        <button
          className="edit-button"
          onClick={() => onEdit(stage)}
        >
          <FaEdit />
        </button>
        <button
          className="delete-button"
          onClick={() => onDelete(stage.id)}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

function StagesManagement({ onClose, onUpdate }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    position: 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stages`);
      setStages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stages:', error);
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Find indices by comparing IDs
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedStages = arrayMove(stages, oldIndex, newIndex);
    
    // Update positions based on new order
    const updatedStages = reorderedStages.map((stage, index) => ({
      ...stage,
      position: index,
    }));

    setStages(updatedStages);

    // Save to backend
    try {
      await axios.put(`${API_BASE_URL}/api/stages/reorder`, {
        stages: updatedStages.map((s) => ({ id: s.id, position: s.position })),
      });
      fetchStages();
      onUpdate();
    } catch (error) {
      console.error('Error reordering stages:', error);
      alert('Αποτυχία αναδιάταξης φάσεων');
      fetchStages(); // Revert on error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStage) {
        await axios.put(`${API_BASE_URL}/api/stages/${editingStage.id}`, formData);
      } else {
        const maxPosition = Math.max(...stages.map((s) => s.position), -1);
        await axios.post(`${API_BASE_URL}/api/stages`, {
          ...formData,
          position: maxPosition + 1,
        });
      }
      setFormData({ title: '', position: 0 });
      setEditingStage(null);
      setShowForm(false);
      fetchStages();
      onUpdate();
    } catch (error) {
      console.error('Error saving stage:', error);
      alert(error.response?.data?.error || 'Αποτυχία αποθήκευσης φάσης');
    }
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setFormData({
      title: stage.title,
      position: stage.position,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη φάση; Οι παραγγελίες σε αυτή τη φάση θα πρέπει να μετακινηθούν πρώτα.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/stages/${id}`);
      fetchStages();
      onUpdate();
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert(error.response?.data?.error || 'Αποτυχία διαγραφής φάσης');
    }
  };

  const handleCancel = () => {
    setFormData({ title: '', position: 0 });
    setEditingStage(null);
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
      <div className="modal-content stages-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Διαχείριση Φάσεων Παραγωγής</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="stages-content">
          <div className="stages-header">
            <h3>Λίστα Φάσεων</h3>
            <button className="add-button" onClick={() => setShowForm(true)}>
              <FaPlus /> Προσθήκη Φάσης
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="stage-form">
              <h4>{editingStage ? 'Επεξεργασία Φάσης' : 'Νέα Φάση'}</h4>
              <div className="form-group">
                <label>Όνομα Φάσης *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="π.χ., Σχεδιασμός, Συναρμολόγηση, κλπ."
                />
              </div>
              <div className="form-group">
                <label>Θέση</label>
                <input
                  type="number"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                  min="0"
                  disabled={!!editingStage}
                  title={editingStage ? 'Χρησιμοποιήστε drag and drop για αναδιάταξη φάσεων' : ''}
                />
                {editingStage && (
                  <small className="form-hint">Χρησιμοποιήστε drag and drop για αναδιάταξη φάσεων</small>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="save-button">
                  {editingStage ? 'Ενημέρωση' : 'Δημιουργία'}
                </button>
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Ακύρωση
                </button>
              </div>
            </form>
          )}

          <div className="stages-list">
            <p className="drag-hint">💡 Σύρετε τις φάσεις για να τις αναδιατάξετε</p>
            {stages.length === 0 ? (
              <p className="no-items">Δεν έχουν προστεθεί φάσεις ακόμα</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={stages.map((s) => s.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {stages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StagesManagement;
