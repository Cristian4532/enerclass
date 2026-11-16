"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: "!rounded-xl !border-slate-200 dark:!border-white/10 dark:!bg-[#0b1626] dark:!text-slate-100"
        }}
      />
    </ThemeProvider>
  );
}
