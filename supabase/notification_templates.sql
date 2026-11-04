-- supabase/notification_templates.sql
-- Washdoor Laundry POS Notification Template Management & Logs Schema

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    category TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    message_body TEXT NOT NULL,
    supported_variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    customer_id UUID,
    template_id UUID,
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient TEXT,
    rendered_subject TEXT,
    rendered_message TEXT,
    provider TEXT,
    provider_message_id TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance querying and deduplication
CREATE INDEX IF NOT EXISTS idx_notification_templates_cat_chan ON notification_templates(category, channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event_channel ON notification_logs(event_type, channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_idempotency ON notification_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notification_logs_triggered_at ON notification_logs(triggered_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view templates
CREATE POLICY "Allow authenticated read on notification_templates"
  ON notification_templates FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update templates
CREATE POLICY "Allow authenticated write on notification_templates"
  ON notification_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated users to read logs
CREATE POLICY "Allow authenticated read on notification_logs"
  ON notification_logs FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated insert on notification_logs"
  ON notification_logs FOR INSERT TO authenticated WITH CHECK (true);
