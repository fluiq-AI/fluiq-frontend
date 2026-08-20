"use client"
// Aggregates is a tab on Prompts. Kept as a redirect so links don't 404.
import { Navigate } from "react-router"

export default function Page() {
  return <Navigate to="/dashboard/prompts?tab=aggregates" replace />
}
