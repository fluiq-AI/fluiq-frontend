"use client"

import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Home01Icon } from "@hugeicons/core-free-icons"

import { SiteNavbar } from "@/components/SiteNavbar"
import { SiteFooter } from "@/components/SiteFooter"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
      <SiteNavbar />

      <section className="relative overflow-hidden">
        <HeroAtmosphere variant="center" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#E5E1D6] bg-[#F2F0E9]/80 px-4 py-1.5 text-[12px] backdrop-blur-sm dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/80">
            <span className="font-semibold text-[#1860D3] dark:text-[#6FA8FF]">404</span>
            <span className="text-[#D4CFC1] dark:text-[#444]">·</span>
            <span className="text-[#6B6B66] dark:text-[#9A9A92]">Page not found</span>
          </div>

          <h1 className="text-[72px] font-semibold leading-none tracking-tight sm:text-[112px]">
            404
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg text-[#6B6B66] dark:text-[#9A9A92]">
            We couldn&apos;t find the page you were looking for. It may have been moved,
            renamed, or never existed.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#1860D3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#134CA8] dark:bg-[#6FA8FF] dark:text-[#0A0A0A] dark:hover:bg-[#8FBCFF]"
            >
              <HugeiconsIcon icon={Home01Icon} size={16} />
              Back to home
            </Link>
            <Link
              to="/documentation"
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D6] px-6 py-3 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#F2F0E9] dark:border-[#2A2A2A] dark:text-[#FAF9F6] dark:hover:bg-[#1A1A1A]"
            >
              Read the docs
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6B6B66] dark:text-[#9A9A92]">
            <Link to="/pricing" className="transition-colors hover:text-[#1860D3] dark:hover:text-[#6FA8FF]">
              Pricing
            </Link>
            <Link to="/integrations" className="transition-colors hover:text-[#1860D3] dark:hover:text-[#6FA8FF]">
              Integrations
            </Link>
            <Link to="/blog" className="transition-colors hover:text-[#1860D3] dark:hover:text-[#6FA8FF]">
              Blog
            </Link>
            <Link to="/contact" className="transition-colors hover:text-[#1860D3] dark:hover:text-[#6FA8FF]">
              Contact
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
