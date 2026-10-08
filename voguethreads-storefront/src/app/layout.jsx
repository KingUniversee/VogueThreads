import "./globals.css";
import { StorefrontShell } from "@/components/layout/storefront-shell";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: "VogueThreads | Modern Luxury & Premium Streetwear",
  description:
    "Discover high-end oversized tees, graphic hoodies, tailored trousers, and minimal luxury essentials from VogueThreads. Engineered for modern wardrobes.",
  keywords: [
    "VogueThreads",
    "Luxury Streetwear",
    "Designer Apparel",
    "Oversized T-Shirts",
    "Hoodies",
    "Cargo Pants",
    "Fashion Commerce",
  ],
  authors: [{ name: "VogueThreads Fashion Retail" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans bg-[#E8E4DC] text-vt-black antialiased selection:bg-vt-black selection:text-white">
        <StorefrontShell>{children}</StorefrontShell>
      </body>
    </html>
  );
}
