import React, { useState, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { FaEdit, FaTrash, FaExclamationTriangle, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import './OrdersOverview.css';

function OrdersOverview({ orders, stages, workmen, onOrderClick, onOrderDelete, onOrderUpdate, userRole, userVisibleStages }) {
  const [sortField, setSortField] = useState('due_date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterStage, setFilterStage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = userRole === 'admin';
  
  // Filter visible stages based on user role
  let visibleStages;
  if (isAdmin) {
    visibleStages = stages;
  } else if (userRole === 'client' && userVisibleStages && userVisibleStages.length > 0) {
    // Client users: only show stages they have permission to view
    visibleStages = stages.filter((stage) => userVisibleStages.includes(stage.id));
  } else if (userVisibleStages && userVisibleStages.length > 0) {
    // Regular users with stage permissions
    visibleStages = stages.filter((stage) => userVisibleStages.includes(stage.id));
  } else {
    // Users without specific permissions: show stages with orders
    visibleStages = stages.filter((stage) => orders.some((order) => order.stage_id === stage.id));
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.client_name.toLowerCase().includes(term) ||
          order.description.toLowerCase().includes(term) ||
          (order.workman_name && order.workman_name.toLowerCase().includes(term))
      );
    }

    // Stage filter
    if (filterStage !== 'all') {
      filtered = filtered.filter((order) => order.stage_id === parseInt(filterStage));
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((order) => order.status === filterStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'client_name':
          aValue = a.client_name.toLowerCase();
          bValue = b.client_name.toLowerCase();
          break;
        case 'due_date':
          aValue = new Date(a.due_date);
          bValue = new Date(b.due_date);
          break;
        case 'received_date':
          aValue = new Date(a.received_date);
          bValue = new Date(b.received_date);
          break;
        case 'priority':
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        case 'stage':
          aValue = a.stage_title || '';
          bValue = b.stage_title || '';
          break;
        case 'workman':
          aValue = a.workman_name || '';
          bValue = b.workman_name || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, sortField, sortDirection, filterStage, filterStatus, searchTerm]);

  const getPriorityLabel = (priority) => {
    const labels = ['Low', 'Medium', 'High', 'Urgent'];
    return labels[priority] || 'Low';
  };

  const getPriorityClass = (priority) => {
    if (priority >= 3) return 'priority-urgent';
    if (priority >= 2) return 'priority-high';
    if (priority >= 1) return 'priority-medium';
    return 'priority-low';
  };

  const getDueDateStatus = (dueDate) => {
    const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
    if (daysUntilDue < 0) return { class: 'overdue', text: 'Εκπρόθεσμη' };
    if (daysUntilDue <= 3) return { class: 'urgent', text: 'Επείγουσα' };
    return { class: 'normal', text: '' };
  };

  const handleQuickUpdate = async (orderId, field, value) => {
    if (!isAdmin) return;
    
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const updatedData = {
      client_name: order.client_name,
      description: order.description,
      received_date: order.received_date,
      due_date: order.due_date,
      stage_id: order.stage_id,
      workman_id: order.workman_id || null,
      priority: order.priority || 0,
      status: order.status || 'active',
      [field]: value,
    };

    onOrderUpdate(orderId, updatedData);
  };

  return (
    <div className="orders-overview">
      <div className="overview-header">
        <h2>Επισκόπηση Παραγγελιών</h2>
        <div className="overview-stats">
          <span>Σύνολο: {orders.length}</span>
          <span>Φιλτραρισμένες: {filteredAndSortedOrders.length}</span>
        </div>
      </div>

      <div className="overview-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Αναζήτηση με πελάτη, περιγραφή ή υπεύθυνο έργου..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Φάση:</label>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="filter-select"
          >
            <option value="all">Όλες οι Φάσεις</option>
            {visibleStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.title}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Κατάσταση:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Όλες οι Καταστάσεις</option>
            <option value="active">Ενεργή</option>
            <option value="on-hold">Σε Αναμονή</option>
            <option value="completed">Ολοκληρωμένη</option>
            <option value="cancelled">Ακυρωμένη</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('client_name')} className="sortable">
                Όνομα Πελάτη {getSortIcon('client_name')}
              </th>
              <th>Περιγραφή</th>
              <th onClick={() => handleSort('received_date')} className="sortable">
                Παραλαβή {getSortIcon('received_date')}
              </th>
              <th onClick={() => handleSort('due_date')} className="sortable">
                Ημερομηνία Παράδοσης {getSortIcon('due_date')}
              </th>
              <th onClick={() => handleSort('stage')} className="sortable">
                Φάση {getSortIcon('stage')}
              </th>
              <th onClick={() => handleSort('workman')} className="sortable">
                Υπεύθυνος Έργου {getSortIcon('workman')}
              </th>
              <th onClick={() => handleSort('priority')} className="sortable">
                Προτεραιότητα {getSortIcon('priority')}
              </th>
              <th>Κατάσταση</th>
              <th>Ειδοποίηση</th>
              {isAdmin && <th>Ενέργειες</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOrders.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="no-orders">
                  Δεν βρέθηκαν παραγγελίες
                </td>
              </tr>
            ) : (
              filteredAndSortedOrders.map((order) => {
                const dueDateStatus = getDueDateStatus(order.due_date);
                return (
                  <tr key={order.id} className={order.alert ? 'row-alert' : ''}>
                    <td className="client-cell">
                      <strong>{order.client_name}</strong>
                    </td>
                    <td className="description-cell" title={order.description}>
                      {order.description.length > 50
                        ? `${order.description.substring(0, 50)}...`
                        : order.description}
                    </td>
                    <td>{format(new Date(order.received_date), 'MMM dd, yyyy')}</td>
                    <td className={dueDateStatus.class}>
                      {format(new Date(order.due_date), 'MMM dd, yyyy')}
                      {dueDateStatus.text && (
                        <span className="due-status-badge">{dueDateStatus.text}</span>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={order.stage_id}
                          onChange={(e) => handleQuickUpdate(order.id, 'stage_id', parseInt(e.target.value))}
                          className="quick-edit-select"
                        >
                          {visibleStages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        order.stage_title
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={order.workman_id || ''}
                          onChange={(e) => handleQuickUpdate(order.id, 'workman_id', e.target.value || null)}
                          className="quick-edit-select"
                        >
                          <option value="">Κανένας</option>
                          {workmen.map((workman) => (
                            <option key={workman.id} value={workman.id}>
                              {workman.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        order.workman_name || '-'
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={order.priority}
                          onChange={(e) => handleQuickUpdate(order.id, 'priority', parseInt(e.target.value))}
                          className={`quick-edit-select ${getPriorityClass(order.priority)}`}
                        >
                          <option value={0}>Χαμηλή</option>
                          <option value={1}>Μέτρια</option>
                          <option value={2}>Υψηλή</option>
                          <option value={3}>Επείγουσα</option>
                        </select>
                      ) : (
                        <span className={`priority-badge ${getPriorityClass(order.priority)}`}>
                          {getPriorityLabel(order.priority)}
                        </span>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickUpdate(order.id, 'status', e.target.value)}
                          className="quick-edit-select"
                        >
                          <option value="active">Ενεργή</option>
                          <option value="on-hold">Σε Αναμονή</option>
                          <option value="completed">Ολοκληρωμένη</option>
                          <option value="cancelled">Ακυρωμένη</option>
                        </select>
                      ) : (
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="alert-cell">
                      {order.alert && (
                        <span className="alert-indicator" title="5+ days no progress">
                          <FaExclamationTriangle />
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="actions-cell">
                        <button
                          className="action-button edit-button"
                          onClick={() => onOrderClick(order)}
                          title="Επεξεργασία Παραγγελίας"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={() => onOrderDelete(order.id)}
                          title="Διαγραφή Παραγγελίας"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrdersOverview;
