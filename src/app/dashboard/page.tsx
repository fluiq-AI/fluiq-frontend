"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { VISITED_KEY } from "@/pages/Dashboard/GettingStarted/index"

export default function Page() {
  const router = useRouter()
  useEffect(() => {
    const visited = localStorage.getItem(VISITED_KEY) === "true"
    router.replace(visited ? "/dashboard/overview" : "/dashboard/getting-started")
  }, [router])
  return null
}
