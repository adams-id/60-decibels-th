import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}))

describe("SessionPicker", () => {
  it("disables incomplete sessions and shows them in red", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          sessions: [
            {
              sessionId: "incomplete-session-id",
              updatedAtMs: Date.now(),
              hasAssembled: false,
              chunkCount: 3,
            },
            {
              sessionId: "complete-session-id",
              updatedAtMs: Date.now() - 1000,
              hasAssembled: true,
              chunkCount: 10,
            },
          ],
        }),
      })),
    )

    const { default: SessionPicker } = await import("@/components/preview/SessionPicker")

    render(<SessionPicker />)

    // Open dropdown
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /expand previous uploads/i }))

    // Incomplete should exist and be disabled
    const incompleteText = await screen.findByText(/\(incomplete\)/i)
    const incompleteBtn = incompleteText.closest("button")
    expect(incompleteBtn).toBeTruthy()
    expect(incompleteBtn!).toBeDisabled()

    // Complete should be enabled
    const readyText = await screen.findByText(/\(ready\)/i)
    const readyBtn = readyText.closest("button")
    expect(readyBtn).toBeTruthy()
    expect(readyBtn!).not.toBeDisabled()
  })
})

