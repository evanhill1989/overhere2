CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"place_name" varchar(255) NOT NULL,
	"place_address" varchar(511) NOT NULL,
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(511) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_kinde_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("kinde_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_user_idx" ON "checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkins_place_idx" ON "checkins" USING btree ("place_id");