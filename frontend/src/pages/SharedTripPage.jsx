import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import { ItineraryItemSkeleton } from '../components/ui/Skeleton.jsx';

const CATEGORY_ICONS = {
  food: '🍽️', culture: '🏛️', nature: '🌿', shopping: '🛍️',
  entertainment: '🎭', wellness: '🧘', hotel: '🏨', anchor: '📌', other: '📍',
};

export default function SharedTripPage() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    const loadShared = async () => {
      try {
        const { data } = await api.get(`/trips/share/${token}`);
        setTrip(data.trip);
      } catch {
        setError('This trip link is invalid or no longer available.');
      } finally {
        setIsLoading(false);
      }
    };
    loadShared();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="page-container py-10 max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <ItineraryItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="card p-10 text-center max-w-sm mx-4">
          <div className="text-5xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-ink mb-2">Trip Not Found</h2>
          <p className="text-ink-secondary text-sm mb-6">{error}</p>
          <Link to="/" className="btn-primary justify-center">Go to TripNode</Link>
        </div>
      </div>
    );
  }

  const days = trip?.trip_days || [];
  const currentDay = days[activeDay];
  const items = currentDay?.itinerary_items || [];
  const totalDays = days.length;

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="bg-white border-b border-surface-muted">
        <div className="page-container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <span className="text-lg font-bold gradient-text">TripNode</span>
          </Link>
          <Link to="/signup" className="btn-primary text-sm">
            Create My Own Trip →
          </Link>
        </div>
      </nav>

      {/* Trip Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
        <div className="page-container py-8">
          <div className="flex items-start justify-between">
            <div>
              <span className="badge bg-white/20 text-white border-white/30 mb-3">
                🌍 Shared Itinerary
              </span>
              <h1 className="text-2xl font-bold mb-1">{trip.title}</h1>
              <p className="text-teal-100 text-sm">
                📍 {trip.destination_city}{trip.destination_country && `, ${trip.destination_country}`}
              </p>
              <div className="flex items-center gap-4 mt-2 text-teal-100 text-sm">
                <span>📅 {format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')}</span>
                <span>🌙 {totalDays} days</span>
                <span>👥 {trip.traveler_count} traveler{trip.traveler_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Day tabs */}
          <div className="lg:w-44 flex-shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
              {days.map((day, idx) => (
                <button
                  key={day.id}
                  onClick={() => setActiveDay(idx)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl text-left transition-all duration-200
                    ${activeDay === idx
                      ? 'bg-teal-500 text-white shadow-teal'
                      : 'bg-white border border-surface-muted text-ink-secondary hover:border-teal-300'}`}
                >
                  <p className={`text-sm font-semibold ${activeDay === idx ? 'text-white' : 'text-ink'}`}>Day {day.day_number}</p>
                  {day.date && (
                    <p className={`text-xs mt-0.5 ${activeDay === idx ? 'text-teal-100' : 'text-ink-muted'}`}>
                      {format(new Date(day.date), 'MMM d')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Itinerary (read-only) */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-ink mb-4">
              Day {currentDay?.day_number}
              {currentDay?.date && (
                <span className="text-ink-secondary font-normal ml-2 text-sm">
                  {format(new Date(currentDay.date), 'EEEE, MMMM d')}
                </span>
              )}
            </h2>

            <div className="space-y-3">
              {items.length === 0 && (
                <p className="text-sm text-ink-muted text-center py-8">No places planned for this day.</p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`card border-l-4 p-4
                    ${item.type === 'hotel' ? 'border-l-violet-500' : item.status === 'locked' ? 'border-l-amber-400' : 'border-l-teal-400'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                      ${item.type === 'hotel' ? 'bg-violet-100' : item.status === 'locked' ? 'bg-amber-100' : 'bg-teal-50'}`}>
                      {CATEGORY_ICONS[item.category || item.type] || '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-ink text-sm">{item.name}</p>
                        <span className={`badge text-2xs flex-shrink-0
                          ${item.type === 'hotel' ? 'badge-violet' : item.status === 'locked' ? 'badge-amber' : 'badge-teal'}`}>
                          {item.type === 'hotel' ? '🏨 Hotel' : item.status === 'locked' ? '🔒 Locked' : '🤖 AI'}
                        </span>
                      </div>
                      {item.start_time && (
                        <p className="text-xs text-ink-muted mt-0.5">
                          🕐 {item.start_time}{item.end_time ? `–${item.end_time}` : ''}
                        </p>
                      )}
                      {item.address && (
                        <p className="text-xs text-ink-muted mt-0.5 truncate">📍 {item.address}</p>
                      )}
                      {item.distance_from_prev_km > 0 && (
                        <span className="mt-1 inline-block text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                          {item.distance_from_prev_km} km from previous
                        </span>
                      )}
                      {item.notes && (
                        <p className="text-xs text-ink-muted mt-1 italic">"{item.notes}"</p>
                      )}
                    </div>
                    {item.photo_url && (
                      <div className="hidden sm:block w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" loading="lazy"
                          onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="border-t border-surface-muted bg-white py-8 mt-8">
        <div className="page-container text-center">
          <p className="text-ink-secondary mb-4">Want to create itineraries like this?</p>
          <Link to="/signup" className="btn-primary text-base px-8 py-3">
            🚀 Start Planning for Free
          </Link>
        </div>
      </div>
    </div>
  );
}
