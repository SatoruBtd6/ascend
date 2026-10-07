import { createClient } from "@supabase/supabase-js";

const url = import.meta.env?.VITE_SUPABASE_URL;   // env is undefined under plain Node (tests, api/)
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const configured = !!(url && key);
export const supabase = configured ? createClient(url, key) : null;
