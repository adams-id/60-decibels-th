"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SessionInfo = {
  sessionId: string;
  updatedAtMs: number;
  hasAssembled: boolean;
  chunkCount: number;
};

function formatWhen(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function shortId(sessionId: string) {
  return `${sessionId.slice(0, 8)}…`;
}

export default function SessionPicker() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("sessionId");

  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/upload/sessions", { method: "GET" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as { sessions: SessionInfo[] };
      setSessions(json.sessions ?? []);
    } catch (e: any) {
      setSessions([]);
      setError(e?.message ?? "Failed to load sessions");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = sessions ?? [];

  const headline = useMemo(() => {
    if (!sessions) return "Previous uploads";
    return items.length === 0
      ? "Previous uploads"
      : `Previous uploads (${items.length})`;
  }, [items.length, sessions]);

  return (
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
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            aria-label={
              isOpen ? "Collapse previous uploads" : "Expand previous uploads"
            }
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: "1px solid #e5e5e5",
              background: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#444",
              flex: "0 0 auto",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              V
            </span>
          </button>
          <div
            style={{
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {headline}
          </div>
        </div>

        <button
          onClick={() => void load()}
          style={{ padding: "6px 10px", borderRadius: 10, fontSize: 12 }}
        >
          Refresh
        </button>
      </div>

      {isOpen ? (
        <div
          style={{ marginTop: 6, fontSize: 12, color: "#666", lineHeight: 1.4 }}
        >
          Click a session to load its preview.
        </div>
      ) : (
        <div
          style={{ marginTop: 6, fontSize: 12, color: "#666", lineHeight: 1.4 }}
        >
          {current ? (
            <span>
              Currently viewing: <b>{shortId(current)}</b>
            </span>
          ) : (
            <span>Closed. Click the chevron to choose a previous upload.</span>
          )}
        </div>
      )}

      {isOpen ? (
        <>
          {error ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b00020" }}>
              {error}
            </div>
          ) : null}

          {!sessions ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              Loading sessions…
            </div>
          ) : items.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              No uploads found yet.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {items.slice(0, 20).map((s) => {
                const isActive = current === s.sessionId;
                const status = s.hasAssembled ? "ready" : "incomplete";
                return (
                  <button
                    key={s.sessionId}
                    onClick={() => {
                      router.push(
                        `/preview?sessionId=${encodeURIComponent(s.sessionId)}`,
                      );
                      setIsOpen(false);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "10px 10px",
                      borderRadius: 12,
                      border: `1px solid ${isActive ? "rgba(11,94,215,0.30)" : "#eee"}`,
                      background: isActive ? "rgba(11,94,215,0.06)" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                      }}
                    >
                      <div style={{ fontWeight: 750, fontSize: 13 }}>
                        {shortId(s.sessionId)}{" "}
                        <span
                          style={{
                            fontSize: 11,
                            color: "#666",
                            fontWeight: 650,
                          }}
                        >
                          ({status})
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#666" }}>
                        {formatWhen(s.updatedAtMs)}
                      </div>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                      chunks: <b>{s.chunkCount}</b>
                      {s.hasAssembled ? (
                        <span style={{ color: "#146c43" }}> • assembled</span>
                      ) : (
                        <span> • not assembled</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {items.length > 20 ? (
                <div style={{ fontSize: 12, color: "#666" }}>
                  Showing latest 20 sessions.
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
