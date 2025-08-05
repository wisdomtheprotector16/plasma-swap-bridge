"use client"

import type React from "react"
import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactLenis, useLenis } from "lenis/react"
import {lenis} from "lenis"
import { useEffect, useRef, useState } from "react"

const inter = Inter({ subsets: ["latin"] })

function ScrollLogger() {
  const [log, setLog] = useState("")
  const lenisRef = useRef(null)

  useLenis((lenis) => {
    setLog(`Scroll Y: ${lenis.scroll}`)
    console.log(lenis.scroll);
    
  })

  return (
    <div
      style={{
        position: "absolute",
        bottom: "1rem",
        right: "1rem",
        background: "rgba(0,0,0,0.7)",
        color: "white",
        padding: "0.5rem 1rem",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        zIndex: 1000,
      }}
    >
      {log}
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactLenis root>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <ScrollLogger />
            {children}
          </ThemeProvider>
        </ReactLenis>
      </body>
    </html>
  )
}


