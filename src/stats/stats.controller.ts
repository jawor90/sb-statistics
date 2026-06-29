import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryDailyStatsDto } from './dto/query-daily-stats.dto';
import { QueryStatsDto } from './dto/query-stats.dto';
import { StatsService } from './stats.service';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  findStats(@Query() query: QueryStatsDto) {
    return this.statsService.findStats(query);
  }

  @Get('stats/:contentId')
  findStatsByContentId(@Param('contentId') contentId: string) {
    return this.statsService.findStatsByContentId(contentId);
  }

  @Get('daily-stats')
  findDailyStats(@Query() query: QueryDailyStatsDto) {
    return this.statsService.findDailyStats(query);
  }
}
