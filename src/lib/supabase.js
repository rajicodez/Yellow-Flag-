import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const AUTHORIZED_HOST_NAMES = new Set(['Lakindu', 'Kasun']);

export async function getAuthorizedHostProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('host_profiles')
    .select('user_id, host_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data && AUTHORIZED_HOST_NAMES.has(data.host_name)
    ? data
    : null;
}
