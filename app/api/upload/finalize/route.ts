import { NextResponse } from "next/server"
import { listChunks, readChunk, writeAssembled } from "@/lib/storage"
import { parseCsvPreview } from "@/lib/csv"

export const runtime = "nodejs"

function parseChunkIndex(filename: string) {
  const m = /^chunk-(\d+)\.bin$/.exec(filename)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function firstLinesUtf8(buf: Buffer, maxLines: number) {
  // Avoid decoding huge CSVs just to show a preview.
  let lines = 0
  let end = buf.length
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 10 /* \n */) {
      lines++
      if (lines >= maxLines) {
        end = i + 1
        break
      }
    }
  }
  return buf.subarray(0, end).toString("utf8")
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { sessionId?: string; totalChunks?: number } | null
  const sessionId = body?.sessionId
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })

  const files = await listChunks(sessionId)
  if (files.length === 0) return NextResponse.json({ error: "No chunks found" }, { status: 400 })

  const indices = new Set<number>()
  for (const f of files) {
    const idx = parseChunkIndex(f)
    if (idx == null) continue
    indices.add(idx)
  }

  // If the client tells us how many chunks to expect, validate completeness.
  const expected = typeof body?.totalChunks === "number" && Number.isFinite(body.totalChunks) ? body.totalChunks : null
  if (expected != null && expected > 0) {
    const missing: number[] = []
    for (let i = 0; i < expected; i++) if (!indices.has(i)) missing.push(i)
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing chunks (${files.length} received, ${expected} expected)`,
          missing: missing.slice(0, 25),
        },
        { status: 400 }
      )
    }
  } else {
    // Best-effort check: if we have a gap, assembling would silently corrupt the output.
    const max = Math.max(...Array.from(indices.values()))
    for (let i = 0; i <= max; i++) {
      if (!indices.has(i)) {
        return NextResponse.json({ error: "Missing chunks (gap detected). Cannot assemble reliably." }, { status: 400 })
      }
    }
  }

  const parts: Buffer[] = []
  for (const f of files) {
    parts.push(await readChunk(sessionId, f))
  }
  const assembled = Buffer.concat(parts)
  await writeAssembled(sessionId, assembled)

  // Preview first ~200 lines (cheap)
  const text = firstLinesUtf8(assembled, 200)
  const preview = parseCsvPreview(text, 100)

  return NextResponse.json({ sessionId, preview })
}

// Convenience: allow GET /finalize?sessionId=... to fetch preview after done
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })

  // This GET just delegates to the assembled file path if it exists, but for simplicity,
  // we rebuild from chunks here too.
  const files = await listChunks(sessionId).catch(() => [])
  if (files.length === 0) return NextResponse.json({ error: "No chunks found" }, { status: 400 })

  const parts: Buffer[] = []
  for (const f of files) parts.push(await readChunk(sessionId, f))
  const assembled = Buffer.concat(parts)

  const text = firstLinesUtf8(assembled, 200)
  const preview = parseCsvPreview(text, 100)

  return NextResponse.json({ sessionId, preview })
}

