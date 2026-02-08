"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PreviewResponse } from "@/lib/types";
import styles from "./DataPreviewTable.module.css";

function issueClass(severity: "info" | "warning" | "error") {
  if (severity === "error") return styles.issueError;
  if (severity === "warning") return styles.issueWarning;
  return styles.issueInfo;
}

export default function DataPreviewTable() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnQuery, setColumnQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<Set<string> | null>(
    null,
  );
  const [effectiveSessionId, setEffectiveSessionId] = useState<string | null>(
    null,
  );

  const sessionIdFromUrl = searchParams.get("sessionId");

  // Prefer URL sessionId, but fall back to the most recent upload in this browser.
  useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl.trim().length > 0) {
      setEffectiveSessionId(sessionIdFromUrl);
      return;
    }
    try {
      const last = localStorage.getItem("lastSessionId");
      setEffectiveSessionId(last && last.trim().length > 0 ? last : null);
    } catch {
      setEffectiveSessionId(null);
    }
  }, [sessionIdFromUrl]);

  useEffect(() => {
    if (!effectiveSessionId) return;
    (async () => {
      setError(null);
      setData(null);
      const res = await fetch(
        `/api/upload/finalize?sessionId=${encodeURIComponent(effectiveSessionId)}`,
        { method: "GET" },
      );
      if (!res.ok) {
        setError(`Failed to load preview (${res.status})`);
        return;
      }
      const json = (await res.json()) as PreviewResponse;
      setData(json);
    })();
  }, [effectiveSessionId]);

  // Default selection: avoid overwhelming non-technical users with 100 columns at once.
  useEffect(() => {
    if (!data) return;
    if (selectedColumns) return;
    const cols = data.preview.columns;
    const first = cols.slice(0, Math.min(12, cols.length));
    setSelectedColumns(new Set(first));
  }, [data, selectedColumns]);

  if (!effectiveSessionId)
    return (
      <div className={styles.muted}>
        No sessionId found. Upload first, then click “Go to preview”.
      </div>
    );
  if (error) return <div style={{ color: "#b00020" }}>{error}</div>;
  if (!data) return <div className={styles.muted}>Loading preview…</div>;

  const { columns, types, rows, issues, stats, columnStats } = data.preview;

  const selected = selectedColumns ?? new Set<string>();
  const filteredColumns = columns.filter((c) =>
    c.toLowerCase().includes(columnQuery.trim().toLowerCase()),
  );
  const visibleColumns = columns.filter((c) => selected.has(c));

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.title}>Preview summary</div>
          <div className={`${styles.muted}`} style={{ fontSize: 12 }}>
            Session{" "}
            <span className={styles.mono}>
              {effectiveSessionId.slice(0, 8)}…
            </span>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div className={styles.chips}>
          <span className={styles.chip}>
            <b>{stats.previewColumns}</b> columns
          </span>
          <span className={styles.chip}>
            <b>{stats.previewRows}</b> preview rows
          </span>
          <span className={styles.chip}>
            <b>{issues.length}</b> checks flagged
          </span>
        </div>

        {issues.length > 0 ? (
          <div className={styles.issuesList}>
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className={`${styles.issue} ${issueClass(iss.severity)}`}
              >
                <span className={styles.issueTitle}>{iss.severity}</span>
                <span style={{ color: "#444" }}> — {iss.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: "#146c43" }}>
            No obvious issues found in the preview.
          </div>
        )}
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Columns</div>

          <input
            value={columnQuery}
            onChange={(e) => setColumnQuery(e.target.value)}
            placeholder="Filter columns…"
            className={styles.input}
          />

          <div style={{ height: 10 }} />

          <div className={styles.btnRow}>
            <button
              onClick={() => setSelectedColumns(new Set(columns))}
              className={styles.btn}
            >
              Show all
            </button>
            <button
              onClick={() =>
                setSelectedColumns(
                  new Set(columns.slice(0, Math.min(12, columns.length))),
                )
              }
              className={styles.btn}
            >
              Show first 12
            </button>
            <button
              onClick={() => setSelectedColumns(new Set())}
              className={styles.btn}
            >
              Clear
            </button>
          </div>

          <div style={{ height: 10 }} />

          <div className={styles.selectedCount}>
            Selected <b>{visibleColumns.length}</b> of <b>{columns.length}</b>
          </div>

          <div className={styles.colList}>
            <div style={{ display: "grid" }}>
              {filteredColumns.map((c, idx) => {
                const st = columnStats[c];
                const type = types[c] ?? "unknown";
                const isChecked = selected.has(c);
                const emptyCount = st?.emptyCount ?? 0;
                const examples = st?.exampleValues ?? [];
                return (
                  <label
                    key={`${c}-${idx}`}
                    className={`${styles.colItem} ${isChecked ? styles.colItemSelected : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedColumns((prev) => {
                          const next = new Set(prev ?? []);
                          if (next.has(c)) next.delete(c);
                          else next.add(c);
                          return next;
                        });
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.colNameRow}>
                        <div className={styles.colName}>{c}</div>
                        <div className={styles.colType}>{type}</div>
                      </div>
                      <div className={styles.colMeta}>
                        empty in preview: {emptyCount}/{rows.length}
                        {examples.length > 0 ? (
                          <span> • e.g. “{examples[0]}”</span>
                        ) : null}
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredColumns.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, color: "#666" }}>
                  No columns match that filter.
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Tip: For wide files, start with a few key columns, then add more if
            needed.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.headerRow}>
            <div style={{ fontWeight: 700 }}>Rows (preview)</div>
            <div className={styles.muted} style={{ fontSize: 12 }}>
              Showing {rows.length} rows
            </div>
          </div>

          <div style={{ height: 10 }} />

          {visibleColumns.length === 0 ? (
            <div className={styles.muted} style={{ fontSize: 13 }}>
              No columns selected. Choose one or more columns on the left.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {visibleColumns.map((c) => (
                      <th key={c} className={styles.th}>
                        <div className={styles.thInner}>
                          <span>{c}</span>
                          <span className={styles.colType}>
                            {types[c] ?? "unknown"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                    >
                      {visibleColumns.map((c) => {
                        const v = String(r[c] ?? "");
                        return (
                          <td key={c} className={styles.td} title={v}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            This is a preview only (first ~100 rows from the first ~200 lines).
          </div>
        </div>
      </div>
    </div>
  );
}
