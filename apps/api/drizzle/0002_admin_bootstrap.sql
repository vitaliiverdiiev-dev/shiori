CREATE TABLE "admin_bootstrap" (
	"id" text PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_bootstrap_single_row" CHECK ("admin_bootstrap"."id" = 'initial')
);
--> statement-breakpoint
DROP INDEX "user_single_admin_idx";