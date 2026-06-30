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
    const { rowsAffected } = await statsService.rebuildContentStats();
    console.log(`Rebuilt content stats: ${rowsAffected} row(s) affected`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to rebuild content stats', error);
  process.exit(1);
});
