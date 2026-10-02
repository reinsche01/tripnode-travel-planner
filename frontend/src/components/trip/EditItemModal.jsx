import { useState } from 'react';
import { useTripStore } from '../../store/tripStore';
import { useUIStore } from '../../store/uiStore';

/**
 * Modal to edit an itinerary item's time, notes, or lock/unlock status.
 */
export default function EditItemModal({ item, tripId, onClose }) {
  const { updateItem } = useTripStore();
  const { showToast } = useUIStore();
  const [form, setForm] = useState({
    start_time: item.start_time || '',
    end_time: item.end_time || '',
    notes: item.notes || '',
    status: item.status,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateItem(tripId, item.id, form);
      showToast('Item updated.', 'success');
      onClose();
    } catch {
      showToast('Failed to update item.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md mx-4 p-6 shadow-soft animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-ink">{item.name}</h3>
            <p className="text-xs text-ink-muted mt-0.5">{item.address}</p>
          </div>
          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-ink-muted text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input-field"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input-field"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Add any notes about this place…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Lock toggle — only for suggested items */}
          {item.type === 'suggested' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-surface-muted">
              <div>
                <p className="text-sm font-medium text-ink">Lock this place</p>
                <p className="text-xs text-ink-muted">Locked places won't be replaced by AI</p>
              </div>
              <button
                id={`btn-toggle-lock-${item.id}`}
                onClick={() => setForm(f => ({ ...f, status: f.status === 'locked' ? 'suggested' : 'locked' }))}
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${form.status === 'locked' ? 'bg-amber-400' : 'bg-surface-muted'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.status === 'locked' ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            id="btn-save-edit"
            onClick={handleSave}
            className="btn-primary flex-1 justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
