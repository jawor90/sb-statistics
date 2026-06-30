CREATE TABLE IF NOT EXISTS "stats_aggregation_state" (
    "id" INTEGER NOT NULL,
    "last_event_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "stats_aggregation_state_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tracking_events_created_at_idx"
    ON "tracking_events" ("created_at");
