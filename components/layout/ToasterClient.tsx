"use client"

import { Toaster } from "react-hot-toast"

/**
 * Global toast mount.
 * Kept as a separate client component so `app/layout.tsx` can remain a server component.
 */
export default function ToasterClient() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4500,
        style: { fontSize: 13 },
      }}
    />
  )
}

