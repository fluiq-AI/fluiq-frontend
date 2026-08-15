"use client"

import "@/styles/home.css"
import React, { useCallback } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe"
import { useSiblingOrigin } from "@/contexts/SiteHostContext"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  CloudServerIcon,
  DatabaseIcon,
  GithubIcon,
  GlobalIcon,
  Shield01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons"

import { CodeBlock } from "@/components/code-block"
import { syntaxHighlight } from "@/pages/Documentation/syntaxHighlight"
import { useScrollReveal } from "@/pages/Home/hooks/useScrollReveal"
import { SiteNavbar } from "@/components/SiteNavbar"
import { SiteFooter } from "@/components/SiteFooter"
import { GrainOverlay, HeroAtmosphere } from "@/components/SiteBackdrop"
import { EASE_OUT } from "@/pages/Home/utils/constants"

const border = "border-[#D4CFC1] dark:border-[#1A1A1A]"
const panelBorder = "border-[#E5E1D6] dark:border-[#2A2A2A]"

const REPO_URL = "https://github.com/SaurabhKumbhar24/Infrager"

const GENERATED_TF = `resource "aws_security_group" "web_sg" {
  name        = "Web SG"
  description = "Managed by Infrager"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app_server" {
  ami                    = "ami-0c02fb55956c7d316"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.private_subnet_b.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.app_role.name
}`

const CAPABILITIES = [
  {
    kicker: "canvas",
    title: "Draw the architecture",
    body: "Drag VPCs, subnets, security groups, instances, load balancers, databases, buckets, and IAM roles onto a canvas. Connect two nodes and Infrager works out what the relationship means.",
  },
  {
    kicker: "codegen",
    title: "Get Terraform, ordered",
    body: "Every change regenerates HCL sorted by dependency, with provider blocks per cloud and variables for anything secret. Copy it or download main.tf.",
  },
  {
    kicker: "lint",
    title: "Catch problems on the canvas",
    body: "Rules run on every edit and mark the offending node. An SSH port open to the world shows up as you draw it, not in a compliance review three weeks later.",
  },
  {
    kicker: "aws + gcp",
    title: "Two clouds, 150+ services",
    body: "Eight core AWS resources have typed properties and security rules. Everything else, across AWS and Google Cloud, comes from a searchable catalog that emits real Terraform.",
  },
  {
    kicker: "workspace",
    title: "Projects that persist",
    body: "Sign in, keep as many architectures as you want, and let autosave handle the rest. Diagrams stay in your workspace.",
  },
  {
    kicker: "MIT",
    title: "Open source, free",
    body: "The whole thing is on GitHub under MIT. Codegen and linting run in your browser, so diagrams never need to leave it to become Terraform.",
  },
]

const LINT_RULES = [
  "Security groups exposing SSH, RDP, or database ports to 0.0.0.0/0",
  "S3 buckets without a public access block",
  "RDS instances and buckets without encryption at rest",
  "IAM policies granting Action or Resource wildcards",
  "Databases marked publicly accessible",
  "Resources missing their VPC or subnet attachment",
]

