import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";

window.__IMPERIAL_BUILD__ = { version: __IMPERIAL_APP_VERSION__, commit: __IMPERIAL_BUILD_COMMIT__ };

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: "imperial-fitness-web@1.21.0",
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

const isLiteRoute = window.location.pathname === "/lite" || window.location.pathname.startsWith("/lite/");
const root = createRoot(document.getElementById("root")!);

function render(node: ReactNode) {
  root.render(<StrictMode>{node}</StrictMode>);
}

async function bootstrap() {
  if (isLiteRoute) {
    const { LitePortal } = await import("./components/LitePortal");
    render(<LitePortal />);
    return;
  }

  const { default: App } = await import("./App");
  render(<App />);
}

void bootstrap().catch(error => {
  Sentry.captureException(error);
  render(
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
      <div>
        <h1 className="text-xl font-black">Imperial Fitness</h1>
        <p className="mt-2 text-sm text-neutral-400">No se pudo iniciar la aplicación. Recarga la página o inténtalo nuevamente.</p>
      </div>
    </div>,
  );
});
