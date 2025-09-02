# 🚀 Deploy Your Scheduled Follow-ups System

## Quick Setup (5 minutes)

### Step 1: Login to Supabase
```bash
npx supabase login
```
*This will open your browser to authenticate*

### Step 2: Deploy the Scheduler
```bash
npx supabase functions deploy scheduled-followups
```

### Step 3: Set Environment Variables
```bash
npx supabase secrets set RESEND_API_KEY="re_GZ72UiZM_SC9yEtD2Gzmr4xmTXhHZ8uqD"
npx supabase secrets set FROM_EMAIL="onboarding@resend.dev"
```

### Step 4: Enable Automatic Scheduling
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `gjwgrkaabbydicnwgyrw`
3. Go to **SQL Editor**
4. Run this SQL:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule follow-ups to run every 5 minutes
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
```

### Step 5: Test It Works
```bash
npx supabase functions invoke scheduled-followups --data '{"test": true}'
```

## ✅ That's It!

Your follow-ups will now send automatically every 5 minutes!

---

## Alternative: Manual Deployment via Dashboard

If CLI doesn't work:

1. **Go to Functions** in Supabase Dashboard
2. **Create New Function** named `scheduled-followups`
3. **Copy/paste** the code from `supabase/functions/scheduled-followups/index.ts`
4. **Set Environment Variables** in the Functions settings
5. **Run the SQL** from Step 4 above

Your follow-up system will be live!