import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const DAILY_STATS_SORT_FIELDS = [
  'day',
  'views',
  'ctaClicks',
  'impressions',
  'uniqueSessions',
  'webEvents',
  'iosEvents',
  'androidEvents',
  'webSessions',
  'iosSessions',
  'androidSessions',
] as const;

export type DailyStatsSortField = (typeof DAILY_STATS_SORT_FIELDS)[number];

export class QueryDailyStatsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(DAILY_STATS_SORT_FIELDS)
  sortBy?: DailyStatsSortField = 'day';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
