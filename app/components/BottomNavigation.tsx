"use client";

import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import Image from 'next/image';

const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      name: "Swap",
      path: "/swap",
      icon: "/icons/bottom/swap.svg",
      activeIcon: "/icons/bottom/swap.svg", // Optional active icon
    },
    {
      name: "Bridge",
      path: "/bridge",
      icon: "/icons/bottom/bridge.svg",
      activeIcon: "/icons/bottom/bridge.svg",
    },
    {
      name: "Faucet",
      path: "/faucet",
      icon: "/icons/bottom/faucet.svg",
      activeIcon: "/icons/bottom/faucet.svg",
    },
    {
      name: "Account",
      path: "/account",
      icon: "/icons/bottom/account.svg",
      activeIcon: "/icons/bottom/account.svg",
    },
  ];

  // Determine active tab based on current route
  const getActiveTab = () => {
    const currentItem = navItems.find(item => pathname.startsWith(item.path));
    return currentItem?.name || 'Swap'; // Default to Swap if no match
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = getActiveTab() === item.name;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 min-w-0 relative ${
                isActive ? "text-green-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className="mb-1">
                <Image 
                  src={isActive && item.activeIcon ? item.activeIcon : item.icon}
                  alt={item.name}
                  width={24}
                  height={24}
                  className={`object-contain ${
                    isActive ? "" : "opacity-70"
                  }`}
                />
              </div>
              <span className="text-xs font-medium">
                {item.name}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;