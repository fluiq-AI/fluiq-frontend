// Human-readable label for an eval metric id. Metric ids are lowercase and may
// be snake_case (e.g. "context_precision"); the UI shows them lowercase with
// spaces to match the existing chip style ("context precision").
export function metricLabel(metric: string): string {
  return metric.replace(/_/g, " ")
}
