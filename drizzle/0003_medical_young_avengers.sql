CREATE TABLE "place_owner_settings" (
	"place_id" varchar(255) PRIMARY KEY NOT NULL,
	"description_override" text,
	"announcement_text" text,
	"announcement_expires_at" timestamp with time zone,
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"last_updated_by" uuid,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "place_owner_settings" ADD CONSTRAINT "place_owner_settings_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_owner_settings" ADD CONSTRAINT "place_owner_settings_last_updated_by_users_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;