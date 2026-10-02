import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTripStore } from '../store/tripStore';
import { useUIStore } from '../store/uiStore';
import Timeline from '../components/timeline/Timeline.jsx';
import EditItemModal from '../components/trip/EditItemModal.jsx';
import AddAnchorModal from '../components/trip/AddAnchorModal.jsx';
import { ItineraryItemSkeleton } from '../components/ui/Skeleton.jsx';
import { generatePDF } from '../utils/pdfExport.js';

export default function TripPlannerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTrip, isLoading, isGenerating, fetchTrip, generateAI, reorderItems, removeItem, shareTrip, clearCurrentTrip } = useTripStore();
  const { showToast } = useUIStore();

  const [activeDay, setActiveDay] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  useEffect(() => {
    fetchTrip(id);
    return () => clearCurrentTrip();
  }, [id, fetchTrip, clearCurrentTrip]);

  if (isLoading || !currentTrip) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="h-16 bg-white border-b border-surface-muted" />
        <div className="page-container py-8">
          <div className="space-y-4 max-w-2xl">
            {[1, 2, 3].map(i => <ItineraryItemSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const days = currentTrip.trip_days || [];
  const currentDay = days[activeDay];
  const currentItems = currentDay?.itinerary_items || [];
  const totalDays = days.length;

  const handleGenerateAI = async () => {
    try {
      const result = await generateAI(id);
      const count = result?.message?.match(/\d+/)?.[0] || '';
      showToast(`✨ AI added ${count} suggestions to your itinerary!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'AI generation failed. Please try again.', 'error');
    }
  };

  const handleReorder = async (reorderedItems) => {
    // Optimistically update UI via store would be ideal; here we call API
    const itemsWithOrder = reorderedItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
    try {
      await reorderItems(id, currentDay.id, itemsWithOrder);
      // Refresh trip to get updated distances
      fetchTrip(id);
    } catch {
      showToast('Failed to save new order.', 'error');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await removeItem(id, itemId);
      showToast('Place removed.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Cannot remove this item.', 'error');
    }
  };

  const handleShare = async () => {
    try {
      const url = await shareTrip(id);
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setShowShareTooltip(true);
      showToast('Share link copied to clipboard! 🔗', 'success');
      setTimeout(() => setShowShareTooltip(false), 3000);
    } catch {
      showToast('Failed to generate share link.', 'error');
    }
  };

  const handleExportPDF = async () => {
    showToast('Generating PDF…', 'info');
    try {
      await generatePDF(currentTrip);
      showToast('PDF downloaded!', 'success');
    } catch {
      showToast('PDF export failed.', 'error');
    }
  };

  const lockedCount = currentItems.filter(i => i.status === 'locked').length;
  const suggestedCount = currentItems.filter(i => i.status === 'suggested').length;

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-surface-muted">
        <div className="page-container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="btn-back-dashboard"
              onClick={() => navigate('/dashboard')}
              className="btn-ghost text-sm flex-shrink-0"
              aria-label="Back to dashboard"
            >
              ← Back
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-ink text-base truncate">{currentTrip.title}</h1>
              <p className="text-xs text-ink-muted">
                📍 {currentTrip.destination_city} · {totalDays} day{totalDays !== 1 ? 's' : ''}
                {currentTrip.start_date && ` · ${format(new Date(currentTrip.start_date), 'MMM d')}–${format(new Date(currentTrip.end_date), 'MMM d, yyyy')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share */}
            <div className="relative">
              <button
                id="btn-share"
                onClick={handleShare}
                className="btn-secondary text-sm"
              >
                🔗 Share
              </button>
              {showShareTooltip && (
                <div className="absolute top-10 right-0 card px-3 py-1.5 text-xs text-teal-600 font-medium shadow-card-hover whitespace-nowrap animate-fade-in">
                  Copied! ✓
                </div>
              )}
            </div>
            {/* PDF Export */}
            <button
              id="btn-export-pdf"
              onClick={handleExportPDF}
              className="btn-secondary text-sm hidden sm:flex"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </header>

      <div className="page-container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left: Day Tabs ───────────────────────────────────────────── */}
          <div className="lg:w-48 flex-shrink-0">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Days</p>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
              {days.map((day, idx) => (
                <button
                  key={day.id}
                  id={`btn-day-${idx + 1}`}
                  onClick={() => setActiveDay(idx)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl text-left transition-all duration-200
                    ${activeDay === idx
                      ? 'bg-teal-500 text-white shadow-teal'
                      : 'bg-white border border-surface-muted text-ink-secondary hover:border-teal-300 hover:text-ink'
                    }`}
                >
                  <p className={`text-sm font-semibold ${activeDay === idx ? 'text-white' : 'text-ink'}`}>
                    Day {day.day_number}
                  </p>
                  {day.date && (
                    <p className={`text-xs mt-0.5 ${activeDay === idx ? 'text-teal-100' : 'text-ink-muted'}`}>
                      {format(new Date(day.date), 'MMM d')}
                    </p>
                  )}
                  <p className={`text-2xs mt-1 ${activeDay === idx ? 'text-teal-200' : 'text-ink-light'}`}>
                    {day.itinerary_items?.length || 0} places
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ─── Right: Timeline Panel ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Day header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Day {currentDay?.day_number}
                  {currentDay?.date && (
                    <span className="text-ink-secondary font-normal ml-2 text-sm">
                      {format(new Date(currentDay.date), 'EEEE, MMMM d')}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-ink-muted">🔒 {lockedCount} locked</span>
                  <span className="text-xs text-ink-muted">🤖 {suggestedCount} AI suggestions</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Add anchor */}
                <button
                  id="btn-add-anchor"
                  onClick={() => setShowAnchorModal(true)}
                  className="btn-secondary text-sm"
                >
                  + Add Event
                </button>

                {/* Generate AI */}
                <button
                  id="btn-generate-ai"
                  onClick={handleGenerateAI}
                  className="btn-primary text-sm"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : '🤖 Generate AI'}
                </button>
              </div>
            </div>

            {/* AI generating banner */}
            {isGenerating && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4 flex items-center gap-3 animate-pulse-soft">
                <span className="text-2xl animate-float">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-teal-700">AI is filling your schedule…</p>
                  <p className="text-xs text-teal-600">Finding nearby places, validating hours, calculating routes</p>
                </div>
              </div>
            )}

            {/* Timeline */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <ItineraryItemSkeleton key={i} />)}
              </div>
            ) : (
              <Timeline
                items={currentItems}
                onReorder={handleReorder}
                onEdit={setEditingItem}
                onRemove={handleRemove}
              />
            )}

            {/* Day stats footer */}
            {currentItems.length > 0 && (
              <div className="mt-4 p-3 bg-surface-subtle rounded-xl flex flex-wrap gap-4 text-xs text-ink-muted">
                <span>📍 {currentItems.length} places</span>
                <span>
                  🚗 Total: {currentItems.reduce((sum, i) => sum + (i.distance_from_prev_km || 0), 0).toFixed(1)} km
                </span>
                <span>
                  ⏱️ {currentItems.filter(i => i.duration_minutes).reduce((sum, i) => sum + (i.duration_minutes || 0), 0)} min of activities
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          tripId={id}
          onClose={() => setEditingItem(null)}
        />
      )}
      {showAnchorModal && (
        <AddAnchorModal
          tripId={id}
          dayCount={totalDays}
          onClose={() => setShowAnchorModal(false)}
        />
      )}
    </div>
  );
}
