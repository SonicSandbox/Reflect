ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_state text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_country text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude numeric;

alter publication supabase_realtime add table users;
