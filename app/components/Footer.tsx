"use client";

import React from "react";
import { Twitter, Linkedin, MessageCircle, Mail } from "lucide-react";
import { TrueFlowLogo, TrueFlowLogoDark } from "./Header";

const Footer = () => {
  const menuLinks = [
    { name: "Swap", href: "/swap" },
    { name: "Bridge", href: "/bridge" },
    // { name: "Explore", href: "" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Account", href: "/account" },
  ];

  const supportLinks = [
    { name: "Help", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
  ];

  const socialLinks = [
    { name: "LinkedIn", icon: Linkedin, href: "#" },
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "Email", icon: Mail, href: "#" },
    { name: "Discord", icon: MessageCircle, href: "#" },
  ];

  return (
    <footer className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-4 md:gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <TrueFlowLogoDark />
            <p className="text-gray-400 text-sm leading-relaxed">
              TrueFlow makes routing your assets across chains as easy as a
              single click. Whether you're looking to swap tokens, bridge
              assets, or explore DeFi opportunities, TrueFlow empowers you with
              the tools you need to prosper in the future of finance.
            </p>
            <div className="pt-2">
              <a
                href="mailto:hello@trueflow.com"
                className="text-green-400 hover:text-green-300 text-sm"
              >
                hello@trueflow.com
              </a>
            </div>
          </div>

          {/* Menu Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Menu</h3>
            <ul className="space-y-3">
              {menuLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Social Media</h3>
            <ul className="space-y-3">
              {socialLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="flex items-center space-x-2 text-gray-400 hover:text-white text-sm transition-colors duration-200"
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{link.name}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <TrueFlowLogoDark/>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              TrueFlow makes routing your assets across chains as easy as a
              single click. Whether you're looking to swap tokens, bridge
              assets, or explore DeFi opportunities, TrueFlow empowers you with
              the tools you need to prosper in the future of finance.
            </p>
            <div className="pt-2">
              <a
                href="mailto:hello@trueflow.com"
                className="text-green-400 text-sm"
              >
                hello@trueflow.com
              </a>
            </div>
          </div>

          {/* Menu Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Menu</h3>
            <div className="grid grid-cols-2 gap-3">
              {menuLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-400 text-sm py-1"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <div className="space-y-3">
              {supportLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-gray-400 text-sm"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Social Media Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Social Media</h3>
            <div className="grid grid-cols-2 gap-3">
              {socialLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="flex items-center space-x-2 text-gray-400 text-sm"
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{link.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <p className="text-center text-gray-500 text-sm">
            Copyright © 2025 by TrueFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
