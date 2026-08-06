import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";
import { SidebarProvider } from "@/components/SidebarContext";
import TeacherOverlay from "@/components/TeacherOverlay";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "منصة المايسترو - الأستاذ أحمد راضي كحلة",
  description: "نظام إدارة تعليمي وحضور وماليات مخصص للأستاذ أحمد راضي كحلة",
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
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-row font-sans">
        {/* نظام الثيم الديناميكي */}
        <ThemeProvider />
        {/* خلفيات التوهج المتغيرة اللون */}
        <div className="ambient-glow-1" aria-hidden="true" />
        <div className="ambient-glow-2" aria-hidden="true" />
        {/* صورة المستر كـ overlay */}
        <TeacherOverlay />
        <ToastProvider>
          <SidebarProvider>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
              <Navbar />
              <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
            </div>
          </SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  );
}



