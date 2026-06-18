import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Suspense } from "react"

import "@/index.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  metadataBase: new URL("https://getfluiq.com"),
  title: {
    default: "Fluiq — The AI Ops Stack for LLM Applications",
    template: "%s | Fluiq",
  },
  description:
    "The AI Ops stack for LLM applications — observe, secure, optimize, and evaluate every LLM call with two lines of Python.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Fluiq",
    images: [
      {
        url: "https://getfluiq.com/banner.png",
        width: 1200,
        height: 630,
        alt: "Fluiq — The AI Ops Stack for LLM Applications",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://getfluiq.com/banner.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Fluiq",
  url: "https://getfluiq.com",
  description:
    "The AI Ops stack for LLM applications — observe, secure, optimize, and evaluate every LLM call with two lines of Python.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://getfluiq.com/documentation",
    "query-input": "required name=search_term_string",
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fluiq",
  url: "https://getfluiq.com",
  logo: "https://getfluiq.com/logo.svg",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: "https://getfluiq.com/contact",
    availableLanguage: "English",
  },
  sameAs: ["https://github.com/fluiq-AI/fluiq-sdk"],
}

// Set the theme class before first paint to avoid a flash / hydration mismatch.
const themeInitScript = `(function(){try{var t=localStorage.getItem('fluiq-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* LLM crawler discovery */}
        <link rel="alternate" type="text/plain" title="LLM context (summary)" href="/llms.txt" />
        <link rel="alternate" type="text/plain" title="LLM context (full reference)" href="/llms-full.txt" />
        <meta name="llms-txt" content="https://getfluiq.com/llms.txt" />
        <meta name="llms-full-txt" content="https://getfluiq.com/llms-full.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
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
