import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// Next.js App Router hooks need mocking in unit tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

let hookState: any
vi.mock("@/hooks/useChunkedUpload", () => ({
  useChunkedUpload: () => hookState,
}))

function setHookState(overrides: Record<string, unknown>) {
  hookState = {
    status: "idle",
    progress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    chunkIndex: null,
    totalChunks: null,
    chunks: null,
    error: null,
    errorHint: null,
    sessionId: null,
    start: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
    resume: vi.fn(),
    retryFailed: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  setHookState({})
})

describe("UploadWizard - button states", () => {
  it("disables Start Upload when status is canceled", async () => {
    setHookState({ status: "canceled", sessionId: "sid", chunks: ["failed"] })
    const { default: Wizard } = await import("@/components/upload/UploadWizard")

    render(<Wizard />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(["a,b\n1,2"], "file.csv", { type: "text/csv" })] },
    })

    const startBtn = await screen.findByRole("button", { name: /start upload/i })
    expect(startBtn).toBeDisabled()
  })

  it("disables Start Upload while uploading", async () => {
    setHookState({ status: "uploading" })
    const { default: Wizard } = await import("@/components/upload/UploadWizard")

    render(<Wizard />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(["a,b\n1,2"], "file.csv", { type: "text/csv" })] },
    })

    const startBtn = await screen.findByRole("button", { name: /start upload/i })
    expect(startBtn).toBeDisabled()
  })
})

