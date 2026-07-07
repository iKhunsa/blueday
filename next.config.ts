import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // content/frases.md se lee con fs en runtime (ISR); sin esto Vercel puede
  // no incluirlo en el bundle serverless y la página caería al fallback.
  outputFileTracingIncludes: { "/": ["./content/**"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
