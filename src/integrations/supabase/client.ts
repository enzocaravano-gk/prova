import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://xjsoqcopalvoskbnarzn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc29xY29wYWx2b3NrYm5hcnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjE2ODAsImV4cCI6MjA5MDYzNzY4MH0.6AhQ5ogFLKRHkfsdMFDD2tB06vcXAf8mINJ3XUdcq_8';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});