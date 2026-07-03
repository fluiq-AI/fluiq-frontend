"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudServerIcon,
  Database01Icon,
  DistributionIcon,
  GithubIcon,
  GlobalIcon,
  HardDriveIcon,
  KeyboardIcon,
  Layers01Icon,
  Notebook01Icon,
  ServerStack01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Infra model (curated from the live AWS account, us-east-2 / 383136686684) ──

type GroupKey =
  | "edge"
  | "network"
  | "compute"
  | "messaging"
  | "data"
  | "storage"
  | "config"
  | "ops"

const GROUP_STYLE: Record<GroupKey, { ring: string; chip: string; label: string }> = {
  edge: { ring: "border-slate-300 dark:border-slate-600", chip: "text-slate-500", label: "Client" },
  network: { ring: "border-sky-300 dark:border-sky-700", chip: "text-sky-600 dark:text-sky-400", label: "Networking" },
  compute: { ring: "border-blue-300 dark:border-blue-700", chip: "text-blue-600 dark:text-blue-400", label: "Compute (ECS Fargate)" },
  messaging: { ring: "border-violet-300 dark:border-violet-700", chip: "text-violet-600 dark:text-violet-400", label: "Messaging" },
  data: { ring: "border-emerald-300 dark:border-emerald-700", chip: "text-emerald-600 dark:text-emerald-400", label: "Databases" },
  storage: { ring: "border-amber-300 dark:border-amber-700", chip: "text-amber-600 dark:text-amber-500", label: "Storage" },
  config: { ring: "border-rose-300 dark:border-rose-700", chip: "text-rose-600 dark:text-rose-400", label: "Config & Secrets" },
  ops: { ring: "border-zinc-300 dark:border-zinc-600", chip: "text-zinc-500", label: "Ops / CI" },
}

interface InfraData extends Record<string, unknown> {
  label: string
  sublabel: string
  group: GroupKey
  icon: typeof CloudServerIcon
  details: { label: string; value: string }[]
}

type InfraNode = Node<InfraData>

const N = (
  id: string,
  x: number,
  y: number,
  data: InfraData,
): InfraNode => ({ id, type: "infra", position: { x, y }, data })

