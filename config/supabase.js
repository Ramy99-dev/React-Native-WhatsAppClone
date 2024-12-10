import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const url = "https://pgrveqcfsygfaxwnxowe.supabase.co"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncnZlcWNmc3lnZmF4d254b3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1MDQ1NDksImV4cCI6MjA0OTA4MDU0OX0.iS9Z82G27nfBd_n7OGkawh8RyeePddaJWifdzLsDjig"
export const supabase = createClient(url, key)