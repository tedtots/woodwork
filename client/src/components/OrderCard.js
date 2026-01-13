import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, differenceInDays } from 'date-fns';
import { FaExclamationTriangle, FaUser, FaCalendarAlt } from 'react-icons/fa';
import './OrderCard.css';

function OrderCard({ order, onClick, isDraggable = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: order.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueDate = new Date(order.due_date);
  const today = new Date();
  const daysUntilDue = differenceInDays(dueDate, today);
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;

  const getPriorityColor = (priority) => {
    if (priority >= 3) return '#dc3545'; // High - red
    if (priority >= 2) return '#ffc107'; // Medium - yellow
    return '#28a745'; // Low - green
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      className={`order-card ${isDragging ? 'dragging' : ''} ${order.alert ? 'alert' : ''} ${!isDraggable ? 'no-drag' : ''}`}
      onClick={onClick}
    >
      {order.alert && (
        <div className="alert-badge">
          <FaExclamationTriangle /> 5+ Ημέρες Χωρίς Πρόοδο
        </div>
      )}
      <div className="order-header">
        <h4 className="order-client">{order.client_name}</h4>
        <div
          className="priority-indicator"
          style={{ backgroundColor: getPriorityColor(order.priority) }}
          title={`Προτεραιότητα: ${order.priority}`}
        />
      </div>
      <p className="order-description">{order.description}</p>
      <div className="order-meta">
        {order.workman_name && (
          <div className="meta-item">
            <FaUser /> {order.workman_name}
          </div>
        )}
        <div className={`meta-item ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}`}>
          <FaCalendarAlt /> {format(dueDate, 'MMM dd, yyyy')}
        </div>
      </div>
      {order.notes_count > 0 && (
        <div className="notes-badge">{order.notes_count} σημείωση{order.notes_count !== 1 ? 'ες' : ''}</div>
      )}
    </div>
  );
}

export default OrderCard;
