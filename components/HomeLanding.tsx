"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

const COLORS = {
  text: "#111",
  subtext: "#5b5b5b",
  border: "#e8e8e8",
  cardBg: "#fff",
  heroBgTop: "#ffffff",
  heroBgBottom: "#f8fafc",
  primary: "#0b5ed7",
  primarySoft: "#0b5ed712",
  success: "#146c43",
  successSoft: "#146c4312",
}

function cardStyle(opts?: { padded?: boolean }) {
  return {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    background: COLORS.cardBg,
    padding: opts?.padded === false ? 0 : 16,
    boxShadow: "0 1px 0 rgba(17,17,17,0.03), 0 10px 30px rgba(17,17,17,0.05)",
  } as const
}

function mono(s: string) {
  return (
    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      {s}
    </span>
  )
}

export default function HomeLanding() {
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem("lastSessionId")
      setLastSessionId(v && v.trim().length > 0 ? v : null)
    } catch {
      setLastSessionId(null)
    }
  }, [])

  const lastSessionShort = useMemo(() => {
    if (!lastSessionId) return null
    return `${lastSessionId.slice(0, 8)}…`
  }, [lastSessionId])

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          ...cardStyle(),
          padding: 18,
          overflow: "hidden",
          background: `linear-gradient(180deg, ${COLORS.heroBgTop}, ${COLORS.heroBgBottom})`,
          position: "relative",
        }}
      >
        {/* decorative blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -90,
            top: -120,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "radial-gradient(circle at 30% 30%, rgba(11,94,215,0.20), rgba(11,94,215,0) 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -110,
            bottom: -140,
            width: 300,
            height: 300,
            borderRadius: 999,
            background: "radial-gradient(circle at 40% 40%, rgba(20,108,67,0.16), rgba(20,108,67,0) 72%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 999,
                background: COLORS.primarySoft,
                color: COLORS.primary,
                border: "1px solid rgba(11,94,215,0.18)",
                fontWeight: 750,
                letterSpacing: 0.2,
              }}
            >
              Chunked uploads
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 999,
                background: COLORS.successSoft,
                color: COLORS.success,
                border: "1px solid rgba(20,108,67,0.18)",
                fontWeight: 750,
                letterSpacing: 0.2,
              }}
            >
              Wide preview
            </span>
          </div>

          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 900, letterSpacing: -0.6, color: COLORS.text }}>
            Upload a CSV. Preview it with confidence.
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: COLORS.subtext, maxWidth: 820, lineHeight: 1.55 }}>
            Send large files safely under serverless request limits, then quickly sanity-check column types and obvious
            schema issues before analysis.
          </div>

          <div style={{ height: 14 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                background: `linear-gradient(180deg, ${COLORS.primary}, #084db1)`,
                color: "#fff",
                border: "1px solid rgba(11,94,215,0.35)",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 13,
                boxShadow: "0 8px 18px rgba(11,94,215,0.18)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ↑
              </span>
              Upload a CSV
            </Link>

            <Link
              href="/preview"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                background: "#fff",
                color: COLORS.text,
                border: "1px solid #e5e5e5",
                textDecoration: "none",
                fontWeight: 750,
                fontSize: 13,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: "#f3f3f3",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "#444",
                }}
              >
                ↗
              </span>
              View preview
            </Link>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#666",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              paddingTop: 12,
            }}
          >
            {lastSessionId ? (
              <span>
                Last upload session detected: {mono(lastSessionShort ?? lastSessionId)}. “View preview” will use it if you
                don’t pass a sessionId in the URL.
              </span>
            ) : (
              <span>No previous upload detected in this browser yet.</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 850, letterSpacing: -0.2, color: COLORS.text }}>How it works</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: COLORS.primarySoft,
                  border: "1px solid rgba(11,94,215,0.18)",
                  color: COLORS.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                1
              </span>
              <div style={{ fontWeight: 850 }}>Upload in parts</div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.subtext, lineHeight: 1.5 }}>
              Your CSV is split into chunks so each request stays under size limits.
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: "rgba(90,44,160,0.10)",
                  border: "1px solid rgba(90,44,160,0.20)",
                  color: "#5a2ca0",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                2
              </span>
              <div style={{ fontWeight: 850 }}>Finalize</div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.subtext, lineHeight: 1.5 }}>
              The server assembles the chunks into a single CSV and prepares a preview.
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: COLORS.successSoft,
                  border: "1px solid rgba(20,108,67,0.18)",
                  color: COLORS.success,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                3
              </span>
              <div style={{ fontWeight: 850 }}>Preview wide data</div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.subtext, lineHeight: 1.5 }}>
              Filter and select columns, review inferred types, and catch obvious schema issues early.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

