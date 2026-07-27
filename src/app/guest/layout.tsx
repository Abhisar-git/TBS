'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Home, MapPin, PlusCircle, User, LogOut, Crown, Clock } from 'lucide-react';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('GUEST');
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-700 flex flex-col pb-24 font-sans">
      <header className="h-20 bg-white/90 backdrop-blur-md border-b border-gold-500/15 px-6 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-royal">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-royal-700 flex items-center justify-center shadow-gold-glow">
            <Crown className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-[10px] text-gold-700 font-sans font-bold uppercase tracking-[0.2em] block">
              The Bride Side
            </span>
            <h1 className="font-serif text-base text-royal-950 tracking-tight">Guest Concierge</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-charcoal-400 font-sans font-medium hidden sm:inline">{user?.name}</span>
          <button
            onClick={logout}
            className="p-2 text-charcoal-400 hover:text-royal-800 transition-colors duration-400"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-6 md:p-8 space-y-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-t border-gold-500/15 flex items-center justify-around z-40 px-4 shadow-royal">
        <Link
          href="/guest/dashboard"
          className={`flex flex-col items-center gap-1 text-xs font-sans transition-all duration-400 ${
            pathname === '/guest/dashboard' ? 'text-gold-700 font-semibold scale-105' : 'text-charcoal-400 hover:text-charcoal-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/guest/track"
          className={`flex flex-col items-center gap-1 text-xs font-sans transition-all duration-400 ${
            pathname === '/guest/track' ? 'text-gold-700 font-semibold scale-105' : 'text-charcoal-400 hover:text-charcoal-600'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Track</span>
        </Link>
        <Link
          href="/guest/request"
          className={`flex flex-col items-center gap-1 text-xs font-sans transition-all duration-400 ${
            pathname === '/guest/request' ? 'text-gold-700 font-semibold scale-105' : 'text-charcoal-400 hover:text-charcoal-600'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span>Request</span>
        </Link>
        <Link
          href="/guest/profile"
          className={`flex flex-col items-center gap-1 text-xs font-sans transition-all duration-400 ${
            pathname === '/guest/profile' ? 'text-gold-700 font-semibold scale-105' : 'text-charcoal-400 hover:text-charcoal-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
        <Link
          href="/guest/history"
          className={`flex flex-col items-center gap-1 text-xs font-sans transition-all duration-400 ${
            pathname === '/guest/history' ? 'text-gold-700 font-semibold scale-105' : 'text-charcoal-400 hover:text-charcoal-600'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>History</span>
        </Link>
      </nav>
    </div>
  );
}
