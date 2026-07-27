'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Crown, Heart, ShieldCheck, Star, Users, MapPin, CheckCircle2 } from 'lucide-react';
import { Spotlight } from '@/components/ui/Spotlight';
import { GlowingCard } from '@/components/ui/GlowingCard';
import { BentoGrid, BentoGridItem } from '@/components/ui/BentoGrid';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-900 overflow-hidden relative">
      {/* Aceternity Spotlight Glow */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#D4AF37" />

      {/* Navigation Header */}
      <nav className="editorial-container py-6 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-royal-700 flex items-center justify-center shadow-gold-glow">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-serif text-xl text-royal-950 font-bold tracking-tight block">
              The Bride Side
            </span>
            <span className="text-[10px] text-gold-700 font-sans tracking-[0.2em] uppercase font-semibold">
              Royal Wedding Hospitality
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="btn-secondary text-xs !px-6 !py-2.5 shadow-sm hover:shadow-gold-glow"
        >
          Concierge Login
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="editorial-container pt-16 pb-24 md:pt-28 md:pb-36 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-gold-500/30 shadow-royal">
            <Sparkles className="w-4 h-4 text-gold-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-xs font-sans font-bold text-royal-800 tracking-widest uppercase">
              Delhi &middot; Bharat Mandapam &middot; Private Royal Fleet
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-royal-950 leading-[1.1] tracking-tight m-2">
            Welcoming Every Guest
            <span className="block italic gold-gradient-text mt-2 font-normal">
              With Royal Elegance & Care
            </span>
          </h1>

          <p className="text-charcoal-600 text-base md:text-xl leading-relaxed max-w-2xl mx-auto font-sans font-light">
            Helping with all transportation needs for Wedding guests
          </p>

          {/* Luxury Portal Action Gateways */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
            <Link href="/login?role=guest" className="btn-gold group w-full sm:w-auto">
              <Heart className="w-4 h-4 text-royal-950 fill-royal-950/20" />
              <span>Guest Concierge</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>

            <Link href="/login?role=admin" className="btn-royal group w-full sm:w-auto">
              <Crown className="w-4 h-4 text-gold-400" />
              <span>Operations Center</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>

            <Link href="/login?role=driver" className="btn-secondary group w-full sm:w-auto">
              <span>Chauffeur Console</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Aceternity Bento Grid Showcase Section */}
      <section className="py-24 bg-white/60 backdrop-blur-md border-t border-gold-500/15 relative z-10">
        <div className="editorial-container space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-sans font-bold text-gold-600 uppercase tracking-[0.25em]">
              The Experience
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-royal-950">
              Orchestrated to Perfection
            </h2>
            <p className="text-xs md:text-sm text-charcoal-400 font-sans max-w-md mx-auto">
              Every arrival, transfer, and hotel escort handled with imperial precision.
            </p>
          </div>

          <BentoGrid>
            <BentoGridItem
              title="Personalized Guest Reception"
              description="Chauffeurs greet guests upon arrival at IGI T3 airport and major Delhi hubs with real-time flight tracking."
              header={
                <div className="w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-ivory-100 to-gold-50 flex items-center justify-center border border-gold-500/15">
                  <Crown className="w-10 h-10 text-gold-500" />
                </div>
              }
              icon={<Heart className="w-5 h-5 text-gold-600" />}
              className="md:col-span-2"
            />

            <BentoGridItem
              title="Zero Wait Protocol"
              description="Intelligent matching ensures zero delay during peak guest arrival windows."
              header={
                <div className="w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-royal-900 to-royal-950 flex items-center justify-center border border-gold-500/30">
                  <Sparkles className="w-10 h-10 text-gold-400" />
                </div>
              }
              icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            />

            <BentoGridItem
              title="Luxury Hotel Accommodations"
              description="Direct luxury transfers to Taj Palace, The Leela Palace, ITC Maurya, and JW Marriott Aerocity."
              header={
                <div className="w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-gold-50 to-ivory-200 flex items-center justify-center border border-gold-500/15">
                  <Star className="w-10 h-10 text-gold-500" />
                </div>
              }
              icon={<MapPin className="w-5 h-5 text-gold-600" />}
            />

            <BentoGridItem
              title="Live Concierge Tracking"
              description="Guests view real-time chauffeur map updates, ETA times, and driver contacts in their private portal."
              header={
                <div className="w-full h-full min-h-[6rem] rounded-2xl bg-gradient-to-br from-royal-800 via-royal-900 to-royal-950 flex items-center justify-center border border-gold-500/30">
                  <Users className="w-10 h-10 text-gold-300" />
                </div>
              }
              icon={<CheckCircle2 className="w-5 h-5 text-gold-400" />}
              className="md:col-span-2"
            />
          </BentoGrid>
        </div>
      </section>

      {/* Royal Event Highlights Strip */}
      <section className="bg-royal-gradient text-white py-16 relative z-10 border-t border-gold-500/30 shadow-royal-glow">
        <div className="editorial-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <p className="font-serif text-4xl md:text-5xl gold-gradient-text font-bold">50+</p>
              <p className="text-xs text-gold-300 font-sans uppercase tracking-[0.2em]">Distinguished Guests</p>
            </div>
            <div className="space-y-2">
              <p className="font-serif text-4xl md:text-5xl gold-gradient-text font-bold">15</p>
              <p className="text-xs text-gold-300 font-sans uppercase tracking-[0.2em]">Royal Chauffeur Fleet</p>
            </div>
            <div className="space-y-2">
              <p className="font-serif text-4xl md:text-5xl gold-gradient-text font-bold">4</p>
              <p className="text-xs text-gold-300 font-sans uppercase tracking-[0.2em]">Luxury Partner Palaces</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-royal-950 text-white border-t border-gold-500/20 py-12 relative z-10">
        <div className="editorial-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-gold-400" />
            <span className="font-serif text-lg text-white">The Bride Side</span>
            <span className="text-xs text-gold-400/80 font-sans tracking-widest uppercase">&middot; Royal Wedding Experience</span>
          </div>
          <p className="text-xs text-gold-300/60 font-sans">
            Bharat Mandapam &middot; Taj Palace &middot; The Leela Palace &middot; ITC Maurya &middot; JW Marriott Aerocity
          </p>
        </div>
      </footer>
    </div>
  );
}
