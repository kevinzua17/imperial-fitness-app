import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: "imperial-fitness-web@1.20.3",
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
}

window.addEventListener("error", event => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.error || new Error(event.message));
  }
});

window.addEventListener("unhandledrejection", event => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
