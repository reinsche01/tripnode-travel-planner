import { create } from 'zustand';
import api from '../services/api';

export const useTripStore = create((set, get) => ({
  trips: [],
  currentTrip: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/trips');
      set({ trips: data.trips, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load trips.', isLoading: false });
    }
  },

  fetchTrip: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/trips/${id}`);
      set({ currentTrip: data.trip, isLoading: false });
      return data.trip;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load trip.', isLoading: false });
      return null;
    }
  },

  createTrip: async (tripData) => {
    const { data } = await api.post('/trips', tripData);
    set(state => ({ trips: [data.trip, ...state.trips] }));
    return data.trip;
  },

  updateTrip: async (id, updates) => {
    const { data } = await api.put(`/trips/${id}`, updates);
    set(state => ({
      trips: state.trips.map(t => t.id === id ? data.trip : t),
      currentTrip: state.currentTrip?.id === id ? data.trip : state.currentTrip,
    }));
    return data.trip;
  },

  deleteTrip: async (id) => {
    await api.delete(`/trips/${id}`);
    set(state => ({
      trips: state.trips.filter(t => t.id !== id),
      currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
    }));
  },

  addAnchor: async (tripId, anchorData) => {
    const { data } = await api.post(`/trips/${tripId}/anchors`, anchorData);
    // Refresh the current trip to get updated items
    await get().fetchTrip(tripId);
    return data.item;
  },

  generateAI: async (tripId) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await api.post(`/trips/${tripId}/generate`);
      set({ currentTrip: data.trip, isGenerating: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'AI generation failed.', isGenerating: false });
      throw err;
    }
  },

  reorderItems: async (tripId, dayId, items) => {
    await api.put(`/trips/${tripId}/reorder`, { day_id: dayId, items });
    // Update local state optimistically (already done by dnd-kit before API call)
  },

  updateItem: async (tripId, itemId, updates) => {
    const { data } = await api.put(`/trips/${tripId}/items/${itemId}`, updates);
    // Update in currentTrip
    set(state => {
      if (!state.currentTrip) return {};
      const updatedDays = state.currentTrip.trip_days.map(day => ({
        ...day,
        itinerary_items: day.itinerary_items.map(item =>
          item.id === itemId ? data.item : item
        ),
      }));
      return { currentTrip: { ...state.currentTrip, trip_days: updatedDays } };
    });
    return data.item;
  },

  removeItem: async (tripId, itemId) => {
    await api.delete(`/trips/${tripId}/items/${itemId}`);
    set(state => {
      if (!state.currentTrip) return {};
      const updatedDays = state.currentTrip.trip_days.map(day => ({
        ...day,
        itinerary_items: day.itinerary_items.filter(item => item.id !== itemId),
      }));
      return { currentTrip: { ...state.currentTrip, trip_days: updatedDays } };
    });
  },

  shareTrip: async (tripId) => {
    const { data } = await api.post(`/trips/${tripId}/share`);
    return data.shareUrl;
  },

  clearCurrentTrip: () => set({ currentTrip: null }),
  clearError: () => set({ error: null }),
}));
