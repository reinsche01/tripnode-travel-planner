import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  // Initialize: check if there's an existing session
  init: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem('tripnode_token', session.access_token);
        const { data } = await api.get('/auth/me');
        set({ user: data.user, isLoading: false });
      } else {
        localStorage.removeItem('tripnode_token');
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('tripnode_token', data.token);
    set({ user: data.user });
    return data;
  },

  signup: async (email, password, name) => {
    const { data } = await api.post('/auth/signup', { email, password, name });
    localStorage.setItem('tripnode_token', data.token);
    set({ user: data.user });
    return data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('tripnode_token');
      set({ user: null });
    }
  },
}));

// Initialize auth state on app load
useAuthStore.getState().init();
