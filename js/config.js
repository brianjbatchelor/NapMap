/* NapMap runtime config. Leave both values empty to turn the friends leaderboard off.
   Where the values come from: Supabase dashboard -> Project Settings -> API.
   - SUPABASE_URL: the Project URL, e.g. 'https://abcdefghijkl.supabase.co'
   - SUPABASE_ANON_KEY: the "anon public" key (or the newer "publishable" key, sb_publishable_...).
   Both are meant to be public; the database is protected by the row-level security in supabase/schema.sql.
   NEVER put the service_role / secret key here: this file is served to every visitor. */
window.NAPMAP_CONFIG = {
  SUPABASE_URL: 'https://osvelyawsvjjvsrgdmzs.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_vOuG7Prdb5t0Rz35p_-Bzw_fFY2Do4l'
};
