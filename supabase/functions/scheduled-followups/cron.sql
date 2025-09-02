-- Create cron job to run scheduled follow-ups every 5 minutes
-- This uses pg_cron extension to automatically trigger the Edge Function

-- Enable pg_cron extension (run this once in your Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the follow-up processor to run every 5 minutes
SELECT cron.schedule(
  'process-scheduled-followups',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://gjwgrkaabbydicnwgyrw.supabase.co/functions/v1/scheduled-followups',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);

-- Alternative: Manual trigger function (for testing)
CREATE OR REPLACE FUNCTION trigger_scheduled_followups()
RETURNS text AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gjwgrkaabbydicnwgyrw.supabase.co/functions/v1/scheduled-followups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('trigger', 'manual')
  );
  
  RETURN 'Scheduled followups triggered successfully';
END;
$$ LANGUAGE plpgsql;

-- To run manually: SELECT trigger_scheduled_followups();