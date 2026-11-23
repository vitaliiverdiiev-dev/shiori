ALTER TABLE "kana_attempt" DROP CONSTRAINT "kana_attempt_direction_check";--> statement-breakpoint
CREATE UNIQUE INDEX "kana_attempt_kana_to_romaji_question_idx" ON "kana_attempt" USING btree ("user_id","round_id","question_index") WHERE "kana_attempt"."direction" = 'kana-to-romaji';--> statement-breakpoint
ALTER TABLE "kana_attempt" DROP CONSTRAINT "kana_attempt_pk";
--> statement-breakpoint
ALTER TABLE "kana_attempt" ADD CONSTRAINT "kana_attempt_pk" PRIMARY KEY("user_id","round_id","question_index","kana_id");--> statement-breakpoint
ALTER TABLE "kana_attempt" ADD CONSTRAINT "kana_attempt_direction_check" CHECK ("kana_attempt"."direction" in ('kana-to-romaji', 'romaji-to-kana'));