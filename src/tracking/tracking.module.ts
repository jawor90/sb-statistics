import { Module } from '@nestjs/common';
import { DedupService } from './dedup.service';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, DedupService],
})
export class TrackingModule {}
