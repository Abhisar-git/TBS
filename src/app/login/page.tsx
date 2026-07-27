'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, ArrowLeft, Heart, ShieldCheck, Car } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleHint = searchParams.get('role') || 'guest';

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (roleHint === 'admin') {
      setEmail('admin@tbs.event');
      setPassword('admin123');
    } else if (roleHint === 'driver') {
      setEmail('driver1@tbs.event');
      setPassword('driver123');
    } else {
      setEmail('guest1@tbs.event');
      setPassword('guest123');
    }
  }, [roleHint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (!isLogin) {
        body.name = name;
        body.phone = phone;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      localStorage.setItem('tbs-token', data.data.token);
      localStorage.setItem('tbs-role', data.data.user.role);
      localStorage.setItem('tbs-user', JSON.stringify(data.data.user));

      const userRole = data.data.user.role;
      if (userRole === 'ADMIN') router.push('/admin/dashboard');
      else if (userRole === 'DRIVER') router.push('/driver/dashboard');
      else router.push('/guest/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const roleConfig = {
    guest: { label: 'Guest Concierge Portal', icon: Heart, badge: 'bg-gold-50 text-gold-700 border-gold-300' },
    admin: { label: 'Operations Command', icon: Crown, badge: 'bg-royal-50 text-royal-700 border-royal-200' },
    driver: { label: 'Chauffeur Console', icon: Car, badge: 'bg-ivory-100 text-charcoal-700 border-gold-300' },
  }[roleHint] || { label: 'Guest Concierge Portal', icon: Heart, badge: 'bg-gold-50 text-gold-700 border-gold-300' };

  const RoleIcon = roleConfig.icon;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-royal-800/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 z-10">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-royal-800 transition-colors duration-400 font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="card-editorial space-y-8 border-gold-500/30">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-royal-700 flex items-center justify-center mx-auto shadow-gold-glow">
              <Crown className="w-7 h-7 text-white" />
            </div>

            <div>
              <span className="text-[10px] font-sans font-bold text-gold-700 uppercase tracking-[0.2em] block mb-1">
                The Bride Side
              </span>
              <h1 className="font-serif text-2xl md:text-3xl text-royal-950">
                {isLogin ? 'Welcome Back' : 'Create Your Account'}
              </h1>
              <p className="text-xs text-charcoal-400 font-sans mt-1">
                {isLogin ? 'Sign in to access your luxury experience' : 'Join the bridal celebration'}
              </p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-sans font-semibold border ${roleConfig.badge}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleConfig.label}</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div>
                  <label className="label-editorial">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-editorial"
                  />
                </div>
                <div>
                  <label className="label-editorial">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-editorial"
                  />
                </div>
              </>
            )}

            <div>
              <label className="label-editorial">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-editorial"
              />
            </div>

            <div>
              <label className="label-editorial">Password</label>
              <input
                type="password"
                required
                minLength={4}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-editorial"
              />
            </div>

            {error && (
              <div className="px-5 py-3.5 bg-royal-50 border border-royal-100 text-royal-700 text-xs rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full disabled:opacity-60"
            >
              {loading ? 'Signing in...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {roleHint === 'guest' && (
            <div className="text-center text-xs text-charcoal-400 font-sans">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-gold-700 font-bold hover:text-gold-800 transition-colors duration-400 ml-1.5"
              >
                {isLogin ? 'Register' : 'Sign In'}
              </button>
            </div>
          )}

          <div className="px-5 py-3.5 bg-ivory-100/80 border border-gold-500/15 rounded-2xl text-xs text-charcoal-400 text-center font-sans">
            Demo credentials pre-filled. Click Sign In to continue.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
