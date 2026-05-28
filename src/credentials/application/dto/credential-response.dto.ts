import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Credential } from "../../domain/credential.entity";

export class CredentialResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  rank!: string;

  @ApiProperty()
  identityNumber!: string;

  @ApiProperty()
  unit!: string;

  @ApiPropertyOptional()
  details?: string;

  @ApiPropertyOptional()
  force?: string;

  @ApiPropertyOptional()
  sport?: string;

  @ApiPropertyOptional()
  course?: string;

  @ApiPropertyOptional()
  grades?: string;

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

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;

  static fromDomain(credential: Credential): CredentialResponseDto {
    return {
      id: credential.id,
      fullName: credential.person.fullName,
      rank: credential.rank ?? "",
      identityNumber: credential.person.identityNumber,
      unit: credential.unit ?? "",
      details: credential.details ?? undefined,
      force: credential.force ?? undefined,
      sport: credential.sport ?? undefined,
      course: credential.course ?? undefined,
      grades: credential.grades ?? undefined,
      birthDate: credential.person.birthDate,
      institutionalEmail: credential.person.institutionalEmail ?? "",
      credentialTypeCode: credential.type.code,
      credentialTypeName: credential.type.name,
      imagePath: credential.imagePath ?? "",
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
