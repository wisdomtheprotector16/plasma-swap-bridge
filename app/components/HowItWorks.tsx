"use client"

import React, { useState, useEffect } from 'react';

const HowItWorks = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const steps = [
    {
      icon: '🔗',
      title: 'Connect & Select',
      description: 'Link your wallet and choose your preferred options'
    },
    {
      icon: '💲',
      title: 'Swap or Bridge',
      description: 'Execute your transaction with ease'
    },
    {
      icon: '⚙️',
      title: 'Set Your Tokens & Chains',
      description: 'Configure your tokens and blockchain networks'
    },
    {
      icon: '📊',
      title: 'Track in Real Time',
      description: 'Monitor your transactions in real-time'
    }
  ];

  // Auto-slide for mobile only
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Desktop View - All 4 items */}
      <div className="hidden md:block">
        <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
                <p className="text-xs opacity-90">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile View - Carousel */}
      <div className="md:hidden">
        <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold text-center mb-6">How It Works</h2>
          
          {/* Carousel Container */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {steps.map((step, index) => (
                <div key={index} className="w-full flex-shrink-0 text-center px-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">{step.icon}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm opacity-90">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;