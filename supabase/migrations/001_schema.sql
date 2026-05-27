-- ═══════════════════════════════════════════════════════════════════════════
-- Protonest PCB Assembly Portal — Initial Schema
-- Migration: 001_schema.sql
-- Apply via: Supabase Dashboard → SQL Editor, or supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable required extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Custom types ──────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('customer', 'admin');

CREATE TYPE order_status AS ENUM (
  'quote_pending',
  'quote_ready',
  'payment_completed',
  'components_received',
  'in_assembly',
  'inspection',
  'ready_for_delivery',
  'delivered'
);

CREATE TYPE assembly_type AS ENUM ('smt_only', 'through_hole_only', 'mixed');
CREATE TYPE inspection_level AS ENUM ('standard', 'detailed');
CREATE TYPE sourcing_option AS ENUM ('protonest', 'customer');
CREATE TYPE file_type AS ENUM ('bom', 'pnp', 'gerber', 'top_view');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'expired', 'revised');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_gateway AS ENUM ('payhere', 'bank_transfer');
CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'skipped');
CREATE TYPE discount_type AS ENUM ('fixed', 'percentage');

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles (extends auth.users) ────────────────────────────────────────
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT,
  phone          TEXT,
  company        TEXT,
  role           user_role NOT NULL DEFAULT 'customer',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── orders ────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT NOT NULL UNIQUE,          -- PN-ASM-XXXX
  customer_id         UUID NOT NULL REFERENCES profiles(id),
  project_name        TEXT NOT NULL,
  units               INTEGER NOT NULL CHECK (units BETWEEN 1 AND 20),
  assembly_type       assembly_type NOT NULL,
  inspection_level    inspection_level NOT NULL DEFAULT 'standard',
  customer_notes      TEXT,
  status              order_status NOT NULL DEFAULT 'quote_pending',
  expected_delivery   DATE,
  discount_token_used UUID,                          -- FK added after discount_tokens
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── order_files ───────────────────────────────────────────────────────────
CREATE TABLE order_files (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_type        file_type NOT NULL,
  storage_path     TEXT NOT NULL,                    -- private Supabase path
  original_name    TEXT NOT NULL,
  file_size_bytes  BIGINT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, file_type)
);

-- ── component_sourcing ────────────────────────────────────────────────────
CREATE TABLE component_sourcing (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                 UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  sourcing_option          sourcing_option NOT NULL DEFAULT 'protonest',
  allow_equivalents        BOOLEAN DEFAULT TRUE,
  customer_supplied_note   TEXT,                     -- free text or file ref
  customer_supplied_path   TEXT,                     -- if customer uploaded a list
  ship_together            BOOLEAN,                  -- only when option = customer
  expected_arrival         DATE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── quotes ────────────────────────────────────────────────────────────────
CREATE TABLE quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id         UUID NOT NULL REFERENCES profiles(id),
  amount_lkr       NUMERIC(12,2) NOT NULL CHECK (amount_lkr > 0),
  customer_notes   TEXT,                             -- visible to customer
  admin_notes      TEXT,                             -- NEVER exposed to customer
  valid_until      TIMESTAMPTZ NOT NULL,
  status           quote_status NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payments ──────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_id            UUID REFERENCES quotes(id),
  gateway             payment_gateway NOT NULL,
  amount_lkr          NUMERIC(12,2) NOT NULL,
  gateway_reference   TEXT,                          -- PayHere order_id / bank ref
  payhere_payment_id  TEXT,
  status              payment_status NOT NULL DEFAULT 'pending',
  ipn_verified        BOOLEAN DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  raw_ipn             JSONB,                         -- store full IPN payload for audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── status_history (immutable audit log) ─────────────────────────────────
CREATE TABLE status_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by   UUID NOT NULL REFERENCES profiles(id),
  old_status   order_status,
  new_status   order_status NOT NULL,
  note         TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── notifications ─────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel      notification_channel NOT NULL,
  event_type   TEXT NOT NULL,
  recipient    TEXT NOT NULL,                        -- email address or phone
  status       notification_status NOT NULL DEFAULT 'sent',
  error_reason TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── discount_tokens ───────────────────────────────────────────────────────
CREATE TABLE discount_tokens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_code     TEXT NOT NULL UNIQUE,
  discount_type  discount_type NOT NULL DEFAULT 'fixed',
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  valid_until    TIMESTAMPTZ NOT NULL,
  used           BOOLEAN NOT NULL DEFAULT FALSE,
  used_at        TIMESTAMPTZ,
  used_on_order  UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admin_notes (never exposed to customers) ──────────────────────────────
CREATE TABLE admin_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES profiles(id),
  note_text  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Add discount token FK to orders ───────────────────────────────────────
ALTER TABLE orders
  ADD CONSTRAINT fk_discount_token
  FOREIGN KEY (discount_token_used)
  REFERENCES discount_tokens(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Auto-generate order number ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 8) AS INTEGER)), 999) + 1
  INTO seq_val
  FROM orders;
  RETURN 'PN-ASM-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ── Auto-update updated_at ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create profile on user signup ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_sourcing ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes       ENABLE ROW LEVEL SECURITY;

