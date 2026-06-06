import { Helmet } from "react-helmet-async"
import { Link } from "react-router"

const LAST_UPDATED = "May 27, 2026"

const SECTIONS = [
  { id: "overview",        label: "Overview" },
  { id: "what-we-collect", label: "What We Collect" },
  { id: "trace-data",      label: "LLM Trace Data" },
  { id: "how-we-use",      label: "How We Use It" },
  { id: "sharing",         label: "Data Sharing" },
  { id: "retention",       label: "Retention" },
  { id: "security",        label: "Security" },
  { id: "your-rights",     label: "Your Rights" },
  { id: "cookies",         label: "Cookies" },
  { id: "international",   label: "International Transfers" },
  { id: "children",        label: "Children's Privacy" },
  { id: "changes",         label: "Policy Changes" },
  { id: "contact",         label: "Contact" },
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

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Privacy Policy — Fluiq</title>
        <meta name="description" content="Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA." />
        <link rel="canonical" href="https://getfluiq.com/privacy" />
        <meta property="og:url" content="https://getfluiq.com/privacy" />
        <meta property="og:title" content="Privacy Policy — Fluiq" />
        <meta property="og:description" content="Fluiq's privacy policy: what data we collect, how we use LLM trace data, data retention, and your rights under GDPR and CCPA." />
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fluiq" className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">Fluiq</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
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
            <h1 className="font-heading text-4xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="mt-3 text-muted-foreground">
              Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span>
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-2xl">
              This policy explains what data Fluiq, Inc. ("Fluiq", "we", "our") collects when you use
              our LLM observability, security, and optimization platform, how we use it, and the controls
              you have over it.
            </p>
          </div>

          <div className="space-y-12">

            <Section id="overview" title="Overview">
              <P>
                Fluiq is a developer infrastructure product. Our core purpose is to help engineering teams
                instrument, monitor, and improve their AI pipelines — not to monetise user data. We collect
                the minimum information needed to operate the service and we never sell your data or your
                users' data to third parties.
              </P>
              <P>
                We are a US-incorporated company. We store data primarily in the United States and
                process it under applicable law including GDPR for European users and CCPA for California
                residents.
              </P>
            </Section>

            <Section id="what-we-collect" title="What We Collect">
              <P>We collect information in three categories:</P>
              <p className="font-medium text-foreground">Account & identity</p>
              <Ul items={[
                "Name and email address when you register or log in via GitHub/Google OAuth",
                "Password hash (bcrypt) — we never store plaintext passwords",
                "Organization name and your role within it",
                "Billing contact details if you subscribe to a paid plan (processed by Stripe; we store only Stripe customer IDs)",
              ]} />
              <p className="font-medium text-foreground mt-4">Usage & product telemetry</p>
              <Ul items={[
                "API key metadata (name, prefix, creation date) — not the raw key value after creation",
                "Dashboard page views and feature interactions for product analytics",
                "Errors and performance metrics from the Fluiq web application itself",
                "Timestamps of logins and session activity",
              ]} />
              <p className="font-medium text-foreground mt-4">Infrastructure & logs</p>
              <Ul items={[
                "IP addresses in server access logs, retained for 30 days",
                "HTTP request metadata for security and abuse prevention",
              ]} />
            </Section>

            <Section id="trace-data" title="LLM Trace Data">
              <P>
                The primary data you send to Fluiq via our SDK is LLM trace data — the requests and
                responses flowing through your AI pipelines. This is the most sensitive data type we
                handle, and we apply the following principles to it:
              </P>
              <Ul items={[
                "Trace data is stored under your organization's namespace and is never mixed with another organization's data.",
                "Traces are transmitted over TLS and stored encrypted at rest using AES-256.",
                "We access trace content only when required to operate the service (e.g. rendering it in your dashboard, running your configured eval prompts, or performing security scans you have enabled).",
                "We do not use your trace data to train any AI model — ours or a third party's — without your explicit written consent.",
                "If your traces contain personal data about your end-users, you are the data controller for that data and Fluiq is the data processor. You are responsible for ensuring you have the appropriate legal basis to share that data with us.",
              ]} />
              <P>
                Our security scanning feature (fluiq.secure()) sends prompt content to our classification
                service. The classification runs on infrastructure we control; prompt content is not
                forwarded to any external AI provider for the scan itself.
              </P>
            </Section>

            <Section id="how-we-use" title="How We Use Your Information">
              <P>We use the information we collect to:</P>
              <Ul items={[
                "Provide, operate, and improve the Fluiq platform and SDK",
                "Authenticate you and maintain session security",
                "Render trace data, evaluations, and analytics in your dashboard",
                "Run security scans and guardrail checks when you enable fluiq.secure()",
                "Send transactional emails (password resets, plan confirmations, usage alerts)",
                "Detect and prevent abuse, fraud, or violations of our Terms of Service",
                "Comply with legal obligations",
                "Send product updates and announcements — you can opt out at any time",
              ]} />
              <P>
                We do not use your data for advertising, we do not build ad profiles, and we do not
                share data with advertising networks.
              </P>
            </Section>

            <Section id="sharing" title="Data Sharing and Disclosure">
              <P>
                We do not sell your personal data. We share it only in these limited circumstances:
              </P>
              <Ul items={[
                "Service providers: cloud infrastructure (AWS), payment processing (Stripe), error monitoring (Sentry), and email delivery (Resend). Each is bound by a data processing agreement.",
                "Within your organization: members of your Fluiq organization can view shared resources such as traces and API key metadata.",
                "Legal requirements: we may disclose data if required by law, court order, or to protect the rights and safety of Fluiq or others.",
                "Business transfers: if Fluiq is acquired or merges with another company, your data may transfer as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.",
              ]} />
            </Section>

            <Section id="retention" title="Data Retention">
              <Ul items={[
                "Account data: retained for the lifetime of your account and deleted within 90 days of account closure.",
                "Trace data: retained according to your plan (Free: 30 days rolling; Team: 90 days; Growth: 1 year; Enterprise: configurable). You can delete traces at any time via the API or dashboard.",
                "Security scan results: retained alongside trace data and subject to the same retention schedule.",
                "Audit log: retained for 1 year on all plans. The audit log is append-only and cannot be modified.",
                "Server access logs: 30 days.",
                "Backups: encrypted backups are retained for up to 30 days after the active record is deleted.",
              ]} />
            </Section>

            <Section id="security" title="Security">
              <P>
                We implement industry-standard controls to protect your data:
              </P>
              <Ul items={[
                "All data in transit is encrypted with TLS 1.2 or higher",
                "All data at rest is encrypted with AES-256",
                "API keys are hashed; the raw key is shown only once at creation",
                "Audit logs are HMAC-SHA256 signed for tamper detection",
                "Access to production systems is restricted to authorized personnel via MFA-protected accounts",
                "We undergo periodic security reviews and respond to responsible disclosure reports",
              ]} />
              <P>
                No security measure is perfect. If you discover a vulnerability, please report it to
                security@getfluiq.com. We aim to respond within 48 hours.
              </P>
            </Section>

            <Section id="your-rights" title="Your Rights">
              <P>
                Depending on your location, you may have the following rights regarding your personal data:
              </P>
              <Ul items={[
                "Access: request a copy of the personal data we hold about you",
                "Correction: ask us to correct inaccurate data",
                "Deletion: request deletion of your account and associated data",
                "Portability: request an export of your data in a machine-readable format",
                "Restriction: ask us to pause processing of your data in certain circumstances",
                "Objection: object to processing based on legitimate interest",
                "Opt-out of marketing: unsubscribe from non-transactional emails at any time",
              ]} />
              <P>
                To exercise any of these rights, email privacy@getfluiq.com. We will respond within 30 days.
                For EU/EEA residents, you also have the right to lodge a complaint with your local data
                protection authority.
              </P>
              <P>
                California residents may additionally request disclosure of the categories of personal
                information shared with third parties for their direct marketing purposes in the preceding
                calendar year. We do not share personal information for direct marketing.
              </P>
            </Section>

            <Section id="cookies" title="Cookies and Tracking">
              <P>
                We use a minimal set of cookies:
              </P>
              <Ul items={[
                "Session cookie: a signed, HttpOnly cookie used solely to maintain your authenticated session. Expires when you sign out or after 30 days of inactivity.",
                "Preference cookie: stores your UI theme (light/dark). No personal data.",
              ]} />
              <P>
                We do not use third-party tracking pixels, advertising cookies, or behavioral analytics
                cookies. Our product analytics are self-hosted and do not share data with external
                analytics providers.
              </P>
            </Section>

            <Section id="international" title="International Data Transfers">
              <P>
                Fluiq is headquartered in the United States. If you access the service from the European
                Economic Area, United Kingdom, or Switzerland, your data is transferred to the US under
                Standard Contractual Clauses (SCCs) adopted by the European Commission. A copy of the
                applicable SCCs is available on request.
              </P>
            </Section>

            <Section id="children" title="Children's Privacy">
              <P>
                The Fluiq platform is a professional developer tool and is not directed at children under
                the age of 16. We do not knowingly collect personal information from children. If you
                believe we have inadvertently collected such information, please contact us at
                privacy@getfluiq.com and we will delete it promptly.
              </P>
            </Section>

            <Section id="changes" title="Changes to This Policy">
              <P>
                We may update this Privacy Policy from time to time. When we make material changes we
                will notify registered users by email at least 14 days before the change takes effect
                and display a notice in the dashboard. Continued use of the service after that date
                constitutes acceptance of the updated policy.
              </P>
              <P>
                The version date at the top of this page always reflects the most recent update.
                Previous versions are available on request.
              </P>
            </Section>

            <Section id="contact" title="Contact">
              <P>
                For privacy-related questions, data subject requests, or concerns about our practices,
                please contact:
              </P>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-1 text-sm">
                <p className="font-medium text-foreground">Fluiq, Inc.</p>
                <p>Privacy inquiries: <a href="mailto:privacy@getfluiq.com" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">privacy@getfluiq.com</a></p>
                <p>Security disclosures: <a href="mailto:security@getfluiq.com" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">security@getfluiq.com</a></p>
                <p>General: <a href="mailto:hello@getfluiq.com" className="text-[#1860D3] dark:text-[#6FA8FF] hover:underline">hello@getfluiq.com</a></p>
              </div>
            </Section>

          </div>

          {/* Footer nav */}
          <div className="mt-16 flex items-center justify-between border-t border-border/60 pt-8 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Fluiq, Inc.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-[#1860D3] dark:hover:text-[#6FA8FF] transition-colors">Terms of Service</Link>
              <Link to="/" className="hover:text-[#1860D3] dark:hover:text-[#6FA8FF] transition-colors">Home</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
