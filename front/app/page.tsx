"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import InfiniteHero from "@/components/ui/infinite-hero"
import {
  Shield,
  Zap,
  Droplets,
  Smartphone,
  FileText,
  Lock,
  Globe,
  Cpu,
  TrendingUp,
  Users,
  Award,
  Rocket,
  ArrowLeftRight,
} from "lucide-react"

interface LandingProps {
  onNavigate: (page: string) => void
}

export default function TZunamiApp() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ scrollBehavior: "smooth" }}>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <InfiniteHero />
      </section>

      {/* Features Section */}
      <section className="relative min-h-screen py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-bold mb-8 text-purple-400 tracking-tight">Features</h2>
            <p className="text-xl text-purple-200 max-w-3xl mx-auto leading-relaxed">
              Revolutionary DeFi infrastructure built for privacy, compliance, and seamless user experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {[
              {
                icon: Shield,
                title: "Privacy-first Trading",
                description: "Shielded balances + stealth addresses for complete transaction privacy",
                color: "purple",
              },
              {
                icon: FileText,
                title: "Compliance-friendly",
                description: "zk-attestations and AML/KYC integration for regulatory compliance",
                color: "pink",
              },
              {
                icon: Droplets,
                title: "Liquidity-rich",
                description: "Direct integration with Uniswap v4 liquidity pools",
                color: "purple",
              },
              {
                icon: Smartphone,
                title: "User-friendly UX",
                description: "Mobile-first design that hides complexity behind intuitive interfaces",
                color: "pink",
              },
              {
                icon: Globe,
                title: "Cross-chain Ready",
                description: "Multi-chain support for seamless asset movement",
                color: "purple",
              },
              {
                icon: Cpu,
                title: "Advanced zk-Proofs",
                description: "Cutting-edge zero-knowledge technology for maximum privacy",
                color: "pink",
              },
              {
                icon: TrendingUp,
                title: "Real-time Analytics",
                description: "Comprehensive trading insights and portfolio tracking",
                color: "purple",
              },
              {
                icon: Award,
                title: "Institutional Grade",
                description: "Enterprise-level security and compliance standards",
                color: "pink",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-white/5 border-white/15 p-8 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:rotate-1 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="relative">
                  <feature.icon
                    className={`w-12 h-12 mb-6 transition-all duration-300 group-hover:scale-110 ${
                      feature.color === "purple" ? "text-purple-400" : "text-pink-400"
                    }`}
                  />
                  <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-purple-200 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-purple-200 leading-relaxed group-hover:text-white transition-colors">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* User Flow Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Deposit Flow",
                description: "Seamlessly deposit assets with automatic privacy shielding and instant confirmation",
                step: "01",
                icon: Droplets,
              },
              {
                title: "Private Swap Flow",
                description: "Execute trades with complete anonymity, compliance verification, and optimal routing",
                step: "02",
                icon: ArrowLeftRight,
              },
              {
                title: "Withdraw Flow",
                description: "Withdraw to any address with optional compliance verification and instant settlement",
                step: "03",
                icon: Rocket,
              },
            ].map((flow, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-500 hover:scale-105 hover:-rotate-1 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{ background: "rgba(139,92,246,0.05)" }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl font-bold text-purple-400 group-hover:text-pink-400 transition-colors">
                    {flow.step}
                  </div>
                  <flow.icon className="w-8 h-8 text-purple-400 group-hover:text-pink-400 transition-all duration-300 group-hover:scale-110" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white group-hover:text-purple-200 transition-colors">
                  {flow.title}
                </h3>
                <p className="text-purple-200 leading-relaxed group-hover:text-white transition-colors">
                  {flow.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-pink-950/20 to-black" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-pink-400 tracking-tight">Trusted by Thousands</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: "$2.5B+", label: "Total Volume Traded", icon: TrendingUp },
              { number: "50K+", label: "Active Users", icon: Users },
              { number: "99.9%", label: "Uptime", icon: Shield },
              { number: "24/7", label: "Support", icon: Globe },
            ].map((stat, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-white/5 border-white/15 p-8 text-center hover:bg-white/10 transition-all duration-500 hover:scale-105 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <stat.icon className="w-10 h-10 text-pink-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-4xl font-bold text-white mb-2 group-hover:text-pink-200 transition-colors">
                  {stat.number}
                </div>
                <div className="text-pink-200 font-medium group-hover:text-white transition-colors">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
