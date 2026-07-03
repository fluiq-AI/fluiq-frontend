"use client"

import { useState } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Database01Icon,
  DistributionIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WorkersTab } from "./WorkersTab"
import { SecretsTab } from "./SecretsTab"
import { LogsTab } from "./LogsTab"

const STORES = [
  {
    name: "RDS PostgreSQL", id: "fluiq-postgres", icon: Database01Icon,
    tint: "text-emerald-600 dark:text-emerald-400",
    rows: [
      ["Engine", "PostgreSQL 16.9"], ["Class", "db.t4g.micro · single-AZ"],
      ["Endpoint", "fluiq-postgres.…us-east-2.rds.amazonaws.com:5432"],
      ["Network", "private · SG → ECS only"],
      ["Holds", "orgs, users, prompts, datasets, blog, guardrails"],
      ["Backups", "7-day automated"],
    ],
  },
  {
    name: "ClickHouse", id: "i-05db644ae9f0b92a6", icon: Database01Icon,
    tint: "text-amber-600 dark:text-amber-400",
    rows: [
      ["Engine", "ClickHouse 26.5.2 (self-hosted EC2)"], ["Class", "t4g.medium · 40 GB gp3"],
      ["Endpoint", "172.31.1.180:8123 (HTTP, in-VPC)"],
      ["Network", "private · SG → ECS only · SSM-managed"],
      ["Holds", "traces, trace_costs, evaluations, security_scans, audit_log"],
      ["Backups", "DLM daily EBS snapshots · retain 7"],
    ],
  },
  {
    name: "Kafka", id: "i-0ce87c91a2778da50", icon: DistributionIcon,
    tint: "text-violet-600 dark:text-violet-400",
    rows: [
      ["Engine", "Kafka 3.9 KRaft (self-hosted EC2, Docker)"], ["Class", "t4g.medium · 40 GB gp3"],
      ["Endpoint", "172.31.13.149:9092 (PLAINTEXT, in-VPC)"],
      ["Network", "private · SG → ECS only · SSM-managed"],
      ["Holds", "tracer · security · evaluations · *.reply topics"],
      ["Backups", "none — transient, 7-day retention"],
    ],
  },
] as const

type Tab = "overview" | "logs" | "workers" | "secrets"
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "logs", label: "Logs" },
  { key: "workers", label: "Workers" },
  { key: "secrets", label: "Secrets" },
]

export default function InfrastructurePage() {
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Infrastructure</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The databases, broker, workers, and secrets behind Fluiq.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-[#1860D3] text-[#1860D3] dark:text-[#6FA8FF]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STORES.map((db) => (
              <Card key={db.id} className="p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={cn("flex size-9 items-center justify-center rounded-md bg-muted", db.tint)}>
                    <HugeiconsIcon icon={db.icon} size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{db.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{db.id}</p>
                  </div>
                  <Badge variant="muted" className="ml-auto">running</Badge>
                </div>
                <dl className="space-y-2">
                  {db.rows.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[88px_1fr] gap-2">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="break-words text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>

          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-[#1860D3] dark:text-[#6FA8FF]">
              <HugeiconsIcon icon={SparklesIcon} size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">SQL Editor</p>
              <p className="text-xs text-muted-foreground">
                Run read-only queries against Postgres or ClickHouse in a full-page editor.
              </p>
            </div>
            <Link
              to="/admin/sql-editor"
              className="ml-auto rounded-md bg-[#1860D3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1450b0]"
            >
              Open SQL Editor
            </Link>
          </Card>
        </div>
      )}

      {tab === "logs" && <LogsTab />}
      {tab === "workers" && <WorkersTab />}
      {tab === "secrets" && <SecretsTab />}

      {tab !== "overview" && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} size={14} className="mt-0.5 shrink-0" />
          <span>Live data from AWS. Reads need scoped permissions (ECS · CloudWatch Logs · SSM · RDS logs); adding/deleting secrets additionally needs write permissions. If you see an error, the IAM policy isn’t enabled yet.</span>
        </div>
      )}
    </div>
  )
}
