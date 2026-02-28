// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS KHK Frozen Food",
  description: "Point of Sales KHK Frozen Food",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KHK POS",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C64F2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KHK POS" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .catch(function(err) { console.log('SW failed:', err); });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}