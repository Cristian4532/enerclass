import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EnerClass · I.E. N° 2001 Leoncio Prado",
    template: "%s · EnerClass"
  },
  description:
    "Sistema de seguimiento del consumo eléctrico y la eficiencia energética de la I.E. N° 2001 Leoncio Prado, Rímac — Lima, Perú.",
  applicationName: "EnerClass",
  keywords: ["EnerClass", "eficiencia energética", "IoT", "ESP32", "SCT-013", "Leoncio Prado", "Rímac"],
  authors: [{ name: "I.E. N° 2001 Leoncio Prado" }]
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#060c16" }
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
