import ToasterClient from "@/components/layout/ToasterClient";
import Link from "next/link";
import { Inter } from "next/font/google";
import TopNav from "@/components/layout/TopNav";
import styles from "./layout.module.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#FFFFF0",
        }}
      >
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <div className={styles.brandRow}>
              <Link href="/" className={styles.brandLink}>
                Home
              </Link>
            </div>

            <TopNav />
          </header>
          <ToasterClient />
          {children}
        </div>
      </body>
    </html>
  );
}
