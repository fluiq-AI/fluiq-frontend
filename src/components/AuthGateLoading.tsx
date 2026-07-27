import { DashboardLoading } from "@/components/DashboardLoading"

/** Branded full-screen loader shown by the auth guards before the client has
 * hydrated the persisted auth state (see RequireAuth / RequireAdmin). Uses the
 * same Fluiq loading screen as the dashboard route boundary so entering the app
 * reads as one continuous branded load. */
export function AuthGateLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <DashboardLoading />
    </div>
  )
}
