"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

export default function AnimatedIcon() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const personIconRef = useRef<SVGSVGElement>(null);
  const settingsIconRef = useRef<SVGSVGElement>(null);
  const isMorphedRef = useRef(false);

  useEffect(() => {
    // Register the plugin
    gsap.registerPlugin(MorphSVGPlugin);

    // Initial setup
    if (settingsIconRef.current) {
      gsap.set(settingsIconRef.current, { opacity: 0 });
    }
  }, []);

  const handleClick = () => {
    const tl = gsap.timeline();
    const isMorphed = isMorphedRef.current;

    if (isMorphed) {
      // Morph back to person icon
      tl.to("#settingsCircle", {
        duration: 0.5,
        morphSVG: "#personHead",
        ease: "power2.inOut",
      })
        .to(
          "#settingsBottom, #settingsTop",
          {
            duration: 0.3,
            opacity: 0,
          },
          0
        )
        .to(
          "#personBody",
          {
            duration: 0.5,
            opacity: 1,
          },
          0
        )
        .to(settingsIconRef.current, {
          opacity: 0,
          duration: 0.3,
        })
        .to(
          personIconRef.current,
          {
            opacity: 1,
            duration: 0.3,
          },
          "<"
        );
    } else {
      // Morph to settings icon
      tl.to(personIconRef.current, {
        opacity: 0,
        duration: 0.3,
      })
        .to(
          settingsIconRef.current,
          {
            opacity: 1,
            duration: 0.3,
          },
          "<"
        )
        .to(
          "#personHead",
          {
            duration: 0.5,
            morphSVG: "#settingsCircle",
            ease: "power2.inOut",
          },
          0
        )
        .to(
          "#personBody",
          {
            duration: 0.3,
            opacity: 0,
          },
          0
        )
        .to(
          "#settingsBottom, #settingsTop",
          {
            duration: 0.5,
            opacity: 1,
          },
          0.3
        );
    }

    isMorphedRef.current = !isMorphed;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
      >
        Toggle Icon
      </button>

      <div className="relative w-12 h-12">
        {/* Person Icon */}
        <svg
          ref={personIconRef}
          id="personIcon"
          width="100%"
          height="100%"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <path
            d="M11.0001 11C13.5314 11 15.5834 8.94795 15.5834 6.41665C15.5834 3.88534 13.5314 1.83331 11.0001 1.83331C8.46878 1.83331 6.41675 3.88534 6.41675 6.41665C6.41675 8.94795 8.46878 11 11.0001 11Z"
            stroke="#8D8D8E"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M18.8741 20.1667C18.8741 16.6192 15.3449 13.75 10.9999 13.75C6.6549 13.75 3.12573 16.6192 3.12573 20.1667"
            stroke="#8D8D8E"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        {/* Settings Icon */}
        <svg
         ref={settingsIconRef}
          id="settingsIcon"
          width="100%"
          height="100%"
          viewBox="0 0 23 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <path
            d="M11.4999 20.1666C16.5625 20.1666 20.6666 16.0626 20.6666 11C20.6666 5.93737 16.5625 1.83331 11.4999 1.83331C6.43731 1.83331 2.33325 5.93737 2.33325 11C2.33325 16.0626 6.43731 20.1666 11.4999 20.1666Z"
            stroke="#8D8D8E"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.84253 13.3008C8.00753 13.5758 8.20919 13.8325 8.43836 14.0617C10.125 15.7483 12.8659 15.7483 14.5617 14.0617C15.2492 13.3742 15.6434 12.5033 15.7717 11.6141"
            stroke="#8D8D8E"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.22827 10.3858C7.3566 9.48749 7.75078 8.62578 8.43828 7.93828C10.1249 6.25161 12.8658 6.25161 14.5616 7.93828C14.7999 8.17661 14.9924 8.43329 15.1574 8.69913"
            stroke="#8D8D8E"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.66821 15.7483V13.3008H10.1157"
            stroke="#8D8D8E"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15.3315 6.25165V8.69913H12.884"
            stroke="#8D8D8E"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
