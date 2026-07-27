'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Clock,
  Users,
  Car,
  Route,
  Zap,
  Building2,
  LogOut,
  Menu,
  X,
  Crown,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Guest Requests', href: '/admin/requests', icon: Clock },
  { name: 'Guest Directory', href: '/admin/guests', icon: Users },
  { name: 'Royal Chauffeurs', href: '/admin/drivers', icon: Car },
  { name: 'Transfer Monitor', href: '/admin/trips', icon: Route },
  { name: 'Batch Optimization', href: '/admin/batch', icon: Zap },
  { name: 'Luxury Lodging', href: '/admin/accommodations', icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('ADMIN');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-800 flex flex-col md:flex-row font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-royal-950 text-white shrink-0 border-r border-gold-500/20 shadow-royal-glow">
        <div className="p-6 border-b border-gold-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-royal-700 flex items-center justify-center shadow-gold-glow">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-lg text-white tracking-wide">The Bride Side</h1>
            <p className="text-[10px] font-sans text-gold-400 uppercase tracking-[0.2em] font-semibold">
              Hospitality Operations
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-sans font-medium transition-all duration-400 ${
                  isActive
                    ? 'bg-royal-800 text-gold-400 border border-gold-400/30 shadow-gold-glow'
                    : 'text-charcoal-300 hover:text-white hover:bg-royal-900/60'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-gold-400' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gold-500/20">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-royal-900/80 border border-gold-500/20">
            <div className="truncate">
              <p className="text-xs font-sans font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gold-400 truncate">Event Director</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-charcoal-400 hover:text-royal-300 transition-colors duration-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-royal-950 text-white sticky top-0 z-50 shadow-royal">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-royal-700 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-serif text-sm text-white">The Bride Side</span>
            <span className="text-[9px] text-gold-400 uppercase tracking-widest block">Operations Center</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gold-300"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[61px] bg-royal-950/95 backdrop-blur-md z-40 p-5 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-sans font-medium ${
                  isActive
                    ? 'bg-royal-800 text-gold-400 border border-gold-400/20'
                    : 'text-charcoal-300 hover:bg-royal-900/60'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-sans font-medium text-royal-300 hover:bg-royal-900/60 mt-4 border border-royal-400/20"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
