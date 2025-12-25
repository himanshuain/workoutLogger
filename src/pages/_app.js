import "@/styles/globals.css";
import { useEffect } from "react";
import Head from "next/head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkoutProvider } from "@/context/WorkoutContext";
import { ThemeProvider } from "@/context/ThemeContext";
import NotificationService from "@/lib/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }) {
  // Register service worker and start notification checker
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });

      // Start notification schedule checker
      NotificationService.startScheduleChecker();

      return () => {
        NotificationService.stopScheduleChecker();
      };
    }
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
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Logbook" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <title>Logbook</title>
      </Head>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WorkoutProvider>
            <Component {...pageProps} />
          </WorkoutProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
