-- ═══════════════════════════════════════════════════════════════════════════
-- Protonest PCB Assembly Portal — Messaging System
-- Migration: 004_messages.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── conversations (one per customer) ─────────────────────────────────────
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- ── messages ─────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX idx_conversations_customer   ON conversations(customer_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation    ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_unread          ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- ── Auto-update conversation.updated_at on new message ───────────────────
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_updates_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ── Grants ───────────────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON conversations TO service_role;
GRANT ALL PRIVILEGES ON messages TO service_role;
