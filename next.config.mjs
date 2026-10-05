import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // On-premise target (OTI UNSCH): emits a minimal, self-contained Node.js
  // server in .next/standalone that runs inside the Docker image without
  // node_modules. Server Actions, cookies and Route Handlers remain available.
  output: "standalone",
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate" },
        ],
      },
    ];
  },
  images: {
    // Photos are already compressed client-side to WebP (~120 KB) with the
    // Canvas API, so the server-side optimizer would only burn OTI CPU.
    // With unoptimized images next/image serves the original src as-is,
    // including local "/uploads/..." paths and legacy remote URLs.
    unoptimized: true,
  },
};

export default withBundleAnalyzer(nextConfig);
