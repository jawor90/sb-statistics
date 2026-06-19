import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  eventType: string;

  @IsString()
  contentId: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  platform?: string;
}
