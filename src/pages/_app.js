import "@/styles/globals.css";
import { useEffect } from "react";
import Head from "next/head";
import localFont from "next/font/local";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkoutProvider } from "@/context/WorkoutContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeSettingsSync from "@/components/ThemeSettingsSync";

const fjallaOne = localFont({
  src: [{ path: "../../public/fonts/fjalla-one-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-fjalla-one",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "../../public/fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }) {
  useEffect(() => {
    document.documentElement.classList.add(fjallaOne.variable, jetbrainsMono.variable);
    return () => {
      document.documentElement.classList.remove(fjallaOne.variable, jetbrainsMono.variable);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    import("@/lib/notifications").then(({ default: NotificationService }) => {
      if (cancelled) return;
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      NotificationService.startScheduleChecker();
    });

    return () => {
      cancelled = true;
      import("@/lib/notifications").then(({ default: NotificationService }) => {
        NotificationService.stopScheduleChecker();
      });
    };
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#18181b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Logbook" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>Logbook</title>
      </Head>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WorkoutProvider>
            <ThemeSettingsSync />
            <div className={`${fjallaOne.className} font-sans antialiased`}>
              <ErrorBoundary>
                <Component {...pageProps} />
              </ErrorBoundary>
              <Toaster
                position="bottom-right"
                duration={1600}
                toastOptions={{
                  className: "!rounded-card !text-sm !shadow-lg",
                  style: {
                    background: "var(--toast-bg)",
                    color: "var(--toast-fg)",
                    border: "1px solid var(--toast-border)",
                  },
                }}
                richColors
              />
            </div>
          </WorkoutProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
