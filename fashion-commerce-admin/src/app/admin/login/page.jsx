"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  Sparkles,
  Layers,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Successful authentication -> redirect to callbackUrl or /
      const callbackUrl = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("callbackUrl") || "/"
        : "/";
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setErrorMessage("Unable to connect to the authentication server. Please check your connection.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FBFBFA] flex antialiased text-stone-900 selection:bg-stone-900 selection:text-stone-50">
      {/* ========================================================================= */}
      {/* LEFT PANEL: EDITORIAL BRAND EXPERIENCE (Desktop / Tablet)                 */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative flex-col justify-between p-12 xl:p-16 bg-[#0E0E11] text-stone-200 overflow-hidden select-none border-r border-stone-800/80">
        {/* Subtle Luxury Atmospheric Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#18181D]/60 via-[#0E0E11] to-[#0A0A0C] z-0" />
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-stone-800/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-stone-700/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Brand Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo
            variant="full"
            theme="white"
            size="md"
            subtext="ATELIER & COMMERCE OS"
            showSubtext={true}
          />

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-stone-800 bg-stone-900/60 text-[10px] font-mono tracking-widest text-stone-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CORE ACTIVE</span>
          </div>
        </div>

        {/* Center: Editorial Art Piece & Campaign Treatment */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          {/* Subtle Season Stamp */}
          <div className="inline-flex items-center gap-2 mb-6 text-[10px] font-mono tracking-[0.3em] text-stone-400 uppercase">
            <span className="h-px w-6 bg-stone-700" />
            <span>Edition 2026 // Collection Matrix</span>
          </div>

          {/* Main Statement */}
          <h2 className="text-3xl xl:text-4xl font-light tracking-tight text-stone-100 leading-[1.25] mb-6">
            Fashion, curated with <span className="italic font-serif text-stone-300">intention</span>.
          </h2>

          <p className="text-xs xl:text-sm text-stone-400 font-normal leading-relaxed mb-8 max-w-md">
            The dedicated administrative operating system for VogueThreads. Orchestrating
            apparel design matrices, real-time variant inventories, and omni-channel fulfillment with precision.
          </p>

          {/* Editorial Visual Composition Card */}
          <div className="relative rounded-sm border border-stone-800/80 bg-stone-900/40 p-5 backdrop-blur-sm shadow-2xl">
            {/* Fine hairline accents */}
            <div className="absolute top-0 right-0 h-4 w-4 border-t border-r border-stone-600" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-stone-600" />

            <div className="grid grid-cols-3 gap-3 text-center divide-x divide-stone-800/70">
              <div className="px-2">
                <span className="block text-[9px] font-mono tracking-[0.2em] text-stone-500 uppercase mb-1">
                  MATRIX
                </span>
                <span className="text-xs font-semibold tracking-wider text-stone-200">
                  Color × Size
                </span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] font-mono tracking-[0.2em] text-stone-500 uppercase mb-1">
                  LEDGER
                </span>
                <span className="text-xs font-semibold tracking-wider text-stone-200">
                  Double-Entry
                </span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] font-mono tracking-[0.2em] text-stone-500 uppercase mb-1">
                  TAX / GST
                </span>
                <span className="text-xs font-semibold tracking-wider text-stone-200">
                  HSN Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Details */}
        <div className="relative z-10 pt-6 border-t border-stone-800/60 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <span>PRIVATE ATELIER NETWORK</span>
          <span>© 2026 VOGUETHREADS RETAIL</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: FOCUSED AUTHENTICATION PORTAL                                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 overflow-y-auto">
        {/* Mobile / Tablet Top Header Brand Element */}
        <div className="lg:hidden flex items-center justify-between pb-8 mb-4 border-b border-stone-200">
          <Logo
            variant="full"
            theme="dark"
            size="sm"
            subtext="ADMIN PORTAL"
            showSubtext={true}
          />
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            Commerce Admin
          </span>
        </div>

        <div className="hidden lg:block">
          {/* Elegant top subtle status indicator */}
          <div className="flex items-center justify-end text-[11px] font-mono text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-stone-400" />
              <span>SECURE ACCESS PORTAL</span>
            </span>
          </div>
        </div>

        {/* Central Form Container */}
        <div className="my-auto w-full max-w-[380px] mx-auto py-8">
          {/* Header Typography */}
          <div className="mb-8 text-left">
            <div className="mb-5">
              <Logo
                variant="full"
                theme="dark"
                size="md"
                subtext="COMMERCE ADMIN"
                showSubtext={true}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-stone-950 mb-2">
              Welcome back
            </h1>
            <p className="text-xs text-stone-500 font-normal">
              Sign in to manage your store, apparel catalog, and fulfillment.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-sm border-l-2 border-rose-600 bg-rose-50/80 p-3.5 text-xs text-rose-900 flex items-start gap-2.5 transition-all animate-in fade-in-50"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Address */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="admin-email"
                className="block text-[10px] font-mono uppercase tracking-[0.16em] font-semibold text-stone-700"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-11 px-3.5 text-xs text-stone-900 bg-white border border-stone-200 rounded-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="block text-[10px] font-mono uppercase tracking-[0.16em] font-semibold text-stone-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-11 pl-3.5 pr-10 text-xs text-stone-900 bg-white border border-stone-200 rounded-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors disabled:bg-stone-50 disabled:cursor-not-allowed font-mono text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 focus:outline-none transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Help Link */}
            <div className="flex items-center justify-between pt-0.5 text-xs text-stone-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-stone-300 text-stone-900 focus:ring-stone-900 transition-colors"
                />
                <span className="text-[11px] text-stone-600">Remember session</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert(
                    "Password recovery is managed by the Super Administrator. Please consult the system administrator or check the server seed credentials."
                  )
                }
                className="text-[11px] text-stone-500 hover:text-stone-900 underline-offset-4 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-stone-950 hover:bg-stone-800 active:bg-black text-white text-xs font-semibold uppercase tracking-[0.18em] rounded-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-stone-300" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 group-hover:text-stone-200 transition-all" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Security / Governance Notice */}
        <div className="pt-8 border-t border-stone-200/80 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-stone-400" />
            <span>SESSION ENCRYPTION ACTIVE (HS256)</span>
          </div>
          <span>AUTHORIZED PERSONNEL ONLY</span>
        </div>
      </div>
    </div>
  );
}
