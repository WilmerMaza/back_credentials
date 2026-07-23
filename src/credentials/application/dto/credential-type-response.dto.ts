import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CredentialType } from "../../domain/credential.entity";
import {
  normalizeCredentialTypeCode,
  resolveCredentialTypeName,
} from "../../domain/credential-type-schema";

export class CredentialTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "militar" })
  code!: string;

  @ApiProperty({ example: "PERSONAL MILITAR" })
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({
    example: {
      fields: [
        {
          name: "force",
          label: "Fuerza",
          type: "select",
          required: true,
          options: ["armada", "ejercito", "fuerza_aerea"],
          optionLabels: {
            armada: "Armada",
            ejercito: "Ejército",
            fuerza_aerea: "Fuerza Aérea",
          },
        },
        {
          name: "category",
          label: "Categoría",
          type: "select",
          required: true,
          dependsOn: "force",
          optionsByParent: {
            ejercito: ["ArmyOfficer", "ArmySubofficer", "IMP"],
          },
        },
        {
          name: "grades",
          label: "Grado",
          type: "select",
          required: true,
          dependsOn: "category",
          hiddenWhen: { field: "category", values: ["IMP"] },
          autoValueWhen: {
            field: "category",
            values: { IMP: "Infante de marina profesional" },
          },
        },
      ],
    },
  })
  schema!: Record<string, unknown>;

  static fromDomain(type: CredentialType): CredentialTypeResponseDto {
    const code = normalizeCredentialTypeCode(type.code);
    return {
      id: type.id,
      code,
      name: resolveCredentialTypeName(code, type.name),
      description: type.description ?? undefined,
      schema: type.schema,
    };
  }
}
