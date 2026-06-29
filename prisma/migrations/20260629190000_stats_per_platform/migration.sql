-- Rebuild stats as per-content, per-platform aggregates
DELETE FROM "stats";

ALTER TABLE "stats" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(50);
ALTER TABLE "stats" ALTER COLUMN "platform" SET NOT NULL;

ALTER TABLE "stats" DROP CONSTRAINT "stats_pkey";
ALTER TABLE "stats" ADD CONSTRAINT "stats_pkey" PRIMARY KEY ("content_id", "platform");
