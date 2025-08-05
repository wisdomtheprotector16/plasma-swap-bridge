"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users,
  BarChart,
  Layers,
} from "lucide-react";
// import { Button } from "@/components/ui/button";

import { useTheme } from "next-themes";
import Hero from "@/app/components/Hero";
import SwapInterface from "@/app/components/SwapModal";
import SwappingBridgingSection from "./components/SwapBridgeInfo";
import HowItWorks from "./components/HowItWorks";
import FAQ from "./components/FAQ";
import CommunitySection from "./components/CommunitySection";
import Footer from "./components/Footer";
import TrueFlowHeader from "./components/Header";
import Button from "@/components/fancybutton";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // const toggleTheme = () => {
  //   setTheme(theme === "dark" ? "light" : "dark");
  // };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TrueFlowHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <Hero />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Move Freely, Flow Securely
          </h1>
          <p className="text-md md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Swap, bridge, and manage assets across chains, fast, gas efficient,
            and built for DeFi's future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Launch App
              <span className="ml-2">
                {" "}
                {/* Add margin-left */}
                <img className="size-4" src="/icons/export.svg" alt="" />
              </span>
            </Button>
          </div>
        </motion.div>

        {/* Swap Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <SwapInterface />
        </motion.div>

        <SwappingBridgingSection />

        <HowItWorks />

        <FAQ />
        <CommunitySection />

        <Footer />
        {/* Logos Section */}
        {/* <section className="w-full py-12 border-y bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Trusted by innovative companies worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Image
                    key={i}
                    src={`/placeholder-logo.svg`}
                    alt={`Company logo ${i}`}
                    width={120}
                    height={60}
                    className="h-8 w-auto opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          </div>
        </section> */}
      </main>
    </div>
  );
}
