-- Grants required for RLS policies to take effect.
-- RLS decides which rows are visible/editable, but Postgres still requires
-- table-level privileges for authenticated users.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

GRANT SELECT, INSERT ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_files TO authenticated;
GRANT SELECT, INSERT, UPDATE ON component_sourcing TO authenticated;

GRANT SELECT ON quotes TO authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT ON status_history TO authenticated;
GRANT SELECT ON discount_tokens TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT ALL PRIVILEGES ON profiles TO service_role;
GRANT ALL PRIVILEGES ON orders TO service_role;
GRANT ALL PRIVILEGES ON order_files TO service_role;
GRANT ALL PRIVILEGES ON component_sourcing TO service_role;
GRANT ALL PRIVILEGES ON quotes TO service_role;
GRANT ALL PRIVILEGES ON payments TO service_role;
GRANT ALL PRIVILEGES ON status_history TO service_role;
GRANT ALL PRIVILEGES ON notifications TO service_role;
GRANT ALL PRIVILEGES ON discount_tokens TO service_role;
GRANT ALL PRIVILEGES ON admin_notes TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
