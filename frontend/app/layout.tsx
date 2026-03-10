import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "CryptiQ 2.0",
  description: "Quantum-safe messaging MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
