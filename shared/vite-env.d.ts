/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DESKTOP_API_BASE_URL?: string;
  readonly VITE_MOBILE_API_BASE_URL?: string;
  readonly VITE_IOS_API_BASE_URL?: string;
  readonly VITE_ANDROID_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
