import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Turbopack's upward
  // lockfile search can land on an outer checkout's package-lock.json (e.g.
  // when running from a git worktree nested under the main checkout) and
  // resolve modules against the wrong node_modules.
  turbopack: {
    // __dirname/import.meta.url inside next.config.ts resolve against Next's
    // compiled/cached copy of this file, not the real project directory —
    // process.cwd() is the directory `next` was actually invoked from.
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      // Supabase Storage public URLs for checklist step images.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
