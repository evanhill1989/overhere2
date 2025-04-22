CREATE TYPE "public"."chat_session_status" AS ENUM('pending', 'active');--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "status" "chat_session_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX "chat_session_status_idx" ON "chat_sessions" USING btree ("status");