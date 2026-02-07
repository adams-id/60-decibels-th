export function parseCsvPreview(csvText: string, maxRows: number) {
  const issues: Array<{ severity: "info" | "warning" | "error"; message: string }> = []

  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  const headerLine = lines[0] ?? ""
  const rawColumns = splitCsvLine(headerLine)

  // Normalize column names slightly for display (keep original intent, but avoid empty labels).
  const columns = rawColumns.map((c, idx) => (c.trim().length === 0 ? `Column ${idx + 1}` : c.trim()))

  // Duplicate/empty header detection (helps non-technical users catch obvious schema issues).
  const seen = new Map<string, number>()
  for (const c of columns) seen.set(c, (seen.get(c) ?? 0) + 1)
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k)
  if (duplicates.length > 0) {
    issues.push({
      severity: "warning",
      message: `Duplicate column names detected: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? "…" : ""}`,
    })
  }

  const rows: Record<string, string>[] = []
  let badRowCount = 0
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const vals = splitCsvLine(lines[i]!)
    if (vals.length !== columns.length) badRowCount++

    const row: Record<string, string> = {}
    for (let c = 0; c < columns.length; c++) row[columns[c]!] = vals[c] ?? ""
    rows.push(row)
  }

  if (badRowCount > 0) {
    issues.push({
      severity: "warning",
      message: `Some rows in the preview have a different number of values than the header (${badRowCount} of ${rows.length}). This can indicate extra commas, missing values, or quoting issues.`,
    })
  }

  const types: Record<string, string> = {}
  const columnStats: Record<string, { emptyCount: number; exampleValues: string[] }> = {}

  for (const col of columns) {
    const values = rows.map((r) => r[col] ?? "")
    const nonEmpty = values.map((v) => v.trim()).filter((v) => v !== "")
    const sample = nonEmpty.slice(0, 50)
    types[col] = inferType(sample)

    const emptyCount = values.filter((v) => v.trim() === "").length
    const exampleValues: string[] = []
    for (const v of nonEmpty) {
      if (!exampleValues.includes(v)) exampleValues.push(v)
      if (exampleValues.length >= 3) break
    }
    columnStats[col] = { emptyCount, exampleValues }
  }

  if (columns.length === 0) {
    issues.push({ severity: "error", message: "No columns found in the header row." })
  }

  return {
    columns,
    rows,
    types,
    issues,
    stats: { previewRows: rows.length, previewColumns: columns.length },
    columnStats,
  }
}

// Minimal CSV splitter (handles quotes). Good enough for take-home.
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

function inferType(sample: string[]) {
  if (sample.length === 0) return "unknown"
  const isNumber = sample.every((v) => /^-?\d+(\.\d+)?$/.test(v.trim()))
  if (isNumber) return "number"
  const isBool = sample.every((v) => /^(true|false)$/i.test(v.trim()))
  if (isBool) return "boolean"
  return "string"
}

