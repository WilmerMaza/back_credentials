import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CredentialType } from "../../domain/credential.entity";

export class CredentialTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "militar" })
  code!: string;

  @ApiProperty({ example: "Personal Militar" })
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({
    example: {
      fields: [
        {
          name: "rank",
          label: "Rango",
          type: "text",
          required: true,
        },
      ],
    },
  })
  schema!: Record<string, unknown>;

  static fromDomain(type: CredentialType): CredentialTypeResponseDto {
    return {
      id: type.id,
      code: type.code,
      name: type.name,
      description: type.description ?? undefined,
      schema: type.schema,
    };
  }
}
