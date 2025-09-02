-- Final step: Set up automated scheduling in Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/gjwgrkaabbydicnwgyrw/sql

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the follow-up processor to run every 5 minutes
SELECT cron.schedule(
  'process-scheduled-followups',
  '*/5 * * * *',
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

-- Check if the job was created
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'process-scheduled-followups';