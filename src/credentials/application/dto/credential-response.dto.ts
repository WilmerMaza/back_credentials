import { ApiProperty } from "@nestjs/swagger";
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

  @ApiProperty({ type: String, format: "date-time" })
  birthDate!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  enlistmentDate!: Date;

  @ApiProperty()
  institutionalEmail!: string;

  @ApiProperty()
  imagePath!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;

  static fromDomain(credential: Credential): CredentialResponseDto {
    return {
      id: credential.id,
      fullName: credential.fullName,
      rank: credential.rank,
      identityNumber: credential.identityNumber,
      unit: credential.unit,
      birthDate: credential.birthDate,
      enlistmentDate: credential.enlistmentDate,
      institutionalEmail: credential.institutionalEmail,
      imagePath: credential.imagePath,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
