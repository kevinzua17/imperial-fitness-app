/// <reference types="vite/client" />

declare const __IMPERIAL_BUILD_COMMIT__: string;
declare const __IMPERIAL_APP_VERSION__: string;

interface Window {
  __IMPERIAL_BUILD__?: { version: string; commit: string };
}
