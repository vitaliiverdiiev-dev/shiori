INSERT INTO "admin_bootstrap" ("id", "completed_at")
SELECT 'initial', min("created_at") FROM "user" WHERE "role" = 'admin' HAVING count(*) > 0;
