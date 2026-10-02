import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';

function TripCard({ trip, onDelete }) {
  const navigate = useNavigate();
  const dayCount = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;
  const isUpcoming = isFuture(new Date(trip.start_date));
  const isPastTrip = isPast(new Date(trip.end_date));

  const statusBadge = trip.status === 'finalized'
    ? <span className="badge badge-teal">✓ Finalized</span>
    : <span className="badge badge-gray">📝 Draft</span>;

  const timeBadge = isUpcoming
    ? <span className="badge-teal badge">Upcoming</span>
    : isPastTrip
      ? <span className="badge badge-gray">Past</span>
      : <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Ongoing</span>;

  return (
    <div className="card-hover p-5 group cursor-pointer" onClick={() => navigate(`/trips/${trip.id}`)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-ink group-hover:text-teal-600 transition-colors">{trip.title}</h3>
          <p className="text-sm text-ink-secondary mt-0.5">
            📍 {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {timeBadge}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mb-4">
        <span>📅 {format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')}</span>
        <span>🌙 {dayCount} day{dayCount !== 1 ? 's' : ''}</span>
        <span>👥 {trip.traveler_count} traveler{trip.traveler_count !== 1 ? 's' : ''}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {statusBadge}
        <button
          id={`btn-delete-trip-${trip.id}`}
          onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-20 text-center animate-fade-in">
      <div className="text-6xl mb-4 animate-float inline-block">🗺️</div>
      <h3 className="text-xl font-semibold text-ink mb-2">No trips yet</h3>
      <p className="text-ink-secondary mb-6">Start planning your first adventure with AI-powered itineraries.</p>
      <Link to="/trips/new" className="btn-primary">
        ✈️ Create Your First Trip
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { trips, isLoading, fetchTrips, deleteTrip } = useTripStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await deleteTrip(id);
      showToast('Trip deleted.', 'success');
    } catch {
      showToast('Failed to delete trip.', 'error');
    }
  };

  const upcoming = trips.filter(t => isFuture(new Date(t.start_date)));
  const others = trips.filter(t => !isFuture(new Date(t.start_date)));

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-surface-muted">
        <div className="page-container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <span className="text-lg font-bold gradient-text">TripNode</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-secondary hidden sm:block">
              Hello, <strong className="text-ink">{user?.name?.split(' ')[0]}</strong> 👋
            </span>
            <button id="btn-logout" onClick={handleLogout} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="page-container py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">My Trips</h1>
            <p className="text-ink-secondary text-sm mt-1">{trips.length} trip{trips.length !== 1 ? 's' : ''} planned</p>
          </div>
          <Link to="/trips/new" id="btn-new-trip" className="btn-primary">
            + New Trip
          </Link>
        </div>

        {/* Stats row */}
        {trips.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Trips', value: trips.length, icon: '🗺️' },
              { label: 'Upcoming', value: upcoming.length, icon: '🚀' },
              { label: 'Destinations', value: new Set(trips.map(t => t.destination_city)).size, icon: '📍' },
              { label: 'Finalized', value: trips.filter(t => t.status === 'finalized').length, icon: '✅' },
            ].map((stat, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xl font-bold text-ink">{stat.value}</p>
                  <p className="text-xs text-ink-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Trip grid */}
        {!isLoading && (
          <>
            {trips.length === 0 ? (
              <div className="grid grid-cols-1"><EmptyState /></div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Upcoming</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {upcoming.map(trip => (
                        <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
                {others.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Past & Ongoing</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {others.map(trip => (
                        <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <Link
        to="/trips/new"
        id="btn-new-trip-fab"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-500 text-white text-2xl flex items-center justify-center shadow-teal-lg hover:bg-teal-600 hover:shadow-teal-lg hover:-translate-y-1 transition-all duration-200 md:hidden"
        aria-label="Create new trip"
      >
        +
      </Link>
    </div>
  );
}
