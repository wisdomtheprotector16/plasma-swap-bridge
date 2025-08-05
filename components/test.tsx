// components/SvgBackgroundBox.tsx
import React from "react";
import Image from "next/image";

interface SvgBackgroundBoxProps {
  children: React.ReactNode;
  className?: string;
}

const SvgBackgroundBox: React.FC<SvgBackgroundBoxProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Background SVG */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/bg.svg" // Update this path
          alt="Decorative background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
};

export default SvgBackgroundBox;
