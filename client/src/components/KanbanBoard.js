import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import OrderCard from './OrderCard';
import './KanbanBoard.css';

function Column({ stage, orders, onOrderClick, userRole, isDraggable }) {
  // Make the column a droppable area
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
  });

  // Sort orders by priority (higher priority first), then by ID for consistency
  const sortedOrders = [...orders].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.id - b.id;
  });

  return (
    <div ref={setNodeRef} className="kanban-column">
      <div className="column-header">
        <h3>{stage.title}</h3>
        <span className="order-count">{orders.length}</span>
      </div>
      <div className="column-content">
        <SortableContext 
          items={sortedOrders.map((o) => o.id)} 
          strategy={verticalListSortingStrategy}
        >
          {sortedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order)}
              isDraggable={isDraggable}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function KanbanBoard({ orders, stages, onOrderClick, onOrderMove, userRole, userVisibleStages }) {
  const [activeId, setActiveId] = useState(null);
  const isAdmin = userRole === 'admin';
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    if (!isAdmin) return;
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    if (!isAdmin) return;
    
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the order being dragged
    const draggedOrder = orders.find((o) => o.id === activeId);
    if (!draggedOrder) return;

    // Check if dropped on a stage column (droppable area)
    if (typeof overId === 'string' && overId.startsWith('stage-')) {
      const stageId = parseInt(overId.replace('stage-', ''));
      const targetStage = stages.find((s) => s.id === stageId);
      if (targetStage && targetStage.id !== draggedOrder.stage_id) {
        // Dropped on a different stage column - move to that stage, keep workman
        onOrderMove(draggedOrder.id, targetStage.id, draggedOrder.workman_id, draggedOrder.priority);
      }
      return;
    }

    // Check if dropped on another order
    const targetOrder = orders.find((o) => o.id === parseInt(overId) || o.id === overId);
    if (targetOrder) {
      // If moved to different stage
      if (targetOrder.stage_id !== draggedOrder.stage_id) {
        onOrderMove(draggedOrder.id, targetOrder.stage_id, draggedOrder.workman_id, draggedOrder.priority);
        return;
      }

      // Reordering within same column
      const activeStage = stages.find((s) => s.id === draggedOrder.stage_id);
      if (!activeStage) return;

      // Get all orders in this stage, sorted by current priority
      const stageOrders = orders
        .filter((o) => o.stage_id === activeStage.id)
        .sort((a, b) => {
          if (b.priority !== a.priority) {
            return b.priority - a.priority;
          }
          return a.id - b.id;
        });

      const oldIndex = stageOrders.findIndex((o) => o.id === activeId);
      const newIndex = stageOrders.findIndex((o) => o.id === parseInt(overId) || o.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(stageOrders, oldIndex, newIndex);
        
        // Update priorities based on new order (higher priority = higher number)
        // First item gets highest priority
        reordered.forEach((order, index) => {
          const newPriority = stageOrders.length - index - 1;
          // Only update if priority actually changed
          if (order.priority !== newPriority) {
            onOrderMove(order.id, order.stage_id, order.workman_id, newPriority);
          }
        });
      }
      return;
    }
  };

  const getOrdersByStage = (stageId) => {
    return orders.filter((order) => order.stage_id === stageId);
  };

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
    visibleStages = stages.filter((stage) => {
      const stageOrders = getOrdersByStage(stage.id);
      return stageOrders.length > 0;
    });
  }

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {visibleStages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            orders={getOrdersByStage(stage.id)}
            onOrderClick={onOrderClick}
            userRole={userRole}
            isDraggable={isAdmin}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <div className="drag-overlay-card">
            <OrderCard order={activeOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
