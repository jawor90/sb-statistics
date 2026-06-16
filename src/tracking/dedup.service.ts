import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

const VIEW_DEDUP_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class DedupService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  private buildViewKey(contentId: string, sessionId: string): string {
    return `view:event:${contentId}:session:${sessionId}`;
  }

  async shouldRecordView(
    contentId: string,
    sessionId: string,
  ): Promise<boolean> {
    const key = this.buildViewKey(contentId, sessionId);
    const existing = await this.cacheManager.get(key);

    if (existing !== undefined && existing !== null) {
      return false;
    }

    await this.cacheManager.set(key, 1, VIEW_DEDUP_TTL_MS);
    return true;
  }
}
