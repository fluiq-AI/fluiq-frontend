"use client"
// Scorers no longer exists as its own surface: a custom scorer is a saved
// prompt of kind 'judge', listed under Prompts → Judge Prompts.
import { Navigate } from "react-router"

export default function Page() {
  return <Navigate to="/dashboard/prompts?tab=judge-prompts" replace />
}
