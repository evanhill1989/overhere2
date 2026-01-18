DROP INDEX "place_claims_unique_pending";--> statement-breakpoint
CREATE UNIQUE INDEX "place_claims_unique_pending" ON "place_claims" USING btree ("place_id","user_id") WHERE status = 'pending';