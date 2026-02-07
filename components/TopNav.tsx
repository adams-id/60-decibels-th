"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href))

  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: isActive ? "#111" : "#555",
        fontSize: 13,
        fontWeight: isActive ? 750 : 650,
        padding: "6px 2px",
        borderBottom: isActive ? "2px solid #111" : "2px solid transparent",
        lineHeight: 1.1,
      }}
    >
      {label}
    </Link>
  )
}

export default function TopNav() {
  return (
    <nav style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <NavLink href="/upload" label="Upload" />
      <NavLink href="/preview" label="Preview" />
    </nav>
  )
}

