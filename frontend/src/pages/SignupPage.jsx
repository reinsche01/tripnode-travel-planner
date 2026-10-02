import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const { showToast } = useUIStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await signup(form.email, form.password, form.name);
      showToast('Account created! Welcome to TripNode 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-teal items-center justify-center p-12">
        <div className="text-white text-center max-w-sm">
          <div className="text-7xl mb-6 animate-float">✈️</div>
          <h2 className="text-2xl font-bold mb-3">Plan your dream trip</h2>
          <p className="text-teal-100 leading-relaxed">
            Create stunning itineraries in minutes with AI that works around your schedule.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {['🏨 Hotel-centric AI', '🔒 Locked anchors', '🗺️ Route optimizer', '📄 PDF export'].map(f => (
              <div key={f} className="bg-white/20 rounded-xl p-3 text-sm backdrop-blur-sm">{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold gradient-text">TripNode</span>
          </Link>

          <h1 className="text-3xl font-bold text-ink mb-2">Create your account</h1>
          <p className="text-ink-secondary mb-8">Start planning smarter trips today — free forever.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6 animate-slide-up">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                className="input-field"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <button
              type="submit"
              id="btn-signup"
              className="btn-primary w-full justify-center py-3 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account…</>
              ) : '🚀 Create Free Account'}
            </button>
          </form>

          <p className="text-center text-xs text-ink-muted mt-4">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center text-sm text-ink-muted mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
