// Tiny static offline page. The service worker falls back here when the
// user is on a bad network and tries to navigate.
export const dynamic = "force-static";
export const revalidate = false;

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "32rem", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          You&apos;re offline
        </h1>
        <p style={{ color: "#9b9ba3", marginBottom: "1.5rem" }}>
          DreamNote can&apos;t reach the network right now. Once you&apos;re
          back online, this message will go away and the app will resume.
        </p>
        <a
          href="/app"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.75rem",
            background: "#7c5cff",
            color: "white",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Try again
        </a>
      </div>
    </main>
  );
}
