import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Credential } from "../../domain/credential.entity";
import { CredentialMetadata } from "../../domain/credential-type-schema";

export type VerificationOutcome =
  | "VALID"
  | "PENDING"
  | "EXPIRED"
  | "REVOKED"
  | "SUSPENDED"
  | "NOT_FOUND";

export class PublicCredentialSnapshotDto {
  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  identityNumber!: string;

  @ApiProperty()
  typeIdentity!: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  birthDate?: Date;

  @ApiPropertyOptional()
  institutionalEmail?: string;

  @ApiProperty()
  credentialTypeCode!: string;

  @ApiProperty()
  credentialTypeName!: string;

  @ApiProperty()
  metadata!: CredentialMetadata;

  @ApiPropertyOptional({ description: "Nombre de archivo para GET /verify/photo/:filename" })
  imageFilename?: string;

  @ApiProperty({
    enum: ["ACTIVE", "PENDING", "EXPIRED", "REVOKED", "SUSPENDED"],
  })
  status!: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  issueDate?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  expirationDate?: Date;
}

export class PublicCredentialVerificationDto {
  @ApiProperty({
    enum: ["VALID", "PENDING", "EXPIRED", "REVOKED", "SUSPENDED", "NOT_FOUND"],
  })
  outcome!: VerificationOutcome;

  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: String, format: "date-time" })
  checkedAt!: Date;

  @ApiPropertyOptional({ type: PublicCredentialSnapshotDto })
  credential?: PublicCredentialSnapshotDto;

  static notFound(checkedAt: Date): PublicCredentialVerificationDto {
    return {
      outcome: "NOT_FOUND",
      valid: false,
      message:
        "No se encontró una credencial registrada con esta identificación y tipo.",
      checkedAt,
    };
  }

  static fromCredential(
    credential: Credential,
    checkedAt: Date,
  ): PublicCredentialVerificationDto {
    const outcome = resolveVerificationOutcome(credential);
    const snapshot = buildSnapshot(credential);

    return {
      outcome,
      valid: outcome === "VALID",
      message: verificationMessage(outcome),
      checkedAt,
      credential: snapshot,
    };
  }
}

function resolveVerificationOutcome(credential: Credential): VerificationOutcome {
  const status = credential.status;

  if (status === "REVOKED") return "REVOKED";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "PENDING") return "PENDING";
  if (status === "EXPIRED") return "EXPIRED";

  if (
    credential.expirationDate &&
    credential.expirationDate.getTime() < Date.now()
  ) {
    return "EXPIRED";
  }

  if (status === "ACTIVE") return "VALID";

  return "NOT_FOUND";
}

function verificationMessage(outcome: VerificationOutcome): string {
  switch (outcome) {
    case "VALID":
      return "Esta credencial es auténtica y se encuentra vigente.";
    case "PENDING":
      return "Esta credencial está registrada pero aún no ha sido activada.";
    case "EXPIRED":
      return "Esta credencial ha expirado y no se encuentra vigente.";
    case "REVOKED":
      return "Esta credencial ha sido revocada.";
    case "SUSPENDED":
      return "Esta credencial se encuentra suspendida.";
    default:
      return "No se encontró una credencial registrada con esta identificación y tipo.";
  }
}

function buildSnapshot(
  credential: Credential,
): PublicCredentialSnapshotDto {
  const imageFilename = extractImageFilename(credential.imagePath);

  return {
    fullName: credential.person.fullName,
    identityNumber: credential.person.identityNumber,
    typeIdentity: credential.person.typeIdentity,
    birthDate: credential.person.birthDate,
    institutionalEmail: credential.person.institutionalEmail ?? undefined,
    credentialTypeCode: credential.type.code,
    credentialTypeName: credential.type.name,
    metadata: credential.metadata,
    imageFilename,
    status: credential.status,
    issueDate: credential.issueDate ?? credential.createdAt,
    expirationDate: credential.expirationDate ?? undefined,
  };
}

function extractImageFilename(imagePath: string | null): string | undefined {
  if (!imagePath) return undefined;

  const normalized = imagePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  const filename = segments[segments.length - 1];

  if (!filename || filename.includes("..")) return undefined;

  return filename;
}
