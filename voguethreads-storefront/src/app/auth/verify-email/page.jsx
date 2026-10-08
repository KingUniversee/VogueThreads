"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Mail, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "expired" | "invalid" | "already_verified" | "awaiting_click"
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!token && emailParam) {
      // User arrived directly after registration
      setStatus("awaiting_click");
      setMessage(`We've sent a verification link to ${emailParam}. Please check your inbox and click the link to activate your account.`);
      return;
    }

    if (!token || !emailParam) {
      setStatus("invalid");
      setMessage("Invalid or missing verification parameters.");
      return;
    }

    // Attempt token verification
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.alreadyVerified) {
            setStatus("already_verified");
            setMessage("Your email address is already verified. You can sign in immediately.");
          } else {
            setStatus("success");
            setMessage("Your email has been verified successfully. Welcome to VogueThreads.");
          }
        } else if (data.expired) {
          setStatus("expired");
          setMessage(data.error || "This verification link has expired. Please request a new one.");
        } else {
          setStatus("invalid");
          setMessage(data.error || "This verification link is invalid or has already been used.");
        }
      })
      .catch((err) => {
        console.error("Verification error:", err);
        setStatus("invalid");
        setMessage("An unexpected error occurred while verifying your email. Please try again.");
      });
  }, [token, emailParam]);

  // Handle Resend Link
  const handleResend = async () => {
    if (!emailParam) {
      toast.error("No email specified to resend verification.");
      return;
    }

    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Verification link sent! Please check your inbox.");
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.error || "Failed to resend verification email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to verification service.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl text-center">
        {/* State: Loading */}
        {status === "loading" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white uppercase">
              Verifying Your Credentials
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Validating security token with VogueThreads concierge...
            </p>
          </div>
        )}

        {/* State: Success or Already Verified */}
        {(status === "success" || status === "already_verified") && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white uppercase">
              {status === "already_verified" ? "Already Verified" : "Account Activated"}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {message}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase shadow-lg hover:opacity-90 transition-all"
            >
              <span>Sign In to VogueThreads</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* State: Awaiting Click (Post-registration confirmation view) */}
        {status === "awaiting_click" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white uppercase">
              Check Your Inbox
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {message}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-black dark:text-white hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : "Resend Verification Email"}
                </span>
              </button>
            </div>
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <Link href="/login" className="text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* State: Expired */}
        {status === "expired" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <Clock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white uppercase">
              Verification Link Expired
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {message}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Request New Verification Link"}
              </span>
            </button>
            <div>
              <Link href="/login" className="text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* State: Invalid */}
        {status === "invalid" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <XCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white uppercase">
              Invalid Verification
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {message}
            </p>
            {emailParam && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                <span>Request New Link</span>
              </button>
            )}
            <div>
              <Link href="/login" className="text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
