CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"initiator_checkin_id" integer NOT NULL,
	"receiver_checkin_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"sender_checkin_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_initiator_checkin_id_checkins_id_fk" FOREIGN KEY ("initiator_checkin_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_receiver_checkin_id_checkins_id_fk" FOREIGN KEY ("receiver_checkin_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_checkin_id_checkins_id_fk" FOREIGN KEY ("sender_checkin_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_session_initiator_idx" ON "chat_sessions" USING btree ("initiator_checkin_id");--> statement-breakpoint
CREATE INDEX "chat_session_receiver_idx" ON "chat_sessions" USING btree ("receiver_checkin_id");--> statement-breakpoint
CREATE INDEX "chat_session_place_idx" ON "chat_sessions" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "message_chat_session_idx" ON "messages" USING btree ("chat_session_id");--> statement-breakpoint
CREATE INDEX "message_sender_idx" ON "messages" USING btree ("sender_checkin_id");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "messages" USING btree ("created_at");