const NODES: InfraNode[] = [
  N("users", 0, 200, {
    label: "Users", sublabel: "Internet", group: "edge", icon: UserGroupIcon,
    details: [{ label: "Entry", value: "getfluiq.com · api.getfluiq.com" }],
  }),
  N("route53", 230, 200, {
    label: "Route 53", sublabel: "DNS", group: "network", icon: GlobalIcon,
    details: [
      { label: "Domains", value: "getfluiq.com, api.getfluiq.com" },
      { label: "Type", value: "Hosted zone → ALB / Amplify" },
    ],
  }),
  N("amplify", 460, 60, {
    label: "AWS Amplify", sublabel: "Frontend (Next.js)", group: "network", icon: Layers01Icon,
    details: [
      { label: "App", value: "fluiq-frontend (getfluiq.com)" },
      { label: "Build", value: "amplify.yml" },
    ],
  }),
  N("alb", 460, 220, {
    label: "ALB", sublabel: "Load Balancer", group: "network", icon: DistributionIcon,
    details: [
      { label: "Target group", value: "fluiq-api-tg" },
      { label: "Routes", value: "api.getfluiq.com → fluiq-api" },
    ],
  }),
  N("api", 720, 200, {
    label: "fluiq-api", sublabel: "FastAPI · ECS service", group: "compute", icon: CloudServerIcon,
    details: [
      { label: "Cluster", value: "fluiq (Fargate)" },
      { label: "Scaling", value: "1→4 tasks · CPU 65% (always ≥1)" },
      { label: "Task role", value: "fluiqECSTaskRole" },
      { label: "Image", value: "ECR fluiq-api:latest" },
    ],
  }),
  N("kafka", 980, 210, {
    label: "Kafka", sublabel: "self-hosted · EC2 i-0ce87c91…", group: "messaging", icon: DistributionIcon,
    details: [
      { label: "Engine", value: "Kafka 3.9 KRaft (Docker) · t4g.medium" },
      { label: "Endpoint", value: "172.31.13.149:9092 · PLAINTEXT, in-VPC" },
      { label: "Topics", value: "tracer · security · evaluations · *.reply" },
      { label: "Network", value: "private · SG → ECS only · SSM-managed" },
    ],
  }),
  N("tracer", 1240, 70, {
    label: "fluiq-tracer", sublabel: "Worker · ECS", group: "compute", icon: CloudServerIcon,
    details: [
      { label: "Consumes", value: "tracer topic" },
      { label: "Scaling", value: "1→3 tasks · CPU 65%" },
      { label: "Writes", value: "ClickHouse traces/costs · reads RDS" },
    ],
  }),
  N("evaluator", 1240, 200, {
    label: "fluiq-evaluator", sublabel: "Worker · ECS", group: "compute", icon: CloudServerIcon,
    details: [
      { label: "Consumes", value: "evaluations topic" },
      { label: "Scaling", value: "1→3 tasks · CPU 65%" },
      { label: "Writes", value: "ClickHouse evaluations" },
    ],
  }),
  N("security", 1240, 330, {
    label: "fluiq-security", sublabel: "Worker · ECS", group: "compute", icon: CloudServerIcon,
    details: [
      { label: "Consumes", value: "security topic" },
      { label: "Scaling", value: "1→2 tasks · CPU 65%" },
      { label: "Writes", value: "ClickHouse security_scans" },
    ],
  }),
  N("rds", 1520, 70, {
    label: "RDS PostgreSQL", sublabel: "fluiq-postgres", group: "data", icon: Database01Icon,
    details: [
      { label: "Engine", value: "PostgreSQL 16.9 · db.t4g.micro" },
      { label: "Network", value: "private, SG → ECS only" },
      { label: "Holds", value: "orgs, users, prompts, datasets, blog, guardrails" },
    ],
  }),
  N("clickhouse", 1520, 250, {
    label: "ClickHouse", sublabel: "EC2 i-05db644…", group: "data", icon: Database01Icon,
    details: [
      { label: "Engine", value: "ClickHouse 26.5.2 · t4g.medium" },
      { label: "Network", value: "private 172.31.1.180:8123, SG → ECS only" },
      { label: "Holds", value: "traces, costs, evaluations, security_scans, audit_log" },
    ],
  }),
  N("s3-media", 720, 380, {
    label: "S3 · blog media", sublabel: "fluiq-blog-media-…", group: "storage", icon: HardDriveIcon,
    details: [
      { label: "Access", value: "private · presigned GET URLs" },
      { label: "Writer", value: "fluiq-api (task role)" },
    ],
  }),
  N("s3-backups", 1520, 430, {
    label: "S3 · CH backups", sublabel: "fluiq-clickhouse-backups-…", group: "storage", icon: HardDriveIcon,
    details: [
      { label: "Source", value: "clickhouse-backup (daily 06:00 UTC)" },
      { label: "Retention", value: "7 remote + 35-day lifecycle" },
    ],
  }),
  N("ssm", 720, 20, {
    label: "SSM Parameters", sublabel: "/fluiq/prod/*", group: "config", icon: KeyboardIcon,
    details: [
      { label: "Holds", value: "CLICKHOUSE_*, KAFKA_*" },
      { label: "Consumed by", value: "all ECS task defs (secrets)" },
    ],
  }),
  N("cloudwatch", 460, 400, {
    label: "CloudWatch Logs", sublabel: "/ecs/fluiq-*", group: "ops", icon: Notebook01Icon,
    details: [{ label: "Streams", value: "api, tracer, evaluator, security" }],
  }),
  N("github", 0, 400, {
    label: "GitHub Actions", sublabel: "CI/CD", group: "ops", icon: GithubIcon,
    details: [
      { label: "Trigger", value: "push to main" },
      { label: "Flow", value: "build → ECR → ECS deploy (live task def)" },
    ],
  }),
  N("ecr", 230, 400, {
    label: "Amazon ECR", sublabel: "image registry", group: "ops", icon: ServerStack01Icon,
    details: [{ label: "Repo", value: "fluiq-api" }],
  }),
  N("dlm", 1520, 590, {
    label: "DLM Snapshots", sublabel: "EBS daily backups", group: "ops", icon: HardDriveIcon,
    details: [
      { label: "Target", value: "ClickHouse volume (tag backup=fluiq-clickhouse)" },
      { label: "Schedule", value: "daily 07:00 UTC · retain 7" },
    ],
  }),
]

