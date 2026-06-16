import { Body, Controller, Post } from '@nestjs/common';
import { CreateEventDto } from './create-event.dto';
import { TrackingService } from './tracking.service';

@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('events')
  recordEvent(@Body() dto: CreateEventDto) {
    return this.trackingService.recordEvent(dto);
  }
}
