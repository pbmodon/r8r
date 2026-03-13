import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_KEY environment variables. ' +
        'Set these to connect to your Supabase project.'
      );
    }
    client = createClient(url, key);
  }
  return client;
}

/** Reset the client (useful for testing). */
export function resetClient(): void {
  client = null;
}
