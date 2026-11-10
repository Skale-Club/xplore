import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getLocale } from "@/i18n/get-locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Xplore",
  description: "Track your game completion checklists.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xplore",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfdfe" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1417" },
  ],
};

// Applies the saved theme before paint to avoid a flash. Default is dark:
// only an explicit "light" preference removes the class set on <html>.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ServiceWorkerRegister />
        <Suspense fallback={<div aria-hidden className="h-14 shrink-0 border-b border-border/60" />}>
          <SiteHeader />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
