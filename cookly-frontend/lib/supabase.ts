import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbrufwgzpxscrpeoyzdr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZwBGs1tN9kmEzlAKl_cQMg_U_0h3cr0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});