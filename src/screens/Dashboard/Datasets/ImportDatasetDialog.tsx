"use client"

import { useRef, useState } from "react"
import { Loading03Icon, Upload01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  uploadImportFile,
  previewDatasetImport,
  importDataset,
  importExamplesInto,
  downloadImportTemplate,
  type ImportPreview,
} from "@/lib/datasetImport"
import type { Dataset } from "./NewDatasetDialog"

const NONE = "__none__"
const NEW = "__new__"

export function ImportDatasetDialog({
  open,
  onOpenChange,
  datasets,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing datasets, so rows can be appended to one instead of creating new. */
  datasets: Dataset[]
  onImported: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<string>(NEW) // NEW or an existing dataset_id
  const [file, setFile] = useState<File | null>(null)
  const [key, setKey] = useState("") // S3 object key after direct upload
  const [name, setName] = useState("")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [inputCol, setInputCol] = useState("")
  const [expectedCol, setExpectedCol] = useState<string>(NONE)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = target === NEW

  function reset() {
    setTarget(NEW); setFile(null); setKey(""); setName(""); setPreview(null); setInputCol(""); setExpectedCol(NONE)
    setParsing(false); setImporting(false); setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    if (importing || parsing) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFile(f: File | null) {
    if (!f) return
    setFile(f)
    setKey("")
    setError(null)
    setPreview(null)
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""))
    setParsing(true)
    try {
      // Upload straight to S3 via a presigned URL, then preview from the object.
      const k = await uploadImportFile(f)
      setKey(k)
      const p = await previewDatasetImport(k)
      setPreview(p)
      setInputCol(p.suggested.input ?? p.columns[0] ?? "")
      setExpectedCol(p.suggested.expected_output ?? NONE)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not upload or read that file.")
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!key || !inputCol) return
    if (isNew && !name.trim()) return
    setImporting(true)
    setError(null)
    try {
      const expectedColumn = expectedCol === NONE ? null : expectedCol
      if (isNew) {
        const ds = await importDataset({ key, name: name.trim(), inputColumn: inputCol, expectedColumn, kind: "single" })
        toast.success(`Imported ${ds.example_count} example${ds.example_count === 1 ? "" : "s"} into "${ds.name}"`)
      } else {
        const res = await importExamplesInto(target, { key, inputColumn: inputCol, expectedColumn })
        const dsName = datasets.find((d) => d.dataset_id === target)?.name ?? "dataset"
        toast.success(`Added ${res.imported} example${res.imported === 1 ? "" : "s"} to "${dsName}"`)
      }
      onImported()
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const cols = preview?.columns ?? []
  const busy = parsing || importing

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import dataset</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file — each row becomes an example. Pick which column is the
            input and (optionally) the expected output.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          {/* Import into: new dataset or append to an existing one */}
          <div className="space-y-1.5">
            <Label className="text-xs">Import into</Label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={importing}
              className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value={NEW}>➕ New dataset</option>
              {datasets.length > 0 ? <option disabled>──────────</option> : null}
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.name} ({d.example_count})
                </option>
              ))}
            </select>
          </div>

          {/* Name (new dataset only) */}
          {isNew ? (
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="import-name">Dataset name</Label>
              <Input
                id="import-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support QA golden set"
                disabled={importing}
              />
            </div>
          ) : null}

          {/* File picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">File</Label>
              <button
                type="button"
                onClick={downloadImportTemplate}
                className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
              >
                Download CSV template
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xlsm,.xls"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/70 px-3 py-4 text-sm transition-colors",
                "hover:bg-muted/40 disabled:opacity-60",
              )}
            >
              <HugeiconsIcon icon={parsing ? Loading03Icon : Upload01Icon} size={16} className={parsing ? "animate-spin" : undefined} />
              {file ? file.name : "Choose a .csv or .xlsx file"}
            </button>
            <p className="text-[11px] text-muted-foreground">CSV, TSV, or Excel · up to 10 MB · first row must be column headers.</p>
          </div>

          {/* Column mapping + preview (once parsed) */}
          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Input column <span className="text-destructive">*</span></Label>
                  <select
                    value={inputCol}
                    onChange={(e) => setInputCol(e.target.value)}
                    disabled={importing}
                    className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {cols.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expected output column</Label>
                  <select
                    value={expectedCol}
                    onChange={(e) => setExpectedCol(e.target.value)}
                    disabled={importing}
                    className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={NONE}>— none —</option>
                    {cols.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview table */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Preview <span className="font-normal text-muted-foreground">({preview.row_count} row{preview.row_count === 1 ? "" : "s"}{preview.truncated ? ", first 5000 will import" : ""})</span>
                </Label>
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-muted/50">
                      <tr>
                        {cols.map((c) => (
                          <th key={c} className={cn(
                            "whitespace-nowrap px-2 py-1.5 font-medium",
                            c === inputCol ? "text-primary" : c === expectedCol ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                          )}>
                            {c}
                            {c === inputCol ? " · input" : c === expectedCol ? " · expected" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, i) => (
                        <tr key={i} className="border-t border-border/50">
                          {cols.map((c) => (
                            <td key={c} className="max-w-[240px] truncate px-2 py-1.5 text-muted-foreground">{row[c]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!preview || !inputCol || busy || (isNew && !name.trim())}>
              {importing ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> : <HugeiconsIcon icon={Upload01Icon} size={14} />}
              Import{preview ? ` ${preview.row_count} rows` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
