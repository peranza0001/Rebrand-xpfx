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

const rootElement = document.getElementById("root");

if (!rootElement) {
  renderRuntimeFallback({
    message: "Application root not found",
    detail: "The website shell is missing. Refresh the page to retry.",
  });
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Failed to mount application:", error);
    renderRuntimeFallback({
      message: "React failed to mount",
      detail: "Refresh the page to retry.",
    });
  }
}
