CREATE TYPE "public"."checkin_status" AS ENUM('available', 'busy');--> statement-breakpoint
CREATE TYPE "public"."message_request_status" AS ENUM('pending', 'accepted', 'rejected', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."message_session_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"place_name" varchar(255) NOT NULL,
	"place_address" varchar(511) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"checkin_status" "checkin_status" DEFAULT 'available' NOT NULL,
	"topic" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"checked_out_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "failed_message_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiator_id" uuid NOT NULL,
	"initiatee_id" uuid NOT NULL,
	"place_id" varchar(255),
	"reason" varchar(255) NOT NULL,
	"error_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_session_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"initiatee_id" uuid NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"status" "message_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "message_session_requests_initiator_id_initiatee_id_place_id_unique" UNIQUE("initiator_id","initiatee_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "message_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"initiator_id" uuid NOT NULL,
	"initiatee_id" uuid NOT NULL,
	"source_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "message_session_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_checkin_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(511) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"primary_type" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_message_requests" ADD CONSTRAINT "failed_message_requests_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_message_requests" ADD CONSTRAINT "failed_message_requests_initiatee_id_users_id_fk" FOREIGN KEY ("initiatee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_message_requests" ADD CONSTRAINT "failed_message_requests_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_session_requests" ADD CONSTRAINT "message_session_requests_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_session_requests" ADD CONSTRAINT "message_session_requests_initiatee_id_users_id_fk" FOREIGN KEY ("initiatee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_session_requests" ADD CONSTRAINT "message_session_requests_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sessions" ADD CONSTRAINT "message_sessions_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sessions" ADD CONSTRAINT "message_sessions_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sessions" ADD CONSTRAINT "message_sessions_initiatee_id_users_id_fk" FOREIGN KEY ("initiatee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sessions" ADD CONSTRAINT "message_sessions_source_request_id_message_session_requests_id_fk" FOREIGN KEY ("source_request_id") REFERENCES "public"."message_session_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_message_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."message_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_checkin_id_checkins_id_fk" FOREIGN KEY ("sender_checkin_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_user_idx" ON "checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkins_place_idx" ON "checkins" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "checkins_status_idx" ON "checkins" USING btree ("checkin_status");--> statement-breakpoint
CREATE INDEX "checkins_created_at_idx" ON "checkins" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_user_active_unique" ON "checkins" USING btree ("user_id") WHERE "checkins"."is_active" = true;--> statement-breakpoint
CREATE INDEX "failed_request_initiator_idx" ON "failed_message_requests" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX "failed_request_reason_idx" ON "failed_message_requests" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "failed_request_created_at_idx" ON "failed_message_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "request_initiator_idx" ON "message_session_requests" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX "request_initiatee_idx" ON "message_session_requests" USING btree ("initiatee_id");--> statement-breakpoint
CREATE INDEX "request_place_idx" ON "message_session_requests" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "request_status_idx" ON "message_session_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_created_at_idx" ON "message_session_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "message_session_initiator_idx" ON "message_sessions" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX "message_session_initiatee_idx" ON "message_sessions" USING btree ("initiatee_id");--> statement-breakpoint
CREATE INDEX "message_session_place_idx" ON "message_sessions" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "message_session_status_idx" ON "message_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_session_source_request_idx" ON "message_sessions" USING btree ("source_request_id");--> statement-breakpoint
CREATE INDEX "message_session_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "message_sender_idx" ON "messages" USING btree ("sender_checkin_id");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "messages" USING btree ("created_at");