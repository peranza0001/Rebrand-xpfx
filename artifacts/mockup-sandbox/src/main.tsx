import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { resolveApiBaseUrl } from "../../nextrade/src/lib/api-url";
import "./index.css";

const apiUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL, window.location.origin);
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
