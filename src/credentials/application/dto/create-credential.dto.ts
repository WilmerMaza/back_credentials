import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateCredentialDto {
  @ApiProperty({ example: "Juan" })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: "Pérez" })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: "123456789" })
  @IsString()
  @IsNotEmpty()
  identityNumber!: string;

  @ApiProperty({ example: "CC" })
  @IsString()
  @IsNotEmpty()
  typeIdentity!: string;

  @ApiPropertyOptional({ example: "Detalle adicional de la credencial" })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiPropertyOptional({
    example:
      '{"force":"armada","category":"OfficerNavy","grades":"Teniente de Corbeta","unit":"Fragata ARC Caldas"}',
    description: "JSON con campos específicos del tipo de credencial",
  })
  @IsString()
  @IsOptional()
  metadata?: string;

  @ApiProperty({ example: "1990-01-01" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ example: "juan.perez@mil.edu" })
  @IsEmail()
  institutionalEmail!: string;

  @ApiProperty({ example: "militar" })
  @IsString()
  @IsNotEmpty()
  credentialTypeCode!: string;

  @ApiPropertyOptional({ example: "3001234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "2030-12-31" })
  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}

export class CreateCredentialRequestDto extends CreateCredentialDto {
  @ApiProperty({ type: "string", format: "binary" })
  image: any;
}
