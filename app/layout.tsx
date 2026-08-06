import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";

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
        <ToastProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            <Navbar />
            <main className="flex-1 p-6 overflow-y-auto">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}


