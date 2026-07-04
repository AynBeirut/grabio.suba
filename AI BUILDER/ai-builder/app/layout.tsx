import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { FloatingGuideAssistant } from "@/components/ai/floating-guide-assistant";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "AI Builder - Build Websites with AI",
  description: "Create professional websites instantly with AI. No coding required. Choose from templates and let AI build your site.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-reload when a new build is deployed (fixes stale cache showing old UI)
              (function() {
                var BUILD_ID = '${process.env.NEXT_PUBLIC_BUILD_ID || 'dev'}';
                try {
                  var stored = localStorage.getItem('_app_build_id');
                  if (stored && stored !== BUILD_ID) {
                    localStorage.setItem('_app_build_id', BUILD_ID);
                    // Force hard reload to get fresh JS chunks
                    window.location.href = window.location.href.split('?')[0] + '?_v=' + BUILD_ID;
                    return;
                  }
                  localStorage.setItem('_app_build_id', BUILD_ID);
                } catch(e) {}

                // Auto-cleanup service workers and caches on every page load
                // Wrap in try/catch — navigator.serviceWorker throws SecurityError in sandboxed iframes
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for (let registration of registrations) {
                        registration.unregister();
                      }
                    });
                  }
                } catch(e) {}
                try {
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (let name of names) {
                        caches.delete(name);
                      }
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
          <FloatingGuideAssistant />
        </SessionProvider>
      </body>
    </html>
  );
}
