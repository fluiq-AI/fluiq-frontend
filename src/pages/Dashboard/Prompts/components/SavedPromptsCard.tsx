import { Fragment, useState } from "react"
import {
  ArrowDown01Icon,
  Copy01Icon,
  Delete02Icon,
  Loading03Icon,
  RocketIcon,
  RotateClockwiseIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/authFetch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/pages/Dashboard/Traces/utils"
import type { PromptEnv, SavedPrompt, PromptVersion } from "../utils/types"
import { truncate } from "../utils"

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_COLS = 7

const ENV_META: Record<PromptEnv, { label: string; short: string; activeClass: string; titleDeploy: string; titleUndeploy: string }> = {
  development: {
    label: "Development", short: "dev",
    activeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    titleDeploy: "Deploy to development", titleUndeploy: "Remove from development",
  },
  staging: {
    label: "Staging", short: "stg",
    activeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    titleDeploy: "Promote to staging", titleUndeploy: "Remove from staging",
  },
  production: {
    label: "Production", short: "prod",
    activeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    titleDeploy: "Promote to production", titleUndeploy: "Remove from production",
  },
}

const ENV_ORDER: PromptEnv[] = ["development", "staging", "production"]

// ── Component ─────────────────────────────────────────────────────────────────

export function SavedPromptsCard({
  prompts,
  loading,
  onDeployEnv,
  onDelete,
  onRestore,
}: {
  prompts: SavedPrompt[]
  loading: boolean
  onDeployEnv: (id: string, env: PromptEnv, deploy: boolean) => Promise<void>
  onDelete: (id: string) => void
  onRestore: (promptId: string, version: number) => Promise<void>
}) {
  const [deployingKeys, setDeployingKeys] = useState<Set<string>>(new Set())
  const [copiedId,         setCopiedId]    = useState<string | null>(null)
  const [historyId,        setHistoryId]   = useState<string | null>(null)
  const [versions,         setVersions]    = useState<PromptVersion[]>([])
  const [versionsLoading,  setVersionsLoading]  = useState(false)
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  async function handleDeployEnv(id: string, env: PromptEnv, deploy: boolean) {
    const key = `${id}-${env}`
    setDeployingKeys((s) => new Set(s).add(key))
    await onDeployEnv(id, env, deploy)
    setDeployingKeys((s) => { const n = new Set(s); n.delete(key); return n })
  }

  async function toggleHistory(promptId: string) {
    if (historyId === promptId) {
      setHistoryId(null)
      setVersions([])
      return
    }
    setHistoryId(promptId)
    setVersionsLoading(true)
    try {
      const data = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/prompts/${promptId}/versions`,
      )
      setVersions(data.versions)
    } catch {
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }

  async function handleRestore(promptId: string, version: number) {
    setRestoringVersion(version)
    await onRestore(promptId, version)
    try {
      const data = await authFetch<{ versions: PromptVersion[] }>(
        `/api/v1/prompts/${promptId}/versions`,
      )
      setVersions(data.versions)
    } catch {
      // silent
    }
    setRestoringVersion(null)
  }

  function copySnippet(slug: string, env: PromptEnv, id: string) {
    const snippet =
      env === "production"
        ? `prompt = fluiq.get_prompt("${slug}")`
        : `prompt = fluiq.get_prompt("${slug}", env="${env}")`
    navigator.clipboard.writeText(snippet)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Saved Prompts</CardTitle>
          {loading ? (
            <HugeiconsIcon icon={Loading03Icon} size={13} className="animate-spin text-muted-foreground" />
          ) : (
            <span className="text-xs text-muted-foreground">({prompts.length})</span>
          )}
        </div>
        <CardDescription>
          Promote templates to <span className="font-medium text-blue-500/80">dev</span>,{" "}
          <span className="font-medium text-amber-500/80">staging</span>, or{" "}
          <span className="font-medium text-emerald-500/80">production</span> — then fetch them via{" "}
          <code className="font-mono text-[11px]">fluiq.get_prompt(slug)</code>.
        </CardDescription>
      </CardHeader>

      {prompts.length === 0 && !loading ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No saved prompts yet. Select a discovered prompt and click{" "}
            <span className="font-medium">Save Prompt</span> to save it.
          </p>
        </CardContent>
      ) : (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Slug / Model</th>
                  <th className="px-4 py-2.5 text-center">Ver.</th>
                  <th className="px-4 py-2.5 text-left">Environments</th>
                  <th className="px-4 py-2.5 text-left">SDK Snippet</th>
                  <th className="px-4 py-2.5 text-left">Saved</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((p) => {
                  const highestDeployedEnv: PromptEnv | null =
                    p.environments.production ? "production"
                    : p.environments.staging ? "staging"
                    : p.environments.development ? "development"
                    : null

                  return (
                    <Fragment key={p.prompt_id}>
                      <tr className="border-b border-border/60 align-middle">
                        <td className="max-w-40 truncate px-4 py-2.5 font-medium text-xs">
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                          {p.model ? (
                            <div className="font-mono text-[10px] text-muted-foreground/50">{p.model}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-xs text-muted-foreground">
                          v{p.version}
                        </td>

                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {ENV_ORDER.map((env) => {
                              const dep = p.environments[env]
                              const meta = ENV_META[env]
                              const key = `${p.prompt_id}-${env}`
                              const busy = deployingKeys.has(key)
                              return (
                                <button
                                  key={env}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeployEnv(p.prompt_id, env, !dep)}
                                  title={
                                    dep
                                      ? `${meta.titleUndeploy} (v${dep.version} — ${dep.deployed_at ? formatDate(dep.deployed_at) : ""})`
                                      : meta.titleDeploy
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50",
                                    dep
                                      ? meta.activeClass
                                      : "border-border/50 text-muted-foreground/40 hover:border-border hover:text-muted-foreground",
                                  )}
                                >
                                  {busy ? (
                                    <HugeiconsIcon icon={Loading03Icon} size={9} className="animate-spin" />
                                  ) : dep ? (
                                    <HugeiconsIcon icon={RocketIcon} size={9} />
                                  ) : null}
                                  {meta.short}
                                  {dep ? ` v${dep.version}` : ""}
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        <td className="px-4 py-2.5">
                          {highestDeployedEnv ? (
                            <button
                              type="button"
                              onClick={() => copySnippet(p.slug, highestDeployedEnv, p.prompt_id)}
                              className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy SDK snippet"
                            >
                              <HugeiconsIcon
                                icon={copiedId === p.prompt_id ? Tick02Icon : Copy01Icon}
                                size={11}
                              />
                              {highestDeployedEnv === "production"
                                ? `fluiq.get_prompt("${p.slug}")`
                                : `fluiq.get_prompt("${p.slug}", env="${highestDeployedEnv}")`}
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">
                              promote to enable
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          {p.created_at ? formatDate(p.created_at) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggleHistory(p.prompt_id)}
                              className={cn(
                                "flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
                                historyId === p.prompt_id
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/60 text-muted-foreground/60 hover:text-muted-foreground",
                              )}
                              title="Version history"
                            >
                              <HugeiconsIcon
                                icon={ArrowDown01Icon}
                                size={10}
                                className={cn("transition-transform", historyId === p.prompt_id && "rotate-180")}
                              />
                              History
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(p.prompt_id)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 text-muted-foreground/60 hover:border-destructive/40 hover:text-destructive transition-colors"
                              title="Delete prompt"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {historyId === p.prompt_id ? (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={HISTORY_COLS} className="px-4 py-3">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                              Version History — {p.name}
                            </p>
                            {versionsLoading ? (
                              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
                                Loading…
                              </div>
                            ) : versions.length === 0 ? (
                              <p className="py-2 text-xs text-muted-foreground">
                                No previous versions. Edit the template to create history.
                              </p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                                    <th className="pb-1.5 pr-4 text-left">Ver.</th>
                                    <th className="pb-1.5 pr-4 text-left">Name</th>
                                    <th className="pb-1.5 pr-4 text-left">Model</th>
                                    <th className="pb-1.5 pr-4 text-left">Saved at</th>
                                    <th className="pb-1.5 pr-4 text-left">Template preview</th>
                                    <th className="pb-1.5 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {versions.map((v) => (
                                    <tr key={v.version_id} className="border-t border-border/30 align-top">
                                      <td className="py-1.5 pr-4 font-mono text-muted-foreground">v{v.version}</td>
                                      <td className="py-1.5 pr-4 max-w-32 truncate text-muted-foreground">{v.name}</td>
                                      <td className="py-1.5 pr-4 font-mono text-muted-foreground">{v.model || "—"}</td>
                                      <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">
                                        {v.created_at ? formatDate(v.created_at) : "—"}
                                      </td>
                                      <td className="py-1.5 pr-4 max-w-xs">
                                        <span className="line-clamp-1 font-mono text-muted-foreground/70">
                                          {truncate(v.template, 80)}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-right">
                                        <button
                                          type="button"
                                          disabled={restoringVersion === v.version}
                                          onClick={() => handleRestore(p.prompt_id, v.version)}
                                          className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground/60 hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
                                          title={`Restore v${v.version}`}
                                        >
                                          {restoringVersion === v.version ? (
                                            <HugeiconsIcon icon={Loading03Icon} size={10} className="animate-spin" />
                                          ) : (
                                            <HugeiconsIcon icon={RotateClockwiseIcon} size={10} />
                                          )}
                                          Restore
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
