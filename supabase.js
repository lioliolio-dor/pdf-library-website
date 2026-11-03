
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://hameqbmmswsnbtnubdku.supabase.co";

const SUPABASE_KEY = "sb_publishable_4HUQPw-rlY6F3I5v8NcJNQ_jy0hjbH1";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
