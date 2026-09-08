// Static-export build target used by Capacitor to bundle the web app
// into a native Android APK. Differs from next.config.mjs:
//   - output: 'export' = static HTML, no Node server required
//   - images.unoptimized (no server-side image opt in static export)
//   - trailingSlash = true for clean Android file:// behavior
//
// Usage:   npx next build --config next.export.config.mjs
// Output:  ./out

const base = (await import("./next.config.mjs")).default;

const nextConfig = {
  ...base,
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
