import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyCredentialQueryDto {
  @ApiProperty({ example: "1231232" })
  @IsString()
  @IsNotEmpty()
  identity!: string;

  @ApiProperty({ example: "inter-escuelas" })
  @IsString()
  @IsNotEmpty()
  type!: string;
}
