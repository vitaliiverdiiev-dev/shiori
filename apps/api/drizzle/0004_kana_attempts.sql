CREATE TABLE "kana_attempt" (
	"corrected" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"direction" text NOT NULL,
	"hint_used" boolean NOT NULL,
	"kana_id" text NOT NULL,
	"outcome" text NOT NULL,
	"question_index" integer NOT NULL,
	"round_id" uuid NOT NULL,
	"script" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "kana_attempt_pk" PRIMARY KEY("user_id","round_id","question_index"),
	CONSTRAINT "kana_attempt_direction_check" CHECK ("kana_attempt"."direction" in ('kana-to-romaji')),
	CONSTRAINT "kana_attempt_outcome_check" CHECK ("kana_attempt"."outcome" in ('correct', 'incorrect', 'skipped')),
	CONSTRAINT "kana_attempt_script_check" CHECK ("kana_attempt"."script" in ('hiragana', 'katakana')),
	CONSTRAINT "kana_attempt_kana_id_matches_script" CHECK (starts_with("kana_attempt"."kana_id", "kana_attempt"."script" || ':')),
	CONSTRAINT "kana_attempt_corrected_only_after_incorrect" CHECK (not "kana_attempt"."corrected" or "kana_attempt"."outcome" = 'incorrect'),
	CONSTRAINT "kana_attempt_question_index_range" CHECK ("kana_attempt"."question_index" >= 0 and "kana_attempt"."question_index" < 1000)
);
--> statement-breakpoint
ALTER TABLE "kana_attempt" ADD CONSTRAINT "kana_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kana_attempt_progress_idx" ON "kana_attempt" USING btree ("user_id","script","direction","kana_id");