"use client";

import type React from "react";
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "SaaSify - Streamline Your Workflow",
//   description: "Boost productivity, reduce costs, and scale your business with our all-in-one SaaS platform.",
//   generator: 'v0.dev'
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);

      // Enable scroll normalization
      ScrollTrigger.normalizeScroll(true);

      // Optional: Add configuration
      // ScrollTrigger.normalizeScroll({
      //   type: "touch,wheel,pointer",
      //   momentum: self => Math.min(3, self.velocityY / 1000),
      // })

      return () => {
        // Cleanup
        ScrollTrigger.normalizeScroll(false);
        ScrollTrigger.getAll().forEach((instance) => instance.kill());
      };
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NextTopLoader
          color="green"
          initialPosition={0.8}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={100}
          shadow="0 0 10px #2299DD,0 0 5px #2299DD"
          template='<div class="bar" role="bar"><div class="peg"></div></div> 
  <div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
          zIndex={1600}
          showAtBottom={false}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// import type React from "react"
// import "@/styles/globals.css"
// import { Inter } from "next/font/google"
// import type { Metadata } from "next"
// import { ThemeProvider } from "@/components/theme-provider"

// const inter = Inter({ subsets: ["latin"] })

// export const metadata: Metadata = {
//   title: "SaaSify - Streamline Your Workflow",
//   description: "Boost productivity, reduce costs, and scale your business with our all-in-one SaaS platform.",
//     generator: 'v0.dev'
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body className={inter.className}>
//         <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
//           {children}
//         </ThemeProvider>
//       </body>
//     </html>
//   )
// }

// // im using nextjs
// // do what they said there to make the scrollling normallize
