import { Helmet } from "react-helmet-async"
import { Link } from "react-router"

const LAST_UPDATED = "May 27, 2026"

const SECTIONS = [
  { id: "acceptance",    label: "Acceptance" },
  { id: "service",      label: "The Service" },
  { id: "accounts",     label: "Accounts" },
  { id: "acceptable",   label: "Acceptable Use" },
  { id: "data",         label: "Your Data" },
  { id: "payment",      label: "Payment & Plans" },
  { id: "ip",           label: "Intellectual Property" },
  { id: "disclaimer",   label: "Disclaimer" },
  { id: "liability",    label: "Limitation of Liability" },
  { id: "termination",  label: "Termination" },
  { id: "governing",    label: "Governing Law" },
  { id: "contact",      label: "Contact" },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-4 flex items-center gap-2">
        <span className="inline-block w-1 h-5 rounded-full bg-[#1860D3] dark:bg-[#6FA8FF] shrink-0" />
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground pl-3">
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1860D3]/50 dark:bg-[#6FA8FF]/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Terms of Service — Fluiq</title>
        <meta name="description" content="Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements." />
        <meta name="keywords" content="Fluiq terms of service, acceptable use, data ownership, API usage, billing, enterprise agreements" />
        <link rel="canonical" href="https://getfluiq.com/terms" />
        <meta property="og:url" content="https://getfluiq.com/terms" />
        <meta property="og:title" content="Terms of Service — Fluiq" />
        <meta property="og:description" content="Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Terms of Service — Fluiq",
          "description": "Fluiq's terms of service: acceptable use, data ownership, API usage, billing, and enterprise agreements.",
          "url": "https://getfluiq.com/terms",
          "isPartOf": { "@id": "https://getfluiq.com" },
        })}</script>
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 md:grid md:grid-cols-[220px_1fr] md:gap-14">
        {/* Sticky TOC */}
        <aside className="hidden md:block">
          <nav className="sticky top-24 space-y-0.5">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Contents
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[#EEF3FD] dark:hover:bg-[#1A2A4A]/40 hover:text-[#1860D3] dark:hover:text-[#6FA8FF]"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Document body */}
        <main className="min-w-0">
          {/* Title block */}
          <div className="mb-10 border-b border-border/60 pb-8">
            <h1 className="font-heading text-4xl font-semibold tracking-tight">Terms of Service</h1>
            <p className="mt-3 text-muted-foreground">
              Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span>
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-2xl">
              These Terms of Service ("Terms") govern your access to and use of the Fluiq platform,
              SDK, APIs, and related services operated by Fluiq, Inc. ("Fluiq", "we", "our").
              By creating an account or using the service, you agree to these Terms.
            </p>
          </div>

          <div className="space-y-12">

            <Section id="acceptance" title="Acceptance of Terms">
              <P>
                By accessing or using Fluiq, you confirm that you are at least 18 years old, have the
                legal authority to enter into these Terms on behalf of yourself or the organization you
                represent, and agree to be bound by these Terms and our Privacy Policy.
              </P>
              <P>
                If you are using Fluiq on behalf of a company or other legal entity, "you" refers to
                that entity and you represent that you have authority to bind it to these Terms.
              </P>
            </Section>

            <Section id="service" title="The Service">
              <P>
                Fluiq provides a developer platform for LLM observability, security scanning, evaluation,
                prompt management, and optimization. The service includes:
              </P>
              <Ul items={[
                "The Fluiq Python SDK and any future language SDKs",
                "The Fluiq web dashboard at dashboard.getfluiq.com",
                "The Fluiq REST API at api.getfluiq.com",
                "Documentation at getfluiq.com/documentation",
              ]} />
              <P>
                We reserve the right to modify, suspend, or discontinue any part of the service at any
                time. We will provide reasonable notice for material changes that affect paid subscribers.
              </P>
            </Section>

            <Section id="accounts" title="Accounts and Organizations">
              <Ul items={[
                "You must provide accurate registration information and keep it current.",
                "You are responsible for maintaining the confidentiality of your credentials and API keys.",
                "You are responsible for all activity that occurs under your account or organization.",
                "You must notify us immediately at security@getfluiq.com if you suspect unauthorized access.",
                "You may not share accounts or allow multiple individuals to access the service under a single set of credentials.",
                "We may suspend or terminate accounts that violate these Terms.",
              ]} />
            </Section>

            <Section id="acceptable" title="Acceptable Use">
              <P>You agree not to use Fluiq to:</P>
              <Ul items={[
                "Violate any applicable law or regulation",
                "Transmit or store content that is illegal, harmful, or infringes third-party rights",
                "Reverse-engineer, decompile, or attempt to extract our proprietary models or systems",
                "Probe, scan, or test the vulnerability of our infrastructure without prior written authorization",
                "Circumvent any rate limits, access controls, or authentication mechanisms",
                "Use the service to build a competing product that substantially replicates Fluiq's functionality",
                "Transmit malware, ransomware, or any malicious code",
                "Engage in any activity that degrades the service for other users",
              ]} />
              <P>
                We may suspend or terminate access immediately and without notice for violations that
                pose a security risk or legal liability to Fluiq or other users.
              </P>
            </Section>

            <Section id="data" title="Your Data">
              <P>
                You retain all ownership rights to the data you submit to Fluiq, including LLM trace
                data, prompts, and evaluation datasets ("Customer Data").
              </P>
              <P>
                You grant Fluiq a limited, non-exclusive, worldwide license to store, process, and
                transmit Customer Data solely to provide the service. We do not claim any broader rights
                in your data.
              </P>
              <P>
                You represent and warrant that you have all necessary rights and consents to submit
                Customer Data to Fluiq, including end-user consent where required by applicable law.
              </P>
              <P>
                Our collection and use of personal data is governed by our{" "}
                <Link to="/privacy" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </P>
            </Section>

            <Section id="payment" title="Payment and Plans">
              <Ul items={[
                "Free plan: limited to 5 million traces total with no credit card required.",
                "Paid plans (Team, Growth, Enterprise): billed monthly or annually via Stripe. Prices are listed on the pricing page and may change with 30 days notice.",
                "All fees are non-refundable except where required by law or as expressly stated in your plan.",
                "Overdue invoices may result in suspension of service after a 7-day grace period.",
                "You may cancel your paid subscription at any time. Cancellation takes effect at the end of the current billing period; you retain access until then.",
                "Enterprise agreements may be subject to a separate order form that supersedes these Terms where they conflict.",
              ]} />
            </Section>

            <Section id="ip" title="Intellectual Property">
              <P>
                Fluiq and its licensors own all right, title, and interest in the platform, SDK, APIs,
                documentation, and underlying technology, including all intellectual property rights.
                These Terms do not grant you any rights to Fluiq's trademarks, logos, or brand features.
              </P>
              <P>
                Feedback, suggestions, or ideas you share with us may be used by Fluiq without
                obligation or compensation to you.
              </P>
            </Section>

            <Section id="disclaimer" title="Disclaimer of Warranties">
              <P>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </P>
              <P>
                We do not warrant that the service will be uninterrupted, error-free, or that defects
                will be corrected. Security scanning results are probabilistic and should not be relied
                upon as the sole security control in your system.
              </P>
            </Section>

            <Section id="liability" title="Limitation of Liability">
              <P>
                TO THE FULLEST EXTENT PERMITTED BY LAW, FLUIQ'S TOTAL CUMULATIVE LIABILITY TO YOU FOR
                ALL CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE
                GREATER OF (A) THE FEES YOU PAID IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) USD $100.
              </P>
              <P>
                IN NO EVENT SHALL FLUIQ BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, EVEN
                IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </P>
            </Section>

            <Section id="termination" title="Termination">
              <P>
                Either party may terminate these Terms at any time. You may close your account through
                the dashboard Profile page. We may terminate or suspend your access immediately if you
                breach these Terms or pose a risk to the security or integrity of the service.
              </P>
              <P>
                Upon termination, your right to use the service ceases immediately. Provisions that by
                their nature should survive (including IP ownership, disclaimers, limitations of
                liability, and governing law) will survive termination.
              </P>
            </Section>

            <Section id="governing" title="Governing Law and Disputes">
              <P>
                These Terms are governed by the laws of the State of Delaware, United States, without
                regard to conflict-of-law principles. Any dispute arising from these Terms shall be
                resolved exclusively in the state or federal courts located in Delaware, and you consent
                to personal jurisdiction there.
              </P>
              <P>
                For EU/EEA residents: nothing in these Terms limits your rights under mandatory consumer
                protection laws in your country of residence.
              </P>
            </Section>

            <Section id="contact" title="Contact">
              <P>
                Questions about these Terms should be directed to:
              </P>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-1 text-sm">
                <p className="font-medium text-foreground">Fluiq, Inc.</p>
                <p>Legal: <a href="mailto:legal@getfluiq.com" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">legal@getfluiq.com</a></p>
                <p>General: <a href="mailto:hello@getfluiq.com" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">hello@getfluiq.com</a></p>
              </div>
            </Section>

          </div>

          {/* Footer nav */}
          <div className="mt-16 flex items-center justify-between border-t border-border/60 pt-8 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Fluiq, Inc.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-[#1860D3] dark:hover:text-[#6FA8FF] transition-colors">Privacy Policy</Link>
              <Link to="/" className="hover:text-[#1860D3] dark:hover:text-[#6FA8FF] transition-colors">Home</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
