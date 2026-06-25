import { ApiProperty } from "@nestjs/swagger";

export class CredentialStatusSummaryDto {
  @ApiProperty({ example: 42, description: "Credenciales con estado ACTIVE" })
  activas!: number;

  @ApiProperty({
    example: 5,
    description: "Credenciales EXPIRED, TRANSFERRED, REVOKED o SUSPENDED",
  })
  inactivas!: number;

  @ApiProperty({ example: 3, description: "Credenciales con estado PENDING" })
  pendientes!: number;

  @ApiProperty({ example: 2, description: "Credenciales con estado EXPIRED" })
  expiradas!: number;
}
