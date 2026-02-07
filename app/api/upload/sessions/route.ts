import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { DATA_DIR } from "@/lib/storage"

export const runtime = "nodejs"

type SessionInfo = {
  sessionId: string
  updatedAtMs: number
  hasAssembled: boolean
  chunkCount: number
}

async function safeStat(p: string) {
  try {
    return await fs.stat(p)
  } catch {
    return null
  }
}

export async function GET() {
  // Lists locally stored upload sessions (everything is local-only in this take-home).
  // We only return folders that look like upload sessions (contain chunk-* or assembled.csv).
  let entries: string[] = []
  try {
    entries = await fs.readdir(DATA_DIR)
  } catch {
    return NextResponse.json({ sessions: [] satisfies SessionInfo[] })
  }

  const sessions: SessionInfo[] = []
  for (const name of entries) {
    const dir = path.join(DATA_DIR, name)
    const st = await safeStat(dir)
    if (!st || !st.isDirectory()) continue

    let files: string[] = []
    try {
      files = await fs.readdir(dir)
    } catch {
      continue
    }

    const hasAssembled = files.includes("assembled.csv")
    const chunkCount = files.filter((f) => f.startsWith("chunk-") && f.endsWith(".bin")).length
    if (!hasAssembled && chunkCount === 0) continue

    // Prefer assembled.csv mtime when present; otherwise fallback to folder mtime.
    const assembledStat = hasAssembled ? await safeStat(path.join(dir, "assembled.csv")) : null
    const updatedAtMs = assembledStat?.mtimeMs ?? st.mtimeMs

    sessions.push({ sessionId: name, updatedAtMs, hasAssembled, chunkCount })
  }

  sessions.sort((a, b) => b.updatedAtMs - a.updatedAtMs)
  return NextResponse.json({ sessions })
}

