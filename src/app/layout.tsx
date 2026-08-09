import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import MobileNav from "@/components/MobileNav";
import TopProgress from "@/components/TopProgress";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["opsz", "wght"] });
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export const metadata: Metadata = {
  title: "Sappy Legacy",
  description: "Inventory, sales & purchase orders",
  icons: { icon: [{ url: "/favicon.svg?v=1", type: "image/svg+xml" }], apple: [{ url: "/favicon.svg?v=1" }] },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        <TopProgress />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-deep/[0.05] to-transparent" />
          <div className="absolute -left-40 -top-40 h-[22rem] w-[22rem] rounded-full animate-floaty sm:h-[34rem] sm:w-[34rem]" style={{ background: "radial-gradient(circle at center, rgba(6,95,70,0.12), transparent 62%)" }} />
          <div className="absolute right-[-12rem] top-1/3 h-[26rem] w-[26rem] rounded-full animate-floaty sm:h-[40rem] sm:w-[40rem]" style={{ animationDelay: "-6s", background: "radial-gradient(circle at center, rgba(16,185,129,0.12), transparent 62%)" }} />
          <div className="absolute -bottom-44 left-1/4 h-[24rem] w-[24rem] rounded-full animate-floaty sm:h-[32rem] sm:w-[32rem]" style={{ animationDelay: "-3s", background: "radial-gradient(circle at center, rgba(6,95,70,0.10), transparent 60%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(6,95,70,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        </div>
        <AuthProvider>
          <MobileNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}