export default function Infrager() {
  // The app is a subdomain of whichever domain this page is being served on.
  const APP_URL = useSiblingOrigin("infrager")
  useScrollReveal()
  const reduce = useReducedMotionSafe()

  const rotYRaw = useMotionValue(-5)
  const rotXRaw = useMotionValue(2)
  const rotY = useSpring(rotYRaw, { stiffness: 180, damping: 26 })
  const rotX = useSpring(rotXRaw, { stiffness: 180, damping: 26 })
  const handleTilt = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      rotYRaw.set(((e.clientX - r.left) / r.width - 0.5) * 8 - 3)
      rotXRaw.set(((e.clientY - r.top) / r.height - 0.5) * -5 + 1)
    },
    [rotYRaw, rotXRaw],
  )
  const resetTilt = useCallback(() => {
    rotYRaw.set(-5)
    rotXRaw.set(2)
  }, [rotYRaw, rotXRaw])

  const ctaPrimary =
    "inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#0a0a0a] px-6 text-[14px] font-semibold text-[#FAF9F6] transition hover:-translate-y-px hover:bg-[#1A1A1A] dark:bg-[#FAF9F6] dark:text-[#0A0A0A] dark:hover:bg-[#E8E6E0]"
  const ctaGhost = `inline-flex h-11 items-center gap-2 rounded-[10px] border ${panelBorder} px-6 text-[14px] font-medium text-[#0a0a0a] transition hover:border-[#1860D3]/50 hover:bg-[#F2F0E9] dark:text-[#FAF9F6] dark:hover:bg-[#1A1A1A]`

  return (
    <div className="home-page min-h-screen bg-[#FAF9F6] text-[#0a0a0a] dark:bg-[#0A0A0A] dark:text-[#FAF9F6]">
      <GrainOverlay />
      <SiteNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden border-b ${border}`}>
        <HeroAtmosphere variant="offset" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="flex flex-col lg:col-span-6">
              <motion.div
                className="mb-6 flex items-center gap-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                <span className="block h-px w-5 shrink-0 bg-[#1860D3] dark:bg-[#6FA8FF]" />
                <span
                  className="text-[#1860D3] dark:text-[#6FA8FF]"
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  Open source from Fluiq
                </span>
              </motion.div>

              <motion.h1
                className="mb-6 font-heading text-[2.5rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] sm:text-5xl lg:text-[3.5rem] dark:text-[#FAF9F6]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12, ease: EASE_OUT }}
              >
                Draw your architecture. Ship{" "}
                <span className="text-[#1860D3] dark:text-[#6FA8FF]">secure</span> Terraform.
              </motion.h1>

              <motion.p
                className="mb-8 max-w-[32rem] text-[15px] leading-[1.7] text-[#6B6B66] dark:text-[#9A9A92]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22, ease: EASE_OUT }}
              >
                Infrager turns drag-and-drop AWS and Google Cloud diagrams into production-ready
                HCL. A security linter reads the same diagram and flags open security groups,
                public buckets, unencrypted storage, and overprivileged IAM while you are still
                drawing.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.32, ease: EASE_OUT }}
              >
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={ctaPrimary}>
                  Open Infrager
                  <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
                </a>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={ctaGhost}>
                  <HugeiconsIcon icon={GithubIcon} size={15} />
                  View source
                </a>
              </motion.div>

              <motion.p
                className="mt-5 font-mono text-[11px] text-[#6B6B66] dark:text-[#9A9A92]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.45 }}
              >
                MIT licensed · free · no card required
              </motion.p>
            </div>

            {/* Generated Terraform, framed like the product window on other pages. */}
            <motion.div
              className="lg:col-span-6 lg:col-start-7"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
              onMouseMove={reduce ? undefined : handleTilt}
              onMouseLeave={reduce ? undefined : resetTilt}
            >
              <motion.div
                className="rounded-[1.75rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_30px_70px_-18px_rgba(24,96,211,0.26)] dark:bg-white/[0.04] dark:ring-white/10"
                style={{ rotateY: rotY, rotateX: rotX, transformPerspective: 1400 }}
              >
                <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] dark:bg-[#141414]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
                    <span className="font-mono text-[11px] text-[#6B6B66]">main.tf</span>
                    <span className="rounded-full bg-[#B85C2B]/15 px-2 py-0.5 font-mono text-[10px] text-[#FB923C]">
                      2 findings
                    </span>
                  </div>
                  <CodeBlock
                    variant="dark"
                    highlighted={syntaxHighlight(GENERATED_TF, "python")}
                  >
                    {GENERATED_TF}
                  </CodeBlock>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section className={`border-b ${border} py-24`}>
        <div className="mx-auto max-w-6xl px-6">
          <h2
            data-animate
            className="max-w-2xl font-heading text-4xl font-bold leading-[1.15] tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]"
          >
            What you get
          </h2>
          <div
            data-animate
            data-delay="1"
            className={`mt-10 grid gap-px overflow-hidden rounded-2xl border ${panelBorder} bg-[#D4CFC1] dark:bg-[#2A2A2A] sm:grid-cols-2 lg:grid-cols-3`}
          >
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="bg-[#FAF9F6] p-7 dark:bg-[#1A1A1A]">
                <p className="mb-3 font-mono text-[11px] text-[#1860D3] dark:text-[#6FA8FF]">
                  {cap.kicker}
                </p>
                <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0a0a0a] dark:text-[#FAF9F6]">
                  {cap.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
                  {cap.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security angle ───────────────────────────────────────────────── */}
      <section className={`border-b ${border} bg-[#F7F6F1] py-24 dark:bg-[#0D0D0D]`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div data-animate>
              <h2 className="mb-5 font-heading text-4xl font-bold leading-[1.15] tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]">
                The mistakes are visible in the diagram first
              </h2>
              <p className="mb-6 text-[15px] leading-[1.7] text-[#6B6B66] dark:text-[#9A9A92]">
                A security group open to the world, a bucket anyone can read, a database without
                encryption: all of it is already there in the drawing, long before anyone runs
                terraform plan. Infrager treats the diagram as the source of truth and checks it on
                every edit.
              </p>
              <ul className="mb-6 space-y-3">
                {LINT_RULES.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={15}
                      className="mt-0.5 shrink-0 text-[#1860D3] dark:text-[#6FA8FF]"
                    />
                    {rule}
                  </li>
                ))}
              </ul>
              <p className="text-[13.5px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
                New resources start encrypted, private, and closed, so warnings appear when you opt
                into risk rather than greeting you on a blank canvas.
              </p>
            </div>

            <div data-animate data-delay="2" className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: GlobalIcon, name: "VPC and subnets", detail: "Typed CIDR, AZ, public IP behavior" },
                { icon: Shield01Icon, name: "Security groups", detail: "Ingress and egress rules, port ranges" },
                { icon: CloudServerIcon, name: "EC2 and load balancers", detail: "Placement, target groups, listeners" },
                { icon: DatabaseIcon, name: "RDS and S3", detail: "Encryption, versioning, public access" },
                { icon: UserShield01Icon, name: "IAM roles", detail: "Assume-role policy and inline statements" },
                { icon: ArrowRight02Icon, name: "150+ more", detail: "Lambda, EKS, GKE, BigQuery, Pub/Sub" },
              ].map((item) => (
                <div
                  key={item.name}
                  className={`rounded-2xl border ${panelBorder} bg-[#FAF9F6] p-5 dark:bg-[#1A1A1A]`}
                >
                  <span
                    className={`mb-4 inline-flex size-9 items-center justify-center rounded-lg border ${panelBorder} bg-white text-[#1860D3] dark:bg-[#0A0A0A] dark:text-[#6FA8FF]`}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} />
                  </span>
                  <p className="mb-1 text-[14px] font-semibold text-[#0a0a0a] dark:text-[#FAF9F6]">
                    {item.name}
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Relationship to Fluiq ────────────────────────────────────────── */}
      <section className={`border-b ${border} py-20`}>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2
            data-animate
            className="mb-4 font-heading text-3xl font-bold leading-tight tracking-tight text-[#0a0a0a] dark:text-[#FAF9F6]"
          >
            Why the Fluiq team built this
          </h2>
          <p
            data-animate
            data-delay="1"
            className="text-[15px] leading-[1.7] text-[#6B6B66] dark:text-[#9A9A92]"
          >
            Fluiq exists to make what runs in production observable and governable. Infrager applies
            the same idea one layer down, to the infrastructure underneath. It is a separate product
            with no Fluiq account required, released under MIT because tools that catch security
            mistakes work better when everyone can read the rules.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div data-animate>
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-[#0a0a0a] text-white dark:bg-[#FAF9F6] dark:text-[#0A0A0A]">
              <HugeiconsIcon icon={GithubIcon} size={22} />
            </div>
            <h2 className="font-heading text-4xl font-bold tracking-tight text-[#0a0a0a] md:text-5xl dark:text-[#FAF9F6]">
              Start with a <span className="text-[#1860D3] dark:text-[#6FA8FF]">blank canvas</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#6B6B66] dark:text-[#9A9A92]">
              Create an account, drag in a VPC, and watch the Terraform appear next to it.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={APP_URL} target="_blank" rel="noopener noreferrer" className={ctaPrimary}>
                Open Infrager
                <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
              </a>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={ctaGhost}>
                <HugeiconsIcon icon={GithubIcon} size={15} />
                View source
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
