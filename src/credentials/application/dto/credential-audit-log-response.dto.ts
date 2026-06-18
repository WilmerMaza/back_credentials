import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CredentialAuditLogEntry } from "../../domain/credential-audit.types";

export class CredentialAuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  credentialId!: string;

  @ApiProperty({ enum: ["CREATE", "UPDATE"] })
  action!: "CREATE" | "UPDATE";

  @ApiPropertyOptional()
  userId!: string | null;

  @ApiPropertyOptional()
  userEmail!: string | null;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  before!: Record<string, unknown> | null;

  @ApiProperty({ type: "object", additionalProperties: true })
  after!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;

  static fromDomain(entry: CredentialAuditLogEntry): CredentialAuditLogResponseDto {
    const dto = new CredentialAuditLogResponseDto();
    dto.id = entry.id;
    dto.credentialId = entry.credentialId;
    dto.action = entry.action;
    dto.userId = entry.userId;
    dto.userEmail = entry.userEmail;
    dto.before = entry.before;
    dto.after = entry.after;
    dto.createdAt = entry.createdAt.toISOString();
    return dto;
  }
}
