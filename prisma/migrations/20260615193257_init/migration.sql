-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(50),
    "content_id" VARCHAR(100),
    "user_id" VARCHAR(100),
    "session_id" VARCHAR(100),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "platform" VARCHAR(50),
    
    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats" (
    "content_id" VARCHAR(100) NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "favorites" BIGINT NOT NULL DEFAULT 0,
    "calendar" BIGINT NOT NULL DEFAULT 0,
    "cta_clicks" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "platform" VARCHAR(50),

    CONSTRAINT "stats_pkey" PRIMARY KEY ("content_id")
);
