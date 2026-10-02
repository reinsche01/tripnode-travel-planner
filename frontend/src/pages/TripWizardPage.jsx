import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { useUIStore } from '../store/uiStore';

const TRAVEL_STYLES = [
  { id: 'backpacker', emoji: '🎒', name: 'Backpacker', desc: 'Budget-savvy, authentic & local experiences', color: 'border-emerald-400 bg-emerald-50' },
  { id: 'leisure', emoji: '🌴', name: 'Leisure', desc: 'Comfortable, well-paced, popular spots', color: 'border-teal-400 bg-teal-50' },
  { id: 'luxury', emoji: '💎', name: 'Luxury', desc: 'Premium, fine dining, exclusive tours', color: 'border-violet-400 bg-violet-50' },
  { id: 'family', emoji: '👨‍👩‍👧', name: 'Family', desc: 'Kid-friendly, educational, safe venues', color: 'border-amber-400 bg-amber-50' },
];

const STEPS = ['Destination & Dates', 'Travel Style', 'Your Hotel', 'Must-Visit Anchors'];

export default function TripWizardPage() {
  const navigate = useNavigate();
  const { createTrip, addAnchor } = useTripStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [createdTripId, setCreatedTripId] = useState(null);

  // Step 1 — Destination & Dates
  const [tripData, setTripData] = useState({
    title: '',
    destination_city: '',
    destination_country: '',
    start_date: '',
    end_date: '',
    traveler_count: 2,
  });

  // Step 2 — Travel Style
  const [travelStyle, setTravelStyle] = useState('leisure');

  // Step 3 — Hotel
  const [hotel, setHotel] = useState({ hotel_name: '', hotel_address: '' });

  // Step 4 — Anchors
  const [anchors, setAnchors] = useState([]);
  const [newAnchor, setNewAnchor] = useState({ name: '', address: '', day_number: 1, start_time: '', end_time: '', notes: '' });

  const handleNext = async () => {
    if (step === 2) {
      // Create the trip before step 4
      setIsLoading(true);
      try {
        const trip = await createTrip({
          ...tripData,
          travel_style: travelStyle,
          ...hotel,
        });
        setCreatedTripId(trip.id);
        setStep(3);
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to create trip.', 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleAddAnchor = () => {
    if (!newAnchor.name || !newAnchor.start_time || !newAnchor.end_time) {
      showToast('Name, start time, and end time are required.', 'error');
      return;
    }
    setAnchors(a => [...a, { ...newAnchor, id: Date.now() }]);
    setNewAnchor({ name: '', address: '', day_number: 1, start_time: '', end_time: '', notes: '' });
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // Add all anchors to the trip
      for (const anchor of anchors) {
        await addAnchor(createdTripId, anchor);
      }
      showToast('Trip created! 🎉 Now generate your AI itinerary.', 'success');
      navigate(`/trips/${createdTripId}`);
    } catch (err) {
      showToast('Failed to save some anchors.', 'error');
      navigate(`/trips/${createdTripId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return tripData.destination_city && tripData.start_date && tripData.end_date;
    if (step === 1) return !!travelStyle;
    if (step === 2) return !!hotel.hotel_name;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-surface-muted px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-teal-500 text-white ring-4 ring-teal-100' : 'bg-surface-muted text-ink-muted'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-ink font-medium' : 'text-ink-muted'}`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < step ? 'bg-teal-400' : 'bg-surface-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-2xl animate-slide-up">

          {/* ── Step 0: Destination & Dates ── */}
          {step === 0 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-ink mb-1">Where & When?</h2>
              <p className="text-ink-secondary mb-6">Set your destination and travel dates.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">City *</label>
                    <input className="input-field" placeholder="e.g. Bali" value={tripData.destination_city}
                      onChange={e => setTripData(d => ({ ...d, destination_city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <input className="input-field" placeholder="e.g. Indonesia" value={tripData.destination_country}
                      onChange={e => setTripData(d => ({ ...d, destination_country: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Trip Title (optional)</label>
                  <input className="input-field" placeholder="e.g. Bali Summer Adventure 2025" value={tripData.title}
                    onChange={e => setTripData(d => ({ ...d, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date *</label>
                    <input type="date" className="input-field" value={tripData.start_date}
                      onChange={e => setTripData(d => ({ ...d, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">End Date *</label>
                    <input type="date" className="input-field" value={tripData.end_date}
                      onChange={e => setTripData(d => ({ ...d, end_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Number of Travelers</label>
                  <input type="number" min="1" max="20" className="input-field w-32" value={tripData.traveler_count}
                    onChange={e => setTripData(d => ({ ...d, traveler_count: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Travel Style ── */}
          {step === 1 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-ink mb-1">How do you travel?</h2>
              <p className="text-ink-secondary mb-6">AI will tailor recommendations to your preferred style.</p>
              <div className="grid grid-cols-2 gap-4">
                {TRAVEL_STYLES.map(style => (
                  <button key={style.id} id={`style-${style.id}`}
                    onClick={() => setTravelStyle(style.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02]
                      ${travelStyle === style.id ? `${style.color} border-opacity-100 shadow-md` : 'border-surface-muted bg-white hover:bg-surface-subtle'}`}>
                    <div className="text-3xl mb-2">{style.emoji}</div>
                    <p className="font-semibold text-ink">{style.name}</p>
                    <p className="text-xs text-ink-muted mt-1">{style.desc}</p>
                    {travelStyle === style.id && <div className="mt-2 text-xs font-medium text-teal-600">✓ Selected</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Hotel ── */}
          {step === 2 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-ink mb-1">🏨 Your Hotel</h2>
              <p className="text-ink-secondary mb-6">
                Your hotel becomes the <strong className="text-ink">gravity center</strong> — AI will only suggest nearby places.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Hotel Name *</label>
                  <input className="input-field" placeholder="e.g. Kuta Beach Hotel" value={hotel.hotel_name}
                    onChange={e => setHotel(h => ({ ...h, hotel_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Hotel Address (optional but recommended)</label>
                  <input className="input-field" placeholder="e.g. Jl. Pantai Kuta No. 1, Bali" value={hotel.hotel_address}
                    onChange={e => setHotel(h => ({ ...h, hotel_address: e.target.value }))} />
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-700">
                  💡 The more precise your hotel address, the better AI can optimize nearby suggestions.
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Anchors ── */}
          {step === 3 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-ink mb-1">🔒 Must-Visit Places</h2>
              <p className="text-ink-secondary mb-6">
                Add concerts, reservations, or any fixed events. AI will never touch these — only fill the gaps around them.
              </p>

              {/* Existing anchors */}
              {anchors.length > 0 && (
                <div className="space-y-2 mb-6">
                  {anchors.map((anchor) => (
                    <div key={anchor.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-lg">🔒</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{anchor.name}</p>
                        <p className="text-xs text-ink-muted">Day {anchor.day_number} · {anchor.start_time}–{anchor.end_time}</p>
                      </div>
                      <button onClick={() => setAnchors(a => a.filter(x => x.id !== anchor.id))}
                        className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add anchor form */}
              <div className="border border-surface-muted rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-ink">Add a locked event</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input className="input-field" placeholder="Event name (e.g. Coldplay Concert)" value={newAnchor.name}
                      onChange={e => setNewAnchor(a => ({ ...a, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <input className="input-field" placeholder="Venue address (optional)" value={newAnchor.address}
                      onChange={e => setNewAnchor(a => ({ ...a, address: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Day Number</label>
                    <input type="number" min="1" className="input-field" value={newAnchor.day_number}
                      onChange={e => setNewAnchor(a => ({ ...a, day_number: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Start</label>
                      <input type="time" className="input-field" value={newAnchor.start_time}
                        onChange={e => setNewAnchor(a => ({ ...a, start_time: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">End</label>
                      <input type="time" className="input-field" value={newAnchor.end_time}
                        onChange={e => setNewAnchor(a => ({ ...a, end_time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input className="input-field" placeholder="Notes (optional)" value={newAnchor.notes}
                      onChange={e => setNewAnchor(a => ({ ...a, notes: e.target.value }))} />
                  </div>
                </div>
                <button id="btn-add-anchor" onClick={handleAddAnchor} className="btn-secondary w-full justify-center">
                  + Add Anchor
                </button>
              </div>

              {anchors.length === 0 && (
                <p className="text-xs text-ink-muted text-center mt-4">
                  No anchors yet — you can also add them later in the planner.
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary">
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                id="btn-wizard-next"
                onClick={handleNext}
                className="btn-primary"
                disabled={!canNext() || isLoading}
              >
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
                ) : 'Continue →'}
              </button>
            ) : (
              <button
                id="btn-wizard-finish"
                onClick={handleFinish}
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                ) : '🚀 Open Planner'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
