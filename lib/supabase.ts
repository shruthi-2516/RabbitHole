import { createClient } from '@supabase/supabase-js';

// Replace these placeholders with your exact Supabase credentials
const SUPABASE_URL = 'https://nxkatskdnxkaupydveuj.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_WWNuJkYpOwgbrOgnoQ7MGw_F-Om1pRs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);