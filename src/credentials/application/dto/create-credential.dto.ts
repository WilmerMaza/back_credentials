import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCredentialDto {
  @ApiProperty({ example: "Juan Perez" })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: "Teniente", required: false })
  @IsString()
  @IsOptional()
  rank?: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  identityNumber!: string;

  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty()
  typeIdentity!: string;

  @ApiProperty({ example: "Batallon 1", required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: "1990-01-01" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ example: 'juan.perez@mil.edu' })
  @IsEmail()
  institutionalEmail!: string;

  @ApiProperty({ example: 'MILITARY' })
  @IsString()
  @IsNotEmpty()
  credentialTypeCode!: string;

  @ApiProperty({ example: '3001234567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateCredentialRequestDto extends CreateCredentialDto {
  @ApiProperty({ type: "string", format: "binary" })
  image: any;
}
