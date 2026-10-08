"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log client errors if necessary
    console.error("Storefront Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16">
      <Container>
        <div className="max-w-md mx-auto text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 shadow-sm border border-destructive/20">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-destructive mb-2">
            System Interruption
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            We encountered an unexpected error while preparing this view. Please attempt to refresh the display or return to the main gallery.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
            <Button
              variant="primary"
              size="large"
              onClick={() => reset()}
              leftIcon={RefreshCw}
              className="w-full sm:w-auto"
            >
              Try Again
            </Button>
            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="large"
                leftIcon={Home}
                className="w-full"
              >
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
