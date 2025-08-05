"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { navigationData, iconMap } from "./constant";
import { Text } from "@/components/text";

const tokens = [
  { symbol: "USDC", name: "USD Coin", balance: "0", price: "$1.00" },
  { symbol: "USDT", name: "Tether USD", balance: "0", price: "$1.00" },
  { symbol: "ETH", name: "Ethereum", balance: "0", price: "$2,456.78" },
  { symbol: "BTC", name: "Bitcoin", balance: "0", price: "$42,123.45" },
];

const slippageOptions = ["1%", "2%", "5%", "Max"];

export function TrueFlowLogo() {
  return (
    <div className="flex items-center gap-2 min-w-max">
      <img
        src="/logo.jpg" // Replace with your actual image path
        alt="TrueFlow Logo"
        className="w-16 h-16 sm:w-12 sm:h-12 md:h-16 md:w-16 object-contain flex-shrink-0" // Added object-contain and flex-shrink-0
      />
      {/* <span className="text-lg font-bold text-gray-900 sm:text-xl whitespace-nowrap">
        TrueFlow
      </span> */}
    </div>
  );
}
export function TrueFlowLogoDark() {
  return (
    <div className="flex items-center gap-2 min-w-max">
      <img
        src="/logo-dark.svg" // Replace with your actual image path
        alt="TrueFlow Logo"
        className="w-16 h-16 sm:w-12 sm:h-12 md:h-16 md:w-16 object-contain flex-shrink-0" // Added object-contain and flex-shrink-0
      />
      {/* <span className="text-lg font-bold text-gray-900 sm:text-xl whitespace-nowrap">
        TrueFlow
      </span> */}
    </div>
  );
}

function ListItem({ className, title, children, icon: Icon, ...props }) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
}

export default function TrueFlowHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full  ">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <TrueFlowLogo />
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationData.navigationItems.map((item, index) => (
              <NavigationMenuItem key={index}>
                {item.hasDropdown ? (
                  <>
                    <NavigationMenuTrigger className="flex items-center gap-1">
                      {item.title}
                      {/* <ChevronDown className="h-3 w-3" /> */}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[300px] gap-3 p-4">
                        {item.dropdownItems.map(
                          (dropdownItem, dropdownIndex) => {
                            const Icon = iconMap[dropdownItem.icon];
                            return (
                              <ListItem
                                key={dropdownIndex}
                                title={dropdownItem.title}
                                href={dropdownItem.href}
                                icon={Icon}
                              >
                                {dropdownItem.description}
                              </ListItem>
                            );
                          }
                        )}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={item.href} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        item.isActive && "text-green-600 font-semibold"
                      )}
                    >
                      {item.title}
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}

            {/* Account Dropdown */}
            {/* <NavigationMenuItem>
              <NavigationMenuTrigger className="flex items-center gap-1">
                Account
                <ChevronDown className="h-3 w-3" />
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-3 p-4">
                  {navigationData.accountDropdownItems.map((item, index) => {
                    const Icon = iconMap[item.icon];
                    return (
                      <ListItem
                        key={index}
                        title={item.title}
                        href={item.href}
                        icon={Icon}
                      >
                        {item.description}
                      </ListItem>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem> */}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Connect Wallet Button */}
        {/* <Button className="hidden md:flex bg-green-600 hover:bg-green-700 text-white">
          Connect Wallet
        </Button> */}

        {/* Mobile Menu */}
        <Link href="/swap">
          <Text
            as="p"
            variant="muted"
            size="md"
            className=" max-w-2xl bg-neutral-100 rounded-full px-3 py-1 flex items-center gap-1 "
          >
            Launch App
            <span>
              <img className="w-3 h-3" src="/icons/exportdark.svg" alt="" />
            </span>
          </Text>
        </Link>
      </div>
    </header>
  );
}

export function TrueFlowHeaderRedirect() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full  ">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <TrueFlowLogo />
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationData.navigationItems.map((item, index) => (
              <NavigationMenuItem key={index}>
                {item.hasDropdown ? (
                  <>
                    <NavigationMenuTrigger className="flex items-center gap-1">
                      {item.title}
                      {/* <ChevronDown className="h-3 w-3" /> */}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[300px] gap-3 p-4">
                        {item.dropdownItems.map(
                          (dropdownItem, dropdownIndex) => {
                            const Icon = iconMap[dropdownItem.icon];
                            return (
                              <ListItem
                                key={dropdownIndex}
                                title={dropdownItem.title}
                                href={dropdownItem.href}
                                icon={Icon}
                              >
                                {dropdownItem.description}
                              </ListItem>
                            );
                          }
                        )}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={item.href} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        item.isActive && "text-green-600 font-semibold"
                      )}
                    >
                      {item.title}
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Connect Wallet Button */}
        {/* <Button className="hidden md:flex bg-green-600 hover:bg-green-700 text-white">
          Connect Wallet
        </Button> */}

        {/* Mobile Menu */}
        <Link href="/">
          <Text
            as="p"
            variant="label"
            size="md"
            className=" max-w-2xl bg-neutral-100 rounded-full px-3 py-1 flex items-center gap-1 "
          >
            Go Home
            <span>
              <img className="w-3 h-3" src="/icons/exportdark.svg" alt="" />
            </span>
          </Text>
        </Link>
      </div>
    </header>
  );
}

