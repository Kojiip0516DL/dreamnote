/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  // BlockNote ships ESM-only; transpile so Next can bundle it cleanly
  transpilePackages: ["@blocknote/core", "@blocknote/react", "@blocknote/mantine"],
  // Skip BuildBot / next-pwa — we ship our own /sw.js (small, predictable)
  // and Next.js only complains about the next-pwa conflict because of
  // React 19 + Workbox 7 type incompat. Pragmatic PWA via /public/sw.js.
};

export default nextConfig;
