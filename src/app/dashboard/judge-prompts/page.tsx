"use client"
// Judge Prompts moved into Prompts as a tab. Kept as a redirect so existing
// links, bookmarks and docs don't land on a 404.
import { Navigate } from "react-router"

export default function Page() {
  return <Navigate to="/dashboard/prompts?tab=judge-prompts" replace />
}
