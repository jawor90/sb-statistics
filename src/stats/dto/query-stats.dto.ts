import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const STATS_PLATFORMS = ['web', 'ios', 'android'] as const;

export const STATS_SORT_FIELDS = [
  'contentId',
  'platform',
  'views',
  'favorites',
  'calendar',
  'ctaClicks',
  'impressions',
  'updatedAt',
] as const;

export type StatsSortField = (typeof STATS_SORT_FIELDS)[number];

export class QueryStatsDto {
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
  @IsIn(STATS_SORT_FIELDS)
  sortBy?: StatsSortField = 'views';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsIn(STATS_PLATFORMS)
  platform?: (typeof STATS_PLATFORMS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minViews?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minImpressions?: number;
}
