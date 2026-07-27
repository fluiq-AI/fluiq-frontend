import { DashboardLoading } from "@/components/DashboardLoading"

/**
 * App Router Suspense fallback for every `/dashboard/*` route. The dashboard
 * layout keeps the sidebar mounted, so this branded loader only fills the main
 * content region while a page segment streams in.
 */
export default function Loading() {
  return <DashboardLoading />
}
