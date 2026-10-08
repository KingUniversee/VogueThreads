"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error("Invalid reset link. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        toast.success("Password updated successfully!");
      } else {
        toast.error(data.error || "Failed to reset password. Link may have expired.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <span className="text-xl font-black tracking-[0.25em] uppercase text-black dark:text-white">
              VogueThreads
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white uppercase">
            Create New Password
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Enter a secure password for {email || "your account"}.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your password has been reset securely. You can now sign in with your new credentials.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase shadow-lg hover:opacity-90 transition-all"
              >
                <span>Sign In to VogueThreads</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full h-11 pl-10 pr-11 rounded-xl text-xs sm:text-sm text-black dark:text-white bg-white/70 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xs focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-11 pl-10 pr-11 rounded-xl text-xs sm:text-sm text-black dark:text-white bg-white/70 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xs focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
