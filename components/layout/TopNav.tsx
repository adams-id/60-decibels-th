"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./TopNav.module.css"

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href))

  return (
    <Link href={href} className={`${styles.link} ${isActive ? styles.active : ""}`}>
      {label}
    </Link>
  )
}

export default function TopNav() {
  return (
    <nav className={styles.nav}>
      <NavLink href="/upload" label="Upload" />
      <NavLink href="/preview" label="Preview" />
    </nav>
  )
}

