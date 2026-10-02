import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Status badge for a timeline item.
 */
function ItemBadge({ type, status }) {
  if (type === 'hotel') return <span className="badge badge-violet text-2xs">🏨 Hotel</span>;
  if (status === 'locked') return <span className="badge badge-amber text-2xs">🔒 Locked</span>;
  return <span className="badge badge-teal text-2xs">🤖 AI</span>;
}

/**
 * Category icon mapping.
 */
const CATEGORY_ICONS = {
  food: '🍽️',
  culture: '🏛️',
  nature: '🌿',
  shopping: '🛍️',
  entertainment: '🎭',
  wellness: '🧘',
  hotel: '🏨',
  anchor: '📌',
  other: '📍',
};

/**
 * Individual timeline card — sortable via dnd-kit.
 * Locked items cannot be dragged.
 */
export default function TimelineItem({ item, onEdit, onRemove }) {
  const isLocked = item.status === 'locked';
  const isHotel = item.type === 'hotel';
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isLocked, // Locked items are not draggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const borderColor = isHotel
    ? 'border-l-violet-500'
    : isLocked
      ? 'border-l-amber-400'
      : 'border-l-teal-400';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card border-l-4 ${borderColor} p-4 group relative
        ${isDragging ? 'shadow-card-hover rotate-1 scale-105' : 'hover:shadow-card-hover'}
        ${isLocked ? '' : 'hover:-translate-y-0.5'}
        transition-all duration-200 animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle — only for non-locked */}
        {!isLocked && (
          <button
            id={`drag-handle-${item.id}`}
            className="drag-handle mt-1 flex-shrink-0 focus:outline-none"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
            </svg>
          </button>
        )}
        {isLocked && <div className="w-4 flex-shrink-0" />}

        {/* Category icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0
          ${isHotel ? 'bg-violet-100' : isLocked ? 'bg-amber-100' : 'bg-teal-50'}`}>
          {CATEGORY_ICONS[item.category || item.type] || '📍'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm truncate">{item.name}</p>
              {item.start_time && (
                <p className="text-xs text-ink-muted mt-0.5">
                  🕐 {item.start_time}{item.end_time ? `–${item.end_time}` : ''}
                  {item.duration_minutes && ` · ${item.duration_minutes} min`}
                </p>
              )}
            </div>
            <ItemBadge type={item.type} status={item.status} />
          </div>

          {/* Address + distance */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {item.address && (
              <span className="text-xs text-ink-muted truncate max-w-[200px]">
                📍 {item.address.split(',').slice(0, 2).join(',')}
              </span>
            )}
            {item.distance_from_prev_km > 0 && (
              <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                {item.distance_from_prev_km} km
              </span>
            )}
            {item.notes && (
              <span className="text-xs text-ink-muted italic truncate max-w-[180px]">
                "{item.notes}"
              </span>
            )}
          </div>
        </div>

        {/* Photo thumbnail */}
        {item.photo_url && (
          <div className="hidden sm:block w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Action menu */}
        {!isHotel && (
          <div className="relative flex-shrink-0">
            <button
              id={`item-menu-${item.id}`}
              onClick={() => setShowMenu(s => !s)}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-ink-muted"
              aria-label="Item options"
            >
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 card shadow-card-hover py-1 min-w-[130px] animate-fade-in">
                <button
                  onClick={() => { onEdit(item); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle text-ink-secondary"
                >
                  ✏️ Edit
                </button>
                {item.status !== 'locked' && (
                  <button
                    onClick={() => { onRemove(item.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-500"
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
