import { create } from 'zustand';

export const useUIStore = create((set) => ({
  toast: null,
  activeModal: null,

  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 4000);
  },

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}));
