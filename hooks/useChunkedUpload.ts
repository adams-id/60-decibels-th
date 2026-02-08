"use client";

import { useCallback, useRef, useState } from "react";
import type { UploadInitResponse } from "@/lib/types";

/**
 * Explicit phases (avoid boolean soup).
 * These map nicely to a user-facing wizard: Select → Validate → Upload → Finalize → Ready.
 */
export type UploadPhase =
  | "idle"
  | "validating"
  | "initializing"
  | "uploading"
  | "finalizing"
  | "done"
  | "error"
  | "canceled";

export type ChunkStatus = "pending" | "uploading" | "uploaded" | "failed";

const DEFAULT_CHUNK_BYTES = 1024 * 1024; // 1MB
const DEFAULT_MAX_RETRIES_PER_CHUNK = 2;
const DEFAULT_MAX_CONCURRENCY = 3;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

export function useChunkedUpload() {
  const [status, setStatus] = useState<UploadPhase>("idle");
  // Progress is tracked by bytes (more trustworthy than chunk count).
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [chunkIndex, setChunkIndex] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [chunks, setChunks] = useState<ChunkStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const chunkSizeRef = useRef<number>(DEFAULT_CHUNK_BYTES);
  const chunkSizesRef = useRef<number[]>([]);
  const chunksRef = useRef<ChunkStatus[] | null>(null);

  const setPhase = useCallback((phase: UploadPhase) => {
    setStatus(phase);
  }, []);

  const resetPlanningState = useCallback(() => {
    fileRef.current = null;
    sessionIdRef.current = null;
    chunkSizesRef.current = [];
    chunksRef.current = null;
    chunkSizeRef.current = DEFAULT_CHUNK_BYTES;
    setChunks(null);
  }, []);

  const computeUploadedBytesFromChunks = useCallback(() => {
    const s = chunksRef.current;
    const sizes = chunkSizesRef.current;
    if (!s || s.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "uploaded") sum += sizes[i] ?? 0;
    }
    return sum;
  }, []);

  const setChunkStatus = useCallback((index: number, next: ChunkStatus) => {
    const current = chunksRef.current;
    if (!current) return;
    if (current[index] === next) return;
    current[index] = next;
    // Mirror to React state for UI.
    setChunks((prev) => {
      if (!prev) return prev;
      const copy = prev.slice();
      copy[index] = next;
      return copy;
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setProgress(0);
    setUploadedBytes(0);
    setTotalBytes(0);
    setChunkIndex(null);
    setTotalChunks(null);
    resetPlanningState();
    setError(null);
    setErrorHint(null);
    setSessionId(null);
  }, [resetPlanningState]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("canceled");
    // Note: we intentionally keep the session + in-memory chunk progress so the user can resume
    // within this page session if desired.
  }, []);

  const validateFile = useCallback((file: File) => {
    // Keep validation lightweight and user-friendly. We mainly want to catch obvious issues early.
    if (!file) throw new Error("No file selected");
    if (file.size === 0) throw new Error("This file is empty");
    if (file.size > MAX_UPLOAD_BYTES)
      throw new Error("File is too large (max 100MB)");

    const name = file.name ?? "";
    const looksLikeCsv = /\.csv$/i.test(name);
    if (!looksLikeCsv) {
      // Not a hard failure in real life, but for this exercise it's reasonable to be strict.
      throw new Error("Please select a .csv file");
    }
  }, []);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const uploadChunkWithRetry = useCallback(
    async (params: {
      sessionId: string;
      chunkIndex: number;
      totalChunks: number;
      body: ArrayBuffer;
      signal: AbortSignal;
      maxRetries?: number;
    }) => {
      const { sessionId, chunkIndex, totalChunks, body, signal } = params;
      const maxRetries = params.maxRetries ?? DEFAULT_MAX_RETRIES_PER_CHUNK;

      let attempt = 0;
      // Retry is safe here because `writeChunk` overwrites by index; resending a chunk is idempotent.
      while (true) {
        try {
          const chunkRes = await fetch("/api/upload/chunk", {
            method: "POST",
            headers: {
              "content-type": "application/octet-stream",
              "x-session-id": sessionId,
              "x-chunk-index": String(chunkIndex),
              "x-total-chunks": String(totalChunks),
            },
            body,
            signal,
          });

          if (chunkRes.ok) return;

          // Non-2xx: treat as retryable up to the max.
          attempt++;
          if (attempt > maxRetries) {
            throw new Error(`chunk ${chunkIndex} failed (${chunkRes.status})`);
          }
        } catch (e: any) {
          if (e?.name === "AbortError") throw e;
          attempt++;
          if (attempt > maxRetries) {
            throw e instanceof Error ? e : new Error("Chunk upload failed");
          }
        }

        // Simple backoff: quick retry first, then slower.
        await sleep(250 * attempt * attempt);
      }
    },
    [],
  );

  const buildChunkPlan = useCallback((file: File) => {
    const chunkSize = chunkSizeRef.current;
    const total = Math.ceil(file.size / chunkSize);
    const sizes: number[] = new Array(total);
    for (let i = 0; i < total; i++) {
      const startByte = i * chunkSize;
      const endByte = Math.min(startByte + chunkSize, file.size);
      sizes[i] = endByte - startByte;
    }

    chunkSizesRef.current = sizes;
    const initialChunks: ChunkStatus[] = new Array(total).fill("pending");
    chunksRef.current = initialChunks.slice();
    setChunks(initialChunks);
    setTotalChunks(total);
    setTotalBytes(file.size);
  }, []);

  const uploadRemainingChunks = useCallback(
    async (opts: { concurrency?: number }) => {
      const file = fileRef.current;
      const sid = sessionIdRef.current;
      const signal = abortRef.current?.signal;
      const plan = chunksRef.current;
      if (!file || !sid || !signal || !plan)
        throw new Error("Upload is not ready to resume");

      const concurrency = Math.max(
        1,
        Math.min(
          DEFAULT_MAX_CONCURRENCY,
          opts.concurrency ?? DEFAULT_MAX_CONCURRENCY,
        ),
      );
      const chunkSize = chunkSizeRef.current;
      const total = plan.length;

      const indices: number[] = [];
      for (let i = 0; i < total; i++) {
        const st = plan[i];
        if (st === "pending" || st === "failed") indices.push(i);
      }
      if (indices.length === 0) return;

      // Progress: recompute from already-uploaded chunks (important for resume/retry).
      const alreadyUploaded = computeUploadedBytesFromChunks();
      setUploadedBytes(alreadyUploaded);
      setProgress(file.size > 0 ? alreadyUploaded / file.size : 0);

      let next = 0;
      let firstError: unknown = null;

      const worker = async () => {
        while (next < indices.length) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          const i = indices[next]!;
          next++;

          setChunkStatus(i, "uploading");
          setChunkIndex(i);

          const startByte = i * chunkSize;
          const endByte = Math.min(startByte + chunkSize, file.size);
          const buf = await file.slice(startByte, endByte).arrayBuffer();

          try {
            await uploadChunkWithRetry({
              sessionId: sid,
              chunkIndex: i,
              totalChunks: total,
              body: buf,
              signal,
            });
            setChunkStatus(i, "uploaded");

            // Bytes-based progress: sum of all uploaded chunks so far.
            const sum = computeUploadedBytesFromChunks();
            setUploadedBytes(sum);
            setProgress(sum / file.size);
          } catch (e) {
            setChunkStatus(i, "failed");
            firstError = firstError ?? e;
            // Stop launching new chunks once we hit a failure (keeps behavior predictable for users).
            return;
          }
        }
      };

      // Run a small worker pool.
      const pool = new Array(concurrency).fill(0).map(() => worker());
      await Promise.allSettled(pool);

      setChunkIndex(null);

      if (firstError) throw firstError;
    },
    [computeUploadedBytesFromChunks, setChunkStatus, uploadChunkWithRetry],
  );

  const finalize = useCallback(async () => {
    const sid = sessionIdRef.current;
    const file = fileRef.current;
    const plan = chunksRef.current;
    const signal = abortRef.current?.signal;
    if (!sid || !file || !plan || !signal)
      throw new Error("Nothing to finalize");

    // Defensive: only finalize when every chunk is uploaded.
    const allUploaded = plan.every((c) => c === "uploaded");
    if (!allUploaded) throw new Error("Upload is incomplete (missing parts)");

    setPhase("finalizing");
    const finRes = await fetch("/api/upload/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sid, totalChunks: plan.length }),
      signal,
    });
    if (!finRes.ok) {
      setErrorHint(
        "Upload sent successfully, but the server couldn't assemble the file. Try re-uploading.",
      );
      throw new Error(`Could not finalize upload (${finRes.status})`);
    }
  }, [setPhase]);

  const runFullUpload = useCallback(
    async (file: File) => {
      setError(null);
      setErrorHint(null);
      setProgress(0);
      setUploadedBytes(0);
      setChunkIndex(null);
      setTotalChunks(null);
      resetPlanningState();

      setPhase("validating");
      validateFile(file);

      // Store the file so we can resume/retry without forcing the user to re-select it.
      fileRef.current = file;

      setPhase("initializing");
      const abort = new AbortController();
      abortRef.current = abort;

      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
        signal: abort.signal,
      });
      if (!initRes.ok) {
        setErrorHint("Please check your connection and try again.");
        throw new Error(`Could not start upload (${initRes.status})`);
      }

      const initJson = (await initRes.json()) as UploadInitResponse;
      setSessionId(initJson.sessionId);
      sessionIdRef.current = initJson.sessionId;
      localStorage.setItem("lastSessionId", initJson.sessionId);

      buildChunkPlan(file);

      setPhase("uploading");
      await uploadRemainingChunks({ concurrency: DEFAULT_MAX_CONCURRENCY });
      await finalize();
      setPhase("done");
    },
    [
      buildChunkPlan,
      finalize,
      resetPlanningState,
      setPhase,
      uploadRemainingChunks,
      validateFile,
    ],
  );

  const start = useCallback(
    async (file: File) => {
      try {
        await runFullUpload(file);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setStatus("error");
        setError(e?.message ?? "Upload failed");
        if (!errorHint) {
          setErrorHint(
            "Try again. If it keeps failing, re-select the file or restart the upload.",
          );
        }
      }
    },
    [errorHint, runFullUpload],
  );

  /**
   * Resume continues the current session using the in-memory chunk plan.
   * This is not "true resumability" across refreshes (the backend would need a "list uploaded chunks" endpoint).
   */
  const resume = useCallback(async () => {
    setError(null);
    setErrorHint(null);

    const file = fileRef.current;
    if (!file) {
      setError("Please re-select your file, then start again.");
      setErrorHint("We can't resume without access to the original file.");
      setStatus("error");
      return;
    }

    const sid = sessionIdRef.current;
    if (!sid) {
      setError("Upload session is missing. Please start again.");
      setErrorHint("Click Reset, then Start upload.");
      setStatus("error");
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      setPhase("uploading");
      await uploadRemainingChunks({ concurrency: DEFAULT_MAX_CONCURRENCY });
      await finalize();
      setPhase("done");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setStatus("error");
      setError(e?.message ?? "Upload failed");
      setErrorHint("You can retry again, or reset and start a fresh upload.");
    }
  }, [finalize, setPhase, uploadRemainingChunks]);

  const retryFailed = useCallback(async () => {
    // For this implementation, "retry failed" is the same as resume:
    // we only enqueue chunks with status pending/failed.
    await resume();
  }, [resume]);

  return {
    status,
    progress,
    uploadedBytes,
    totalBytes,
    chunkIndex,
    totalChunks,
    chunks,
    error,
    errorHint,
    start,
    cancel,
    reset,
    resume,
    retryFailed,
    sessionId,
  };
}
