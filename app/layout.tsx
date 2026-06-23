import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEALI Tough Conversations Resource Notebook",
  description:
    "Conference resource notebook for early childhood educators and child care providers.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
