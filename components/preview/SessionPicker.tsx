"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "./SessionPicker.module.css"

type SessionInfo = {
  sessionId: string
  updatedAtMs: number
  hasAssembled: boolean
  chunkCount: number
}

function formatWhen(ms: number) {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return ""
  }
}

function shortId(sessionId: string) {
  return `${sessionId.slice(0, 8)}…`
}

export default function SessionPicker() {
  const router = useRouter()
  const sp = useSearchParams()
  const current = sp.get("sessionId")

  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const load = async () => {
    setError(null)
    try {
      const res = await fetch("/api/upload/sessions", { method: "GET" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const json = (await res.json()) as { sessions: SessionInfo[] }
      setSessions(json.sessions ?? [])
    } catch (e: any) {
      setSessions([])
      setError(e?.message ?? "Failed to load sessions")
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = sessions ?? []

  const headline = useMemo(() => {
    if (!sessions) return "Previous uploads"
    return items.length === 0 ? "Previous uploads" : `Previous uploads (${items.length})`
  }, [items.length, sessions])

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            aria-label={isOpen ? "Collapse previous uploads" : "Expand previous uploads"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className={styles.chevronBtn}
          >
            <svg
              className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className={styles.title}>{headline}</div>
        </div>

        <button onClick={() => void load()} className={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div className={styles.subtext}>
        {isOpen ? (
          <span>Click a session to load its preview.</span>
        ) : current ? (
          <span>
            Currently viewing: <b>{shortId(current)}</b>
          </span>
        ) : (
          <span>Closed. Click the chevron to choose a previous upload.</span>
        )}
      </div>

      {isOpen ? (
        <>
          {error ? <div className={styles.error}>{error}</div> : null}

          {!sessions ? (
            <div className={styles.subtext}>Loading sessions…</div>
          ) : items.length === 0 ? (
            <div className={styles.subtext}>No uploads found yet.</div>
          ) : (
            <div className={styles.list}>
              {items.slice(0, 10).map((s) => {
                const isActive = current === s.sessionId
                const status = s.hasAssembled ? "ready" : "incomplete"
                const isDisabled = !s.hasAssembled
                return (
                  <button
                    key={s.sessionId}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return
                      router.push(`/preview?sessionId=${encodeURIComponent(s.sessionId)}`)
                      setIsOpen(false)
                    }}
                    className={[
                      styles.itemBtn,
                      isActive ? styles.itemBtnActive : "",
                      isDisabled ? styles.itemBtnDisabled : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={isDisabled ? "Upload is incomplete — preview not available yet." : "Load preview"}
                  >
                    <div className={styles.itemTop}>
                      <div className={styles.itemTitle}>
                        {shortId(s.sessionId)}{" "}
                        <span className={`${styles.itemMeta} ${isDisabled ? styles.incomplete : ""}`}>
                          ({status})
                        </span>
                      </div>
                      <div className={styles.itemMeta}>{formatWhen(s.updatedAtMs)}</div>
                    </div>
                    <div className={styles.itemBottom}>
                      chunks: <b>{s.chunkCount}</b>
                      {s.hasAssembled ? (
                        <span className={styles.assembled}> • assembled</span>
                      ) : (
                        <span className={styles.incomplete}> • not assembled</span>
                      )}
                    </div>
                  </button>
                )
              })}
              {items.length > 10 ? (
                <div className={styles.hint}>Showing latest 10 sessions.</div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