const E = (s: string, t: string, opts: Partial<Edge> = {}): Edge => ({
  id: `${s}-${t}`, source: s, target: t, ...opts,
})
const dashed = { style: { strokeDasharray: "4 4", opacity: 0.55 } }

const EDGES: Edge[] = [
  E("users", "route53"),
  E("route53", "amplify"),
  E("route53", "alb"),
  E("alb", "api"),
  E("api", "kafka", { animated: true }),
  E("api", "rds"),
  E("api", "clickhouse"),
  E("api", "s3-media"),
  E("kafka", "tracer", { animated: true }),
  E("kafka", "evaluator", { animated: true }),
  E("kafka", "security", { animated: true }),
  E("tracer", "clickhouse"),
  E("evaluator", "clickhouse"),
  E("security", "clickhouse"),
  E("tracer", "rds"),
  E("clickhouse", "s3-backups"),
  E("clickhouse", "dlm", dashed),
  E("api", "ssm", dashed),
  E("api", "cloudwatch", dashed),
  E("github", "ecr", dashed),
  E("ecr", "api", dashed),
]

// ── Custom node ────────────────────────────────────────────────────────────────

function InfraNodeCard({ data, selected }: NodeProps<InfraNode>) {
  const g = GROUP_STYLE[data.group]
  return (
    <div
      className={cn(
        "w-[190px] rounded-lg border bg-background px-3 py-2.5 shadow-sm transition-all",
        g.ring,
        selected ? "ring-2 ring-[#1860D3] shadow-md" : "hover:shadow-md",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-muted-foreground/40" />
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted", g.chip)}>
          <HugeiconsIcon icon={data.icon} size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{data.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{data.sublabel}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-muted-foreground/40" />
    </div>
  )
}

const nodeTypes = { infra: InfraNodeCard }

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const [nodes, , onNodesChange] = useNodesState(NODES)
  const [edges, , onEdgesChange] = useEdgesState(EDGES)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => NODES.find((n) => n.id === selectedId)?.data ?? null,
    [selectedId],
  )

  const onNodeClick = useCallback((_: unknown, node: Node) => setSelectedId(node.id), [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Architecture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live AWS topology (us-east-2). Click any node for details.
        </p>
      </div>

      <div className="relative h-[640px] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
        <ReactFlow
          nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.3}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} className="!bg-transparent" />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-background/90 p-2 backdrop-blur">
              {(Object.keys(GROUP_STYLE) as GroupKey[]).map((k) => (
                <span key={k} className={cn("text-[11px] font-medium", GROUP_STYLE[k].chip)}>
                  {GROUP_STYLE[k].label}
                </span>
              ))}
            </div>
          </Panel>
        </ReactFlow>

        {/* Detail panel */}
        {selected && (
          <aside className="absolute right-0 top-0 flex h-full w-80 flex-col border-l border-border/60 bg-background shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex size-9 items-center justify-center rounded-md bg-muted", GROUP_STYLE[selected.group].chip)}>
                  <HugeiconsIcon icon={selected.icon} size={20} />
                </span>
                <div>
                  <p className="font-medium leading-tight">{selected.label}</p>
                  <Badge variant="muted" className="mt-1">{GROUP_STYLE[selected.group].label}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>✕</Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground">{selected.sublabel}</p>
              <dl className="space-y-2.5">
                {selected.details.map((d) => (
                  <div key={d.label}>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{d.label}</dt>
                    <dd className="text-sm">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
