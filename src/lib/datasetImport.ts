import { ApiError } from "@/lib/api"
import { authFetch } from "@/lib/authFetch"
import type { Dataset } from "@/screens/Dashboard/Datasets/NewDatasetDialog"

// Import flow: the browser asks the API for a presigned S3 PUT URL, uploads the
// file DIRECTLY to S3, then hands the resulting object key to the API for
// preview/import. The file never flows through the API — only its rows do.

export interface ImportPreview {
  columns: string[]
  preview: Record<string, string>[]
  row_count: number
  suggested: { input: string | null; expected_output: string | null }
  truncated: boolean
}

/** Get a presigned URL, PUT the file straight to S3, and return the object key. */
export async function uploadImportFile(file: File): Promise<string> {
  const { upload_url, key } = await authFetch<{ upload_url: string; key: string }>(
    "/api/v1/datasets/import/presign",
    { method: "POST", body: { filename: file.name } },
  )
  const res = await fetch(upload_url, { method: "PUT", body: file })
  if (!res.ok) {
    throw new ApiError(res.status, "Upload to storage failed. Check your connection and try again.")
  }
  return key
}

export function previewDatasetImport(key: string): Promise<ImportPreview> {
  return authFetch<ImportPreview>("/api/v1/datasets/import/preview", {
    method: "POST",
    body: { key },
  })
}

export function importDataset(opts: {
  key: string
  name: string
  inputColumn: string
  expectedColumn?: string | null
  kind?: "single" | "agentic"
}): Promise<Dataset> {
  return authFetch<Dataset>("/api/v1/datasets/import", {
    method: "POST",
    body: {
      key: opts.key,
      name: opts.name,
      input_column: opts.inputColumn,
      expected_column: opts.expectedColumn ?? null,
      kind: opts.kind ?? "single",
    },
  })
}

/** Append rows from an uploaded file to an existing dataset. */
export function importExamplesInto(
  datasetId: string,
  opts: { key: string; inputColumn: string; expectedColumn?: string | null },
): Promise<{ dataset_id: string; imported: number }> {
  return authFetch(`/api/v1/datasets/${datasetId}/examples/import`, {
    method: "POST",
    body: {
      key: opts.key,
      input_column: opts.inputColumn,
      expected_column: opts.expectedColumn ?? null,
    },
  })
}

/** A ready-to-fill CSV template so people know the expected column format. */
export function downloadImportTemplate(): void {
  const csv = [
    "input,expected_output",
    "What is the capital of France?,Paris",
    "What is 2 + 2?,4",
    "Summarize: the sky is blue because of Rayleigh scattering.,The sky is blue due to Rayleigh scattering.",
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "fluiq-dataset-template.csv"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
