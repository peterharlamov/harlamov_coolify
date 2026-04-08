import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, loginWithPassword, loginWithOAuth, oauthProviders } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = location.state?.from?.pathname || '/dashboard';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError?.message || 'Failed to login. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuthLogin(providerName) {
    setError('');

    try {
      await loginWithOAuth(providerName);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError?.message || 'OAuth login failed.');
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-100 lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-600 to-cyan-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">Inventuurisusteem</p>
          <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">Smart inventory tracking for modern office teams.</h1>
        </div>
        <p className="text-cyan-100">Track devices, ownership, and maintenance notes in one place.</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">Use your account to access the inventory dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {oauthProviders.length > 0 ? (
            <div className="mt-5">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Or continue with</p>
              <div className="flex flex-wrap gap-2">
                {oauthProviders.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => handleOAuthLogin(provider.name)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {provider.displayName || provider.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-sm text-slate-600">
            No account?{' '}
            <Link className="font-semibold text-brand-700 hover:text-brand-800" to="/register">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
