"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChunkedUpload } from "@/hooks/useChunkedUpload";
import toast from "react-hot-toast";
import styles from "./UploadWizard.module.css";

function formatBytes(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = n;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function percent(n: number) {
  return `${Math.max(0, Math.min(100, Math.round(n * 100)))}%`;
}

function phaseColor(phase: string) {
  if (phase === "done") return "#16a34a"; // green
  if (phase === "error") return "#b00020"; // red
  if (phase === "canceled") return "#6c757d"; // gray
  if (phase === "finalizing") return "#5a2ca0"; // purple
  if (
    phase === "uploading" ||
    phase === "initializing" ||
    phase === "validating"
  )
    return "#2563eb"; // blue
  return "#111";
}

function Stepper({ phase, isError }: { phase: string; isError: boolean }) {
  const steps = [
    { key: "idle", label: "Select", sub: "Choose file" },
    { key: "validating", label: "Validate", sub: "Check format" },
    { key: "uploading", label: "Upload", sub: "Send chunks" },
    { key: "finalizing", label: "Finalize", sub: "Complete" },
    { key: "done", label: "Ready", sub: "Preview" },
  ] as const;

  const normalized =
    phase === "initializing"
      ? "uploading"
      : phase === "error" || phase === "canceled"
        ? "uploading"
        : phase;

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === normalized),
  );

  return (
    <div className={styles.stepsRow}>
      {steps.map((s, idx) => {
        const isActive = idx === activeIndex;
        const isCompleted = idx < activeIndex;
        const isFailed = isError && idx === activeIndex;
        const isLast = idx === steps.length - 1;

        const indicatorClass = [
          styles.stepIndicator,
          isActive ? styles.stepIndicatorActive : "",
          isCompleted ? styles.stepIndicatorCompleted : "",
          isFailed ? styles.stepIndicatorError : "",
        ]
          .filter(Boolean)
          .join(" ");

        const titleClass = [
          styles.stepTitle,
          isActive ? styles.stepTitleActive : "",
          isCompleted ? styles.stepTitleCompleted : "",
          isFailed ? styles.stepTitleError : "",
        ]
          .filter(Boolean)
          .join(" ");

        const connectorClass = [
          styles.stepConnector,
          isCompleted ? styles.stepConnectorCompleted : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={s.key}
            className={`${styles.stepGroup} ${isLast ? styles.stepGroupTight : ""}`}
            style={{ flex: isLast ? "0 0 auto" : undefined }}
          >
            <div className={indicatorClass}>
              {isFailed ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : isCompleted ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                String(idx + 1)
              )}
            </div>
            <div className={styles.stepText}>
              <div className={titleClass}>{s.label}</div>
              <div
                className={styles.stepSub}
                style={isFailed ? { color: "#b00020" } : undefined}
              >
                {s.sub}
              </div>
            </div>
            {!isLast ? <div className={connectorClass} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className={styles.infoBox}>{children}</div>;
}

export default function UploadWizard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastNonTerminalPhaseRef = useRef<string>("idle");
  const [dragOver, setDragOver] = useState(false);

  const {
    status,
    progress,
    error,
    errorHint,
    start,
    cancel,
    reset,
    resume,
    sessionId,
    uploadedBytes,
    totalBytes,
    chunkIndex,
    totalChunks,
    chunks,
  } = useChunkedUpload();

  // "Start Upload" is only enabled when we can safely begin a fresh attempt.
  // If the user cancels, they should use Resume (missing parts) or Reset.
  const canStart = !!file && (status === "idle" || status === "error");
  const isBusy =
    status === "validating" ||
    status === "initializing" ||
    status === "uploading" ||
    status === "finalizing";
  const canResume =
    (status === "error" || status === "canceled") && !!sessionId && !!chunks;
  const startDisabled = !canStart || isBusy;
  const showGoToPreview = !!sessionId && status === "done";
  const isDone = status === "done";
  const hasFile = !!file;

  const stepPhase =
    status === "error" || status === "canceled"
      ? lastNonTerminalPhaseRef.current
      : status;

  const chunkSummary = useMemo(() => {
    if (!chunks || chunks.length === 0) return null;
    const uploaded = chunks.filter((c) => c === "uploaded").length;
    const failed = chunks.filter((c) => c === "failed").length;
    return { uploaded, failed, total: chunks.length };
  }, [chunks]);

  const failedChunkCount = chunkSummary?.failed ?? 0;

  // Toasts: keep them phase-driven (and dedupe with a ref).
  const lastPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastPhaseRef.current === status) return;
    lastPhaseRef.current = status;

    if (status === "validating")
      toast.loading("Validating file…", { id: "upload" });
    if (status === "initializing")
      toast.loading("Starting upload…", { id: "upload" });
    if (status === "uploading") toast.loading("Uploading…", { id: "upload" });
    if (status === "finalizing") toast.loading("Finalizing…", { id: "upload" });
    if (status === "done")
      toast.success("Upload complete. Preview is ready.", { id: "upload" });
    if (status === "canceled") toast("Upload canceled.", { id: "upload" });
    if (status === "error")
      toast.error("Upload failed. See details below.", { id: "upload" });
    if (status === "idle") toast.dismiss("upload");
  }, [status]);

  useEffect(() => {
    if (status === "error" || status === "canceled") return;
    lastNonTerminalPhaseRef.current = status;
  }, [status]);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (
      f &&
      (status === "done" ||
        status === "error" ||
        status === "canceled" ||
        status === "idle")
    ) {
      reset();
      toast.dismiss("upload");
    }
  };

  const stageDescription = useMemo(() => {
    if (status === "idle") return "Choose a CSV file to begin.";
    if (status === "validating")
      return "Checking that the file looks like a CSV and isn’t empty.";
    if (status === "initializing") return "Creating a secure upload session.";
    if (status === "uploading")
      return "Sending your file in small parts so it works under request size limits.";
    if (status === "finalizing")
      return "Assembling uploaded parts into a single CSV and preparing the preview.";
    if (status === "done")
      return "Upload is fully complete. You can now review the preview.";
    if (status === "canceled")
      return "Upload was stopped. You can resume or restart.";
    if (status === "error")
      return "Some parts upload have failed. You can retry the missing parts or restart.";
    return "";
  }, [status]);

  const progressColor = phaseColor(status);

  const clearFileAndReset = () => {
    reset();
    setFile(null);
    toast.dismiss("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <div className={styles.card}>
        <div className={styles.stepsHeader}>
          <Stepper phase={stepPhase} isError={status === "error"} />
        </div>

        <div className={styles.body}>
          <div style={{ marginBottom: 16 }}>
            <h2 className={styles.sectionTitle}>Upload your CSV</h2>
            <p className={styles.sectionSubtitle}>
              Large files are sent in parts (chunked) to work under request size
              limits.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            disabled={isBusy}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />

          {!hasFile && !isDone ? (
            <div
              className={[
                styles.uploadZone,
                dragOver ? styles.uploadZoneDragover : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                if (isBusy) return;
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                if (isBusy) return;
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0] ?? null;
                onPickFile(f);
              }}
              title={
                isBusy
                  ? "Upload in progress"
                  : "Click to upload or drag and drop"
              }
            >
              <div className={styles.uploadIconWrap} aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12l-3 3m3-3l3 3m-3-3v9"
                    stroke="#4b5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Click to upload or drag and drop
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
                CSV files only (max 100MB)
              </div>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isBusy}
              >
                Choose File
              </button>
            </div>
          ) : null}

          {hasFile && !isDone ? (
            <div className={styles.fileSelectedCard}>
              <div className={styles.fileRow}>
                <div className={styles.fileIcon} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.fileMeta}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className={styles.fileName}>
                        {file?.name ?? "Selected file"}
                      </p>
                      <p className={styles.fileSize}>
                        {file ? formatBytes(file.size) : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => clearFileAndReset()}
                      title="Remove file"
                      aria-label="Remove file"
                      disabled={isBusy}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.progressTopRow}>
                    <div className={styles.progressLabel}>Progress</div>
                    <div className={styles.progressPct}>
                      {percent(progress)}
                    </div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: percent(progress) }}
                    />
                  </div>
                  <p className={styles.hint}>
                    Upload completes only after “Finalize” succeeds. Progress is
                    measured by bytes sent.
                  </p>

                  {status !== "idle" ? (
                    <p className={styles.hint} style={{ marginTop: 8 }}>
                      <b style={{ color: progressColor }}>
                        {status.toUpperCase()}
                      </b>{" "}
                      — {stageDescription}
                      {sessionId ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          session {sessionId.slice(0, 8)}…
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  <p className={styles.hint} style={{ marginTop: 8 }}>
                    {totalBytes > 0 ? (
                      <span>
                        {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                      </span>
                    ) : null}
                    {chunkSummary ? (
                      <span style={{ marginLeft: 10 }}>
                        parts {chunkSummary.uploaded}/{chunkSummary.total}
                        {failedChunkCount > 0 ? (
                          <span style={{ color: "#b00020" }}>
                            {" "}
                            • failed {failedChunkCount}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    {status === "uploading" &&
                    totalChunks != null &&
                    chunkIndex != null ? (
                      <span style={{ marginLeft: 10 }}>
                        (part {chunkIndex + 1} of {totalChunks})
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.primaryBtn} ${styles.flex1}`}
                  onClick={() => file && start(file)}
                  disabled={startDisabled}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12l-3 3m3-3l3 3m-3-3v9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {status === "error" ? "Restart Upload" : "Start Upload"}
                  </span>
                </button>

                {canResume ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => resume()}
                  >
                    Resume Missing Parts
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => cancel()}
                  disabled={!isBusy}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => clearFileAndReset()}
                >
                  Reset
                </button>
              </div>

              {error ? (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(176,0,32,0.18)",
                    background: "rgba(176,0,32,0.06)",
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#b00020" }}>
                    Upload failed
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#b00020",
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                  >
                    <div>
                      <b>Error:</b> {error}
                    </div>
                    {errorHint ? (
                      <div style={{ marginTop: 4, color: "#8a0019" }}>
                        <b>What you can do:</b> {errorHint}
                      </div>
                    ) : null}
                    {failedChunkCount > 0 && canResume ? (
                      <div style={{ marginTop: 6, color: "#8a0019" }}>
                        Tip: Click “Resume Missing Parts” to retry only the
                        failed parts.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <InfoBox>
            <div className={styles.infoRow}>
              <div style={{ flex: "0 0 auto" }} aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    color: "#1e3a8a",
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  How it works
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    color: "#1e40af",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <li>
                    Files are split into smaller chunks to handle large uploads
                    efficiently.
                  </li>
                  <li>
                    You can cancel and resume missing parts (within this page
                    session).
                  </li>
                  <li>
                    After upload completes, you’ll see a preview of your
                    dataset.
                  </li>
                </ul>
              </div>
            </div>
          </InfoBox>
        </div>
      </div>

      {isDone && showGoToPreview ? (
        <div className={styles.successCard}>
          <div className={styles.successIcon} aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className={styles.successTitle}>Upload Complete!</h3>
          <p className={styles.successSub}>
            Your file has been successfully uploaded and is ready for preview.
          </p>
          <div className={styles.successActions}>
            <button
              type="button"
              className={styles.successBtn}
              onClick={() =>
                router.push(
                  `/preview?sessionId=${encodeURIComponent(sessionId)}`,
                )
              }
            >
              Open Preview
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                clearFileAndReset();
                fileInputRef.current?.click();
              }}
            >
              Upload another file
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
