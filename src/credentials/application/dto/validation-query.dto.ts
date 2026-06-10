import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CheckEmailQueryDto {
  @ApiProperty({ example: "juan.perez@enap.edu.co" })
  @IsEmail()
  email!: string;
}

export class CheckIdentityQueryDto {
  @ApiProperty({ example: "1234567890", description: "Número de identificación (CC, TI, etc.)" })
  @IsString()
  @IsNotEmpty()
  identityNumber!: string;
}

export class ExistsResponseDto {
  @ApiProperty({ example: true })
  exists!: boolean;
}
