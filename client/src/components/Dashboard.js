import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from './KanbanBoard';
import OrdersOverview from './OrdersOverview';
import OrderModal from './OrderModal';
import WorkmenManagement from './WorkmenManagement';
import UserManagement from './UserManagement';
import StagesManagement from './StagesManagement';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stages, setStages] = useState([]);
  const [workmen, setWorkmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showWorkmenModal, setShowWorkmenModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStagesModal, setShowStagesModal] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, stagesRes, workmenRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/orders`),
        axios.get(`${API_BASE_URL}/api/stages`),
        axios.get(`${API_BASE_URL}/api/workmen`),
      ]);

      setOrders(ordersRes.data);
      setStages(stagesRes.data);
      setWorkmen(workmenRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleOrderMove = async (orderId, newStageId, newWorkmanId, newPriority) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/move`, {
        stage_id: newStageId,
        workman_id: newWorkmanId,
        priority: newPriority,
      });
      fetchData();
    } catch (error) {
      console.error('Error moving order:', error);
      alert('Αποτυχία μετακίνησης παραγγελίας');
    }
  };

  const handleOrderCreate = async (orderData) => {
    try {
        await axios.post(`${API_BASE_URL}/api/orders`, orderData);
      fetchData();
      setShowOrderModal(false);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Αποτυχία δημιουργίας παραγγελίας');
    }
  };

  const handleOrderUpdate = async (orderId, orderData) => {
    try {
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}`, orderData);
      fetchData();
      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Αποτυχία ενημέρωσης παραγγελίας');
    }
  };

  const handleOrderDelete = async (orderId) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την παραγγελία;')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/orders/${orderId}`);
      fetchData();
      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Αποτυχία διαγραφής παραγγελίας');
    }
  };

  if (loading) {
    return <div className="loading">Φόρτωση...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Εργαστήριο Ξυλουργικής</h1>
          <div className="header-actions">
            <span className="user-info">
              {user.name} ({user.role === 'admin' ? 'Διαχειριστής' : user.role === 'client' ? 'Πελάτης' : 'Χρήστης'})
            </span>
            <div className="view-toggle">
              <button
                className={`view-button ${viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
              <button
                className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Πίνακας
              </button>
            </div>
            {user.role === 'admin' && (
              <>
                <button
                  className="header-button"
                  onClick={() => setShowStagesModal(true)}
                >
                  Διαχείριση Φάσεων
                </button>
                <button
                  className="header-button"
                  onClick={() => setShowWorkmenModal(true)}
                >
                  Διαχείριση Εργατών
                </button>
                <button
                  className="header-button"
                  onClick={() => setShowUserModal(true)}
                >
                  Διαχείριση Χρηστών
                </button>
                <button
                  className="header-button primary"
                  onClick={() => {
                    setSelectedOrder(null);
                    setShowOrderModal(true);
                  }}
                >
                  + Νέα Παραγγελία
                </button>
              </>
            )}
            <button className="header-button" onClick={logout}>
              Αποσύνδεση
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            orders={orders}
            stages={stages}
            workmen={workmen}
            onOrderClick={handleOrderClick}
            onOrderMove={handleOrderMove}
            userRole={user.role}
            userVisibleStages={user.visibleStages}
          />
        ) : (
          <OrdersOverview
            orders={orders}
            stages={stages}
            workmen={workmen}
            onOrderClick={handleOrderClick}
            onOrderDelete={handleOrderDelete}
            onOrderUpdate={handleOrderUpdate}
            userRole={user.role}
            userVisibleStages={user.visibleStages}
          />
        )}
      </main>

      {showOrderModal && (
        <OrderModal
          order={selectedOrder}
          stages={stages}
          workmen={workmen}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
          onSave={selectedOrder ? handleOrderUpdate : handleOrderCreate}
          onDelete={selectedOrder ? handleOrderDelete : null}
          userRole={user.role}
        />
      )}

      {showWorkmenModal && (
        <WorkmenManagement
          onClose={() => setShowWorkmenModal(false)}
          onUpdate={fetchData}
        />
      )}

      {showUserModal && (
        <UserManagement
          onClose={() => setShowUserModal(false)}
        />
      )}

      {showStagesModal && (
        <StagesManagement
          onClose={() => setShowStagesModal(false)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

export default Dashboard;
