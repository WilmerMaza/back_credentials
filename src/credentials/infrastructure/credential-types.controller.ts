import { Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";
import { CredentialTypeResponseDto } from "../application/dto/credential-type-response.dto";
import { CredentialType } from "../domain/credential.entity";
import { normalizeCredentialTypeCode } from "../domain/credential-type-schema";
import { GetCredentialTypeQuery } from "../application/queries/get-credential-type.query";
import { ListCredentialTypesQuery } from "../application/queries/list-credential-types.query";

@ApiTags("credential-types")
@UseGuards(JwtAuthGuard)
@Controller("credential-types")
export class CredentialTypesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOkResponse({ type: [CredentialTypeResponseDto] })
  async list(): Promise<CredentialTypeResponseDto[]> {
    const types = await this.queryBus.execute(new ListCredentialTypesQuery());
    return types.map((type: CredentialType) =>
      CredentialTypeResponseDto.fromDomain(type),
    );
  }

  @Get(":code")
  @ApiOkResponse({ type: CredentialTypeResponseDto })
  async get(@Param("code") code: string): Promise<CredentialTypeResponseDto> {
    const found = await this.queryBus.execute(
      new GetCredentialTypeQuery(normalizeCredentialTypeCode(code)),
    );
    if (!found) {
      throw new NotFoundException("Credential type not found");
    }

    return CredentialTypeResponseDto.fromDomain(found);
  }
}
