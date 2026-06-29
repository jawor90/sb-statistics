import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 6 * * *', { name: 'daily-stats', timeZone: 'Europe/Warsaw' })
  async handleDailyStats(): Promise<void> {
    await this.generateDailyStats();
  }

  async generateDailyStats(targetDay?: Date): Promise<void> {
    const dayLabel = targetDay
      ? targetDay.toISOString().slice(0, 10)
      : 'yesterday (Europe/Warsaw)';

    this.logger.log(`Generating daily stats for ${dayLabel}`);

    try {
      const affectedRows = targetDay
        ? await this.upsertDailyStatsForDay(targetDay)
        : await this.upsertDailyStatsForYesterday();

      this.logger.log(
        `Daily stats generated for ${dayLabel}: ${affectedRows} row(s) affected`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate daily stats for ${dayLabel}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async upsertDailyStatsForYesterday(): Promise<number> {
    return this.prisma.$executeRaw`
      WITH target AS (
        SELECT (now() AT TIME ZONE 'Europe/Warsaw')::date - 1 AS day
      )
      INSERT INTO daily_stats (
        day, views, cta_clicks, impressions, unique_sessions,
        web_events, ios_events, android_events,
        web_sessions, ios_sessions, android_sessions, updated_at
      )
      SELECT
        t.day,
        COUNT(*) FILTER (WHERE e.event_type = 'view'),
        COUNT(*) FILTER (WHERE e.event_type = 'cta_click'),
        COUNT(*) FILTER (WHERE e.event_type = 'impression'),
        COUNT(DISTINCT e.session_id),
        COUNT(*) FILTER (WHERE e.platform = 'web'),
        COUNT(*) FILTER (WHERE e.platform = 'ios'),
        COUNT(*) FILTER (WHERE e.platform = 'android'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'web'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'ios'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'android'),
        now()
      FROM tracking_events e, target t
      WHERE DATE(e.created_at AT TIME ZONE 'Europe/Warsaw') = t.day
      GROUP BY t.day
      ON CONFLICT (day) DO UPDATE SET
        views = EXCLUDED.views,
        cta_clicks = EXCLUDED.cta_clicks,
        impressions = EXCLUDED.impressions,
        unique_sessions = EXCLUDED.unique_sessions,
        web_events = EXCLUDED.web_events,
        ios_events = EXCLUDED.ios_events,
        android_events = EXCLUDED.android_events,
        web_sessions = EXCLUDED.web_sessions,
        ios_sessions = EXCLUDED.ios_sessions,
        android_sessions = EXCLUDED.android_sessions,
        updated_at = EXCLUDED.updated_at
    `;
  }

  private async upsertDailyStatsForDay(targetDay: Date): Promise<number> {
    const day = targetDay.toISOString().slice(0, 10);

    return this.prisma.$executeRaw`
      WITH target AS (
        SELECT ${day}::date AS day
      )
      INSERT INTO daily_stats (
        day, views, cta_clicks, impressions, unique_sessions,
        web_events, ios_events, android_events,
        web_sessions, ios_sessions, android_sessions, updated_at
      )
      SELECT
        t.day,
        COUNT(*) FILTER (WHERE e.event_type = 'view'),
        COUNT(*) FILTER (WHERE e.event_type = 'cta_click'),
        COUNT(*) FILTER (WHERE e.event_type = 'impression'),
        COUNT(DISTINCT e.session_id),
        COUNT(*) FILTER (WHERE e.platform = 'web'),
        COUNT(*) FILTER (WHERE e.platform = 'ios'),
        COUNT(*) FILTER (WHERE e.platform = 'android'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'web'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'ios'),
        COUNT(DISTINCT e.session_id) FILTER (WHERE e.platform = 'android'),
        now()
      FROM tracking_events e, target t
      WHERE DATE(e.created_at AT TIME ZONE 'Europe/Warsaw') = t.day
      GROUP BY t.day
      ON CONFLICT (day) DO UPDATE SET
        views = EXCLUDED.views,
        cta_clicks = EXCLUDED.cta_clicks,
        impressions = EXCLUDED.impressions,
        unique_sessions = EXCLUDED.unique_sessions,
        web_events = EXCLUDED.web_events,
        ios_events = EXCLUDED.ios_events,
        android_events = EXCLUDED.android_events,
        web_sessions = EXCLUDED.web_sessions,
        ios_sessions = EXCLUDED.ios_sessions,
        android_sessions = EXCLUDED.android_sessions,
        updated_at = EXCLUDED.updated_at
    `;
  }
}
