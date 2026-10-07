import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import TimelineItem from './TimelineItem';

/**
 * Connector line between timeline items showing distance.
 */
function TimelineConnector({ distanceKm }) {
  if (!distanceKm || distanceKm === 0) return <div className="h-2" />;
  return (
    <div className="flex items-center gap-2 py-1 pl-10">
      <div className="w-0.5 h-4 bg-teal-200 mx-auto ml-4" />
      <span className="text-xs text-ink-muted">
        🚗 {distanceKm} km
      </span>
    </div>
  );
}

/**
 * The main sortable timeline for a single day.
 * Handles drag-and-drop reordering via dnd-kit.
 *
 * @param {Array} items - Itinerary items for this day
 * @param {Function} onReorder - Called with new item array after drop
 * @param {Function} onEdit - Called with item when edit clicked
 * @param {Function} onRemove - Called with itemId when remove clicked
 */
export default function Timeline({ items, onReorder, onEdit, onRemove }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeItem = activeId ? items.find(i => i.id === activeId) : null;

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Prevent dropping a suggested item before a locked/hotel item
    const targetItem = items[newIndex];
    if (targetItem && (targetItem.status === 'locked' || targetItem.type === 'hotel')) return;

    onReorder(reordered);
  }

  if (!items || items.length === 0) {
    return (
      <div className="py-10 text-center border-2 border-dashed border-surface-muted rounded-2xl">
        <div className="text-4xl mb-2">✨</div>
        <p className="text-sm text-ink-muted">No items yet. Click <strong>Generate AI</strong> to fill this day.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(i => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1" role="list" aria-label="Itinerary timeline">
          {items.map((item, idx) => (
            <div key={item.id} role="listitem">
              {idx > 0 && (
                <TimelineConnector distanceKm={item.distance_from_prev_km} />
              )}
              <TimelineItem
                item={item}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            </div>
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay — ghost card while dragging */}
      <DragOverlay>
        {activeItem ? (
          <div className="card border-l-4 border-l-teal-400 p-4 shadow-card-hover rotate-2 scale-105 opacity-90">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-lg">📍</div>
              <div>
                <p className="font-semibold text-ink text-sm">{activeItem.name}</p>
                <p className="text-xs text-ink-muted">{activeItem.start_time}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
