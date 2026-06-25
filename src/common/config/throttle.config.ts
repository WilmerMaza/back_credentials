import { ExecutionContext } from "@nestjs/common";
import { ThrottlerModuleOptions } from "@nestjs/throttler";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Rutas que no deben contar contra el rate limit (documentación, health implícito). */
function shouldSkipThrottle(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest<{ path?: string; url?: string }>();
  const path = req.path ?? req.url ?? "";
  return path.startsWith("/docs");
}

/**
 * Rate limit por defecto: generoso para uso normal de la SPA.
 * Rutas sensibles usan @Throttle() con límites más bajos.
 * Lecturas frecuentes usan @SkipThrottle().
 */
export function createThrottleConfig(): ThrottlerModuleOptions {
  const ttl = parsePositiveInt(process.env.THROTTLE_TTL, 60_000);
  const limit = parsePositiveInt(process.env.THROTTLE_LIMIT, 120);

  return {
    skipIf: shouldSkipThrottle,
    throttlers: [
      {
        name: "default",
        ttl,
        limit,
      },
    ],
  };
}

/** Límites recomendados para decorador @Throttle en rutas sensibles. */
export const THROTTLE_AUTH = {
  default: {
    ttl: parsePositiveInt(process.env.THROTTLE_AUTH_TTL, 60_000),
    limit: parsePositiveInt(process.env.THROTTLE_AUTH_LIMIT, 10),
  },
};

export const THROTTLE_WRITE = {
  default: {
    ttl: parsePositiveInt(process.env.THROTTLE_WRITE_TTL, 60_000),
    limit: parsePositiveInt(process.env.THROTTLE_WRITE_LIMIT, 30),
  },
};

export const THROTTLE_MAIL = {
  default: {
    ttl: parsePositiveInt(process.env.THROTTLE_MAIL_TTL, 60_000),
    limit: parsePositiveInt(process.env.THROTTLE_MAIL_LIMIT, 10),
  },
};
