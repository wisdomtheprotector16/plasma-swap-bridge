"use client";

import SwapInterface from "../../components/SwapModal";
import BottomNavigation from "../../components/BottomNavigation";
import { TrueFlowHeaderRedirect } from "@/app/components/Header";

export default function TrueFlowApp() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TrueFlowHeaderRedirect/>
      <main className="py-8">
        <div className="container mx-auto px-4">
          <SwapInterface />
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
