import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { AuthCard } from "@/components/auth/auth-card";
import { Sparkles, ShieldCheck, Truck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Sign In | VogueThreads",
  description:
    "Sign in to your VogueThreads account to manage orders, access your wishlist, and enjoy member privileges.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100vh-140px)] py-10 sm:py-16 flex items-center justify-center overflow-hidden">
      {/* Ambient Opalescent Lighting Accents */}
      <div className="absolute top-12 left-1/4 -translate-x-1/2 w-[420px] h-[420px] bg-white/50 rounded-full blur-[90px] pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-1/4 translate-x-1/2 w-[380px] h-[380px] bg-amber-100/30 rounded-full blur-[100px] pointer-events-none -z-10" />

      <Container>
        {/* Back Link */}
        <div className="max-w-5xl mx-auto mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5A5A5E] hover:text-[#141414] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>

        {/* Dual-Column Editorial Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
          {/* Left Column: Editorial Showcase (Visible on lg+) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col">
            <div
              className="relative rounded-[2.25rem] p-3.5 liquid-glass-card shadow-2xl transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.32) 50%, rgba(255, 255, 255, 0.55) 100%)",
                backdropFilter: "blur(28px) saturate(190%)",
                WebkitBackdropFilter: "blur(28px) saturate(190%)",
                border: "1.5px solid rgba(255, 255, 255, 0.85)",
                boxShadow: "inset 0 1px 2px 0 #ffffff, 0 20px 50px -10px rgba(0, 0, 0, 0.10)",
              }}
            >
              {/* Inset High-Fashion Editorial Imagery */}
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black/5">
                <Image
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"
                  alt="VogueThreads Editorial Runway"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover object-center scale-100 hover:scale-105 transition-transform duration-700"
                />

                {/* Floating Frosted Glass Header Pill */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-white/85 backdrop-blur-xl border border-white/90 text-[10px] font-bold tracking-[0.16em] uppercase text-[#141414] shadow-sm">
                    Editorial Season 04
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white/40 animate-pulse" />
                </div>

                {/* Floating Bottom Drawer with Member Perks */}
                <div className="absolute bottom-4 inset-x-4 p-4 rounded-xl bg-[#141414]/85 backdrop-blur-xl border border-white/20 text-white shadow-xl">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-bold tracking-widest uppercase mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Member Privileges</span>
                  </div>
                  <h3 className="font-display font-bold text-sm tracking-tight text-white mb-2">
                    Architectural Silhouettes & Luxury Basics
                  </h3>
                  <div className="space-y-1.5 text-[11px] text-white/80 font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Complimentary White-Glove Express Courier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Guaranteed Authenticity & Private Previews</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Liquid Glass Auth Card */}
          <div className="lg:col-span-7 flex justify-center">
            <Suspense fallback={<div className="w-full max-w-[480px] h-[520px] rounded-[2.25rem] bg-white/40 animate-pulse" />}>
              <AuthCard initialMode="login" />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}
