import {
  ChevronDown,
  BarChart3,
  User,
  History,
  ArrowUpDown,
  Settings,
  Menu,
  X,
  TrendingUp,
  Bell,
  BarChart,
} from "lucide-react";

// This would normally be imported from your JSON file
export const navigationData = {
  logo: {
    name: "TrueFlow",
    href: "/",
  },
  navigationItems: [
    {
      title: "Swap",
      href: "/swap",
      isActive: true,
    },
    {
      title: "Bridge",
      href: "/bridge",
    },
    {
      title: "Faucet",
      href: "/faucet",
    },
    {
      title: "Tools",
      hasDropdown: true,
      dropdownItems: [
        {
          title: "Portfolio Tracker",
          description: "Track your crypto portfolio performance",
          href: "/portfolio",
          icon: "TrendingUp",
        },
        {
          title: "Price Alerts",
          description: "Set alerts for token price movements",
          href: "/alerts",
          icon: "Bell",
        },
        {
          title: "Analytics",
          description: "Advanced trading analytics and insights",
          href: "/analytics",
          icon: "BarChart",
        },
      ],
    },
    {
      title: "Account",
      hasDropdown: true,
      dropdownItems: [
        {
          title: "Dashboard",
          description: "Key metrics and performance of TrueFlow",
          href: "/dashboard",
          icon: "BarChart3",
        },
        {
          title: "Profile",
          description: "View and manage your TrueFlow Account",
          href: "/profile",
          icon: "User",
        },
        {
          title: "Transaction History",
          description: "View your transaction history and activity",
          href: "/transactions",
          icon: "History",
        },
      ],
    },
  ],
  // accountDropdownItems: [
  //   {
  //     title: "Dashboard",
  //     description: "Key metrics and performance of TrueFlow",
  //     href: "/dashboard",
  //     icon: "BarChart3"
  //   },
  //   {
  //     title: "Profile",
  //     description: "View and manage your TrueFlow Account",
  //     href: "/profile",
  //     icon: "User"
  //   },
  //   {
  //     title: "Transaction History",
  //     description: "View your transaction history and activity",
  //     href: "/transactions",
  //     icon: "History"
  //   }
  // ]
};

export const iconMap = {
  BarChart3: BarChart3,
  User: User,
  History: History,
};
