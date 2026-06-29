import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInts);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeBigInts(val)]),
    );
  }

  return value;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInts(data)));
  }
}
