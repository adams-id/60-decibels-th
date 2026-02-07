export type UploadInitResponse = { sessionId: string }

export type PreviewIssue = {
  severity: "info" | "warning" | "error"
  message: string
}

export type PreviewResponse = {
  sessionId: string
  preview: {
    columns: string[]
    types: Record<string, string>
    rows: Array<Record<string, string>>
    issues: PreviewIssue[]
    stats: {
      previewRows: number
      previewColumns: number
    }
    columnStats: Record<string, { emptyCount: number; exampleValues: string[] }>
  }
}

