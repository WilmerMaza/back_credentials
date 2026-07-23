import { ConfigService } from "@nestjs/config";
import { CookieOptions } from "express";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

function parseAccessTtlMs(config: ConfigService): number {
  const raw = config.get<string>("JWT_ACCESS_TTL") ?? "15m";
  const match = /^(\d+)(m|h|d)$/.exec(raw.trim());
  if (!match) {
    return 15 * 60 * 1000;
  }
  const value = Number(match[1]);
  switch (match[2]) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 1000;
  }
}

function parseRefreshTtlMs(config: ConfigService): number {
  const days = Number(config.get<string>("REFRESH_TOKEN_TTL_DAYS") ?? "7");
  return (Number.isFinite(days) ? days : 7) * 24 * 60 * 60 * 1000;
}

/** Prefijo público visto por el navegador (ej. `/api`). Vacío si el API se expone en la raíz. */
export function getApiPublicPrefix(config: ConfigService): string {
  const raw = (config.get<string>("API_PUBLIC_PREFIX") ?? "").trim().replace(/\/$/, "");
  if (!raw || raw === "/") {
    return "";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Path de la cookie refresh según lo que ve el navegador.
 * Con proxy/nginx: `/api/auth/refresh`. Sin prefijo: `/auth/refresh`.
 */
export function getRefreshCookiePath(config: ConfigService): string {
  return `${getApiPublicPrefix(config)}/auth/refresh`;
}

function resolveSecure(config: ConfigService, sameSite: CookieOptions["sameSite"]): boolean {
  const explicit = config.get<string>("AUTH_COOKIE_SECURE");
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const nodeEnv = config.get<string>("NODE_ENV") ?? "development";
  return nodeEnv === "production" || sameSite === "none";
}

function baseCookieOptions(config: ConfigService): Omit<CookieOptions, "path" | "maxAge"> {
  const sameSite = (config.get<string>("AUTH_COOKIE_SAMESITE") ?? "lax") as
    | "lax"
    | "strict"
    | "none";
  const domain = config.get<string>("AUTH_COOKIE_DOMAIN")?.trim() || undefined;

  return {
    httpOnly: true,
    secure: resolveSecure(config, sameSite),
    sameSite,
    domain,
  };
}

export function getAccessCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: "/",
    maxAge: parseAccessTtlMs(config),
  };
}

export function getRefreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: getRefreshCookiePath(config),
    maxAge: parseRefreshTtlMs(config),
  };
}

export function getClearAccessCookieOptions(
  config: ConfigService,
): CookieOptions {
  const { maxAge: _maxAge, ...options } = getAccessCookieOptions(config);
  return options;
}

export function getClearRefreshCookieOptions(
  config: ConfigService,
): CookieOptions {
  const { maxAge: _maxAge, ...options } = getRefreshCookieOptions(config);
  return options;
}
