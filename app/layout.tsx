import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";
import { SidebarProvider } from "@/components/SidebarContext";
import TeacherOverlay from "@/components/TeacherOverlay";
import ThemeProvider from "@/components/ThemeProvider";
import PageTransition from "@/components/PageTransition";
import CommandPalette from "@/components/CommandPalette";
import CommandMenu from "@/components/CommandMenu";
import OfflineBanner from "@/components/OfflineBanner";
import PwaStatusManager from "@/components/PwaStatusManager";
import OfflineSyncWidget from "@/components/OfflineSyncWidget";

export const metadata: Metadata = {
  title: "منصة المايسترو - الأستاذ أحمد راضي كحلة",
  description: "نظام إدارة تعليمي وحضور وماليات مخصص للأستاذ أحمد راضي كحلة",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased dark"
    >
      <head>
        {/* Cairo font preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-row font-sans">
        {/* نظام الثيم الديناميكي */}
        <ThemeProvider />
        {/* خلفيات التوهج المتغيرة اللون */}
        <div className="ambient-glow-1" aria-hidden="true" />
        <div className="ambient-glow-2" aria-hidden="true" />
        {/* صورة المستر كـ overlay */}
        <TeacherOverlay />
        <ToastProvider>
          <PwaStatusManager />
          <OfflineSyncWidget />
          <OfflineBanner />
          <CommandMenu />
          <SidebarProvider>
            <Sidebar />
            {/* Global Command Palette - available on all pages */}
            <CommandPalette />
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
              <Navbar />
              <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
            </div>
          </SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
