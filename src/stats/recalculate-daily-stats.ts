import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { StatsService } from './stats.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const statsService = app.get(StatsService);
    const { daysAffected } = await statsService.recalculateAllDailyStats();
    console.log(`Recalculated daily stats for ${daysAffected} day(s)`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to recalculate daily stats', error);
  process.exit(1);
});
