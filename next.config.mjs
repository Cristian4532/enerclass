/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Producción: minificación SWC y compresión HTTP para laptops básicas.
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    // Reduce el bundle de iconos: solo se empaqueta lo que se usa.
    optimizePackageImports: ["lucide-react"],
    // Habilita src/instrumentation.ts (auto-seed y PRAGMA WAL al arrancar).
    instrumentationHook: true
  }
};

export default nextConfig;
