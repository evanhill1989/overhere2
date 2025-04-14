CREATE TYPE "public"."checkin_status" AS ENUM('available', 'busy');--> statement-breakpoint
ALTER TABLE "checkins" ADD COLUMN "status" "checkin_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "checkins" ADD COLUMN "topic" varchar(120);--> statement-breakpoint
CREATE INDEX "checkins_status_idx" ON "checkins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkins_created_at_idx" ON "checkins" USING btree ("created_at");