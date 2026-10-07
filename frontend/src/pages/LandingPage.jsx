import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🏨',
    title: 'Hotel as Your Gravity Center',
    desc: 'Your accommodation anchors everything. AI only recommends nearby places on efficient routes — no backtracking.',
  },
  {
    icon: '🤖',
    title: 'Contextual AI Fill-the-Blank',
    desc: 'Lock in your concerts, reservations, and must-sees. AI fills only the empty slots — never overwriting your plans.',
  },
  {
    icon: '⏰',
    title: 'Real-Time Availability Check',
    desc: 'Every suggestion is pinpointed and geocoded via Geoapify with smart OSRM routing. Accurate locations, no surprises.',
  },
];

const steps = [
  { step: '01', title: 'Set Your Anchors', desc: 'Add your hotel and must-visit spots. These become locked pillars in your schedule.' },
  { step: '02', title: 'AI Fills the Gaps', desc: 'Gemini AI analyzes your locked spots and fills empty slots with smart nearby recommendations.' },
  { step: '03', title: 'Drag, Edit & Go', desc: 'Rearrange your itinerary with drag-and-drop. Download as PDF or share a collaboration link.' },
];

const travelStyles = [
  { emoji: '🎒', name: 'Backpacker', desc: 'Budget-savvy, authentic & local', color: 'border-emerald-300 bg-emerald-50' },
  { emoji: '🌴', name: 'Leisure', desc: 'Comfortable & well-paced', color: 'border-teal-300 bg-teal-50' },
  { emoji: '💎', name: 'Luxury', desc: 'Premium, exclusive experiences', color: 'border-violet-300 bg-violet-50' },
  { emoji: '👨‍👩‍👧', name: 'Family', desc: 'Kid-friendly & safe adventures', color: 'border-amber-300 bg-amber-50' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-muted">
        <div className="page-container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold gradient-text">TripNode</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/signup" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="section page-container text-center">
        <div className="max-w-3xl mx-auto animate-slide-up">
          <span className="badge-teal mb-6 inline-flex">
            ✨ Powered by Gemini AI & Geoapify Maps
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-ink mb-6 leading-tight">
            Plan Smarter.<br />
            <span className="gradient-text">Travel Better.</span>
          </h1>
          <p className="text-xl text-ink-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            TripNode builds your perfect itinerary around your hotel and must-visits —
            then AI fills the gaps with nearby gems. Clean, intuitive, collaborative.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5 shadow-teal-lg">
              🚀 Create Your First Trip
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
              Sign In →
            </Link>
          </div>
        </div>

        {/* Hero visual — floating cards mockup */}
        <div className="mt-16 relative max-w-2xl mx-auto animate-fade-in">
          <div className="card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-ink-muted ml-2 font-mono">tripnode.app/trips/bali-2025</span>
            </div>
            <div className="space-y-3">
              {/* Hotel item */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200">
                <span className="text-lg">🏨</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Kuta Beach Hotel</p>
                  <p className="text-xs text-ink-muted">08:00 · Home base</p>
                </div>
                <span className="badge badge-violet text-2xs">HOTEL</span>
              </div>
              {/* Locked anchor */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-300">
                <span className="text-lg">🎸</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Coldplay Concert — GBK</p>
                  <p className="text-xs text-ink-muted">19:00–22:00 · Locked</p>
                </div>
                <span className="badge badge-amber text-2xs">🔒 LOCKED</span>
              </div>
              {/* AI suggested */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-300">
                <span className="text-lg">🍜</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Warung Nasi Campur Bu Oka</p>
                  <p className="text-xs text-ink-muted">12:00–13:30 · 0.8 km away · ⭐ 4.7</p>
                </div>
                <span className="badge badge-teal text-2xs">🤖 AI</span>
              </div>
              {/* AI suggested 2 */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-200 opacity-70">
                <span className="text-lg">🌅</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Tanah Lot Temple</p>
                  <p className="text-xs text-ink-muted">15:30–17:30 · 12 km · Open until 19:00</p>
                </div>
                <span className="badge badge-teal text-2xs">🤖 AI</span>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-3 card px-3 py-1.5 shadow-card-hover animate-float">
            <span className="text-xs font-semibold text-teal-600">✨ 6 places added by AI</span>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────── */}
      <section className="section bg-white border-y border-surface-muted">
        <div className="page-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">How TripNode Works</h2>
            <p className="text-ink-secondary text-lg max-w-xl mx-auto">
              From blank slate to complete itinerary in minutes — not hours.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-teal-200 to-transparent -translate-x-1/2 z-0" />
                )}
                <div className="card p-6 text-center relative z-10 hover:shadow-card-hover transition-shadow duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-teal text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-teal">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold text-ink mb-2">{s.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="section page-container">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
            Built for <span className="gradient-text">Real Travelers</span>
          </h2>
          <p className="text-ink-secondary text-lg">Three core features that make TripNode different.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card-hover p-6">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-ink mb-3">{f.title}</h3>
              <p className="text-sm text-ink-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Travel Styles ────────────────────────────────────────────────── */}
      <section className="section bg-surface-subtle border-y border-surface-muted">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-3">Your Style, Your Trip</h2>
            <p className="text-ink-secondary">AI recommendations adapt to how you travel.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {travelStyles.map((s, i) => (
              <div key={i} className={`card p-5 text-center border-2 ${s.color} cursor-pointer hover:scale-105 transition-transform duration-200`}>
                <div className="text-3xl mb-2">{s.emoji}</div>
                <p className="font-semibold text-ink text-sm">{s.name}</p>
                <p className="text-2xs text-ink-muted mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Footer ──────────────────────────────────────────────────── */}
      <section className="section page-container text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
            Ready to plan your next adventure?
          </h2>
          <p className="text-ink-secondary mb-8">
            Join thousands of travelers using TripNode to build stress-free itineraries.
          </p>
          <Link to="/signup" className="btn-primary text-base px-10 py-4 shadow-teal-lg">
            🌍 Start Planning — It's Free
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-muted bg-white py-8">
        <div className="page-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <span className="font-bold gradient-text">TripNode</span>
            <span className="text-xs text-ink-muted ml-2">© 2025</span>
          </div>
          <p className="text-xs text-ink-muted">
            Built with ❤️ using Gemini AI, Geoapify & OSRM
          </p>
        </div>
      </footer>
    </div>
  );
}
