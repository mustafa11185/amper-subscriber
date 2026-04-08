import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "فاتورتي — أمبير",
  description: "متابعة الفاتورة وحالة المولدة",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="max-w-[390px] w-full mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
