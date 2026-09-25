import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaptchaKit Next.js example",
  description: "Minimal App Router demo for captchakit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
