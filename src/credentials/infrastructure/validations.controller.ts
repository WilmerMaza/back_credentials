import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";
import {
  CheckEmailQueryDto,
  CheckIdentityQueryDto,
  ExistsResponseDto,
} from "../application/dto/validation-query.dto";
import { CheckEmailExistsQuery } from "../application/queries/check-email-exists.query";
import { CheckIdentityExistsQuery } from "../application/queries/check-identity-exists.query";

@ApiTags("validations")
@UseGuards(JwtAuthGuard)
@Controller("validations")
export class ValidationsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get("email")
  @ApiOkResponse({
    type: ExistsResponseDto,
    description: "Verifica si el correo institucional ya está registrado",
  })
  async checkEmail(@Query() query: CheckEmailQueryDto): Promise<ExistsResponseDto> {
    const exists = await this.queryBus.execute(
      new CheckEmailExistsQuery(query.email),
    );

    return { exists };
  }

  @Get("identity")
  @ApiOkResponse({
    type: ExistsResponseDto,
    description: "Verifica si el número de identificación (CC) ya está registrado",
  })
  async checkIdentity(
    @Query() query: CheckIdentityQueryDto,
  ): Promise<ExistsResponseDto> {
    const exists = await this.queryBus.execute(
      new CheckIdentityExistsQuery(query.identityNumber),
    );

    return { exists };
  }
}
