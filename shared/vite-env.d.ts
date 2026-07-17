/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly NEXT_PUBLIC_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_DESKTOP_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_MOBILE_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_IOS_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_ANDROID_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_SYNC_SERVER_URL?: string;
  // Backward compatibility with VITE_ prefixed vars
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SYNC_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
