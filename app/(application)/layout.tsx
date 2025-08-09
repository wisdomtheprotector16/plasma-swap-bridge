// app/(application)/layout.jsx
"use client";

import { useRouter } from "next/navigation";
import BottomNavigation from "../components/BottomNavigation";

export default function ApplicationLayout({ children }) {
  const router = useRouter();

  const navigateTo = (path) => {
    router.push(`/(application)/${path}`);
  };

  return (
    <div className="min-h-screen relative">
      {/* Main content with bottom padding to prevent overlap */}
      <div className="pb-32">
      {/* <div className="pb-50"> */}
        {children}
      </div>
      {/* Fixed bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <BottomNavigation onNavigate={navigateTo} />
      </div>
    </div>
  );
}