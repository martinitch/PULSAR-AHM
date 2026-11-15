/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** "true" to enable the dev boards (?stillset, ?wtgrid, ?wt, ?still) in a production build. */
  readonly VITE_DEV_TOOLS?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
interface ImportMetaEnv {
  /** Real authentication API URL. Absent → demo accounts (DemoAuthService). */
  readonly VITE_AUTH_API_URL?: string;
}
interface ImportMetaEnv {
  /** FastAPI backend URL (default http://localhost:8000). */
  readonly VITE_API_URL?: string;
  /** "true" = local simulator only (no network calls). */
  readonly VITE_USE_MOCK?: string;
}
