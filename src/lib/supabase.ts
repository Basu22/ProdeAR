import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
	import.meta.env.VITE_SUPABASE_URL ||
	"https://placeholder-project.supabase.co";
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const isSupabaseConfigured = !!(
	import.meta.env.VITE_SUPABASE_URL &&
	!import.meta.env.VITE_SUPABASE_URL.includes("placeholder") &&
	import.meta.env.VITE_SUPABASE_ANON_KEY &&
	import.meta.env.VITE_SUPABASE_ANON_KEY !== "placeholder-key"
);

if (!isSupabaseConfigured) {
	console.warn(
		"ProdeAR Warning: Supabase environment variables are missing or are placeholders. Falling back to local simulation mode.",
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
