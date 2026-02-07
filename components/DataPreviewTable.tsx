"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PreviewResponse } from "@/lib/types";

function badgeColor(severity: "info" | "warning" | "error") {
  if (severity === "error")
    return { fg: "#b00020", bg: "#b0002012", border: "#b0002028" };
  if (severity === "warning")
    return { fg: "#7a5d00", bg: "#ffcc0015", border: "#ffcc0030" };
  return { fg: "#0b5ed7", bg: "#0b5ed712", border: "#0b5ed728" };
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
  // This makes the Preview page more forgiving if someone navigates here directly.
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
      <div style={{ color: "#666" }}>
        Missing sessionId. Upload first, then click “Go to preview”.
      </div>
    );
  if (error) return <div style={{ color: "#b00020" }}>{error}</div>;
  if (!data) return <div style={{ color: "#666" }}>Loading preview…</div>;

  const { columns, types, rows, issues, stats, columnStats } = data.preview;

  const selected = selectedColumns ?? new Set<string>();
  const filteredColumns = columns.filter((c) =>
    c.toLowerCase().includes(columnQuery.trim().toLowerCase()),
  );
  const visibleColumns = columns.filter((c) => selected.has(c));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <div style={{ fontWeight: 750 }}>Preview summary</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            Session{" "}
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {effectiveSessionId.slice(0, 8)}…
            </span>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#444",
          }}
        >
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "#f3f3f3",
            }}
          >
            <b>{stats.previewColumns}</b> columns
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "#f3f3f3",
            }}
          >
            <b>{stats.previewRows}</b> preview rows
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "#f3f3f3",
            }}
          >
            <b>{issues.length}</b> checks flagged
          </span>
        </div>

        {issues.length > 0 ? (
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {issues.map((iss, idx) => {
              const c = badgeColor(iss.severity);
              return (
                <div
                  key={idx}
                  style={{
                    fontSize: 12,
                    color: c.fg,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                  }}
                >
                  <b style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {iss.severity}
                  </b>
                  <span style={{ color: "#444" }}> — {iss.message}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: "#146c43" }}>
            No obvious issues found in the preview.
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            padding: 12,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Columns</div>

          <input
            value={columnQuery}
            onChange={(e) => setColumnQuery(e.target.value)}
            placeholder="Filter columns…"
            style={{
              width: "93%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e5e5",
            }}
          />

          <div style={{ height: 10 }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedColumns(new Set(columns))}
              style={{ padding: "6px 10px", borderRadius: 10, fontSize: 12 }}
            >
              Show all
            </button>
            <button
              onClick={() =>
                setSelectedColumns(
                  new Set(columns.slice(0, Math.min(12, columns.length))),
                )
              }
              style={{ padding: "6px 10px", borderRadius: 10, fontSize: 12 }}
            >
              Show first 12
            </button>
            <button
              onClick={() => setSelectedColumns(new Set())}
              style={{ padding: "6px 10px", borderRadius: 10, fontSize: 12 }}
            >
              Clear
            </button>
          </div>

          <div style={{ height: 10 }} />

          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
            Selected <b>{visibleColumns.length}</b> of <b>{columns.length}</b>
          </div>

          <div
            style={{
              maxHeight: 520,
              overflow: "auto",
              border: "1px solid #eee",
              borderRadius: 12,
            }}
          >
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
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr",
                      gap: 8,
                      padding: "8px 10px",
                      borderBottom: "1px solid #f3f3f3",
                      cursor: "pointer",
                      background: isChecked ? "#0b5ed708" : "#fff",
                    }}
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "#111",
                            fontWeight: 650,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#666",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {type}
                        </div>
                      </div>
                      <div
                        style={{ marginTop: 2, fontSize: 11, color: "#666" }}
                      >
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

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            padding: 12,
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            <div style={{ fontWeight: 700 }}>Rows (preview)</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Showing {rows.length} rows
            </div>
          </div>

          <div style={{ height: 10 }} />

          {visibleColumns.length === 0 ? (
            <div style={{ color: "#666", fontSize: 13 }}>
              No columns selected. Choose one or more columns on the left.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                borderRadius: 12,
                border: "1px solid #eee",
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {visibleColumns.map((c) => (
                      <th
                        key={c}
                        style={{
                          position: "sticky",
                          top: 0,
                          textAlign: "left",
                          padding: 8,
                          borderBottom: "1px solid #eee",
                          background: "#fafafa",
                          whiteSpace: "nowrap",
                          zIndex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "baseline",
                          }}
                        >
                          <span>{c}</span>
                          <span style={{ fontSize: 11, color: "#666" }}>
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
                      style={{ background: idx % 2 === 0 ? "#fff" : "#fcfcfc" }}
                    >
                      {visibleColumns.map((c) => {
                        const v = String(r[c] ?? "");
                        return (
                          <td
                            key={c}
                            title={v}
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #f3f3f3",
                              whiteSpace: "nowrap",
                              maxWidth: 260,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
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
