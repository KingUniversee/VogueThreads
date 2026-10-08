import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16">
      <Container>
        <div className="max-w-md mx-auto text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-surface-dark text-primary flex items-center justify-center mb-6 shadow-xl border border-white/10">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
            Error 404
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Piece Not Found
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            The collection or garment you are looking for has been archived, moved, or is no longer in circulation.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="primary" size="large" className="w-full">
                Return Home
              </Button>
            </Link>
            <Link href="/shop" className="w-full sm:w-auto">
              <Button variant="outline" size="large" className="w-full">
                Browse Shop
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
