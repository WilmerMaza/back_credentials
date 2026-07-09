import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseCorsOrigins(raw?: string): string[] | boolean {
  const value = raw?.trim();
  if (!value || value === '*') {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const maxUploadMb = parseInt(process.env.MAX_PDF_SIZE_MB ?? '25', 10);
  const bodyLimit = `${maxUploadMb}mb`;

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const cookieSecure = configService.get<string>('AUTH_COOKIE_SECURE') === 'true';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      strictTransportSecurity: cookieSecure ? undefined : false,
      contentSecurityPolicy: cookieSecure
        ? undefined
        : {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'upgrade-insecure-requests': null,
            },
          },
    }),
  );
  const corsOrigins = parseCorsOrigins(configService.get<string>('CORS_ORIGINS'));

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-csrf-token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const apiPublicPrefix = (configService.get<string>('API_PUBLIC_PREFIX') ?? '')
    .trim()
    .replace(/\/$/, '');

  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Credentials API')
    .setDescription('API para registrar y generar credenciales militares')
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'api-key',
    );

  if (apiPublicPrefix) {
    swaggerBuilder.addServer(apiPublicPrefix);
  }

  const swaggerConfig = swaggerBuilder.build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
