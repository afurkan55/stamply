import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zmvlgixeclablfqehhig.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_0kKPRNJ_2bPVDYCL7nbwJQ_o5xcxx63'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
