"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import styles from "./HomeLanding.module.css"

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
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.pillRow}>
            <span className={`${styles.pill} ${styles.pillBlue}`}>Chunked uploads</span>
            <span className={`${styles.pill} ${styles.pillGreen}`}>Wide preview</span>
          </div>

          <div className={styles.headline}>Upload a CSV. Preview it with confidence.</div>
          <div className={styles.subhead}>
            Send large files safely under serverless request limits, then quickly sanity-check column types and obvious
            schema issues before analysis.
          </div>

          <div className={styles.ctaRow}>
            <Link href="/upload" className={styles.primaryCta}>
              <span className={`${styles.iconBubble} ${styles.iconBubblePrimary}`} aria-hidden>
                ↑
              </span>
              Upload a CSV
            </Link>
            <Link href="/preview" className={styles.secondaryCta}>
              <span className={`${styles.iconBubble} ${styles.iconBubbleSecondary}`} aria-hidden>
                ↗
              </span>
              View preview
            </Link>
          </div>

          <div className={styles.note}>
            {lastSessionId ? (
              <span>
                Last upload session detected:{" "}
                <span className={styles.mono}>{lastSessionShort ?? lastSessionId}</span>. “View preview” will use it if you
                don’t pass a sessionId in the URL.
              </span>
            ) : (
              <span>No previous upload detected in this browser yet.</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div className={styles.sectionTitle}>How it works</div>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={`${styles.stepIcon} ${styles.stepIconBlue}`} aria-hidden>
                1
              </span>
              <div className={styles.stepTitle}>Upload in parts</div>
            </div>
            <div className={styles.stepBody}>
              Your CSV is split into chunks so each request stays under size limits.
            </div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={`${styles.stepIcon} ${styles.stepIconPurple}`} aria-hidden>
                2
              </span>
              <div className={styles.stepTitle}>Finalize</div>
            </div>
            <div className={styles.stepBody}>
              The server assembles uploaded parts into a single CSV and prepares a lightweight preview.
            </div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={`${styles.stepIcon} ${styles.stepIconGreen}`} aria-hidden>
                3
              </span>
              <div className={styles.stepTitle}>Preview wide data</div>
            </div>
            <div className={styles.stepBody}>
              Filter and select columns, review inferred types, and catch schema issues early.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

