import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorker from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "DreamNote — write anything, keep everything",
  description: "An unlimited-note knowledge app for DreamLand. Sign in with Discord.",
  applicationName: "DreamNote",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DreamNote",
    statusBarStyle: "black-translucent",
    startupImage: "/icons/icon-512.png",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c5cff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Allow PWA-fullscreen on iOS
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dl-bg text-dl-ink antialiased">
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}