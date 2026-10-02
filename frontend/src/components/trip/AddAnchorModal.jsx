import { useState } from 'react';
import { useTripStore } from '../../store/tripStore';
import { useUIStore } from '../../store/uiStore';

/**
 * Add anchor modal — add a locked must-visit place to a specific day.
 */
export default function AddAnchorModal({ tripId, dayCount, onClose }) {
  const { addAnchor } = useTripStore();
  const { showToast } = useUIStore();
  const [form, setForm] = useState({
    name: '',
    address: '',
    day_number: 1,
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      showToast('Name, start time, and end time are required.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await addAnchor(tripId, form);
      showToast(`"${form.name}" locked in! 🔒`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add anchor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md mx-4 p-6 shadow-soft animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-ink">Add Locked Place 🔒</h3>
            <p className="text-xs text-ink-muted mt-0.5">AI will never modify this event</p>
          </div>
          <button
            id="btn-close-anchor-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-ink-muted text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Event / Place Name *</label>
            <input
              id="anchor-name"
              className="input-field"
              placeholder="e.g. Coldplay Concert"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Venue Address</label>
            <input
              id="anchor-address"
              className="input-field"
              placeholder="e.g. GBK Stadium, Jakarta"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Day</label>
            <select
              className="input-field"
              value={form.day_number}
              onChange={e => setForm(f => ({ ...f, day_number: parseInt(e.target.value) }))}
            >
              {Array.from({ length: dayCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time *</label>
              <input
                type="time"
                className="input-field"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input
                type="time"
                className="input-field"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input-field"
              placeholder="e.g. Gate opens at 17:00"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            id="btn-save-anchor"
            onClick={handleSave}
            className="btn-primary flex-1 justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : '🔒 Lock it in'}
          </button>
        </div>
      </div>
    </div>
  );
}
