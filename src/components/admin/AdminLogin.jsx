import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin({ onDemoLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const loginTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(loginTimerRef.current), []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password || !email.includes('@')) {
      setError('Enter a valid demo email and a non-empty password to continue.');
      return;
    }

    setIsLoading(true);
    form.reset();
    loginTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      onDemoLogin();
    }, 650);
  };

  return (
    <main className="admin-grid-background relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070708] px-4 py-10 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(250,204,21,0.11),transparent_32%),radial-gradient(circle_at_90%_90%,rgba(220,38,38,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute left-0 top-24 h-px w-1/3 bg-gradient-to-r from-red-600/70 to-transparent" />
      <div className="pointer-events-none absolute bottom-20 right-0 h-px w-2/5 bg-gradient-to-l from-yellow-400/60 to-transparent" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img
            src="/logo.jpeg"
            alt="Yellow Flag"
            className="h-11 w-11 rounded-xl border border-yellow-400/35 object-cover shadow-[0_0_25px_rgba(250,204,21,0.18)]"
          />
          <div>
            <p className="font-display text-xl font-black uppercase tracking-[0.12em]">Yellow Flag</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-500">Administration</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111113]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="h-1 bg-[linear-gradient(90deg,#e10600_0_16%,#facc15_16%_82%,#ffffff_82%_100%)]" />
          <div className="p-6 sm:p-8">
            <div className="mb-7">
              <div className="mb-4 flex items-center gap-2 text-yellow-400">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <p className="text-[10px] font-black uppercase tracking-[0.24em]">Yellow Flag Control Centre</p>
              </div>
              <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">Admin Access</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Restricted area for authorized administrators. This screen is a UI demonstration and does not provide production security.
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-950/35 px-4 py-3 text-sm font-semibold text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    placeholder="admin@example.com"
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/15"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">Password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter a demo password"
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-yellow-400 px-5 py-3.5 font-display text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_28px_rgba(250,204,21,0.18)] transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:ring-offset-2 focus:ring-offset-[#111113] disabled:cursor-wait disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" aria-hidden="true" />
                    Checking Demo Access
                  </span>
                ) : 'Sign In to Admin Panel'}
              </button>
            </form>

            <Link
              to="/"
              className="mt-6 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Website
            </Link>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          UI Prototype · No Real Authentication
        </div>
      </div>
    </main>
  );
}
