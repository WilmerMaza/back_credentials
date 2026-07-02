import { ConfigService } from "@nestjs/config";

export function isAdminUser(
  configService: ConfigService,
  userId: string,
): boolean {
  const raw = configService.get<string>("ADMIN_USER_IDS") ?? "";
  const adminIds = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return adminIds.includes(userId);
}
