import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Valores publicáveis (anon key) com fallback para garantir que o SSR/build
// nunca quebre com "supabaseUrl is required" quando as env vars não forem
// injetadas no ambiente de deploy (Lovable/Cloudflare).
const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string) || "https://nhkburqoligtdyrjtkrs.supabase.co";
const supabasePublishableKey =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string) ||
  "sb_publishable_M9jDHpJ214--HnafZLr8dA_CS3WAlF2";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
