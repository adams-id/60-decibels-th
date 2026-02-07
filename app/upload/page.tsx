import UploadWizard from "@/components/UploadWizard"

export default function UploadPage() {
  return (
    <main>
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, letterSpacing: -0.3 }}>Upload</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.5, maxWidth: 860 }}>
          Upload a CSV safely under request size limits. When the upload is fully finalized, you’ll be able to open a
          readable preview (including wide datasets).
        </p>
      </div>
      <UploadWizard />
    </main>
  )
}

