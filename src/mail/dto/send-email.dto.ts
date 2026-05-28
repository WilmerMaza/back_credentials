import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendEmailDto {
  @ApiProperty({ example: "destino@ejemplo.com" })
  @IsEmail()
  to!: string;

  @ApiProperty({ example: "Tu credencial militar" })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ example: "<p>Adjuntamos tu credencial en PDF.</p>" })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    example: "credencial-juan-perez.pdf",
    description: "Nombre del archivo PDF adjunto",
  })
  @IsString()
  @IsOptional()
  pdfFileName?: string;
}

export class SendEmailRequestDto extends SendEmailDto {
  @ApiProperty({ type: "string", format: "binary", description: "PDF de la credencial" })
  pdf!: unknown;
}
