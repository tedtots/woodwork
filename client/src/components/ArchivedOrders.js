import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { FaTimes, FaUndo } from 'react-icons/fa';
import API_BASE_URL from '../config/api';
import './ArchivedOrders.css';

function ArchivedOrders({ onClose, onReinstated }) {
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/archived/list`);
      setArchivedOrders(res.data);
    } catch (error) {
      console.error('Error fetching archived orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReinstate = async (orderId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/unarchive`);
      setArchivedOrders((prev) => prev.filter((o) => o.id !== orderId));
      onReinstated();
    } catch (error) {
      console.error('Error reinstating order:', error);
      alert('Failed to reinstate order');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content archived-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Archived Orders</h2>
          <button className="close-button" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="archived-body">
          {loading && <p className="archived-empty">Loading...</p>}
          {!loading && archivedOrders.length === 0 && (
            <p className="archived-empty">No archived orders.</p>
          )}
          {!loading && archivedOrders.map((order) => (
            <div key={order.id} className="archived-row">
              <div className="archived-info">
                <span className="archived-client">{order.client_name}</span>
                <span className="archived-desc">{order.description}</span>
                <span className="archived-meta">
                  {order.stage_title} · Due {format(new Date(order.due_date), 'MMM dd, yyyy')}
                </span>
              </div>
              <button
                className="reinstate-button"
                onClick={() => handleReinstate(order.id)}
                title="Reinstate to Kanban board"
              >
                <FaUndo /> Reinstate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ArchivedOrders;
