-- Clerk owns authentication; Supabase remains the database.
-- Keep UUID profile IDs for existing foreign keys, and map each profile to a
-- Clerk user ID.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);
