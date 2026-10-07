import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import api from '../services/api';

// Read token synchronously on module load — no async delay
const storedToken = localStorage.getItem('tripnode_token');
const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('tripnode_user') || 'null'); }
  catch { return null; }
})();

export const useAuthStore = create((set, get) => ({
  // Pre-populate from localStorage so ProtectedRoute never flashes login on refresh
  user: storedUser,
  token: storedToken,
  // Only show loading spinner if we have a token but not yet validated
  isLoading: !!storedToken && !storedUser,

  // ── Called once at app boot to validate existing session ─────────────────
  init: async () => {
    const { token } = get();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      // Verify token is still valid against backend
      const { data } = await api.get('/auth/me');
      localStorage.setItem('tripnode_user', JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });
    } catch {
      // Token expired or invalid — clear everything
      localStorage.removeItem('tripnode_token');
      localStorage.removeItem('tripnode_user');
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('tripnode_token', data.token);
    localStorage.setItem('tripnode_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data;
  },

  signup: async (email, password, name) => {
    const { data } = await api.post('/auth/signup', { email, password, name });
    localStorage.setItem('tripnode_token', data.token);
    localStorage.setItem('tripnode_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('tripnode_token');
    localStorage.removeItem('tripnode_user');
    set({ user: null, token: null });
  },

  // Update user profile data in memory + localStorage
  setUser: (user) => {
    localStorage.setItem('tripnode_user', JSON.stringify(user));
    set({ user });
  },
}));

