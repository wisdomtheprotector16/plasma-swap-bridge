// app/(application)/layout.jsx
"use client";

import { useRouter } from 'next/navigation';
import BottomNavigation from '../components/BottomNavigation';

export default function ApplicationLayout({ children }) {
  const router = useRouter();

  const navigateTo = (path) => {
    router.push(`/(application)/${path}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      <BottomNavigation onNavigate={navigateTo} />
    </div>
  );
}