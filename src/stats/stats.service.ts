import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyStat, Prisma, Stat } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDailyStatsDto } from './dto/query-daily-stats.dto';
import { QueryStatsDto } from './dto/query-stats.dto';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findStats(
    query: QueryStatsDto,
  ): Promise<PaginatedResponse<Stat>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'views';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.StatWhereInput = {};

    if (query.contentId) {
      where.contentId = {
        contains: query.contentId,
        mode: 'insensitive',
      };
    }

    if (query.minViews !== undefined) {
      where.views = { gte: BigInt(query.minViews) };
    }

    if (query.minImpressions !== undefined) {
      where.impressions = { gte: BigInt(query.minImpressions) };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stat.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stat.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findStatByContentId(contentId: string): Promise<Stat> {
    const stat = await this.prisma.stat.findUnique({
      where: { contentId },
    });

    if (!stat) {
      throw new NotFoundException(`Stat not found for contentId: ${contentId}`);
    }

    return stat;
  }

  async findDailyStats(
    query: QueryDailyStatsDto,
  ): Promise<PaginatedResponse<DailyStat>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'day';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.DailyStatWhereInput = {};

    if (query.from || query.to) {
      where.day = {};

      if (query.from) {
        where.day.gte = new Date(query.from);
      }

      if (query.to) {
        where.day.lte = new Date(query.to);
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.dailyStat.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailyStat.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  @Cron('0 6 * * *', { name: 'daily-stats', timeZone: 'Europe/Warsaw' })
  async handleDailyStats(): Promise<void> {
    await this.generateDailyStats();
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'content-stats' })
  async handleContentStats(): Promise<void> {
    await this.recalculateContentStats();
  }

  async recalculateContentStats(): Promise<{ contentIdsAffected: number }> {
    this.logger.log('Recalculating content stats');

    try {
      const contentIdsAffected = await this.prisma.$executeRaw`
        INSERT INTO stats (content_id, views, cta_clicks, impressions, updated_at)
        SELECT
          e.content_id,
          COUNT(*) FILTER (WHERE e.event_type = 'view'),
          COUNT(*) FILTER (WHERE e.event_type = 'cta_click'),
          COUNT(*) FILTER (WHERE e.event_type = 'impression'),
          now()
        FROM tracking_events e
        WHERE e.content_id IS NOT NULL
        GROUP BY e.content_id
        ON CONFLICT (content_id) DO UPDATE SET
          views = EXCLUDED.views,
          cta_clicks = EXCLUDED.cta_clicks,
          impressions = EXCLUDED.impressions,
          updated_at = EXCLUDED.updated_at
      `;

      this.logger.log(
        `Content stats recalculated: ${contentIdsAffected} row(s) affected`,
      );

      return { contentIdsAffected };
    } catch (error) {
      this.logger.error(
        'Failed to recalculate content stats',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
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

  async recalculateAllDailyStats(): Promise<{ daysAffected: number }> {
    this.logger.log('Recalculating daily stats for all days');

    try {
      const daysAffected = await this.prisma.$executeRaw`
        INSERT INTO daily_stats (
          day, views, cta_clicks, impressions, unique_sessions,
          web_events, ios_events, android_events,
          web_sessions, ios_sessions, android_sessions, updated_at
        )
        SELECT
          DATE(e.created_at AT TIME ZONE 'Europe/Warsaw') AS day,
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
        FROM tracking_events e
        GROUP BY DATE(e.created_at AT TIME ZONE 'Europe/Warsaw')
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

      this.logger.log(
        `Daily stats recalculated for all days: ${daysAffected} row(s) affected`,
      );

      return { daysAffected };
    } catch (error) {
      this.logger.error(
        'Failed to recalculate daily stats for all days',
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
