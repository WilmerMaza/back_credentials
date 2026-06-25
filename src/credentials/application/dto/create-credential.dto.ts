import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import {
  CREDENTIAL_STATUSES,
  DEFAULT_CREDENTIAL_STATUS,
} from "../../domain/credential-status";
import { emptyToUndefined } from "../../domain/credential-draft";

const EmptyToUndefined = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "string") {
      return emptyToUndefined(value);
    }
    return value;
  });

export class CreateCredentialDto {
  @ApiPropertyOptional({ example: "Juan" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Pérez" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: "123456789" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  identityNumber?: string;

  @ApiPropertyOptional({
    example: "123456789",
    description: "Alias de identityNumber (compatibilidad frontend)",
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  numeroIdentidad?: string;

  @ApiPropertyOptional({ example: "CC" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  typeIdentity?: string;

  @ApiPropertyOptional({
    example: "CC",
    description: "Alias de typeIdentity (compatibilidad frontend)",
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  tipoIdentidad?: string;

  @ApiPropertyOptional({ example: "Detalle adicional de la credencial" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({
    example:
      '{"force":"armada","category":"OfficerNavy","grades":"Teniente de Corbeta","unit":"Fragata ARC Caldas"}',
    description: "JSON con campos específicos del tipo de credencial",
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiPropertyOptional({ example: "1990-01-01" })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && String(value).trim() !== "")
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: "juan.perez@mil.edu" })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && String(value).trim() !== "")
  @IsEmail()
  institutionalEmail?: string;

  @ApiPropertyOptional({ example: "militar" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  credentialTypeCode?: string;

  @ApiPropertyOptional({ example: "3001234567" })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "2030-12-31" })
  @EmptyToUndefined()
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && String(value).trim() !== "")
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({
    enum: CREDENTIAL_STATUSES,
    example: DEFAULT_CREDENTIAL_STATUS,
    description: "Estado inicial de la credencial. Por defecto: PENDING",
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateCredentialRequestDto extends CreateCredentialDto {
  @ApiPropertyOptional({ type: "string", format: "binary" })
  image?: any;
}
