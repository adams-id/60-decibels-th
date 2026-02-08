import { describe, expect, it } from "vitest"
import { parseCsvPreview } from "@/lib/csv"

describe("parseCsvPreview", () => {
  it("flags duplicate headers", () => {
    const csv = ["a,a", "1,2", "3,4"].join("\n")
    const preview = parseCsvPreview(csv, 10)

    expect(preview.issues.some((i) => i.message.toLowerCase().includes("duplicate"))).toBe(true)
  })

  it("flags row/header length mismatch", () => {
    const csv = ["a,b,c", "1,2,3", "4,5"].join("\n")
    const preview = parseCsvPreview(csv, 10)

    expect(preview.issues.some((i) => i.message.toLowerCase().includes("different number of values"))).toBe(true)
  })

  it("infers basic types", () => {
    const csv = ["n,b,s", "1,true,hello", "2,false,world"].join("\n")
    const preview = parseCsvPreview(csv, 10)

    expect(preview.types.n).toBe("number")
    expect(preview.types.b).toBe("boolean")
    expect(preview.types.s).toBe("string")
  })
})

