import { SupabaseClient } from '@supabase/supabase-js';
export declare function getClient(): SupabaseClient;
/** Reset the client (useful for testing). */
export declare function resetClient(): void;
