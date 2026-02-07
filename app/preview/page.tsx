import DataPreviewTable from "@/components/DataPreviewTable"
import SessionPicker from "@/components/SessionPicker"
import { Suspense } from "react"

export default function PreviewPage() {
  return (
    <main>
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, letterSpacing: -0.3 }}>Preview</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.5, maxWidth: 860 }}>
          Sanity-check your data before analysis. Filter columns, review inferred types, and look for early schema issues.
        </p>
      </div>
      <Suspense fallback={null}>
        <SessionPicker />
      </Suspense>
      <div style={{ height: 12 }} />
      <Suspense fallback={<div style={{ color: "#666" }}>Loading preview…</div>}>
        <DataPreviewTable />
      </Suspense>
    </main>
  )
}

