import { useNavigate } from "react-router"
import {
  Activity01Icon,
  AiSecurity02Icon,
  ApiIcon,
  Notification01Icon,
  TestTube01Icon,
  AiContentGenerator01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  clearAll,
  markAllRead,
  markRead,
  type AppNotification,
  type NotificationKind,
} from "@/store/notifications/slice"
import { cn } from "@/lib/utils"

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

type HugeIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"]

const KIND_META: Record<
  NotificationKind,
  { icon: HugeIcon; dot: string; label: string }
> = {
  security: {
    icon: AiSecurity02Icon,
    dot: "bg-destructive",
    label: "Security",
  },
  evals: {
    icon: TestTube01Icon,
    dot: "bg-blue-500",
    label: "Evals",
  },
  prompts: {
    icon: AiContentGenerator01Icon,
    dot: "bg-violet-500",
    label: "Prompts",
  },
  observability: {
    icon: Activity01Icon,
    dot: "bg-emerald-500",
    label: "Observability",
  },
  api: {
    icon: ApiIcon,
    dot: "bg-orange-500",
    label: "API",
  },
}

function NotificationRow({ item }: { item: AppNotification }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const meta = KIND_META[item.kind]

  function handleClick() {
    dispatch(markRead(item.id))
    navigate(item.href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        !item.read && "bg-primary/[0.03]",
      )}
    >
      {/* kind icon */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={meta.icon}
          size={14}
          className="text-foreground"
        />
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[12px] leading-snug",
              item.read
                ? "font-normal text-foreground"
                : "font-semibold text-foreground",
            )}
          >
            {item.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {relativeTime(item.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {item.body}
        </p>
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground",
          )}
        >
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>

      {/* unread dot */}
      {!item.read && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}

export function NotificationPanel() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.notifications.items)
  const unreadCount = items.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <HugeiconsIcon icon={Notification01Icon} size={16} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-[13px] font-semibold text-foreground">
            Notifications
          </span>
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(markAllRead())}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => dispatch(clearAll())}
                className="text-[11px] text-muted-foreground transition-colors hover:text-destructive"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* list */}
        <div className="max-h-[440px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <HugeiconsIcon
                icon={Notification01Icon}
                size={28}
                className="text-muted-foreground/40"
              />
              <p className="text-[12px] text-muted-foreground">
                You're all caught up
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
