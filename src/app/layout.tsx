import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klinika Boshqaruvi",
  description: "Doctor/Dentist Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
