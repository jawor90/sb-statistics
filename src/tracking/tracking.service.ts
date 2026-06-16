import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './create-event.dto';
import { DedupService } from './dedup.service';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dedupService: DedupService,
  ) {}

  async recordEvent(dto: CreateEventDto): Promise<{ recorded: boolean }> {
    if (dto.eventType === 'view') {
      const shouldRecord = await this.dedupService.shouldRecordView(
        dto.contentId,
        dto.sessionId,
      );

      if (!shouldRecord) {
        return { recorded: false };
      }
    }

    await this.prisma.trackingEvent.create({
      data: {
        eventType: dto.eventType,
        contentId: dto.contentId,
        sessionId: dto.sessionId,
        userId: dto.userId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        platform: dto.platform,
        createdAt: new Date(),
      },
    });

    return { recorded: true };
  }
}
