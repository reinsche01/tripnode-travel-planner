import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';

/**
 * Global toast notification component.
 * Reads from uiStore and renders bottom-right toast with auto-dismiss.
 */
export default function Toast() {
  const { toast } = useUIStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = {
    success: 'border-teal-300 bg-white text-ink',
    error: 'border-red-300 bg-white text-red-700',
    info: 'border-teal-200 bg-teal-50 text-teal-700',
    warning: 'border-amber-300 bg-amber-50 text-amber-700',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl
        border shadow-card-hover max-w-sm
        ${colors[toast.type || 'success']}
        ${visible ? 'animate-slide-in-right' : 'opacity-0'}
      `}
    >
      <span className="text-lg flex-shrink-0">{icons[toast.type || 'success']}</span>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
}
