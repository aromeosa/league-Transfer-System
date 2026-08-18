import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true stashes the untouched request body as a Buffer on req.rawBody for
  // every body parser — PayfastWebhookController needs the exact bytes PayFast sent
  // (not a re-serialization of the parsed object) to forward to PayFast's own validate
  // callback and to recompute the ITN signature reliably. useBodyParser() deliberately
  // doesn't expose a custom `verify` option, so this is the supported way to get it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Raised above Express's 100kb default to fit base64-encoded player photo uploads
  // (client resizes to a small thumbnail first, but this leaves headroom).
  app.useBodyParser('json', { limit: '2mb' });

  // PayFast's ITN webhook POSTs application/x-www-form-urlencoded, not JSON.
  app.useBodyParser('urlencoded', { extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Comma-separated so you can allow both a deployed frontend and localhost at once.
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`5quadLeague Transfer System API listening on port ${port}`);
}
bootstrap();
