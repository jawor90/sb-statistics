import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './create-event.dto';
import { DedupService } from './dedup.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dedupService: DedupService,
  ) {}

  async recordEvent(dto: CreateEventDto): Promise<{ recorded: boolean }> {
    this.logger.log(
      `Incoming event: type=${dto.eventType} contentId=${dto.contentId} sessionId=${dto.sessionId}` +
        (dto.userId ? ` userId=${dto.userId}` : '') +
        (dto.platform ? ` platform=${dto.platform}` : ''),
    );

    if (dto.eventType === 'view') {
      const shouldRecord = await this.dedupService.shouldRecordView(
        dto.contentId,
        dto.sessionId,
      );
      if (!shouldRecord) {
        this.logger.debug(
          `View deduplicated: contentId=${dto.contentId} sessionId=${dto.sessionId}`,
        );
        return { recorded: false };
      }
    }

    try {
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

      this.logger.log(
        `Event recorded: type=${dto.eventType} contentId=${dto.contentId} sessionId=${dto.sessionId}`,
      );
      return { recorded: true };
    } catch (error) {
      this.logger.error(
        `Failed to record event: type=${dto.eventType} contentId=${dto.contentId} sessionId=${dto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
