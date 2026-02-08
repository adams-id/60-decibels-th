## What I changed and why

### Codebase structure

- **Component folders by feature**: reorganized `components/` to group UI + styles together by feature:
  - `components/upload/` (upload flow UI)
  - `components/preview/` (preview UI + session picker)
  - `components/home/` (landing page)
  - `components/layout/` (nav + toaster)
- **CSS modules**: moved most component styling from inline `style={{...}}` blocks into colocated `*.module.css` files to keep UI code easier to read and the design easier to evolve.

### Upload UX

- **Explicit phases**: modeled the flow as clear phases (Select → Validate → Init → Upload → Finalize → Ready) so users always know where they are.
- **Trustworthy progress**: switched progress from “chunks uploaded” to **bytes uploaded / total bytes**, so the percentage matches what users expect.
- **Actionable errors**: added human-readable guidance (“what you can do”) rather than raw status codes only.
- **Notifications**: added `react-hot-toast` to provide calm, lightweight feedback at key milestones without cluttering the UI.
- **Max file size clarity**: UI now states **max 100MB** and the client validates this before uploading (fast fail for users).
- **Clearer upload surface**: replaced the earlier multi-panel layout with a simple, friendly “single card” upload flow:
  - stepper timeline at the top (completed steps show a green check + green connector)
  - centered dropzone with drag-and-drop + “Choose File”
  - file-selected state shows a compact file card + progress + action buttons
  - “Go to preview” / “Open preview” only appear after a true success (after finalize)
  - “Upload another file” resets back to file selection (does not re-upload the prior file)
  - styling moved to a CSS module while keeping the app dependency-light

### Client-side robustness

- **Per-chunk state model**: introduced chunk-level statuses (`pending | uploading | uploaded | failed`) to avoid fragile boolean soup and make partial failures representable.
- **Limited concurrency**: upload uses a small worker pool (default 3) for better throughput while keeping behavior predictable.
- **Safe retry**: chunk retry is treated as safe because the backend writes each chunk by `(sessionId, chunkIndex)` and overwrites on re-send (idempotent from the frontend’s perspective).
- **Cancel + resume (in-session)**:
  - cancel aborts in-flight requests
  - resume retries only missing/failed chunks and then finalizes
  - this is **in-session only** (no true resumability across refresh without backend support)
- **Finalize safety check**: the server validates chunk completeness (uses client-provided `totalChunks` when available; otherwise detects gaps) to avoid silently assembling corrupted CSVs.
- **Preview decoding guard**: finalize only decodes the first ~200 lines to avoid converting the entire file to a string just to render a preview.

### Data preview surface

- **Wide-dataset UX**: added a left-side column picker with filter + selection so 20–100 columns are usable.
- **Early issue surfacing**: the preview now flags:
  - duplicate column names
  - preview rows with a mismatched number of values vs the header
  - empty headers (normalized to “Column N”)
- **More readable table**: sticky header, zebra rows, truncation with hover tooltip.
- **Session picker for previous uploads**: added a “Previous uploads” dropdown that lists locally stored sessions so users can revisit earlier previews without copying IDs.

### Navigation + landing page improvements

- **Landing page instead of redirect**: `/` is now a simple “what this does + next steps” page, with links to Upload and Preview.
- **Header navigation**: added lightweight nav links (Upload/Preview) so users always know where to go.
- **Preview robustness**: Preview now reads `sessionId` via App Router search params (with a safe fallback to `localStorage.lastSessionId`) and uses a `Suspense` boundary.
- **Typography**: use the Inter font via `next/font` for a cleaner, consistent UI.

### Tests

- **Test harness**: added `vitest` + Testing Library (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`) with a minimal `vitest.config.ts` + `tests/setup.ts`.
- **High-signal coverage** (kept intentionally small for timebox):
  - `tests/csv.test.ts`: CSV preview parsing (duplicate headers, row length mismatch issue, type inference).
  - `tests/UploadWizard.test.tsx`: critical UX behavior for “Start Upload” disabled states (canceled, uploading).
  - `tests/SessionPicker.test.tsx`: incomplete sessions are disabled; complete sessions remain selectable.
- **Scripts**: added `npm test` and `npm run test:watch`.

## What I intentionally did not do

- **True resumable uploads across refresh/device**: would require backend endpoints to query upload state (e.g. “which chunks are present?”) and likely checksums.
- **Pause/resume**: cancel + resume covers the main UX needs for this timebox.
- **Full CSV correctness/performance**: parsing is intentionally lightweight (preview-only) and does not implement a complete CSV spec for all edge cases.
- **Authentication / persistence / database**: out of scope .
- **Perfect visual design system**: UI uses inline styles for speed and clarity since it is a take-home setting. In a real app, I’d centralize tokens/components.

## Tradeoffs

- **Preview accuracy vs cost**: the server returns only a preview from the first ~200 lines / ~100 rows to keep work cheap and fast.
- **Concurrency**: kept low to avoid saturating the server and to make failures easier to reason about.
- **Error behavior**: on first chunk failure after retries, uploads stop to keep behavior predictable. User can resume missing parts.
- **Session listing is local-only**: the “previous uploads” list comes from `.data/` on disk. In production, this would likely come from a database or object storage metadata.

## What I’d ask the backend for next

- **`GET /api/upload/status?sessionId=...`** returning:
  - expected chunk count
  - which chunk indices are present
  - optional checksums/byte ranges
- **Finalize validation**:
  - verify all chunks present
  - verify assembled size matches expected
- **More robust preview endpoints**:
  - column-level summary stats (null %, unique count, sample values)
  - schema validation hooks / configurable rules
- **Session metadata**:
  - original filename, file size, upload timestamps
  - preview generation timestamp
  - ability to delete old sessions safely
