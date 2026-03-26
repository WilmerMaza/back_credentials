import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateCredentialDto {
  @ApiProperty({ example: "Juan Perez" })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: "Teniente" })
  @IsString()
  @IsNotEmpty()
  rank!: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  identityNumber!: string;

  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty()
  typeIdentity!: string;

  @ApiProperty({ example: "Batallon 1" })
  @IsString()
  @IsNotEmpty()
  unit!: string;

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
}

export class CreateCredentialRequestDto extends CreateCredentialDto {
  @ApiProperty({ type: "string", format: "binary" })
  image: any;
}
