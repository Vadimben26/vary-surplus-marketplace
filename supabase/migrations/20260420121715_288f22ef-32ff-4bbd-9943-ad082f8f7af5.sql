-- Enable RLS on realtime.messages and require authentication to subscribe.
-- The postgres_changes extension still enforces row-level visibility from public.messages RLS,
-- so authenticated users will only receive change events they can SELECT on the source table.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