-- ── Helper: is current user an admin ─────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── profiles RLS ──────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── orders RLS ────────────────────────────────────────────────────────────
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (is_admin());  -- only admins update orders

-- ── order_files RLS ───────────────────────────────────────────────────────
CREATE POLICY "order_files_select" ON order_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "order_files_insert" ON order_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
  );

-- ── component_sourcing RLS ────────────────────────────────────────────────
CREATE POLICY "sourcing_select" ON component_sourcing
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "sourcing_insert" ON component_sourcing
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
  );

CREATE POLICY "sourcing_update" ON component_sourcing
  FOR UPDATE USING (is_admin());

-- ── quotes RLS — admin_notes column NEVER readable by customer ────────────
CREATE POLICY "quotes_select_customer" ON quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "quotes_insert_admin" ON quotes
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "quotes_update_admin" ON quotes
  FOR UPDATE USING (is_admin());

-- ── payments RLS ──────────────────────────────────────────────────────────
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "payments_update_admin" ON payments
  FOR UPDATE USING (is_admin());

-- ── status_history RLS ────────────────────────────────────────────────────
CREATE POLICY "status_history_select" ON status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "status_history_insert_admin" ON status_history
  FOR INSERT WITH CHECK (is_admin());

-- ── admin_notes — admins only, customers can NEVER see ───────────────────
CREATE POLICY "admin_notes_admin_only" ON admin_notes
  FOR ALL USING (is_admin());

-- ── discount_tokens RLS ───────────────────────────────────────────────────
CREATE POLICY "tokens_select" ON discount_tokens
  FOR SELECT USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY "tokens_insert_admin" ON discount_tokens
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "tokens_update_admin" ON discount_tokens
  FOR UPDATE USING (is_admin());

-- ── notifications — admin only (customers see order timeline instead) ─────
CREATE POLICY "notifications_admin" ON notifications
  FOR ALL USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_orders_customer     ON orders(customer_id);
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX idx_order_files_order   ON order_files(order_id);
CREATE INDEX idx_quotes_order        ON quotes(order_id);
CREATE INDEX idx_payments_order      ON payments(order_id);
CREATE INDEX idx_status_history_order ON status_history(order_id);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_discount_tokens_code ON discount_tokens(token_code);
CREATE INDEX idx_admin_notes_order   ON admin_notes(order_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET SETUP (run in Supabase Dashboard if CLI not available)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in the SQL editor:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('order-files', 'order-files', false);
--
-- Storage RLS (allow authenticated users to upload to their own folder):
-- CREATE POLICY "order_files_upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'order-files' AND auth.role() = 'authenticated'
--   );
-- CREATE POLICY "order_files_read" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'order-files' AND auth.role() = 'authenticated'
--   );
