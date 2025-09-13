import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tsunami Privacy",
  description: "Private. Compliant. DeFi-native.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global Navbar */}
        <header className="sticky top-0 z-50 w-full">
          {/* Full-width glass bar */}
          <div className="w-full backdrop-blur-3xl backdrop-saturate-200 border-b border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_24px_rgba(0,0,0,0.35)]" style={{ background: "transparent" }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-white/90">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white">
                  <span className="text-black font-bold">T</span>
                </span>
                <span className="font-semibold">Tsunami</span>
              </Link>
              <nav className="flex items-center gap-2 sm:gap-3">
                <Link href="/dash" className="px-3 py-1.5 text-sm rounded-md bg-white/10 border border-white/15 text-white/85 hover:bg-white/15">Dashboard</Link>
                <Link href="/deposit" className="px-3 py-1.5 text-sm rounded-md bg-white/10 border border-white/15 text-white/85 hover:bg-white/15">Deposit</Link>
                <Link href="/swap" className="px-3 py-1.5 text-sm rounded-md bg-white/10 border border-white/15 text-white/85 hover:bg-white/15">Swap</Link>
                <Link href="/withdraw" className="px-3 py-1.5 text-sm rounded-md bg-white/10 border border-white/15 text-white/85 hover:bg-white/15">Withdraw</Link>
                <Link href="/onboarding" className="px-3 py-1.5 text-sm rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 text-white font-semibold hover:brightness-110">Get Started</Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="w-full pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
