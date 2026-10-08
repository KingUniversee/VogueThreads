"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AuthCard({ initialMode = "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sync mode with prop & load Google Identity script
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (mode === "signup" && !agreeTerms) {
      toast.error("Please accept the VogueThreads Terms of Service");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Dynamic registration API call
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.error || "Failed to create account. Please try again.");
          setIsLoading(false);
          return;
        }

        if (data.needsVerification) {
          toast.success("Account Created Successfully!", {
            description: "Please check your inbox to verify your email and activate your membership.",
          });
          router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
          return;
        }

        const userData = {
          id: data.user?.id,
          name: data.user?.name,
          email: data.user?.email,
          tier: "Member",
        };

        // Clear any stale local orders from previous browser sessions
        localStorage.removeItem("vt_orders");
        localStorage.setItem("vt_user", JSON.stringify(userData));
        window.dispatchEvent(new Event("vt_auth_changed"));

        toast.success("Account Created Successfully!", {
          description: `Welcome to VogueThreads, ${userData.name}.`,
        });
        router.push(callbackUrl);
      } else {
        // Dynamic login API call
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.needsVerification) {
            toast.error(data.error || "Please verify your email address to sign in.", {
              action: {
                label: "Verify Email",
                onClick: () => router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`),
              },
            });
          } else {
            toast.error(data.error || "Invalid email or password. Please try again.");
          }
          setIsLoading(false);
          return;
        }

        const userData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          tier: "Member",
        };

        // Clear any stale local orders from previous browser sessions
        localStorage.removeItem("vt_orders");
        localStorage.setItem("vt_user", JSON.stringify(userData));
        window.dispatchEvent(new Event("vt_auth_changed"));

        toast.success("Welcome Back!", {
          description: `Signed in as ${userData.email}`,
        });
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      } else {
        toast.error(data?.error || "Failed to initialize Google Sign In");
      }
    } catch (err) {
      console.warn("Direct Google OAuth error:", err);
      toast.error("Failed to connect to Google Sign In service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleAuth = () => {
    toast.info("Apple Sign-In will be supported in an upcoming update.");
  };

  return (
    <>
      <div
        className="relative w-full max-w-[480px] mx-auto rounded-[2.25rem] p-6 sm:p-9 liquid-glass-card shadow-2xl transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0.60) 100%)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          border: "1.5px solid rgba(255, 255, 255, 0.90)",
          boxShadow: "inset 0 1px 2px 0 #ffffff, inset 0 -1px 1px 0 rgba(255, 255, 255, 0.4), 0 24px 60px -12px rgba(0, 0, 0, 0.10)",
        }}
      >
        {/* Header Tag - Atelier text & Private Client Access removed as requested */}
        <div className="flex items-center justify-start mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-xs text-[10px] font-bold tracking-[0.18em] uppercase text-[#141414]">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>VogueThreads</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="relative flex p-1 mb-7 rounded-2xl bg-black/[0.05] border border-white/60 backdrop-blur-md">
          <Link
            href="/login"
            onClick={() => setMode("login")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider",
              mode === "login"
                ? "bg-white text-[#141414] shadow-sm border border-white/80"
                : "text-[#5A5A5E] hover:text-[#141414]"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            onClick={() => setMode("signup")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider",
              mode === "signup"
                ? "bg-white text-[#141414] shadow-sm border border-white/80"
                : "text-[#5A5A5E] hover:text-[#141414]"
            )}
          >
            Create Account
          </Link>
        </div>

        {/* Editorial Title */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#141414]">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A5E] mt-1.5 leading-relaxed">
            {mode === "login"
              ? "Access your saved curations, orders, and member privileges."
              : "Create an account to explore new collections, order tracking & member privileges."}
          </p>
        </div>

        {/* Primary Action: One-Click Verified Google Authentication */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="group relative w-full h-12 rounded-2xl bg-white hover:bg-slate-50 border-2 border-[#141414]/15 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3 px-4 text-xs sm:text-sm font-bold text-[#141414] cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {mode === "login" ? "Sign In with Google" : "Sign Up with Google"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold tracking-wider ml-auto">
              Verified
            </span>
          </button>
          <p className="text-[11px] text-[#8E8E93] text-center mt-2 font-medium">
            Recommended • Instant sign-in with verified Google Account
          </p>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-black/[0.08]" />
          <span className="relative px-3 text-[10px] uppercase font-bold tracking-[0.2em] text-[#8E8E93] bg-[#F1EFE9]/90 backdrop-blur-md rounded-full">
            Or With Email & Password
          </span>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name field (Sign Up only) */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/80">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm text-[#141414] bg-white/70 backdrop-blur-md border border-[#E5E2DC] placeholder:text-[#8E8E93] shadow-xs focus:bg-white focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/80">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm text-[#141414] bg-white/70 backdrop-blur-md border border-[#E5E2DC] placeholder:text-[#8E8E93] shadow-xs focus:bg-white focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 focus:outline-none transition-all"
              />
            </div>
            {mode === "signup" &&
              (email.toLowerCase().includes("@gmail") ||
                email.toLowerCase().includes("@googlemail")) && (
                <div className="text-[11px] text-[#5A5A5E] bg-black/[0.03] p-2 rounded-xl border border-black/[0.06] flex items-center justify-between gap-2">
                  <span>Tip: You can also use 1-click Google Sign-In above.</span>
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="font-bold text-[#141414] underline hover:text-black cursor-pointer shrink-0"
                  >
                    Use Google
                  </button>
                </div>
              )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/80">
                Password
              </label>
              {mode === "login" && (
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] font-semibold text-[#141414] hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-11 rounded-xl text-xs sm:text-sm text-[#141414] bg-white/70 backdrop-blur-md border border-[#E5E2DC] placeholder:text-[#8E8E93] shadow-xs focus:bg-white focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8E8E93] hover:text-[#141414] transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me / Terms Checkbox */}
          {mode === "login" ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="relative flex items-center gap-2 text-xs text-[#5A5A5E] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D1D6] text-[#141414] accent-[#141414] focus:ring-[#141414]/20 cursor-pointer"
                />
                <span>Keep me signed in</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#141414] font-medium hover:underline underline-offset-2 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#D1D1D6] text-[#141414] accent-[#141414] focus:ring-[#141414]/20 cursor-pointer"
              />
              <label htmlFor="agree-terms" className="text-xs text-[#5A5A5E] cursor-pointer leading-tight">
                I agree to the{" "}
                <Link href="/checkout" className="font-semibold text-[#141414] underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/checkout" className="font-semibold text-[#141414] underline underline-offset-2">
                  Privacy Policy
                </Link>.
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full h-12 rounded-2xl bg-[#141414] text-white font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-black/15 hover:bg-[#2C2C2E] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>


        {/* Trust & Security Note */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#8E8E93]">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>256-bit encrypted • VogueThreads luxury member protection</span>
        </div>

        {/* Footer Switcher Note */}
        <div className="mt-7 pt-4 border-t border-black/[0.06] text-center text-xs text-[#5A5A5E]">
          {mode === "login" ? (
            <span>
              New to VogueThreads?{" "}
              <Link
                href="/signup"
                onClick={() => setMode("signup")}
                className="font-bold text-[#141414] hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
              >
                Sign Up
              </Link>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <Link
                href="/login"
                onClick={() => setMode("login")}
                className="font-bold text-[#141414] hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
              >
                Sign In
              </Link>
            </span>
          )}
        </div>
      </div>
    </>
  );
}
