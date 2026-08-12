import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Suspense } from "react"

import "@/index.css"
import { Providers } from "./providers"
import { getSiteUrl } from "@/lib/site-url"

// metadataBase is what makes every page's relative `alternates.canonical` and
// `openGraph.url` absolute. Deriving it from the request host is what makes the
// canonical follow the domain the visitor is actually on, across all routes.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteUrl()
  return {
    metadataBase: new URL(site),
    title: {
      default: "Fluiq | The Control Plane for AI Agents in Production",
      template: "%s | Fluiq",
    },
    description:
      "The control plane for AI agents in production: block prompt attacks, score trajectories, and trace every step with two lines of Python.",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "Fluiq",
      images: [
        {
          url: `${site}/banner.png`,
          width: 1200,
          height: 630,
          alt: "Fluiq, the control plane for AI agents in production",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${site}/banner.png`],
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

const websiteJsonLd = (site: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Fluiq",
  url: site,
  description:
    "The control plane for AI agents in production: block prompt attacks, score trajectories, and trace every step with two lines of Python.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${site}/documentation`,
    "query-input": "required name=search_term_string",
  },
})

const organizationJsonLd = (site: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fluiq",
  alternateName: "FluiqAI",
  url: site,
  logo: {
    "@type": "ImageObject",
    url: `${site}/logo.svg`,
    width: 512,
    height: 512,
  },
  description:
    "Fluiq is the control plane for AI agents in production. Two lines of Python add tracing, pre-call security blocking, and trajectory-level evaluation to any agent or LLM app.",
  slogan: "The control plane for AI agents in production.",
  // Topic entities Fluiq should be associated with in AI answers (AEO).
  knowsAbout: [
    "LLM observability",
    "LLM tracing",
    "AI security",
    "prompt injection detection",
    "PII redaction",
    "LLM evaluation",
    "LLM-as-judge",
    "hallucination detection",
    "prompt management",
    "AI agent observability",
    "AI agent governance",
    "agent trajectory evaluation",
    "MCP security",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${site}/contact`,
    availableLanguage: "English",
  },
  sameAs: ["https://github.com/fluiq-AI/fluiq-sdk"],
})

// Set the theme class before first paint to avoid a flash / hydration mismatch.
const themeInitScript = `(function(){try{var t=localStorage.getItem('fluiq-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteUrl()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* LLM crawler discovery */}
        <link rel="alternate" type="text/plain" title="LLM context (summary)" href="/llms.txt" />
        <link rel="alternate" type="text/plain" title="LLM context (full reference)" href="/llms-full.txt" />
        <link rel="alternate" type="text/markdown" title="Agent integration brief" href="/agents.md" />
        <meta name="llms-txt" content={`${site}/llms.txt`} />
        <meta name="llms-full-txt" content={`${site}/llms-full.txt`} />
        <meta name="agents-md" content={`${site}/agents.md`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(site)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(site)) }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-FCNNKDRDX6"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-FCNNKDRDX6');`}
        </Script>

        {/* Microsoft Clarity */}
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "x5xb3hthah");`}
        </Script>
      </body>
    </html>
  )
}
