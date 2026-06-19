import { Body, Controller, Post } from '@nestjs/common';
import { CreateEventDto } from './create-event.dto';
import { TrackingService } from './tracking.service';
import { CreateEventsBatchDto } from './create-events-batch.dto';

@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('events')
  recordEvent(@Body() dto: CreateEventDto) {
    return this.trackingService.recordEvent(dto);
  }

  @Post('events/batch')
  recordEvents(@Body() dto: CreateEventsBatchDto) {
    return this.trackingService.recordEvents(dto);
  }
}
