import React from "react";

/* Top-level error boundary for the public app tree.

   Without this, any single render throw — a malformed section from admin JSON,
   a nav dropdown missing its links, an empty registration flow — unmounts all
   of React and leaves a blank white page. This catches the throw and renders a
   readable fallback instead, so one broken section never takes the whole site
   down. Class component because only class components can catch render errors
   (getDerivedStateFromError / componentDidCatch). */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface it in the console (and any future error-reporting hook) rather
    // than swallowing it silently.
    console.error("Render error caught by ErrorBoundary:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          fontFamily:
            "'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#0A0A0A",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Something went wrong on this page.
        </h1>
        <p style={{ fontSize: "0.95rem", color: "rgba(10,10,10,0.6)", marginBottom: "1.5rem", maxWidth: 480 }}>
          Please refresh, or head back to the homepage. If it keeps happening,
          email us at info@turnpagedigital.com.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#0A0A0A",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "0.9rem",
          }}
        >
          Back to home
        </a>
      </div>
    );
  }
}
