import { useParams, Navigate } from "react-router"
import { INTEGRATIONS } from "./data"
import IntegrationPage from "./IntegrationPage"

export default function IntegrationRoute() {
  const { slug } = useParams<{ slug: string }>()
  const data = INTEGRATIONS.find((i) => i.slug === slug)
  if (!data) return <Navigate to="/integrations" replace />
  return <IntegrationPage data={data} />
}
