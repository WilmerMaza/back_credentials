import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Credential } from "../../domain/credential.entity";
import { CredentialMetadata } from "../../domain/credential-type-schema";

export class CredentialResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ description: "Nombre completo calculado y persistido en BD" })
  fullName!: string;

  @ApiProperty()
  identityNumber!: string;

  @ApiProperty()
  typeIdentity!: string;

  @ApiPropertyOptional()
  details?: string;

  @ApiProperty({
    example: { rank: "Capitán", unit: "Batallón 12", force: "Ejército" },
  })
  metadata!: CredentialMetadata;

  @ApiProperty({ type: String, format: "date-time" })
  birthDate!: Date;

  @ApiProperty()
  institutionalEmail!: string;

  @ApiProperty()
  credentialTypeCode!: string;

  @ApiProperty()
  credentialTypeName!: string;

  @ApiProperty()
  imagePath!: string;

  @ApiProperty({
    enum: ["ACTIVE", "PENDING", "EXPIRED", "REVOKED", "SUSPENDED"],
  })
  status!: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  expirationDate?: Date;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;

  static fromDomain(credential: Credential): CredentialResponseDto {
    return {
      id: credential.id,
      firstName: credential.person.firstName,
      lastName: credential.person.lastName,
      fullName: credential.person.fullName,
      identityNumber: credential.person.identityNumber,
      typeIdentity: credential.person.typeIdentity,
      details: credential.details ?? undefined,
      metadata: credential.metadata,
      birthDate: credential.person.birthDate,
      institutionalEmail: credential.person.institutionalEmail ?? "",
      credentialTypeCode: credential.type.code,
      credentialTypeName: credential.type.name,
      imagePath: credential.imagePath ?? "",
      status: credential.status,
      expirationDate: credential.expirationDate ?? undefined,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
