import React from 'react';
import { Twitter, Linkedin, MessageCircle, Mail } from 'lucide-react';

const CommunitySection = () => {
  const socialLinks = [
    {
      name: 'X (Twitter)',
      icon: Twitter,
      href: '#',
      color: 'hover:bg-blue-600'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: '#',
      color: 'hover:bg-blue-700'
    },
    {
      name: 'Discord',
      icon: MessageCircle,
      href: '#',
      color: 'hover:bg-indigo-600'
    },
    {
      name: 'Email',
      icon: Mail,
      href: '#',
      color: 'hover:bg-green-600'
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="bg-black rounded-2xl p-6 md:p-8 text-white">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">
          Join the TrueFlow Community
        </h2>
        
        {/* Desktop Layout - 4 buttons in a row */}
        <div className="hidden md:flex justify-center items-center gap-4">
          {socialLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                className={`
                  flex items-center justify-center gap-3 px-6 py-3 
                  bg-gray-800 rounded-lg font-medium text-sm
                  transition-all duration-200 transform hover:scale-105
                  ${link.color} hover:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50
                  min-w-[120px]
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span>{link.name}</span>
              </a>
            );
          })}
        </div>

        {/* Mobile Layout - Stacked buttons */}
        <div className="md:hidden space-y-3">
          {socialLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                className={`
                  flex items-center justify-center gap-3 w-full py-3 px-6
                  bg-gray-800 rounded-lg font-medium text-sm
                  transition-all duration-200 transform active:scale-95
                  ${link.color} active:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span>{link.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommunitySection;