import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { renderRuntimeFallback } from "./lib/app-bootstrap";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

// Initialize API client with the correct base URL from environment
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Keep runtime details out of the user-facing error screen.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-runtime-error">
          <h1>We&apos;re having trouble loading XpressPro FX.</h1>
          <p>Refresh the page to try again. Your account and funds remain protected.</p>
          <button type="button" onClick={() => window.location.reload()}>Refresh page</button>
        </main>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  renderRuntimeFallback({
    message: "Application root not found",
    detail: "The website shell is missing. Refresh the page to retry.",
  });
} else {
  try {
    createRoot(rootElement).render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  } catch (error) {
    Sentry.captureException(error);
    renderRuntimeFallback({
      message: "React failed to mount",
      detail: "Refresh the page to retry.",
    });
  }
}
