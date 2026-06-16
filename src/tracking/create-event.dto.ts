export class CreateEventDto {
  eventType: string;
  contentId: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  platform?: string;
}
