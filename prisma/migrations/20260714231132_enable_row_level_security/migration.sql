-- Supabase's Security Advisor flags every public-schema table without RLS as
-- a critical issue, since Supabase provisions a public REST API (PostgREST)
-- for every project regardless of whether the app uses it. This app only
-- talks to Postgres via Prisma's direct connection as the "postgres" owner
-- role, which always bypasses RLS — so enabling RLS here has zero effect on
-- the app's own behavior. With no policies added, it simply denies all
-- access to any other role (e.g. PostgREST's "anon"/"authenticated" roles),
-- closing the public-API exposure without touching how Prisma reads/writes.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "distribution_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "producers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operator_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_events" ENABLE ROW LEVEL SECURITY;