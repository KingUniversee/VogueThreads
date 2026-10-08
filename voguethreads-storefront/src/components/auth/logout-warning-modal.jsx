"use client";

import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { LogOut, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LogoutWarningModal({ open, onOpenChange, onConfirm }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear server-side HttpOnly session cookie
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (logoutErr) {
        console.warn("Could not clear server session cookie:", logoutErr);
      }

      if (onConfirm) {
        await onConfirm();
      } else {
        localStorage.removeItem("vt_user");
        window.dispatchEvent(new Event("vt_auth_changed"));
      }
      toast.info("Signed out of your VogueThreads account");
      onOpenChange(false);
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out cleanly. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Soft Frosted Backdrop */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md animate-fade-in transition-all" />

        {/* 100% Center Alignment Flex Shell */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto">
          {/* Liquid Glass Dialog Body */}
          <DialogPrimitive.Content
            className={cn(
              "pointer-events-auto relative w-[92%] max-w-md mx-auto my-auto",
              "p-6 sm:p-8 rounded-[2rem] text-text-primary shadow-2xl focus:outline-none",
              "animate-fade-in max-h-[90vh] overflow-y-auto"
            )}
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 248, 245, 0.92) 50%, rgba(255, 255, 255, 0.98) 100%)",
              backdropFilter: "blur(32px) saturate(190%)",
              WebkitBackdropFilter: "blur(32px) saturate(190%)",
              border: "1.5px solid rgba(255, 255, 255, 0.95)",
              boxShadow:
                "inset 0 1px 2px 0 #ffffff, 0 24px 60px -12px rgba(0, 0, 0, 0.3), 0 8px 24px -4px rgba(0, 0, 0, 0.15)",
            }}
          >
          {/* Close button */}
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              className="absolute top-5 right-5 p-2 rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors focus-ring cursor-pointer"
              aria-label="Close modal"
              disabled={isLoggingOut}
            >
              <X className="w-5 h-5" />
            </button>
          </DialogPrimitive.Close>

          {/* Modal Header with Warning Accent */}
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 shadow-inner">
              <LogOut className="w-7 h-7 text-rose-600 translate-x-0.5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-[9px] font-bold text-white">
                  !
                </span>
              </span>
            </div>

            <div>
              <DialogPrimitive.Title className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Sign Out Confirmation
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed max-w-sm">
                Are you sure you want to sign out of your VogueThreads account? You will need to log back in to access your order archives, saved addresses, and active wishlist.
              </DialogPrimitive.Description>
            </div>
          </div>

          {/* Security Notice Pill */}
          <div className="mt-5 p-3 rounded-xl bg-black/[0.03] border border-black/[0.06] flex items-center gap-2.5 text-xs text-text-secondary">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Active cart items will remain securely preserved on this device.</span>
          </div>

          {/* Dual Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-6 mt-6 border-t border-black/[0.08]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={isLoggingOut}
              className="w-full rounded-2xl text-xs font-semibold py-3.5 border-black/15 hover:bg-black/5 cursor-pointer whitespace-nowrap"
            >
              Stay Signed In
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={LogOut}
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="w-full rounded-2xl text-xs font-semibold py-3.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border-0 cursor-pointer whitespace-nowrap"
            >
              Sign Out
            </Button>
          </div>
        </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
