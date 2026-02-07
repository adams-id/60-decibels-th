import ToasterClient from "@/components/ToasterClient";
import Link from "next/link";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";

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
          background: "linear-gradient(180deg, #fffff0 240px)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
              paddingBottom: 12,
              borderBottom: "1px solid #ededed",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/"
                style={{
                  fontWeight: 800,
                  color: "#111",
                  textDecoration: "none",
                }}
              >
                Large Upload Take-home
              </Link>
              <div style={{ color: "#666", fontSize: 13 }}>
                Chunked uploads + data preview
              </div>
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
