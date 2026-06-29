-- CreateTable
CREATE TABLE "daily_stats" (
    "day" DATE NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "cta_clicks" BIGINT NOT NULL DEFAULT 0,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "unique_sessions" BIGINT NOT NULL DEFAULT 0,
    "web_events" BIGINT NOT NULL DEFAULT 0,
    "ios_events" BIGINT NOT NULL DEFAULT 0,
    "android_events" BIGINT NOT NULL DEFAULT 0,
    "web_sessions" BIGINT NOT NULL DEFAULT 0,
    "ios_sessions" BIGINT NOT NULL DEFAULT 0,
    "android_sessions" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("day")
);
