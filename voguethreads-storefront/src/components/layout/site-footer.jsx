"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, RotateCcw, CreditCard } from "lucide-react";
import { Button } from "../ui/button";

const FOOTER_SECTIONS = [
  {
    title: "Shop",
    links: [
      { name: "Men's Collection", href: "/shop?gender=MEN" },
      { name: "Women's Collection", href: "/shop?gender=WOMEN" },
      { name: "Curated Collections", href: "/collections" },
      { name: "Oversized T-Shirts", href: "/shop?category=t-shirts" },
      { name: "Hoodies & Fleeces", href: "/shop?category=hoodies" },
      { name: "Cargo & Utility Pants", href: "/shop?category=pants" },
      { name: "End of Season Sale", href: "/shop?sale=true" },
    ],
  },
  {
    title: "Customer Support",
    links: [
      { name: "Track Your Order", href: "/account" },
      { name: "Shipping & Delivery Policy", href: "/shop" },
      { name: "7-Day Easy Returns", href: "/shop" },
      { name: "Size & Fit Guide", href: "/shop" },
      { name: "FAQs & Help Center", href: "/shop" },
      { name: "Contact Concierge", href: "/account" },
    ],
  },
  {
    title: "About VogueThreads",
    links: [
      { name: "Our Manifesto", href: "/collections" },
      { name: "Craftsmanship & Atelier", href: "/collections" },
      { name: "Store Locations", href: "/shop" },
      { name: "Careers & Creative", href: "/collections" },
      { name: "Editorial Journal", href: "/collections" },
      { name: "Admin Portal ↗", href: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000", target: "_blank" },
    ],
  },
  {
    title: "Legal & Security",
    links: [
      { name: "Terms of Service", href: "/checkout" },
      { name: "Privacy Policy", href: "/checkout" },
      { name: "Return & Refund Policy", href: "/shop" },
      { name: "GSTIN & Invoicing", href: "/checkout" },
      { name: "Cookie Preferences", href: "/" },
    ],
  },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubscribed(true);
  };

  return (
    <footer className="bg-vt-black text-white pt-16 sm:pt-20 pb-24 md:pb-16 border-t border-white/10">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Newsletter & Brand Bar */}
        <div className="pb-16 border-b border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-3">
            <Link
              href="/"
              className="font-display font-bold text-3xl sm:text-4xl tracking-[0.18em] text-white uppercase inline-block"
            >
              VogueThreads
            </Link>
            <p className="text-white/60 text-sm max-w-md font-light leading-relaxed">
              PREMIUM FASHION × MODERN TECH × FOR A BETTER YOU. Engineered for the next generation of modern wardrobes.
            </p>
          </div>

          {/* Newsletter Box */}
          <div className="lg:col-span-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white block mb-2">
                Join the VogueThreads Club
              </span>
              <p className="text-xs text-white/60 mb-4 font-light">
                Receive early access to seasonal drops, secret archives, and exclusive member-only releases.
              </p>

              {subscribed ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Thank you for joining. Welcome to VogueThreads.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    rightIcon={ArrowRight}
                    className="bg-white text-vt-black hover:bg-white/90 shrink-0 font-semibold"
                  >
                    Subscribe
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Middle Navigation Columns */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-white/90">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs text-white/60 hover:text-white transition-colors duration-200 block py-0.5"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Trust & Legal Bar */}
        <div className="pt-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-white/50">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-white/70" />
              Free Delivery &gt; ₹999
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-white/70" />
              7-Day Returns
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-white/70" />
              100% Authentic
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-white/70" />
              Razorpay & COD Verified
            </span>
          </div>

          <p className="text-[11px] text-white/40 text-center sm:text-right font-mono">
            &copy; {new Date().getFullYear()} VogueThreads. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
