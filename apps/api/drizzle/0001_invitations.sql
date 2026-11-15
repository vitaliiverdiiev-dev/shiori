CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	CONSTRAINT "invitation_code_hash_unique" UNIQUE("code_hash"),
	CONSTRAINT "invitation_email_normalized" CHECK ("invitation"."email" = lower(btrim("invitation"."email")) and "invitation"."email" <> ''),
	CONSTRAINT "invitation_single_outcome" CHECK (num_nonnulls("invitation"."used_at", "invitation"."revoked_at") <= 1),
	CONSTRAINT "invitation_expires_after_creation" CHECK ("invitation"."expires_at" > "invitation"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_single_admin_idx" ON "user" USING btree ("role") WHERE "user"."role" = 'admin';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_lowercase" CHECK ("user"."email" = lower("user"."email"));