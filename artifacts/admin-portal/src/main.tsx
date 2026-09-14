import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
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

createRoot(document.getElementById("root")!).render(<App />);
